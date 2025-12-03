import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { useTensorFlow } from '@/hooks/useTensorFlow';
import { 
  BarChart3, 
  Loader2, 
  Upload,
  Target,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Sparkles,
  Brain,
  Cpu
} from 'lucide-react';

interface ScoreResult {
  totalScore: number;
  grade: string;
  ctrPrediction: { low: number; expected: number; high: number };
  categories: {
    visualImpact: { score: number; maxScore: number; feedback: string };
    emotionalAppeal: { score: number; maxScore: number; feedback: string };
    clarityReadability: { score: number; maxScore: number; feedback: string };
    brandConsistency: { score: number; maxScore: number; feedback: string };
    platformOptimization: { score: number; maxScore: number; feedback: string };
  };
  strengths: string[];
  weaknesses: string[];
  actionableImprovements: { priority: string; suggestion: string; expectedImpact: string }[];
  competitorComparison: string;
  nicheSpecificTips?: string[];
}

interface ThumbnailScorerProps {
  initialImage?: string;
}

export function ThumbnailScorer({ initialImage }: ThumbnailScorerProps) {
  const [imageUrl, setImageUrl] = useState(initialImage || '');
  const [niche, setNiche] = useState('general');
  const [scoring, setScoring] = useState(false);
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [clientAnalysis, setClientAnalysis] = useState<any>(null);
  const [analyzingLocal, setAnalyzingLocal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { isModelLoaded, isLoading: tfLoading, analyzeImage } = useTensorFlow();

  // Run client-side TensorFlow analysis when image is loaded
  useEffect(() => {
    if (imageUrl && isModelLoaded) {
      runLocalAnalysis();
    }
  }, [imageUrl, isModelLoaded]);

  const runLocalAnalysis = async () => {
    if (!imageUrl || !isModelLoaded) return;
    
    setAnalyzingLocal(true);
    try {
      const analysis = await analyzeImage(imageUrl);
      setClientAnalysis(analysis);
    } catch (error) {
      console.error('Local analysis error:', error);
    } finally {
      setAnalyzingLocal(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImageUrl(reader.result as string);
      setResult(null);
      setClientAnalysis(null);
    };
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
        body: { 
          imageUrl, 
          niche,
          clientAnalysis // Send TensorFlow analysis to backend
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setResult(data);
      toast.success('Thumbnail scored with AI!');
    } catch (error) {
      console.error('Error scoring thumbnail:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to score');
    } finally {
      setScoring(false);
    }
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'S': return 'text-purple-400 bg-purple-500/20';
      case 'A': return 'text-green-400 bg-green-500/20';
      case 'B': return 'text-blue-400 bg-blue-500/20';
      case 'C': return 'text-yellow-400 bg-yellow-500/20';
      case 'D': return 'text-orange-400 bg-orange-500/20';
      default: return 'text-red-400 bg-red-500/20';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default: return 'bg-green-500/20 text-green-400 border-green-500/30';
    }
  };

  const niches = [
    'general', 'gaming', 'tech', 'beauty', 'fitness', 'cooking', 
    'education', 'entertainment', 'music', 'sports', 'travel', 
    'finance', 'lifestyle', 'news', 'vlog', 'tutorial'
  ];

  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            AI Thumbnail Scorer
          </h2>
          <div className="flex items-center gap-2">
            {isModelLoaded ? (
              <span className="flex items-center gap-1 text-xs text-green-400">
                <Cpu className="w-3 h-3" />
                TensorFlow Ready
              </span>
            ) : tfLoading ? (
              <span className="flex items-center gap-1 text-xs text-yellow-400">
                <Loader2 className="w-3 h-3 animate-spin" />
                Loading Neural Net...
              </span>
            ) : null}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Upload a thumbnail for AI analysis with neural network face detection and CTR prediction
        </p>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Thumbnail Image</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Paste image URL..."
                value={imageUrl.startsWith('data:') ? 'Image uploaded' : imageUrl}
                onChange={(e) => {
                  setImageUrl(e.target.value);
                  setResult(null);
                  setClientAnalysis(null);
                }}
                disabled={imageUrl.startsWith('data:')}
              />
              <Button 
                variant="outline" 
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-4 h-4" />
              </Button>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileUpload}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Content Niche</Label>
            <Select value={niche} onValueChange={setNiche}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {niches.map((n) => (
                  <SelectItem key={n} value={n} className="capitalize">
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Preview */}
        {imageUrl && (
          <div className="space-y-3">
            <div className="aspect-video max-w-md rounded-xl overflow-hidden bg-surface-2 border border-border">
              <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
            </div>
            
            {/* Client-side Analysis Results */}
            {clientAnalysis && (
              <div className="p-4 rounded-lg bg-surface-2 border border-border space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Brain className="w-4 h-4 text-purple-400" />
                  Neural Network Pre-Analysis
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div className="text-center p-2 rounded bg-background">
                    <p className="text-muted-foreground text-xs">Faces</p>
                    <p className="font-bold text-lg">{clientAnalysis.faces?.length || 0}</p>
                  </div>
                  <div className="text-center p-2 rounded bg-background">
                    <p className="text-muted-foreground text-xs">Brightness</p>
                    <p className="font-bold text-lg">{clientAnalysis.brightness}%</p>
                  </div>
                  <div className="text-center p-2 rounded bg-background">
                    <p className="text-muted-foreground text-xs">Contrast</p>
                    <p className="font-bold text-lg">{clientAnalysis.contrast}%</p>
                  </div>
                  <div className="text-center p-2 rounded bg-background">
                    <p className="text-muted-foreground text-xs">Quality</p>
                    <p className="font-bold text-lg">{clientAnalysis.qualityScore}/100</p>
                  </div>
                </div>
                {clientAnalysis.dominantColors && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Dominant Colors</p>
                    <div className="flex gap-2">
                      {clientAnalysis.dominantColors.slice(0, 5).map((color: string, i: number) => (
                        <div 
                          key={i} 
                          className="w-8 h-8 rounded border border-border" 
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {analyzingLocal && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Running TensorFlow analysis...
              </div>
            )}
          </div>
        )}

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
              Analyzing with Gemini 3 Pro...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Score Thumbnail with AI
            </>
          )}
        </Button>
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Score Overview */}
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-display text-lg font-semibold">Analysis Results</h3>
                <p className="text-sm text-muted-foreground">Powered by Gemini 3 Pro + TensorFlow.js</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-5xl font-bold text-primary">{result.totalScore}</p>
                  <p className="text-sm text-muted-foreground">/ 100</p>
                </div>
                <div className={`px-4 py-2 rounded-xl text-2xl font-bold ${getGradeColor(result.grade)}`}>
                  {result.grade}
                </div>
              </div>
            </div>

            {/* CTR Prediction */}
            <div className="p-4 rounded-xl bg-surface-2 mb-6">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" />
                CTR Prediction
              </h4>
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">{result.ctrPrediction.low}%</span>
                <div className="flex-1 h-2 bg-surface-1 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 rounded-full"
                    style={{ width: `${(result.ctrPrediction.expected / 15) * 100}%` }}
                  />
                </div>
                <span className="text-sm text-muted-foreground">{result.ctrPrediction.high}%</span>
              </div>
              <p className="text-center mt-2 text-lg font-semibold">
                Expected: <span className="text-primary">{result.ctrPrediction.expected}%</span>
              </p>
            </div>

            {/* Category Breakdown */}
            <div className="space-y-4">
              <h4 className="font-medium">Category Scores</h4>
              {Object.entries(result.categories).map(([key, cat]) => (
                <div key={key} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                    <span>{cat.score}/{cat.maxScore || 25}</span>
                  </div>
                  <Progress value={(cat.score / (cat.maxScore || 25)) * 100} className="h-2" />
                  <p className="text-xs text-muted-foreground">{cat.feedback}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Strengths & Weaknesses */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="glass rounded-2xl p-6">
              <h4 className="font-medium mb-4 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                Strengths
              </h4>
              <div className="space-y-2">
                {result.strengths.map((strength, i) => (
                  <div key={i} className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-sm">
                    {strength}
                  </div>
                ))}
              </div>
            </div>

            <div className="glass rounded-2xl p-6">
              <h4 className="font-medium mb-4 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-400" />
                Weaknesses
              </h4>
              <div className="space-y-2">
                {result.weaknesses.map((weakness, i) => (
                  <div key={i} className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-sm">
                    {weakness}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Actionable Improvements */}
          <div className="glass rounded-2xl p-6">
            <h4 className="font-medium mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Actionable Improvements
            </h4>
            <div className="space-y-3">
              {result.actionableImprovements.map((item, i) => (
                <div key={i} className={`p-4 rounded-lg border ${getPriorityColor(item.priority)}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getPriorityColor(item.priority)} mb-2 inline-block`}>
                        {item.priority.toUpperCase()} PRIORITY
                      </span>
                      <p className="font-medium">{item.suggestion}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Impact: {item.expectedImpact}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Competitor Comparison */}
          {result.competitorComparison && (
            <div className="glass rounded-2xl p-6">
              <h4 className="font-medium mb-3">Competitor Comparison</h4>
              <p className="text-sm text-muted-foreground">{result.competitorComparison}</p>
            </div>
          )}

          {/* Niche-Specific Tips */}
          {result.nicheSpecificTips && result.nicheSpecificTips.length > 0 && (
            <div className="glass rounded-2xl p-6">
              <h4 className="font-medium mb-3 capitalize">{niche} Niche Tips</h4>
              <div className="space-y-2">
                {result.nicheSpecificTips.map((tip, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-primary">•</span>
                    <span>{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
