import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { 
  Youtube, 
  Loader2, 
  Download, 
  Sparkles, 
  TrendingUp,
  Target,
  Palette,
  Type
} from 'lucide-react';

interface YouTubeAnalysis {
  videoId: string;
  thumbnails: Record<string, string>;
  bestThumbnail: string;
  analysis: {
    score: number;
    colorAnalysis: { dominantColors: string[]; contrastLevel: string };
    textAnalysis: { hasText: boolean; readability: string };
    faceAnalysis: { faceCount: number; expressions: string[] };
    composition: { ruleOfThirds: boolean; focalPoints: string[] };
    ctrPrediction: string;
    improvements: string[];
  } | null;
}

interface YouTubeAnalyzerProps {
  onUseForEdit: (imageUrl: string) => void;
  onGenerateImproved: (analysis: YouTubeAnalysis) => void;
}

export function YouTubeAnalyzer({ onUseForEdit, onGenerateImproved }: YouTubeAnalyzerProps) {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<YouTubeAnalysis | null>(null);

  const handleAnalyze = async () => {
    if (!youtubeUrl.trim()) {
      toast.error('Please enter a YouTube URL');
      return;
    }

    setAnalyzing(true);
    setAnalysis(null);

    try {
      const { data, error } = await supabase.functions.invoke('analyze-youtube', {
        body: { youtubeUrl }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setAnalysis(data);
      toast.success('Analysis complete!');
    } catch (error) {
      console.error('Error analyzing YouTube:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to analyze');
    } finally {
      setAnalyzing(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const getCTRColor = (ctr: string) => {
    if (ctr === 'high') return 'bg-green-500/20 text-green-400';
    if (ctr === 'medium') return 'bg-yellow-500/20 text-yellow-400';
    return 'bg-red-500/20 text-red-400';
  };

  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl p-6 space-y-4">
        <h2 className="font-display text-xl font-semibold flex items-center gap-2">
          <Youtube className="w-5 h-5 text-red-500" />
          YouTube Thumbnail Analyzer
        </h2>
        <p className="text-sm text-muted-foreground">
          Paste any YouTube video URL to analyze its thumbnail and get AI-powered improvement suggestions
        </p>

        <div className="space-y-2">
          <Label>YouTube Video URL</Label>
          <Input
            placeholder="https://youtube.com/watch?v=... or https://youtu.be/..."
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
          />
        </div>

        <Button 
          onClick={handleAnalyze}
          variant="mint"
          className="w-full"
          size="lg"
          disabled={analyzing}
        >
          {analyzing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Target className="w-4 h-4" />
              Analyze Thumbnail
            </>
          )}
        </Button>
      </div>

      {analysis && (
        <div className="space-y-4">
          {/* Thumbnail Preview */}
          <div className="glass rounded-2xl p-6">
            <h3 className="font-display text-lg font-semibold mb-4">Current Thumbnail</h3>
            <div className="aspect-video rounded-xl overflow-hidden bg-surface-2">
              <img 
                src={analysis.bestThumbnail} 
                alt="YouTube thumbnail" 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex gap-2 mt-4">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => onUseForEdit(analysis.bestThumbnail)}
              >
                <Palette className="w-4 h-4 mr-2" />
                Edit This
              </Button>
              <Button 
                variant="mint" 
                className="flex-1"
                onClick={() => onGenerateImproved(analysis)}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Better
              </Button>
            </div>
          </div>

          {/* Analysis Results */}
          {analysis.analysis && (
            <div className="glass rounded-2xl p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-semibold">AI Analysis</h3>
                <div className="flex items-center gap-3">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Score</p>
                    <p className={`text-3xl font-bold ${getScoreColor(analysis.analysis.score)}`}>
                      {analysis.analysis.score}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getCTRColor(analysis.analysis.ctrPrediction)}`}>
                    {analysis.analysis.ctrPrediction.toUpperCase()} CTR
                  </span>
                </div>
              </div>

              {/* Color Analysis */}
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <Palette className="w-4 h-4 text-primary" />
                  Color Analysis
                </h4>
                <div className="flex flex-wrap gap-2">
                  {analysis.analysis.colorAnalysis.dominantColors.map((color, i) => (
                    <span key={i} className="px-3 py-1 rounded-full bg-surface-2 text-sm">
                      {color}
                    </span>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  Contrast: <span className="text-foreground capitalize">{analysis.analysis.colorAnalysis.contrastLevel}</span>
                </p>
              </div>

              {/* Text Analysis */}
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <Type className="w-4 h-4 text-primary" />
                  Text Analysis
                </h4>
                <p className="text-sm text-muted-foreground">
                  {analysis.analysis.textAnalysis.hasText 
                    ? `Text detected with ${analysis.analysis.textAnalysis.readability} readability`
                    : 'No text detected in thumbnail'
                  }
                </p>
              </div>

              {/* Face Analysis */}
              {analysis.analysis.faceAnalysis.faceCount > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Face Detection</h4>
                  <p className="text-sm text-muted-foreground">
                    {analysis.analysis.faceAnalysis.faceCount} face(s) detected
                    {analysis.analysis.faceAnalysis.expressions.length > 0 && 
                      `: ${analysis.analysis.faceAnalysis.expressions.join(', ')}`
                    }
                  </p>
                </div>
              )}

              {/* Improvements */}
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  Suggested Improvements
                </h4>
                <div className="space-y-2">
                  {analysis.analysis.improvements.map((improvement, i) => (
                    <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-surface-2">
                      <span className="text-primary font-bold">{i + 1}.</span>
                      <p className="text-sm">{improvement}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
