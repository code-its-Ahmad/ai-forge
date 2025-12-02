import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles, Play, Star, ArrowRight, Zap, Shield, Clock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const sampleThumbnails = [
  { title: "The Race That Changed Formula 1 FOREVER..", views: "4,500,000+", image: "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=400&h=225&fit=crop" },
  { title: "SECRET Tattoos Footballers Don't Talk About", views: "800,000+", image: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400&h=225&fit=crop" },
  { title: "THE GREATEST FC 25 PACK OPENING SO FAR!", views: "3,700,000+", image: "https://images.unsplash.com/photo-1493711662062-fa541f7f3d24?w=400&h=225&fit=crop" },
  { title: "How One Person Destroyed 239 Lives", views: "2,200,000+", image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&h=225&fit=crop" },
  { title: "Millionaires VS Billionaires - What's Different?", views: "1,100,000+", image: "https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=400&h=225&fit=crop" },
  { title: "The Unluckiest Racer of ALL TIME", views: "700,000+", image: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=400&h=225&fit=crop" },
];

const quickFeatures = [
  { icon: Zap, text: "AI-Powered Generation" },
  { icon: Shield, text: "Face Swap Technology" },
  { icon: Clock, text: "Results in Seconds" },
];

export function HeroSection() {
  const [prompt, setPrompt] = useState('');
  const [currentSlide, setCurrentSlide] = useState(0);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % sampleThumbnails.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  const handleGenerate = () => {
    if (user) {
      navigate('/dashboard', { state: { initialPrompt: prompt } });
    } else {
      navigate('/auth?mode=signup', { state: { initialPrompt: prompt } });
    }
  };

  return (
    <section className="relative min-h-screen pt-20 pb-16 overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-hero pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-primary/15 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[300px] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Trust Badge */}
        <div className="flex justify-center mb-8 animate-fade-in">
          <div className="glass px-5 py-2.5 rounded-full flex items-center gap-3 border border-primary/20">
            <div className="flex items-center gap-0.5">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-primary text-primary" />
              ))}
            </div>
            <div className="h-4 w-px bg-border" />
            <span className="text-sm">
              <span className="text-muted-foreground">Rated </span>
              <span className="font-semibold text-foreground">Excellent</span>
            </span>
            <div className="h-4 w-px bg-border" />
            <span className="text-sm">
              Trusted by <span className="text-primary font-bold">569,902</span> Creators
            </span>
          </div>
        </div>

        {/* Main Headline */}
        <div className="text-center max-w-5xl mx-auto mb-10 animate-slide-up">
          <h1 className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold mb-6 leading-[1.1] tracking-tight">
            The <span className="text-gradient-mint">Shortcut</span>
            <br />
            <span className="text-gradient-mint">to Millions</span> of Views
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            From Ignored to Viral With Data-Backed AI Thumbnails.
            <br className="hidden sm:block" />
            Generate, swap faces, and create click-worthy content in seconds.
          </p>
        </div>

        {/* Quick Features */}
        <div className="flex flex-wrap justify-center gap-4 mb-8 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          {quickFeatures.map((feature, index) => (
            <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
              <feature.icon className="w-4 h-4 text-primary" />
              <span>{feature.text}</span>
            </div>
          ))}
        </div>

        {/* Input Section */}
        <div className="max-w-3xl mx-auto mb-6 animate-slide-up" style={{ animationDelay: '0.15s' }}>
          <div className="glass-strong rounded-2xl p-2 shadow-glow">
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Enter your video topic... e.g., The 1998 F1 Grand Prix in Spa"
                className="flex-1 h-14 bg-transparent border-0 text-lg placeholder:text-muted-foreground/50 focus-visible:ring-0 px-4"
                onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
              />
              <Button 
                onClick={handleGenerate}
                variant="mint"
                size="lg"
                className="h-14 px-8 text-base font-semibold"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Generate Thumbnail
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
          <p className="text-center text-xs text-muted-foreground mt-3">
            No credit card required • 10 free generations • Cancel anytime
          </p>
        </div>

        {/* Demo Link */}
        <div className="flex justify-center mb-12 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <button className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors group">
            <div className="w-12 h-12 rounded-full border-2 border-border flex items-center justify-center group-hover:border-primary group-hover:bg-primary/10 transition-all">
              <Play className="w-5 h-5 ml-1 group-hover:text-primary" />
            </div>
            <div className="text-left">
              <span className="block text-sm font-medium text-foreground group-hover:text-primary transition-colors">Watch Demo</span>
              <span className="text-xs text-muted-foreground">See how it works in 65 seconds</span>
            </div>
          </button>
        </div>

        {/* Thumbnail Showcase */}
        <div className="relative max-w-6xl mx-auto animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <div className="glass rounded-3xl p-6 border border-border/50">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="ml-3 text-sm text-muted-foreground">ThumbForge AI — Generated Thumbnails</span>
            </div>
            
            {/* Thumbnail Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {sampleThumbnails.map((thumb, index) => (
                <div 
                  key={index}
                  className={`group cursor-pointer transition-all duration-500 ${
                    index === currentSlide ? 'scale-105 z-10' : 'opacity-70 hover:opacity-100'
                  }`}
                >
                  <div className="relative rounded-xl overflow-hidden shadow-card group-hover:shadow-glow transition-all duration-300">
                    <img 
                      src={thumb.image} 
                      alt={thumb.title}
                      className="w-full aspect-video object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <h3 className="text-xs sm:text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">
                        {thumb.title}
                      </h3>
                      <p className="text-xs text-primary mt-1 font-semibold">{thumb.views} views</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Decorative elements */}
          <div className="absolute -top-4 -right-4 w-24 h-24 bg-primary/20 rounded-full blur-2xl" />
          <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
        </div>

        {/* Bottom Stats */}
        <div className="flex flex-wrap justify-center gap-8 mt-12 animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <div className="text-center">
            <p className="font-display text-3xl font-bold text-primary">2M+</p>
            <p className="text-sm text-muted-foreground">Thumbnails Created</p>
          </div>
          <div className="h-12 w-px bg-border hidden sm:block" />
          <div className="text-center">
            <p className="font-display text-3xl font-bold text-primary">500K+</p>
            <p className="text-sm text-muted-foreground">Happy Creators</p>
          </div>
          <div className="h-12 w-px bg-border hidden sm:block" />
          <div className="text-center">
            <p className="font-display text-3xl font-bold text-primary">4.9/5</p>
            <p className="text-sm text-muted-foreground">Average Rating</p>
          </div>
        </div>
      </div>
    </section>
  );
}
