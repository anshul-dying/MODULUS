import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Database, 
  Brain, 
  BarChart3, 
  Zap, 
  ArrowRight,
  CheckCircle,
  Sparkles,
  TrendingUp
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface WelcomeScreenProps {
  onDismiss?: () => void;
}

export function WelcomeScreen({ onDismiss }: WelcomeScreenProps) {
  const navigate = useNavigate();

  const features = [
    {
      icon: Database,
      title: 'Dataset Management',
      description: 'Upload and manage your CSV datasets with ease',
      action: () => navigate('/datasets')
    },
    {
      icon: Sparkles,
      title: 'AI-Powered Preprocessing',
      description: 'Automatically clean and prepare your data',
      action: () => navigate('/preprocessing')
    },
    {
      icon: Brain,
      title: 'Model Training',
      description: 'Train machine learning models with just a few clicks',
      action: () => navigate('/training')
    },
    {
      icon: BarChart3,
      title: 'Comprehensive Reports',
      description: 'Generate detailed EDA reports and visualizations',
      action: () => navigate('/reports')
    }
  ];

  const steps = [
    { icon: Database, text: 'Upload your dataset' },
    { icon: Zap, text: 'Preprocess with AI assistance' },
    { icon: Brain, text: 'Train your model' },
    { icon: TrendingUp, text: 'Analyze results' }
  ];

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Hero Section */}
      <div className="text-center space-y-4 py-12">
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full"></div>
            <div className="relative bg-gradient-to-br from-primary to-primary/80 p-8 rounded-3xl shadow-2xl">
              <Brain className="h-20 w-20 text-primary-foreground" />
            </div>
          </div>
        </div>
        
        <h1 className="text-5xl font-bold text-gradient">
          Welcome to Modulus
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Your comprehensive machine learning platform for data preprocessing, model training, and analysis
        </p>

        <div className="flex items-center justify-center gap-4 pt-6">
          <Button 
            size="lg" 
            onClick={() => navigate('/datasets')}
            className="btn-interactive btn-primary-interactive shadow-lg hover:shadow-xl"
          >
            Get Started
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          {onDismiss && (
            <Button 
              size="lg" 
              variant="outline"
              onClick={onDismiss}
              className="btn-interactive btn-outline-interactive"
            >
              Skip Tour
            </Button>
          )}
        </div>
      </div>

      {/* Quick Start Steps */}
      <Card className="glassmorphism">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Quick Start Guide
          </CardTitle>
          <CardDescription>
            Get started with Modulus in 4 simple steps
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {steps.map((step, index) => (
              <div key={index} className="flex flex-col items-center text-center space-y-3">
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/10 blur-xl rounded-full"></div>
                  <div className="relative bg-primary/20 p-4 rounded-full">
                    <step.icon className="h-8 w-8 text-primary" />
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-semibold text-primary">Step {index + 1}</div>
                  <p className="text-sm text-muted-foreground">{step.text}</p>
                </div>
                {index < steps.length - 1 && (
                  <ArrowRight className="hidden md:block absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 h-5 w-5 text-muted-foreground" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {features.map((feature, index) => (
          <Card 
            key={index}
            className="glassmorphism card-hover-lift cursor-pointer group"
            onClick={feature.action}
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="bg-primary/10 p-3 rounded-lg group-hover:bg-primary/20 transition-colors">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{feature.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Key Benefits */}
      <Card className="glassmorphism">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-success" />
            Why Choose Modulus?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { title: 'AI-Powered', description: 'Intelligent data preprocessing and analysis' },
              { title: 'User-Friendly', description: 'Intuitive interface for all skill levels' },
              { title: 'Comprehensive', description: 'End-to-end ML pipeline in one platform' },
              { title: 'Fast', description: 'Optimized for quick training and results' },
              { title: 'Flexible', description: 'Support for various ML algorithms' },
              { title: 'Exportable', description: 'Download models and reports easily' }
            ].map((benefit, index) => (
              <div key={index} className="flex items-start space-x-3 p-4 rounded-lg bg-card/50 hover:bg-card/80 transition-colors">
                <CheckCircle className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold mb-1">{benefit.title}</h4>
                  <p className="text-sm text-muted-foreground">{benefit.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

