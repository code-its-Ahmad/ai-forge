import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles, Play, Star } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const sampleThumbnails = [
  { title: "The Race That Changed Formula 1 FOREVER..", views: "4,500,000+", image: "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=400&h=225&fit=crop" },
  { title: "SECRET Tattoos Footballers Don't Talk About", views: "800,000+", image: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400&h=225&fit=crop" },
  { title: "THE GREATEST FC 25 PACK OPENING SO FAR!", views: "3,700,000+", image: "https://images.unsplash.com/photo-1493711662062-fa541f7f3d24?w=400&h=225&fit=crop" },
  { title: "How One Person Destroyed 239 Lives", views: "2,200,000+", image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&h=225&fit=crop" },
  { title: "Millionaires VS Billionaires - What's Different?", views: "1,100,000+", image: "https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=400&h=225&fit=crop" },
  { title: "The Unluckiest Racer of ALL TIME", views: "700,000+", image: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=400&h=225&fit=crop" },
];

export function HeroSection() {
  const [prompt, setPrompt] = useState('');
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleGenerate = () => {
    if (user) {
      navigate('/dashboard', { state: { initialPrompt: prompt } });
    } else {
      navigate('/auth?mode=signup', { state: { initialPrompt: prompt } });
    }
  };

  return (
    <section className="relative min-h-screen pt-24 pb-16 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-hero pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Trust Badge */}
        <div className="flex justify-center mb-6 animate-fade-in">
          <div className="glass px-4 py-2 rounded-full flex items-center gap-2">
            <div className="flex items-center gap-0.5">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-primary text-primary" />
              ))}
            </div>
            <span className="text-sm text-muted-foreground">Excellent</span>
            <span className="text-sm font-medium">Trusted by <span className="text-primary">569,902</span> Users</span>
          </div>
        </div>

        {/* Main Headline */}
        <div className="text-center max-w-4xl mx-auto mb-12 animate-slide-up">
          <h1 className="font-display text-5xl md:text-7xl font-bold mb-6 leading-tight">
            The <span className="text-gradient-mint">Shortcut</span>
            <br />to Millions of Views
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            From Ignored to Viral With Data-Backed AI Thumbnails
          </p>
        </div>

        {/* Input Section */}
        <div className="max-w-2xl mx-auto mb-8 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <div className="glass-strong rounded-2xl p-2">
            <div className="flex gap-2">
              <Input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="The 1998 F1 Grand Prix in Spa"
                className="flex-1 h-14 bg-transparent border-0 text-lg placeholder:text-muted-foreground/50 focus-visible:ring-0"
                onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
              />
              <Button 
                onClick={handleGenerate}
                variant="hero"
                className="h-14"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Generate My First Thumbnail
              </Button>
            </div>
          </div>
        </div>

        {/* Demo Link */}
        <div className="flex justify-center mb-16 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <button className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group">
            <div className="w-10 h-10 rounded-full border border-border flex items-center justify-center group-hover:border-primary group-hover:bg-primary/10 transition-all">
              <Play className="w-4 h-4 ml-0.5" />
            </div>
            <span>Watch Demo <span className="text-muted-foreground/60">65 sec</span></span>
          </button>
        </div>

        {/* Thumbnail Carousel */}
        <div className="relative overflow-hidden animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <div className="flex gap-4 animate-[slide-in-left_0.8s_ease-out]">
            {sampleThumbnails.map((thumb, index) => (
              <div 
                key={index}
                className="flex-shrink-0 w-72 group cursor-pointer"
              >
                <div className="relative rounded-xl overflow-hidden shadow-card group-hover:shadow-glow transition-all duration-300">
                  <img 
                    src={thumb.image} 
                    alt={thumb.title}
                    className="w-full aspect-video object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="mt-3 px-1">
                  <h3 className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">
                    {thumb.title}
                  </h3>
                  <p className="text-xs text-primary mt-1">{thumb.views} views</p>
                </div>
              </div>
            ))}
          </div>
          
          {/* Fade edges */}
          <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-background to-transparent pointer-events-none" />
          <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-background to-transparent pointer-events-none" />
        </div>
      </div>
    </section>
  );
}
