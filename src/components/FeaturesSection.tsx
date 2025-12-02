import { 
  Sparkles, 
  Wand2, 
  Users, 
  BarChart3, 
  Zap, 
  Shield,
  Palette,
  Target,
  TrendingUp
} from 'lucide-react';

const features = [
  {
    icon: Sparkles,
    title: 'AI Thumbnail Generation',
    description: 'Generate stunning, click-worthy thumbnails from just a video title using advanced AI. Our system understands what makes viewers click.',
    highlight: true
  },
  {
    icon: Users,
    title: 'AI Face Swap',
    description: 'Seamlessly swap faces in your thumbnails. Put yourself in any scene with realistic, professional-quality results.',
    highlight: true
  },
  {
    icon: Palette,
    title: 'Smart Image Editing',
    description: 'Enhance, recolor, add effects, or completely transform your thumbnails with AI-powered editing tools.'
  },
  {
    icon: Wand2,
    title: 'Viral Title Generator',
    description: 'Get click-worthy title suggestions backed by data. Maximize your CTR with proven title formulas.'
  },
  {
    icon: Target,
    title: 'Platform Optimization',
    description: 'Auto-optimize for YouTube, TikTok, Instagram & more. Perfect dimensions and style for each platform.'
  },
  {
    icon: TrendingUp,
    title: 'CTR Predictions',
    description: 'AI-powered click-through rate predictions help you choose the best performing thumbnail.'
  },
  {
    icon: Zap,
    title: 'Lightning Fast',
    description: 'Generate professional thumbnails in seconds, not hours. Save time and focus on creating content.'
  },
  {
    icon: Shield,
    title: 'Commercial License',
    description: 'Full commercial rights to all generated content. Use for your business, clients, or monetized channels.'
  },
  {
    icon: BarChart3,
    title: 'Analytics Dashboard',
    description: 'Track your generation history and monitor your usage with detailed analytics and insights.'
  }
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-surface-1/50 to-transparent pointer-events-none" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <span className="text-sm font-medium text-primary uppercase tracking-wider">Features</span>
          <h2 className="font-display text-4xl md:text-5xl font-bold mt-3 mb-4">
            Everything You Need to
            <br />
            <span className="text-gradient-mint">Go Viral</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Professional thumbnail creation powered by cutting-edge AI technology.
            No design skills required.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div 
              key={index}
              className={`group glass rounded-2xl p-6 transition-all duration-300 hover:shadow-glow hover:border-primary/30 ${
                (feature as any).highlight ? 'border-primary/20 bg-primary/5' : ''
              }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-all duration-300 ${
                (feature as any).highlight 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-surface-2 text-primary group-hover:bg-primary group-hover:text-primary-foreground'
              }`}>
                <feature.icon className="w-6 h-6" />
              </div>
              <h3 className="font-display text-xl font-semibold mb-2 group-hover:text-primary transition-colors">
                {feature.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {feature.description}
              </p>
              {(feature as any).highlight && (
                <span className="inline-block mt-4 text-xs font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full">
                  Most Popular
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
