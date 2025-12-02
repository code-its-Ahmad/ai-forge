import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { 
  BarChart3, 
  Loader2, 
  Upload,
  Trophy,
  Target,
  Zap,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';

interface ScoreResult {
  totalScore: number;
  grade: string;
  ctrPrediction: { low: number; expected: number; high: number };
  categories: {
    visualImpact: { score: number; feedback: string };
    emotionalAppeal: { score: number; feedback: string };
    clarityReadability: { score: number; feedback: string };
    brandConsistency: { score: number; feedback: string };
    platformOptimization: { score: number; feedback: string };
  };
  strengths: string[];
  weaknesses: string[];
  actionableImprovements: Array<{
    priority: string;
    suggestion: string;
    expectedImpact: string;
  }>;
  competitorComparison: string;
}

interface ThumbnailScorerProps {
  initialImage?: string;
}

export function ThumbnailScorer({ initialImage }: ThumbnailScorerProps) {
  const [imageUrl, setImageUrl] = useState(initialImage || '');
  const [niche, setNiche] = useState('general');
  const [scoring, setScoring] = useState(false);
  const [result, setResult] = useState<ScoreResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setImageUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleScore = async () => {
    if (!imageUrl) {
      toast.error('Please upload or provide an image');
      return;
    }

    setScoring(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('score-thumbnail', {
        body: { imageUrl, niche }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setResult(data);
      toast.success('Scoring complete!');
    } catch (error) {
      console.error('Error scoring thumbnail:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to score');
    } finally {
      setScoring(false);
    }
  };

  const getGradeColor = (grade: string) => {
    const colors: Record<string, string> = {
      'S': 'from-purple-500 to-pink-500',
      'A': 'from-green-500 to-emerald-500',
      'B': 'from-blue-500 to-cyan-500',
      'C': 'from-yellow-500 to-orange-500',
      'D': 'from-orange-500 to-red-500',
      'F': 'from-red-500 to-red-700',
    };
    return colors[grade] || colors['C'];
  };

  const getPriorityColor = (priority: string) => {
    if (priority === 'high') return 'border-red-500 bg-red-500/10';
    if (priority === 'medium') return 'border-yellow-500 bg-yellow-500/10';
    return 'border-green-500 bg-green-500/10';
  };

  const getCategoryScore = (score: number) => {
    const percentage = Math.round(score);
    return {
      width: `${percentage}%`,
      color: score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-yellow-500' : score >= 40 ? 'bg-orange-500' : 'bg-red-500'
    };
  };

  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl p-6 space-y-4">
        <h2 className="font-display text-xl font-semibold flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          AI Thumbnail Scorer
        </h2>
        <p className="text-sm text-muted-foreground">
          Get a detailed CTR score and actionable improvements for any thumbnail
        </p>

        <div className="space-y-2">
          <Label>Upload Thumbnail</Label>
          <div 
            className="border-2 border-dashed border-border rounded-xl p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => inputRef.current?.click()}
          >
            {imageUrl ? (
              <img src={imageUrl} alt="To score" className="max-h-32 mx-auto rounded-lg" />
            ) : (
              <>
                <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Click to upload thumbnail</p>
              </>
            )}
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />
          <Input
            placeholder="Or paste image URL"
            value={imageUrl.startsWith('data:') ? '' : imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Content Niche</Label>
          <Select value={niche} onValueChange={setNiche}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="general">General</SelectItem>
              <SelectItem value="gaming">Gaming</SelectItem>
              <SelectItem value="tech">Tech / Reviews</SelectItem>
              <SelectItem value="vlog">Vlog / Lifestyle</SelectItem>
              <SelectItem value="education">Education</SelectItem>
              <SelectItem value="entertainment">Entertainment</SelectItem>
              <SelectItem value="music">Music</SelectItem>
              <SelectItem value="sports">Sports</SelectItem>
              <SelectItem value="business">Business / Finance</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button 
          onClick={handleScore}
          variant="mint"
          className="w-full"
          size="lg"
          disabled={scoring || !imageUrl}
        >
          {scoring ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Trophy className="w-4 h-4" />
              Get Score & Feedback
            </>
          )}
        </Button>
      </div>

      {result && (
        <div className="space-y-4">
          {/* Score Overview */}
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-display text-lg font-semibold">Overall Score</h3>
                <p className="text-sm text-muted-foreground">Based on {niche} niche benchmarks</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-4xl font-bold text-primary">{result.totalScore}</p>
                  <p className="text-xs text-muted-foreground">out of 100</p>
                </div>
                <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${getGradeColor(result.grade)} flex items-center justify-center`}>
                  <span className="text-2xl font-bold text-white">{result.grade}</span>
                </div>
              </div>
            </div>

            {/* CTR Prediction */}
            <div className="p-4 rounded-xl bg-surface-2 mb-6">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" />
                Predicted CTR Range
              </h4>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Low</span>
                <span className="text-muted-foreground">Expected</span>
                <span className="text-muted-foreground">High</span>
              </div>
              <div className="flex items-center justify-between font-bold text-lg">
                <span className="text-red-400">{result.ctrPrediction.low}%</span>
                <span className="text-yellow-400">{result.ctrPrediction.expected}%</span>
                <span className="text-green-400">{result.ctrPrediction.high}%</span>
              </div>
            </div>

            {/* Category Scores */}
            <div className="space-y-4">
              <h4 className="font-medium">Category Breakdown</h4>
              {Object.entries(result.categories).map(([key, value]) => {
                const scoreStyle = getCategoryScore(value.score);
                const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                return (
                  <div key={key} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{formattedKey}</span>
                      <span className="font-medium">{Math.round(value.score)}/100</span>
                    </div>
                    <div className="h-2 bg-surface-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${scoreStyle.color} rounded-full transition-all`}
                        style={{ width: scoreStyle.width }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">{value.feedback}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Strengths & Weaknesses */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="glass rounded-2xl p-6">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                Strengths
              </h4>
              <ul className="space-y-2">
                {result.strengths.map((strength, i) => (
                  <li key={i} className="text-sm flex items-start gap-2">
                    <span className="text-green-500 mt-1">✓</span>
                    {strength}
                  </li>
                ))}
              </ul>
            </div>
            <div className="glass rounded-2xl p-6">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-500" />
                Areas to Improve
              </h4>
              <ul className="space-y-2">
                {result.weaknesses.map((weakness, i) => (
                  <li key={i} className="text-sm flex items-start gap-2">
                    <span className="text-yellow-500 mt-1">!</span>
                    {weakness}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Actionable Improvements */}
          <div className="glass rounded-2xl p-6">
            <h4 className="font-medium mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              Action Items
            </h4>
            <div className="space-y-3">
              {result.actionableImprovements.map((item, i) => (
                <div 
                  key={i} 
                  className={`p-4 rounded-xl border ${getPriorityColor(item.priority)}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium uppercase">{item.priority} priority</span>
                    <span className="text-xs text-muted-foreground">{item.expectedImpact}</span>
                  </div>
                  <p className="text-sm">{item.suggestion}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Competitor Comparison */}
          <div className="glass rounded-2xl p-6">
            <h4 className="font-medium mb-3">Competitor Comparison</h4>
            <p className="text-sm text-muted-foreground">{result.competitorComparison}</p>
          </div>
        </div>
      )}
    </div>
  );
}
