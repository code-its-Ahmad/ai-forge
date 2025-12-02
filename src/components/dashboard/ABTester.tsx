import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { 
  FlipHorizontal, 
  Loader2, 
  Upload,
  Trophy,
  Crown,
  TrendingUp
} from 'lucide-react';

interface ABTestResult {
  winner: 'A' | 'B';
  confidence: number;
  winnerExplanation: string;
  comparison: {
    visualImpact: { A: number; B: number; winner: string };
    emotionalAppeal: { A: number; B: number; winner: string };
    clarity: { A: number; B: number; winner: string };
    clickability: { A: number; B: number; winner: string };
    professionalism: { A: number; B: number; winner: string };
  };
  thumbnailA: { score: number; strengths: string[]; weaknesses: string[] };
  thumbnailB: { score: number; strengths: string[]; weaknesses: string[] };
  ctrPrediction: {
    A: { min: number; max: number };
    B: { min: number; max: number };
  };
  recommendation: string;
  improvementSuggestions: { forLoser: string[]; forWinner: string[] };
}

export function ABTester() {
  const [thumbnailA, setThumbnailA] = useState('');
  const [thumbnailB, setThumbnailB] = useState('');
  const [videoTitle, setVideoTitle] = useState('');
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<ABTestResult | null>(null);
  const inputRefA = useRef<HTMLInputElement>(null);
  const inputRefB = useRef<HTMLInputElement>(null);

  const handleFileUpload = (setter: (url: string) => void) => async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setter(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleTest = async () => {
    if (!thumbnailA || !thumbnailB) {
      toast.error('Please upload both thumbnails');
      return;
    }

    setTesting(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('ab-test-thumbnails', {
        body: { thumbnailA, thumbnailB, videoTitle }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setResult(data);
      toast.success('A/B Test complete!');
    } catch (error) {
      console.error('Error in A/B test:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to test');
    } finally {
      setTesting(false);
    }
  };

  const ComparisonBar = ({ labelA, labelB, valueA, valueB, winner }: { labelA: string; labelB: string; valueA: number; valueB: number; winner: string }) => {
    const total = valueA + valueB || 1;
    const percentA = (valueA / total) * 100;
    const percentB = (valueB / total) * 100;
    
    return (
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{labelA}: {Math.round(valueA)}</span>
          <span>{labelB}: {Math.round(valueB)}</span>
        </div>
        <div className="flex h-3 rounded-full overflow-hidden bg-surface-2">
          <div 
            className={`${winner === 'A' ? 'bg-green-500' : 'bg-muted-foreground/50'} transition-all`}
            style={{ width: `${percentA}%` }}
          />
          <div 
            className={`${winner === 'B' ? 'bg-green-500' : 'bg-muted-foreground/50'} transition-all`}
            style={{ width: `${percentB}%` }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl p-6 space-y-4">
        <h2 className="font-display text-xl font-semibold flex items-center gap-2">
          <FlipHorizontal className="w-5 h-5 text-primary" />
          A/B Thumbnail Tester
        </h2>
        <p className="text-sm text-muted-foreground">
          Compare two thumbnails to see which one would perform better with AI analysis
        </p>

        <div className="space-y-2">
          <Label>Video Title (Optional)</Label>
          <Input
            placeholder="Enter your video title for context"
            value={videoTitle}
            onChange={(e) => setVideoTitle(e.target.value)}
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Thumbnail A */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold text-white">A</span>
              Thumbnail A
            </Label>
            <div 
              className="border-2 border-dashed border-blue-500/50 rounded-xl p-4 text-center cursor-pointer hover:border-blue-500 transition-colors aspect-video flex items-center justify-center"
              onClick={() => inputRefA.current?.click()}
            >
              {thumbnailA ? (
                <img src={thumbnailA} alt="Thumbnail A" className="max-h-full max-w-full rounded-lg object-contain" />
              ) : (
                <>
                  <div>
                    <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Upload A</p>
                  </div>
                </>
              )}
            </div>
            <input
              ref={inputRefA}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload(setThumbnailA)}
            />
            <Input
              placeholder="Or paste URL"
              value={thumbnailA.startsWith('data:') ? '' : thumbnailA}
              onChange={(e) => setThumbnailA(e.target.value)}
            />
          </div>

          {/* Thumbnail B */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center text-xs font-bold text-white">B</span>
              Thumbnail B
            </Label>
            <div 
              className="border-2 border-dashed border-purple-500/50 rounded-xl p-4 text-center cursor-pointer hover:border-purple-500 transition-colors aspect-video flex items-center justify-center"
              onClick={() => inputRefB.current?.click()}
            >
              {thumbnailB ? (
                <img src={thumbnailB} alt="Thumbnail B" className="max-h-full max-w-full rounded-lg object-contain" />
              ) : (
                <>
                  <div>
                    <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Upload B</p>
                  </div>
                </>
              )}
            </div>
            <input
              ref={inputRefB}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload(setThumbnailB)}
            />
            <Input
              placeholder="Or paste URL"
              value={thumbnailB.startsWith('data:') ? '' : thumbnailB}
              onChange={(e) => setThumbnailB(e.target.value)}
            />
          </div>
        </div>

        <Button 
          onClick={handleTest}
          variant="mint"
          className="w-full"
          size="lg"
          disabled={testing || !thumbnailA || !thumbnailB}
        >
          {testing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Comparing...
            </>
          ) : (
            <>
              <Trophy className="w-4 h-4" />
              Find the Winner
            </>
          )}
        </Button>
      </div>

      {result && (
        <div className="space-y-4">
          {/* Winner Announcement */}
          <div className={`glass rounded-2xl p-6 border-2 ${result.winner === 'A' ? 'border-blue-500' : 'border-purple-500'}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Crown className={`w-8 h-8 ${result.winner === 'A' ? 'text-blue-500' : 'text-purple-500'}`} />
                <div>
                  <h3 className="font-display text-xl font-bold">
                    Thumbnail {result.winner} Wins!
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {result.confidence}% confidence
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Predicted CTR</p>
                <p className={`font-bold ${result.winner === 'A' ? 'text-blue-500' : 'text-purple-500'}`}>
                  {result.ctrPrediction[result.winner].min}% - {result.ctrPrediction[result.winner].max}%
                </p>
              </div>
            </div>
            <p className="text-sm">{result.winnerExplanation}</p>
          </div>

          {/* Score Comparison */}
          <div className="glass rounded-2xl p-6">
            <h4 className="font-medium mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Head-to-Head Comparison
            </h4>
            <div className="space-y-4">
              {Object.entries(result.comparison).map(([key, value]) => (
                <div key={key}>
                  <p className="text-sm font-medium mb-1 capitalize">{key.replace(/([A-Z])/g, ' $1')}</p>
                  <ComparisonBar 
                    labelA="A" 
                    labelB="B" 
                    valueA={value.A} 
                    valueB={value.B} 
                    winner={value.winner}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Individual Analysis */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className={`glass rounded-2xl p-6 ${result.winner === 'A' ? 'ring-2 ring-blue-500' : ''}`}>
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold text-white">A</span>
                  Thumbnail A
                </h4>
                <span className="text-2xl font-bold text-blue-500">{result.thumbnailA.score}</span>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Strengths</p>
                  <ul className="text-sm space-y-1">
                    {result.thumbnailA.strengths.slice(0, 3).map((s, i) => (
                      <li key={i} className="flex items-start gap-1">
                        <span className="text-green-500">+</span> {s}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Weaknesses</p>
                  <ul className="text-sm space-y-1">
                    {result.thumbnailA.weaknesses.slice(0, 3).map((w, i) => (
                      <li key={i} className="flex items-start gap-1">
                        <span className="text-red-500">-</span> {w}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className={`glass rounded-2xl p-6 ${result.winner === 'B' ? 'ring-2 ring-purple-500' : ''}`}>
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center text-xs font-bold text-white">B</span>
                  Thumbnail B
                </h4>
                <span className="text-2xl font-bold text-purple-500">{result.thumbnailB.score}</span>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Strengths</p>
                  <ul className="text-sm space-y-1">
                    {result.thumbnailB.strengths.slice(0, 3).map((s, i) => (
                      <li key={i} className="flex items-start gap-1">
                        <span className="text-green-500">+</span> {s}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Weaknesses</p>
                  <ul className="text-sm space-y-1">
                    {result.thumbnailB.weaknesses.slice(0, 3).map((w, i) => (
                      <li key={i} className="flex items-start gap-1">
                        <span className="text-red-500">-</span> {w}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Recommendation */}
          <div className="glass rounded-2xl p-6">
            <h4 className="font-medium mb-3">Final Recommendation</h4>
            <p className="text-sm text-muted-foreground">{result.recommendation}</p>
          </div>
        </div>
      )}
    </div>
  );
}
