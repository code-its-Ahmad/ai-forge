import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

const plans = [
  {
    name: 'Starter',
    price: '$0',
    period: '/forever',
    description: 'Perfect for trying out ThumbForge AI',
    features: [
      '10 generations per month',
      'AI thumbnail generation',
      'AI title suggestions',
      'Standard quality exports',
      'Basic analytics',
      'Email support',
    ],
    cta: 'Start Free',
    popular: false,
  },
  {
    name: 'Creator',
    price: '$19',
    period: '/month',
    description: 'For serious content creators',
    features: [
      '100 generations per month',
      'All thumbnail styles',
      'HD quality exports',
      'AI Face Swap feature',
      'Smart image editing',
      'Platform optimization',
      'CTR predictions',
      'Priority support',
    ],
    cta: 'Start 7-Day Trial',
    popular: true,
  },
  {
    name: 'Agency',
    price: '$49',
    period: '/month',
    description: 'For teams and agencies',
    features: [
      '1000 generations per month',
      'All Creator features',
      'API access',
      'Team collaboration',
      'Custom branding',
      'Bulk generation',
      'White-label exports',
      'Dedicated account manager',
    ],
    cta: 'Contact Sales',
    popular: false,
  },
];

export function PricingSection() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleSelectPlan = (planName: string) => {
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/auth?mode=signup');
    }
  };

  return (
    <section id="pricing" className="py-24 relative">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <span className="text-sm font-medium text-primary uppercase tracking-wider">Pricing</span>
          <h2 className="font-display text-4xl md:text-5xl font-bold mt-3 mb-4">
            Simple, Transparent
            <br />
            <span className="text-gradient-mint">Pricing</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Start for free, upgrade when you're ready. No hidden fees.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
            <div 
              key={index}
              className={`rounded-2xl p-6 relative ${
                plan.popular 
                  ? 'glass-strong border-2 border-primary shadow-glow' 
                  : 'glass'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h3 className="font-display text-xl font-semibold mb-2">{plan.name}</h3>
                <div className="flex items-baseline gap-1">
                  <span className="font-display text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">{plan.description}</p>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm">
                    <Check className="w-4 h-4 text-primary flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Button 
                variant={plan.popular ? 'mint' : 'outline'}
                className="w-full"
                onClick={() => handleSelectPlan(plan.name)}
              >
                {plan.cta}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
