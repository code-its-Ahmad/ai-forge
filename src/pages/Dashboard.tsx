import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Navbar } from '@/components/Navbar';
import { YouTubeAnalyzer } from '@/components/dashboard/YouTubeAnalyzer';
import { ThumbnailScorer } from '@/components/dashboard/ThumbnailScorer';
import { ABTester } from '@/components/dashboard/ABTester';
import { toast } from 'sonner';
import { 
  Sparkles, 
  Wand2, 
  Download, 
  Copy, 
  Loader2, 
  Image as ImageIcon,
  Type,
  History,
  Trash2,
  Users,
  Palette,
  Upload,
  RefreshCw,
  Youtube,
  BarChart3,
  FlipHorizontal,
  Link2
} from 'lucide-react';

interface Generation {
  id: string;
  generation_type: string;
  prompt: string | null;
  image_url: string | null;
  title_suggestions: any;
  platform: string | null;
  created_at: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  
  // Active tab
  const [activeTab, setActiveTab] = useState('thumbnail');
  
  // Thumbnail generation
  const [prompt, setPrompt] = useState('');
  const [platform, setPlatform] = useState('youtube');
  const [style, setStyle] = useState('professional');
  const [language, setLanguage] = useState('english');
  const [persona, setPersona] = useState('none');
  const [generating, setGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  
  // Title generation
  const [titleTopic, setTitleTopic] = useState('');
  const [titlePlatform, setTitlePlatform] = useState('YouTube');
  const [generatingTitles, setGeneratingTitles] = useState(false);
  const [generatedTitles, setGeneratedTitles] = useState<any[]>([]);
  
  // Face swap
  const [sourceImage, setSourceImage] = useState<string>('');
  const [faceImage, setFaceImage] = useState<string>('');
  const [swapping, setSwapping] = useState(false);
  const [swappedImage, setSwappedImage] = useState<string | null>(null);
  const sourceInputRef = useRef<HTMLInputElement>(null);
  const faceInputRef = useRef<HTMLInputElement>(null);
  
  // Edit thumbnail
  const [editImageUrl, setEditImageUrl] = useState<string>('');
  const [editPrompt, setEditPrompt] = useState('');
  const [editType, setEditType] = useState('enhance');
  const [editing, setEditing] = useState(false);
  const [editedImage, setEditedImage] = useState<string | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  
  // YouTube to Thumbnail
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [generatingFromYT, setGeneratingFromYT] = useState(false);
  const [ytResult, setYtResult] = useState<any>(null);
  
  // History
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const initialPrompt = (location.state as any)?.initialPrompt;

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (initialPrompt) {
      setPrompt(initialPrompt);
    }
  }, [initialPrompt]);

  useEffect(() => {
    if (user) {
      fetchGenerations();
    }
  }, [user]);

  const fetchGenerations = async () => {
    if (!user) return;
    setLoadingHistory(true);
    
    const { data, error } = await supabase
      .from('generations')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error fetching generations:', error);
    } else {
      setGenerations((data || []) as Generation[]);
    }
    setLoadingHistory(false);
  };

  const checkUsageLimit = () => {
    if (!profile) return false;
    if (profile.monthly_usage >= profile.usage_limit) {
      toast.error('Usage limit reached. Please upgrade your plan.');
      return false;
    }
    return true;
  };

  const handleFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    setImage: (url: string) => void
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be less than 10MB');
      return;
    }

    try {
      const base64 = await handleFileToBase64(file);
      setImage(base64);
      toast.success('Image uploaded successfully');
    } catch {
      toast.error('Failed to upload image');
    }
  };

  const handleGenerateThumbnail = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }
    if (!checkUsageLimit()) return;

    setGenerating(true);
    setGeneratedImage(null);

    try {
      const { data, error } = await supabase.functions.invoke('generate-thumbnail', {
        body: { prompt, platform, style, language, persona }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setGeneratedImage(data.imageUrl);

      // Save to database
      await supabase.from('generations').insert({
        user_id: user!.id,
        generation_type: 'thumbnail',
        prompt,
        image_url: data.imageUrl,
        platform,
        metadata: { style, language, persona }
      });

      // Increment usage
      await supabase.rpc('increment_usage', { user_uuid: user!.id });
      await refreshProfile();
      await fetchGenerations();

      toast.success('Thumbnail generated successfully!');
    } catch (error) {
      console.error('Error generating thumbnail:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate thumbnail');
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateTitles = async () => {
    if (!titleTopic.trim()) {
      toast.error('Please enter a topic');
      return;
    }
    if (!checkUsageLimit()) return;

    setGeneratingTitles(true);
    setGeneratedTitles([]);

    try {
      const { data, error } = await supabase.functions.invoke('generate-titles', {
        body: { topic: titleTopic, platform: titlePlatform }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setGeneratedTitles(data.titles || []);

      // Save to database
      await supabase.from('generations').insert({
        user_id: user!.id,
        generation_type: 'title',
        prompt: titleTopic,
        title_suggestions: data.titles,
        platform: titlePlatform.toLowerCase(),
      });

      // Increment usage
      await supabase.rpc('increment_usage', { user_uuid: user!.id });
      await refreshProfile();
      await fetchGenerations();

      toast.success('Titles generated successfully!');
    } catch (error) {
      console.error('Error generating titles:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate titles');
    } finally {
      setGeneratingTitles(false);
    }
  };

  const handleFaceSwap = async () => {
    if (!sourceImage || !faceImage) {
      toast.error('Please upload both images');
      return;
    }
    if (!checkUsageLimit()) return;

    setSwapping(true);
    setSwappedImage(null);

    try {
      const { data, error } = await supabase.functions.invoke('face-swap', {
        body: { 
          sourceImageUrl: sourceImage,
          targetFaceUrl: faceImage
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setSwappedImage(data.imageUrl);

      // Save to database
      await supabase.from('generations').insert({
        user_id: user!.id,
        generation_type: 'faceswap',
        prompt: 'Face swap',
        image_url: data.imageUrl,
        platform: 'general',
      });

      // Increment usage
      await supabase.rpc('increment_usage', { user_uuid: user!.id });
      await refreshProfile();
      await fetchGenerations();

      toast.success('Face swap completed!');
    } catch (error) {
      console.error('Error in face swap:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to perform face swap');
    } finally {
      setSwapping(false);
    }
  };

  const handleEditThumbnail = async () => {
    if (!editImageUrl) {
      toast.error('Please upload or provide an image');
      return;
    }
    if (!checkUsageLimit()) return;

    setEditing(true);
    setEditedImage(null);

    try {
      const { data, error } = await supabase.functions.invoke('edit-thumbnail', {
        body: { 
          imageUrl: editImageUrl,
          editPrompt,
          editType
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setEditedImage(data.imageUrl);

      // Save to database
      await supabase.from('generations').insert({
        user_id: user!.id,
        generation_type: 'edit',
        prompt: editPrompt || editType,
        image_url: data.imageUrl,
        platform: 'general',
        metadata: { editType }
      });

      // Increment usage
      await supabase.rpc('increment_usage', { user_uuid: user!.id });
      await refreshProfile();
      await fetchGenerations();

      toast.success('Thumbnail edited successfully!');
    } catch (error) {
      console.error('Error editing thumbnail:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to edit thumbnail');
    } finally {
      setEditing(false);
    }
  };

  const handleGenerateFromYouTube = async () => {
    if (!youtubeUrl.trim()) {
      toast.error('Please enter a YouTube URL');
      return;
    }
    if (!checkUsageLimit()) return;

    setGeneratingFromYT(true);
    setYtResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('generate-from-youtube', {
        body: { 
          youtubeUrl,
          style,
          generateTitles: true
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setYtResult(data);

      // Save to database
      if (data.generatedThumbnail) {
        await supabase.from('generations').insert({
          user_id: user!.id,
          generation_type: 'thumbnail',
          prompt: `Generated from YouTube: ${youtubeUrl}`,
          image_url: data.generatedThumbnail,
          platform: 'youtube',
          title_suggestions: data.titles,
          metadata: { videoId: data.videoId, analysis: data.analysis }
        });

        await supabase.rpc('increment_usage', { user_uuid: user!.id });
        await refreshProfile();
        await fetchGenerations();
      }

      toast.success('Generated improved thumbnail from YouTube!');
    } catch (error) {
      console.error('Error generating from YouTube:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate');
    } finally {
      setGeneratingFromYT(false);
    }
  };

  const handleDownload = async (imageUrl: string, filename?: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || `thumbforge-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Image downloaded!');
    } catch {
      toast.error('Failed to download image');
    }
  };

  const handleCopyTitle = (title: string) => {
    navigator.clipboard.writeText(title);
    toast.success('Title copied to clipboard!');
  };

  const handleDeleteGeneration = async (id: string) => {
    const { error } = await supabase.from('generations').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete');
    } else {
      toast.success('Deleted successfully');
      await fetchGenerations();
    }
  };

  const useImageForEdit = (imageUrl: string) => {
    setEditImageUrl(imageUrl);
    setActiveTab('edit');
    toast.success('Image loaded for editing');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 pt-24 pb-12">
        {/* Usage Stats */}
        <div className="glass rounded-2xl p-6 mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl font-bold">Welcome back, {profile?.full_name || 'Creator'}!</h1>
              <p className="text-muted-foreground">Create stunning thumbnails and titles with AI</p>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Monthly Usage</p>
                <p className="font-display text-2xl font-bold">
                  <span className="text-primary">{profile?.monthly_usage || 0}</span>
                  <span className="text-muted-foreground text-base">/{profile?.usage_limit || 10}</span>
                </p>
              </div>
              <div className="h-12 w-px bg-border" />
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Plan</p>
                <p className="font-display text-lg font-semibold capitalize text-primary">
                  {profile?.subscription_tier || 'free'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="glass p-1 flex-wrap h-auto gap-1">
            <TabsTrigger value="thumbnail" className="gap-2">
              <ImageIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Thumbnail</span>
            </TabsTrigger>
            <TabsTrigger value="youtube-gen" className="gap-2">
              <Link2 className="w-4 h-4" />
              <span className="hidden sm:inline">YouTube → Thumb</span>
            </TabsTrigger>
            <TabsTrigger value="titles" className="gap-2">
              <Type className="w-4 h-4" />
              <span className="hidden sm:inline">Titles</span>
            </TabsTrigger>
            <TabsTrigger value="faceswap" className="gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Face Swap</span>
            </TabsTrigger>
            <TabsTrigger value="edit" className="gap-2">
              <Palette className="w-4 h-4" />
              <span className="hidden sm:inline">Edit</span>
            </TabsTrigger>
            <TabsTrigger value="analyze" className="gap-2">
              <Youtube className="w-4 h-4" />
              <span className="hidden sm:inline">Analyze</span>
            </TabsTrigger>
            <TabsTrigger value="score" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Score</span>
            </TabsTrigger>
            <TabsTrigger value="abtest" className="gap-2">
              <FlipHorizontal className="w-4 h-4" />
              <span className="hidden sm:inline">A/B Test</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">History</span>
            </TabsTrigger>
          </TabsList>

          {/* Thumbnail Generation */}
          <TabsContent value="thumbnail" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="glass rounded-2xl p-6 space-y-4">
                <h2 className="font-display text-xl font-semibold flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  Generate Thumbnail
                </h2>

                <div className="space-y-2">
                  <Label>Video Title / Topic</Label>
                  <Textarea
                    placeholder="The 1998 F1 Grand Prix in Spa - The Greatest Race Ever"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="min-h-[100px]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Platform</Label>
                    <Select value={platform} onValueChange={setPlatform}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="youtube">YouTube</SelectItem>
                        <SelectItem value="instagram">Instagram</SelectItem>
                        <SelectItem value="tiktok">TikTok</SelectItem>
                        <SelectItem value="facebook">Facebook</SelectItem>
                        <SelectItem value="twitter">Twitter</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      🌍 Language
                    </Label>
                    <Select value={language} onValueChange={setLanguage}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="english">English</SelectItem>
                        <SelectItem value="spanish">Español</SelectItem>
                        <SelectItem value="french">Français</SelectItem>
                        <SelectItem value="german">Deutsch</SelectItem>
                        <SelectItem value="portuguese">Português</SelectItem>
                        <SelectItem value="italian">Italiano</SelectItem>
                        <SelectItem value="russian">Русский</SelectItem>
                        <SelectItem value="japanese">日本語</SelectItem>
                        <SelectItem value="korean">한국어</SelectItem>
                        <SelectItem value="chinese">中文</SelectItem>
                        <SelectItem value="arabic">العربية</SelectItem>
                        <SelectItem value="hindi">हिन्दी</SelectItem>
                        <SelectItem value="urdu">اردو</SelectItem>
                        <SelectItem value="turkish">Türkçe</SelectItem>
                        <SelectItem value="dutch">Nederlands</SelectItem>
                        <SelectItem value="polish">Polski</SelectItem>
                        <SelectItem value="vietnamese">Tiếng Việt</SelectItem>
                        <SelectItem value="thai">ไทย</SelectItem>
                        <SelectItem value="indonesian">Bahasa Indonesia</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      👤 Persona Style
                    </Label>
                    <Select value={persona} onValueChange={setPersona}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Persona</SelectItem>
                        <SelectItem value="mrbeast">MrBeast Style</SelectItem>
                        <SelectItem value="mkbhd">MKBHD Style</SelectItem>
                        <SelectItem value="veritasium">Veritasium Style</SelectItem>
                        <SelectItem value="pewdiepie">PewDiePie Style</SelectItem>
                        <SelectItem value="casey">Casey Neistat Style</SelectItem>
                        <SelectItem value="linus">Linus Tech Tips Style</SelectItem>
                        <SelectItem value="vsauce">Vsauce Style</SelectItem>
                        <SelectItem value="kurzgesagt">Kurzgesagt Style</SelectItem>
                        <SelectItem value="cocomelon">CoComelon Style</SelectItem>
                        <SelectItem value="dude_perfect">Dude Perfect Style</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                    <Label>Style</Label>
                    <Select value={style} onValueChange={setStyle}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="professional">Professional</SelectItem>
                        <SelectItem value="bold">Bold & Dramatic</SelectItem>
                        <SelectItem value="minimal">Minimal</SelectItem>
                        <SelectItem value="gaming">Gaming</SelectItem>
                        <SelectItem value="lifestyle">Lifestyle</SelectItem>
                        <SelectItem value="cinematic">Cinematic</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button 
                  onClick={handleGenerateThumbnail}
                  variant="mint"
                  className="w-full"
                  size="lg"
                  disabled={generating}
                >
                  {generating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Generate Thumbnail
                    </>
                  )}
                </Button>
              </div>

              {/* Preview */}
              <div className="glass rounded-2xl p-6">
                <h2 className="font-display text-xl font-semibold mb-4">Preview</h2>
                <div className="aspect-video rounded-xl bg-surface-2 border border-border overflow-hidden flex items-center justify-center">
                  {generating ? (
                    <div className="text-center">
                      <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
                      <p className="text-muted-foreground">Creating your thumbnail...</p>
                    </div>
                  ) : generatedImage ? (
                    <img 
                      src={generatedImage} 
                      alt="Generated thumbnail" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center text-muted-foreground">
                      <ImageIcon className="w-16 h-16 mx-auto mb-4 opacity-30" />
                      <p>Your thumbnail will appear here</p>
                    </div>
                  )}
                </div>
                
                {generatedImage && (
                  <div className="flex gap-2 mt-4">
                    <Button 
                      onClick={() => handleDownload(generatedImage)}
                      variant="outline"
                      className="flex-1"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                    <Button 
                      onClick={() => useImageForEdit(generatedImage)}
                      variant="outline"
                      className="flex-1"
                    >
                      <Palette className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* YouTube to Thumbnail */}
          <TabsContent value="youtube-gen" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="glass rounded-2xl p-6 space-y-4">
                <h2 className="font-display text-xl font-semibold flex items-center gap-2">
                  <Link2 className="w-5 h-5 text-primary" />
                  Generate from YouTube Link
                </h2>
                <p className="text-sm text-muted-foreground">
                  Paste any YouTube URL and we'll analyze the current thumbnail, then generate an improved version with matching titles.
                </p>

                <div className="space-y-2">
                  <Label>YouTube Video URL</Label>
                  <Input
                    placeholder="https://youtube.com/watch?v=... or https://youtu.be/..."
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Style</Label>
                  <Select value={style} onValueChange={setStyle}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="bold">Bold & Dramatic</SelectItem>
                      <SelectItem value="minimal">Minimal</SelectItem>
                      <SelectItem value="gaming">Gaming</SelectItem>
                      <SelectItem value="cinematic">Cinematic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  onClick={handleGenerateFromYouTube}
                  variant="mint"
                  className="w-full"
                  size="lg"
                  disabled={generatingFromYT}
                >
                  {generatingFromYT ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Analyzing & Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Generate Better Thumbnail
                    </>
                  )}
                </Button>
              </div>

              {/* Results */}
              <div className="space-y-4">
                {ytResult && (
                  <>
                    {/* Before/After */}
                    <div className="glass rounded-2xl p-6">
                      <h3 className="font-display text-lg font-semibold mb-4">Before & After</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground mb-2">Original</p>
                          <div className="aspect-video rounded-lg overflow-hidden bg-surface-2">
                            <img src={ytResult.originalThumbnail} alt="Original" className="w-full h-full object-cover" />
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-2">AI Generated</p>
                          <div className="aspect-video rounded-lg overflow-hidden bg-surface-2">
                            {ytResult.generatedThumbnail ? (
                              <img src={ytResult.generatedThumbnail} alt="Generated" className="w-full h-full object-cover" />
                            ) : (
                              <div className="flex items-center justify-center h-full text-muted-foreground">
                                No image generated
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      {ytResult.generatedThumbnail && (
                        <div className="flex gap-2 mt-4">
                          <Button 
                            onClick={() => handleDownload(ytResult.generatedThumbnail)}
                            variant="outline"
                            className="flex-1"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Download New
                          </Button>
                          <Button 
                            onClick={() => useImageForEdit(ytResult.generatedThumbnail)}
                            variant="outline"
                            className="flex-1"
                          >
                            <Palette className="w-4 h-4 mr-2" />
                            Edit
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Analysis */}
                    {ytResult.analysis && (
                      <div className="glass rounded-2xl p-6">
                        <h3 className="font-display text-lg font-semibold mb-3">Video Analysis</h3>
                        <p className="text-sm"><strong>Topic:</strong> {ytResult.analysis.videoTopic}</p>
                        {ytResult.analysis.improvedConcept && (
                          <p className="text-sm mt-2"><strong>Improvement:</strong> {ytResult.analysis.improvedConcept}</p>
                        )}
                      </div>
                    )}

                    {/* Generated Titles */}
                    {ytResult.titles && ytResult.titles.length > 0 && (
                      <div className="glass rounded-2xl p-6">
                        <h3 className="font-display text-lg font-semibold mb-3">Suggested Titles</h3>
                        <div className="space-y-2">
                          {ytResult.titles.map((item: any, i: number) => (
                            <div key={i} className="p-3 rounded-lg bg-surface-2 flex items-center justify-between group">
                              <div>
                                <p className="text-sm font-medium">{item.title}</p>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                  item.estimatedCTR === 'high' ? 'bg-green-500/20 text-green-400' :
                                  item.estimatedCTR === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                                  'bg-muted text-muted-foreground'
                                }`}>
                                  {item.estimatedCTR} CTR
                                </span>
                              </div>
                              <Button size="sm" variant="ghost" onClick={() => handleCopyTitle(item.title)}>
                                <Copy className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {!ytResult && !generatingFromYT && (
                  <div className="glass rounded-2xl p-6 text-center">
                    <Youtube className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-30" />
                    <p className="text-muted-foreground">Enter a YouTube URL to generate an improved thumbnail</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Title Generation */}
          <TabsContent value="titles" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="glass rounded-2xl p-6 space-y-4">
                <h2 className="font-display text-xl font-semibold flex items-center gap-2">
                  <Wand2 className="w-5 h-5 text-primary" />
                  Generate Titles
                </h2>

                <div className="space-y-2">
                  <Label>Video Topic</Label>
                  <Textarea
                    placeholder="A documentary about the 1998 F1 season and the rivalry between Schumacher and Hakkinen"
                    value={titleTopic}
                    onChange={(e) => setTitleTopic(e.target.value)}
                    className="min-h-[100px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Platform</Label>
                  <Select value={titlePlatform} onValueChange={setTitlePlatform}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="YouTube">YouTube</SelectItem>
                      <SelectItem value="TikTok">TikTok</SelectItem>
                      <SelectItem value="Instagram">Instagram</SelectItem>
                      <SelectItem value="Facebook">Facebook</SelectItem>
                      <SelectItem value="Twitter">Twitter</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  onClick={handleGenerateTitles}
                  variant="mint"
                  className="w-full"
                  size="lg"
                  disabled={generatingTitles}
                >
                  {generatingTitles ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4" />
                      Generate Titles
                    </>
                  )}
                </Button>
              </div>

              {/* Title Results */}
              <div className="glass rounded-2xl p-6">
                <h2 className="font-display text-xl font-semibold mb-4">Suggestions</h2>
                
                {generatingTitles ? (
                  <div className="text-center py-12">
                    <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-muted-foreground">Creating viral titles...</p>
                  </div>
                ) : generatedTitles.length > 0 ? (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {generatedTitles.map((item, index) => (
                      <div 
                        key={index}
                        className="p-4 rounded-xl bg-surface-2 border border-border hover:border-primary/50 transition-colors group"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <p className="font-medium">{item.title}</p>
                            <p className="text-xs text-muted-foreground mt-1">{item.reason}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full mt-2 inline-block ${
                              item.estimatedCTR === 'high' 
                                ? 'bg-green-500/20 text-green-400' 
                                : item.estimatedCTR === 'medium'
                                ? 'bg-yellow-500/20 text-yellow-400'
                                : 'bg-muted text-muted-foreground'
                            }`}>
                              {item.estimatedCTR} CTR
                            </span>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleCopyTitle(item.title)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Type className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p>Your titles will appear here</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Face Swap */}
          <TabsContent value="faceswap" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="glass rounded-2xl p-6 space-y-4">
                <h2 className="font-display text-xl font-semibold flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  AI Face Swap
                </h2>

                <div className="space-y-4">
                  {/* Source Image */}
                  <div className="space-y-2">
                    <Label>Source Image (Thumbnail)</Label>
                    <div 
                      className="border-2 border-dashed border-border rounded-xl p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => sourceInputRef.current?.click()}
                    >
                      {sourceImage ? (
                        <img src={sourceImage} alt="Source" className="max-h-32 mx-auto rounded-lg" />
                      ) : (
                        <>
                          <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">Click to upload thumbnail</p>
                        </>
                      )}
                    </div>
                    <input
                      ref={sourceInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageUpload(e, setSourceImage)}
                    />
                    <Input
                      placeholder="Or paste image URL"
                      value={sourceImage.startsWith('data:') ? '' : sourceImage}
                      onChange={(e) => setSourceImage(e.target.value)}
                    />
                  </div>

                  {/* Face Image */}
                  <div className="space-y-2">
                    <Label>Face Image (Your Face)</Label>
                    <div 
                      className="border-2 border-dashed border-border rounded-xl p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => faceInputRef.current?.click()}
                    >
                      {faceImage ? (
                        <img src={faceImage} alt="Face" className="max-h-32 mx-auto rounded-lg" />
                      ) : (
                        <>
                          <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">Click to upload face</p>
                        </>
                      )}
                    </div>
                    <input
                      ref={faceInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageUpload(e, setFaceImage)}
                    />
                    <Input
                      placeholder="Or paste image URL"
                      value={faceImage.startsWith('data:') ? '' : faceImage}
                      onChange={(e) => setFaceImage(e.target.value)}
                    />
                  </div>
                </div>

                <Button 
                  onClick={handleFaceSwap}
                  variant="mint"
                  className="w-full"
                  size="lg"
                  disabled={swapping || !sourceImage || !faceImage}
                >
                  {swapping ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Swapping Faces...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      Swap Faces
                    </>
                  )}
                </Button>
              </div>

              {/* Face Swap Result */}
              <div className="glass rounded-2xl p-6">
                <h2 className="font-display text-xl font-semibold mb-4">Result</h2>
                <div className="aspect-video rounded-xl bg-surface-2 border border-border overflow-hidden flex items-center justify-center">
                  {swapping ? (
                    <div className="text-center">
                      <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
                      <p className="text-muted-foreground">Processing face swap...</p>
                      <p className="text-xs text-muted-foreground mt-1">This may take up to 60 seconds</p>
                    </div>
                  ) : swappedImage ? (
                    <img 
                      src={swappedImage} 
                      alt="Face swapped result" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center text-muted-foreground">
                      <Users className="w-16 h-16 mx-auto mb-4 opacity-30" />
                      <p>Your result will appear here</p>
                    </div>
                  )}
                </div>
                
                {swappedImage && (
                  <div className="flex gap-2 mt-4">
                    <Button 
                      onClick={() => handleDownload(swappedImage, 'faceswap-result.png')}
                      variant="outline"
                      className="flex-1"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                    <Button 
                      onClick={() => useImageForEdit(swappedImage)}
                      variant="outline"
                      className="flex-1"
                    >
                      <Palette className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Edit Thumbnail */}
          <TabsContent value="edit" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="glass rounded-2xl p-6 space-y-4">
                <h2 className="font-display text-xl font-semibold flex items-center gap-2">
                  <Palette className="w-5 h-5 text-primary" />
                  Edit Thumbnail
                </h2>

                <div className="space-y-2">
                  <Label>Image to Edit</Label>
                  <div 
                    className="border-2 border-dashed border-border rounded-xl p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => editInputRef.current?.click()}
                  >
                    {editImageUrl ? (
                      <img src={editImageUrl} alt="To edit" className="max-h-32 mx-auto rounded-lg" />
                    ) : (
                      <>
                        <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Click to upload or use generated image</p>
                      </>
                    )}
                  </div>
                  <input
                    ref={editInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleImageUpload(e, setEditImageUrl)}
                  />
                  <Input
                    placeholder="Or paste image URL"
                    value={editImageUrl.startsWith('data:') ? '' : editImageUrl}
                    onChange={(e) => setEditImageUrl(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Edit Type</Label>
                  <Select value={editType} onValueChange={setEditType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="enhance">Enhance & Improve</SelectItem>
                      <SelectItem value="text_overlay">Add Text Overlay</SelectItem>
                      <SelectItem value="background_change">Change Background</SelectItem>
                      <SelectItem value="style_transfer">Apply Style</SelectItem>
                      <SelectItem value="color_grade">Color Grading</SelectItem>
                      <SelectItem value="remove_background">Remove Background</SelectItem>
                      <SelectItem value="add_effects">Add Effects</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Edit Instructions (Optional)</Label>
                  <Textarea
                    placeholder="Describe what changes you want..."
                    value={editPrompt}
                    onChange={(e) => setEditPrompt(e.target.value)}
                    className="min-h-[80px]"
                  />
                </div>

                <Button 
                  onClick={handleEditThumbnail}
                  variant="mint"
                  className="w-full"
                  size="lg"
                  disabled={editing || !editImageUrl}
                >
                  {editing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Editing...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4" />
                      Apply Edits
                    </>
                  )}
                </Button>
              </div>

              {/* Edit Result */}
              <div className="glass rounded-2xl p-6">
                <h2 className="font-display text-xl font-semibold mb-4">Edited Result</h2>
                <div className="aspect-video rounded-xl bg-surface-2 border border-border overflow-hidden flex items-center justify-center">
                  {editing ? (
                    <div className="text-center">
                      <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
                      <p className="text-muted-foreground">Applying edits...</p>
                    </div>
                  ) : editedImage ? (
                    <img 
                      src={editedImage} 
                      alt="Edited thumbnail" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center text-muted-foreground">
                      <Palette className="w-16 h-16 mx-auto mb-4 opacity-30" />
                      <p>Your edited image will appear here</p>
                    </div>
                  )}
                </div>
                
                {editedImage && (
                  <div className="flex gap-2 mt-4">
                    <Button 
                      onClick={() => handleDownload(editedImage, 'edited-thumbnail.png')}
                      variant="outline"
                      className="flex-1"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                    <Button 
                      onClick={() => {
                        setEditImageUrl(editedImage);
                        setEditedImage(null);
                      }}
                      variant="outline"
                      className="flex-1"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Edit Again
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* YouTube Analyzer */}
          <TabsContent value="analyze">
            <YouTubeAnalyzer 
              onUseForEdit={useImageForEdit}
              onGenerateImproved={(analysis) => {
                setYoutubeUrl(`https://youtube.com/watch?v=${analysis.videoId}`);
                setActiveTab('youtube-gen');
              }}
            />
          </TabsContent>

          {/* Thumbnail Scorer */}
          <TabsContent value="score">
            <ThumbnailScorer />
          </TabsContent>

          {/* A/B Tester */}
          <TabsContent value="abtest">
            <ABTester />
          </TabsContent>

          {/* History */}
          <TabsContent value="history" className="space-y-6">
            <div className="glass rounded-2xl p-6">
              <h2 className="font-display text-xl font-semibold mb-4 flex items-center gap-2">
                <History className="w-5 h-5 text-primary" />
                Generation History
              </h2>
              
              {loadingHistory ? (
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                </div>
              ) : generations.length > 0 ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {generations.map((gen) => (
                    <div key={gen.id} className="rounded-xl bg-surface-2 border border-border overflow-hidden group">
                      {gen.image_url ? (
                        <div className="aspect-video bg-surface-3">
                          <img 
                            src={gen.image_url} 
                            alt={gen.prompt || 'Generated'} 
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="aspect-video bg-surface-3 flex items-center justify-center">
                          <Type className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}
                      <div className="p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary capitalize">
                            {gen.generation_type}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(gen.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{gen.prompt}</p>
                        <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {gen.image_url && (
                            <>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => handleDownload(gen.image_url!)}
                              >
                                <Download className="w-3 h-3" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => useImageForEdit(gen.image_url!)}
                              >
                                <Palette className="w-3 h-3" />
                              </Button>
                            </>
                          )}
                          <Button 
                            size="sm" 
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDeleteGeneration(gen.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <History className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p>No generations yet. Start creating!</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
