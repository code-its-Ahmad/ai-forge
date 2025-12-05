import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { 
  Youtube, 
  Loader2, 
  Download, 
  Sparkles, 
  TrendingUp,
  Target,
  Palette,
  Type,
  Copy,
  RefreshCw,
  CheckCircle2,
  Image as ImageIcon,
  Zap,
  Star,
  Eye,
  Bell,
  ThumbsUp,
  Users,
  Clock,
  Hash,
  Flame
} from 'lucide-react';

interface YouTubeToThumbnailProps {
  onUseForEdit: (imageUrl: string) => void;
  userId: string;
  onRefreshProfile: () => Promise<void>;
  onFetchGenerations: () => Promise<void>;
}

interface GenerationResult {
  videoId: string;
  originalThumbnail: string;
  generatedThumbnails: string[];
  analysis: {
    videoTopic: string;
    visualElements: string[];
    emotions: string[];
    improvedConcept: string;
    suggestedText: string;
    targetAudience: string;
    contentType: string;
  } | null;
  titles: {
    title: string;
    reason: string;
    estimatedCTR: string;
    hook: string;
    emotion: string;
  }[] | null;
}

// All available styles
const STYLES = [
  { value: 'professional', label: 'Professional', icon: '💼', description: 'Clean, polished look' },
  { value: 'bold', label: 'Bold & Dramatic', icon: '🔥', description: 'High contrast, attention-grabbing' },
  { value: 'minimal', label: 'Minimal', icon: '✨', description: 'Simple, elegant design' },
  { value: 'gaming', label: 'Gaming', icon: '🎮', description: 'Energetic, vibrant colors' },
  { value: 'cinematic', label: 'Cinematic', icon: '🎬', description: 'Movie poster style' },
  { value: 'viral', label: 'Viral', icon: '📈', description: 'Maximum click appeal' },
  { value: 'educational', label: 'Educational', icon: '📚', description: 'Clear, informative' },
  { value: 'vlog', label: 'Vlog', icon: '📹', description: 'Personal, authentic feel' },
  { value: 'documentary', label: 'Documentary', icon: '🎥', description: 'Serious, professional tone' },
  { value: 'comedy', label: 'Comedy', icon: '😂', description: 'Fun, playful design' },
];

// Creator personas
const PERSONAS = [
  { value: 'none', label: 'No Persona', icon: '🎯' },
  { value: 'mrbeast', label: 'MrBeast Style', icon: '💰' },
  { value: 'mkbhd', label: 'MKBHD Style', icon: '📱' },
  { value: 'veritasium', label: 'Veritasium Style', icon: '🔬' },
  { value: 'pewdiepie', label: 'PewDiePie Style', icon: '👊' },
  { value: 'casey', label: 'Casey Neistat', icon: '🎬' },
  { value: 'linus', label: 'Linus Tech Tips', icon: '💻' },
  { value: 'vsauce', label: 'Vsauce Style', icon: '🧠' },
  { value: 'kurzgesagt', label: 'Kurzgesagt Style', icon: '🌌' },
  { value: 'cocomelon', label: 'CoComelon Style', icon: '👶' },
  { value: 'dude_perfect', label: 'Dude Perfect', icon: '🏀' },
  { value: 'marques', label: 'Marques Brownlee', icon: '🎧' },
  { value: 'graham_stephan', label: 'Graham Stephan', icon: '💵' },
  { value: 'ali_abdaal', label: 'Ali Abdaal', icon: '📝' },
];

// Platform overlays
const PLATFORM_OVERLAYS = {
  youtube: [
    { id: 'subscribe', label: 'Subscribe Button', icon: Bell },
    { id: 'views', label: 'Views Counter', icon: Eye },
    { id: 'like', label: 'Like Button', icon: ThumbsUp },
    { id: 'duration', label: 'Video Duration', icon: Clock },
  ],
  instagram: [
    { id: 'heart', label: 'Heart Icon', icon: ThumbsUp },
    { id: 'followers', label: 'Followers', icon: Users },
  ],
  tiktok: [
    { id: 'likes', label: 'Likes', icon: ThumbsUp },
    { id: 'comments', label: 'Comments', icon: Hash },
  ],
};

