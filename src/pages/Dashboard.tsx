import { useState, useEffect } from 'react';
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
  BarChart3,
  Trash2
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
  
  const [prompt, setPrompt] = useState('');
  const [platform, setPlatform] = useState('youtube');
  const [style, setStyle] = useState('professional');
  const [generating, setGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  
  const [titleTopic, setTitleTopic] = useState('');
  const [titlePlatform, setTitlePlatform] = useState('YouTube');
  const [generatingTitles, setGeneratingTitles] = useState(false);
  const [generatedTitles, setGeneratedTitles] = useState<any[]>([]);
  
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
        body: { prompt, platform, style }
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
        metadata: { style }
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

  const handleDownload = async (imageUrl: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `thumbforge-${Date.now()}.png`;
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

        <Tabs defaultValue="thumbnail" className="space-y-6">
          <TabsList className="glass p-1">
            <TabsTrigger value="thumbnail" className="gap-2">
              <ImageIcon className="w-4 h-4" />
              Thumbnail
            </TabsTrigger>
            <TabsTrigger value="titles" className="gap-2">
              <Type className="w-4 h-4" />
              Titles
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="w-4 h-4" />
              History
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
                      </SelectContent>
                    </Select>
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
                      onClick={() => {
                        navigator.clipboard.writeText(generatedImage);
                        toast.success('Image URL copied!');
                      }}
                      variant="outline"
                      className="flex-1"
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy URL
                    </Button>
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
                  <div className="space-y-3">
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
                            variant="ghost" 
                            size="icon"
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
                    <p>Title suggestions will appear here</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* History */}
          <TabsContent value="history">
            <div className="glass rounded-2xl p-6">
              <h2 className="font-display text-xl font-semibold mb-6 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                Generation History
              </h2>

              {loadingHistory ? (
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                </div>
              ) : generations.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <History className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p>No generations yet. Start creating!</p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {generations.map((gen) => (
                    <div 
                      key={gen.id}
                      className="rounded-xl bg-surface-2 border border-border overflow-hidden group"
                    >
                      {gen.generation_type === 'thumbnail' && gen.image_url ? (
                        <div className="aspect-video relative">
                          <img 
                            src={gen.image_url} 
                            alt={gen.prompt || 'Generated thumbnail'}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <Button 
                              size="icon" 
                              variant="ghost"
                              onClick={() => handleDownload(gen.image_url!)}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="icon" 
                              variant="ghost"
                              onClick={() => handleDeleteGeneration(gen.id)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="aspect-video bg-surface-3 flex items-center justify-center">
                          <Type className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}
                      <div className="p-3">
                        <p className="text-sm line-clamp-2">{gen.prompt}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-muted-foreground capitalize">
                            {gen.generation_type}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(gen.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
