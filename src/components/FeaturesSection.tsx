import { Sparkles, Wand2, Users, BarChart3, Zap, Shield } from 'lucide-react';

const features = [
  {
    icon: Sparkles,
    title: 'AI Thumbnail Generation',
    description: 'Generate stunning, click-worthy thumbnails from just a video title using advanced AI.',
  },
  {
    icon: Wand2,
    title: 'Title Optimization',
    description: 'Get AI-powered title suggestions designed to maximize your click-through rates.',
  },
  {
    icon: Users,
    title: 'Face Swap Technology',
    description: 'Seamlessly swap faces in your thumbnails to create engaging, personalized content.',
  },
  {
    icon: BarChart3,
    title: 'Analytics Dashboard',
    description: 'Track your generation history and monitor your usage with detailed analytics.',
  },
  {
    icon: Zap,
    title: 'Lightning Fast',
    description: 'Generate professional thumbnails in seconds, not hours. Save time and boost productivity.',
  },
  {
    icon: Shield,
    title: 'Multi-Platform Support',
    description: 'Optimized for YouTube, Instagram, TikTok, and more. One tool for all platforms.',
  },
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

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="glass rounded-2xl p-6 group hover:bg-card/90 transition-all duration-300 hover:shadow-card"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-display text-xl font-semibold mb-2 group-hover:text-primary transition-colors">
                {feature.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