export function YouTubeToThumbnail({ 
  onUseForEdit, 
  userId, 
  onRefreshProfile, 
  onFetchGenerations 
}: YouTubeToThumbnailProps) {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [style, setStyle] = useState('viral');
  const [persona, setPersona] = useState('none');
  const [platform, setPlatform] = useState('youtube');
  const [selectedOverlays, setSelectedOverlays] = useState<string[]>(['subscribe']);
  const [generateMultiple, setGenerateMultiple] = useState(true);
  const [generateTitles, setGenerateTitles] = useState(true);
  const [preserveOriginal, setPreserveOriginal] = useState(true);
  
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [selectedThumbnail, setSelectedThumbnail] = useState<number>(0);
  const [selectedTitle, setSelectedTitle] = useState<number | null>(null);

  const toggleOverlay = (overlayId: string) => {
    setSelectedOverlays(prev => 
      prev.includes(overlayId) 
        ? prev.filter(id => id !== overlayId)
        : [...prev, overlayId]
    );
  };

  const handleGenerate = async () => {
    if (!youtubeUrl.trim()) {
      toast.error('Please enter a YouTube URL');
      return;
    }

    setGenerating(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('generate-from-youtube', {
        body: { 
          youtubeUrl,
          style,
          persona,
          platform,
          overlays: selectedOverlays,
          generateMultiple,
          generateTitles,
          preserveOriginal
        }
      });

      // Handle edge function errors properly
      if (error) {
        // Extract error details from FunctionsHttpError
        const errorBody = error.context?.body ? JSON.parse(error.context.body) : null;
        const statusCode = error.context?.status || (error as any).status;
        const errorMessage = errorBody?.error || error.message || 'Unknown error';
        
        if (statusCode === 402 || errorMessage.toLowerCase().includes('usage limit') || errorMessage.toLowerCase().includes('credit')) {
          toast.error('You\'ve run out of AI credits. Please add more credits in Settings → Workspace → Usage to continue generating.', {
            duration: 8000,
          });
          return;
        } else if (statusCode === 429 || errorMessage.toLowerCase().includes('rate limit')) {
          toast.error('Too many requests. Please wait a moment and try again.', { duration: 5000 });
          return;
        } else {
          toast.error(errorMessage || 'Failed to generate thumbnail. Please try again.');
          return;
        }
      }
      
      // Handle error in response body
      if (data?.error) {
        const errorMsg = data.error.toLowerCase();
        if (errorMsg.includes('usage limit') || errorMsg.includes('credit') || errorMsg.includes('payment')) {
          toast.error('You\'ve run out of AI credits. Please add more credits in Settings → Workspace → Usage to continue generating.', {
            duration: 8000,
          });
          return;
        }
        toast.error(data.error);
        return;
      }

      setResult(data);
      setSelectedThumbnail(0);

      // Save to database
      if (data.generatedThumbnails && data.generatedThumbnails.length > 0) {
        await supabase.from('generations').insert({
          user_id: userId,
          generation_type: 'thumbnail',
          prompt: `YouTube → Thumb: ${youtubeUrl}`,
          image_url: data.generatedThumbnails[0],
          platform: 'youtube',
          title_suggestions: data.titles,
          metadata: { 
            videoId: data.videoId, 
            analysis: data.analysis,
            style,
            persona,
            allThumbnails: data.generatedThumbnails
          }
        });

        await supabase.rpc('increment_usage', { user_uuid: userId });
        await onRefreshProfile();
        await onFetchGenerations();
      }

      toast.success('Thumbnails generated successfully!');
    } catch (error: any) {
      console.error('Error generating from YouTube:', error);
      toast.error(error?.message || 'Failed to generate thumbnail. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleRegenerate = async () => {
    if (!result) return;
    await handleGenerate();
  };

  const handleDownload = async (imageUrl: string, filename?: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || `youtube-thumb-${Date.now()}.png`;
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

  const getCTRColor = (ctr: string) => {
    if (ctr === 'high') return 'bg-green-500/20 text-green-400 border-green-500/30';
    if (ctr === 'medium') return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    return 'bg-red-500/20 text-red-400 border-red-500/30';
  };

  const getEmotionIcon = (emotion: string) => {
    const icons: Record<string, string> = {
      curiosity: '🤔',
      excitement: '🔥',
      shock: '😱',
      joy: '😊',
      intrigue: '🧐',
      urgency: '⚡',
      fomo: '😰',
      inspiration: '✨',
    };
    return icons[emotion.toLowerCase()] || '📌';
  };

  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Configuration Panel */}
        <div className="space-y-4">
          <div className="glass rounded-2xl p-6 space-y-4">
            <h2 className="font-display text-xl font-semibold flex items-center gap-2">
              <Youtube className="w-5 h-5 text-red-500" />
              YouTube → Better Thumbnail
            </h2>
            <p className="text-sm text-muted-foreground">
              Paste a YouTube URL to analyze the thumbnail and generate improved versions with AI.
            </p>

            {/* URL Input */}
            <div className="space-y-2">
              <Label>YouTube Video URL</Label>
              <Input
                placeholder="https://youtube.com/watch?v=... or https://youtu.be/..."
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                className="font-mono text-sm"
              />
            </div>

            {/* Style Selection */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Palette className="w-4 h-4" />
                Thumbnail Style
              </Label>
              <Select value={style} onValueChange={setStyle}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STYLES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      <span className="flex items-center gap-2">
                        <span>{s.icon}</span>
                        <span>{s.label}</span>
                        <span className="text-xs text-muted-foreground">- {s.description}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Persona Selection */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Creator Persona
              </Label>
              <Select value={persona} onValueChange={setPersona}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERSONAS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      <span className="flex items-center gap-2">
                        <span>{p.icon}</span>
                        <span>{p.label}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Platform */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Target className="w-4 h-4" />
                Target Platform
              </Label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="youtube">YouTube</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="tiktok">TikTok</SelectItem>
                  <SelectItem value="twitter">Twitter/X</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Platform Overlays */}
            {platform === 'youtube' && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  YouTube Overlays
                </Label>
                <div className="flex flex-wrap gap-2">
                  {PLATFORM_OVERLAYS.youtube.map((overlay) => (
                    <button
                      key={overlay.id}
                      onClick={() => toggleOverlay(overlay.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
                        selectedOverlays.includes(overlay.id)
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-surface-2 text-muted-foreground hover:border-primary/50'
                      }`}
                    >
                      <overlay.icon className="w-4 h-4" />
                      {overlay.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Options */}
            <div className="space-y-3 pt-2 border-t border-border">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="multiple" 
                  checked={generateMultiple} 
                  onCheckedChange={(checked) => setGenerateMultiple(checked as boolean)}
                />
                <label htmlFor="multiple" className="text-sm cursor-pointer">
                  Generate multiple variations (3 thumbnails)
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="titles" 
                  checked={generateTitles} 
                  onCheckedChange={(checked) => setGenerateTitles(checked as boolean)}
                />
                <label htmlFor="titles" className="text-sm cursor-pointer">
                  Generate viral title suggestions
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="preserve" 
                  checked={preserveOriginal} 
                  onCheckedChange={(checked) => setPreserveOriginal(checked as boolean)}
                />
                <label htmlFor="preserve" className="text-sm cursor-pointer">
                  Preserve original thumbnail elements
                </label>
              </div>
            </div>

            {/* Generate Button */}
            <Button 
              onClick={handleGenerate}
              variant="mint"
              className="w-full"
              size="lg"
              disabled={generating}
            >
              {generating ? (
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
        </div>

        {/* Results Panel */}
        <div className="space-y-4">
          {generating && (
            <div className="glass rounded-2xl p-12 text-center">
              <Loader2 className="w-16 h-16 animate-spin text-primary mx-auto mb-4" />
              <h3 className="font-display text-lg font-semibold mb-2">Creating Your Thumbnails</h3>
              <p className="text-sm text-muted-foreground">
                Analyzing video content and generating {generateMultiple ? 'multiple variations' : 'thumbnail'}...
              </p>
              <div className="mt-4 space-y-2 text-xs text-muted-foreground">
                <p>✓ Extracting video metadata</p>
                <p>✓ Analyzing original thumbnail</p>
                <p>⏳ Generating improved versions...</p>
              </div>
            </div>
          )}

          {result && !generating && (
            <>
              {/* Original vs Generated Comparison */}
              <div className="glass rounded-2xl p-6">
                <h3 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
                  <Eye className="w-5 h-5 text-primary" />
                  Original Thumbnail
                </h3>
                <div className="aspect-video rounded-xl overflow-hidden bg-surface-2 border border-border">
                  <img 
                    src={result.originalThumbnail} 
                    alt="Original thumbnail" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex gap-2 mt-3">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleDownload(result.originalThumbnail, 'original-thumbnail.png')}
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Download Original
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => onUseForEdit(result.originalThumbnail)}
                  >
                    <Palette className="w-4 h-4 mr-1" />
                    Edit Original
                  </Button>
                </div>
              </div>

              {/* Generated Thumbnails */}
              <div className="glass rounded-2xl p-6">
                <h3 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  AI Generated Thumbnails
                </h3>
                
                {result.generatedThumbnails && result.generatedThumbnails.length > 0 ? (
                  <>
                    {/* Main Selected Thumbnail */}
                    <div className="aspect-video rounded-xl overflow-hidden bg-surface-2 border-2 border-primary mb-4">
                      <img 
                        src={result.generatedThumbnails[selectedThumbnail]} 
                        alt={`Generated thumbnail ${selectedThumbnail + 1}`} 
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Thumbnail Variations */}
                    {result.generatedThumbnails.length > 1 && (
                      <div className="grid grid-cols-3 gap-2 mb-4">
                        {result.generatedThumbnails.map((thumb, index) => (
                          <button
                            key={index}
                            onClick={() => setSelectedThumbnail(index)}
                            className={`aspect-video rounded-lg overflow-hidden border-2 transition-all ${
                              selectedThumbnail === index 
                                ? 'border-primary ring-2 ring-primary/30' 
                                : 'border-border hover:border-primary/50'
                            }`}
                          >
                            <img 
                              src={thumb} 
                              alt={`Variation ${index + 1}`} 
                              className="w-full h-full object-cover"
                            />
                            {selectedThumbnail === index && (
                              <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                                <CheckCircle2 className="w-6 h-6 text-primary" />
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <Button 
                        variant="mint" 
                        className="flex-1"
                        onClick={() => handleDownload(result.generatedThumbnails[selectedThumbnail])}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download Selected
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => onUseForEdit(result.generatedThumbnails[selectedThumbnail])}
                      >
                        <Palette className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                      <Button variant="outline" onClick={handleRegenerate}>
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No thumbnails generated</p>
                  </div>
                )}
              </div>

              {/* Video Analysis */}
              {result.analysis && (
                <div className="glass rounded-2xl p-6">
                  <h3 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
                    <Target className="w-5 h-5 text-primary" />
                    Video Analysis
                  </h3>
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-surface-2">
                      <p className="text-xs text-muted-foreground mb-1">Topic</p>
                      <p className="font-medium">{result.analysis.videoTopic}</p>
                    </div>
                    {result.analysis.improvedConcept && (
                      <div className="p-3 rounded-lg bg-surface-2">
                        <p className="text-xs text-muted-foreground mb-1">AI Improvement Strategy</p>
                        <p className="text-sm">{result.analysis.improvedConcept}</p>
                      </div>
                    )}
                    {result.analysis.targetAudience && (
                      <div className="p-3 rounded-lg bg-surface-2">
                        <p className="text-xs text-muted-foreground mb-1">Target Audience</p>
                        <p className="text-sm">{result.analysis.targetAudience}</p>
                      </div>
                    )}
                    {result.analysis.visualElements && result.analysis.visualElements.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {result.analysis.visualElements.map((element, i) => (
                          <span key={i} className="px-2 py-1 rounded-full bg-primary/10 text-primary text-xs">
                            {element}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Generated Titles */}
              {result.titles && result.titles.length > 0 && (
                <div className="glass rounded-2xl p-6">
                  <h3 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
                    <Type className="w-5 h-5 text-primary" />
                    Viral Title Suggestions
                  </h3>
                  <div className="space-y-3">
                    {result.titles.map((item, i) => (
                      <div 
                        key={i}
                        onClick={() => setSelectedTitle(selectedTitle === i ? null : i)}
                        className={`p-4 rounded-xl cursor-pointer transition-all border ${
                          selectedTitle === i 
                            ? 'bg-primary/10 border-primary' 
                            : 'bg-surface-2 border-border hover:border-primary/50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-lg">{getEmotionIcon(item.emotion || 'curiosity')}</span>
                              <p className="font-medium">{item.title}</p>
                            </div>
                            {selectedTitle === i && (
                              <div className="mt-2 space-y-2 text-sm">
                                <p className="text-muted-foreground">{item.reason}</p>
                                {item.hook && (
                                  <p className="text-xs">
                                    <span className="text-primary">Hook:</span> {item.hook}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <span className={`text-xs px-2 py-1 rounded-full border ${getCTRColor(item.estimatedCTR)}`}>
                              {item.estimatedCTR.toUpperCase()} CTR
                            </span>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyTitle(item.title);
                              }}
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Empty State */}
          {!result && !generating && (
            <div className="glass rounded-2xl p-12 text-center">
              <Youtube className="w-20 h-20 mx-auto mb-6 text-red-500/30" />
              <h3 className="font-display text-xl font-semibold mb-2">Ready to Improve Your Thumbnails</h3>
              <p className="text-muted-foreground mb-6">
                Enter a YouTube URL to analyze the current thumbnail and generate AI-improved versions.
              </p>
              <div className="grid grid-cols-3 gap-4 text-center text-sm">
                <div className="p-4 rounded-xl bg-surface-2">
                  <Target className="w-6 h-6 mx-auto mb-2 text-primary" />
                  <p className="font-medium">Analyze</p>
                  <p className="text-xs text-muted-foreground">AI examines your thumbnail</p>
                </div>
                <div className="p-4 rounded-xl bg-surface-2">
                  <Sparkles className="w-6 h-6 mx-auto mb-2 text-primary" />
                  <p className="font-medium">Generate</p>
                  <p className="text-xs text-muted-foreground">Create better versions</p>
                </div>
                <div className="p-4 rounded-xl bg-surface-2">
                  <TrendingUp className="w-6 h-6 mx-auto mb-2 text-primary" />
                  <p className="font-medium">Optimize</p>
                  <p className="text-xs text-muted-foreground">Maximize your CTR</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
