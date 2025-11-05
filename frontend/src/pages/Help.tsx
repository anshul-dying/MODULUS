import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import {
  HelpCircle,
  Keyboard,
  Home,
  Database,
  Brain,
  FileText,
  Settings,
  Image,
  Sparkles,
  BarChart3,
  Zap,
  Info,
  Lightbulb,
  ArrowRight,
  AlertCircle,
  Rocket,
  TrendingUp,
  Shield
} from 'lucide-react';

const Help = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<string>('overview');

  const shortcuts = [
    { key: 'Ctrl + H', macKey: 'Cmd + H', description: 'Navigate to Dashboard', icon: Home, category: 'Navigation' },
    { key: 'Ctrl + D', macKey: 'Cmd + D', description: 'Navigate to Datasets', icon: Database, category: 'Navigation' },
    { key: 'Ctrl + P', macKey: 'Cmd + P', description: 'Navigate to Preprocessing', icon: Settings, category: 'Navigation' },
    { key: 'Ctrl + T', macKey: 'Cmd + T', description: 'Navigate to Training', icon: Brain, category: 'Navigation' },
    { key: 'Ctrl + R', macKey: 'Cmd + R', description: 'Navigate to Reports', icon: FileText, category: 'Navigation' },
    { key: 'Ctrl + K', macKey: 'Cmd + K', description: 'Toggle shortcuts overlay', icon: Keyboard, category: 'General' },
    { key: '?', macKey: '?', description: 'Show shortcuts overlay', icon: HelpCircle, category: 'General' },
    { key: 'Ctrl + ?', macKey: 'Cmd + ?', description: 'Go to Help page', icon: HelpCircle, category: 'General' },
  ];

  const features = [
    {
      icon: Database,
      title: 'Dataset Management',
      description: 'Upload, view, and manage your CSV and Parquet datasets. Preview data, analyze columns, and organize your datasets efficiently.',
      path: '/datasets',
      color: 'text-blue-500'
    },
    {
      icon: Sparkles,
      title: 'AI-Powered Preprocessing',
      description: 'Automatically analyze your data and get intelligent suggestions for cleaning, handling missing values, outliers, and more.',
      path: '/preprocessing',
      color: 'text-purple-500'
    },
    {
      icon: Brain,
      title: 'Model Training',
      description: 'Train machine learning models for classification and regression tasks. Choose from various algorithms and customize your training pipeline.',
      path: '/training',
      color: 'text-green-500'
    },
    {
      icon: Image,
      title: 'Image Training',
      description: 'Train models on image datasets for computer vision tasks. Support for classification and regression on image data.',
      path: '/image-training',
      color: 'text-pink-500'
    },
    {
      icon: BarChart3,
      title: 'Reports & Analysis',
      description: 'Generate comprehensive EDA reports, view training reports, and export trained models for deployment.',
      path: '/reports',
      color: 'text-orange-500'
    }
  ];

  const quickStartSteps = [
    {
      step: 1,
      title: 'Upload Dataset',
      description: 'Go to the Datasets page and upload your CSV or Parquet file. The system will automatically detect column types and provide a preview.',
      icon: Database,
      path: '/datasets'
    },
    {
      step: 2,
      title: 'Preprocess Data',
      description: 'Use AI analysis to get suggestions or manually configure preprocessing options. Handle missing values, outliers, and data type conversions.',
      icon: Sparkles,
      path: '/preprocessing'
    },
    {
      step: 3,
      title: 'Train Model',
      description: 'Select your dataset, choose a target column, select task type (classification/regression), and pick an algorithm. Start training!',
      icon: Brain,
      path: '/training'
    },
    {
      step: 4,
      title: 'View Results',
      description: 'Check training reports, export models, and generate EDA reports to analyze your data and model performance.',
      icon: FileText,
      path: '/reports'
    }
  ];

  const faqs = [
    {
      question: 'What file formats are supported?',
      answer: 'Currently, we support CSV and Parquet file formats. CSV files can use different separators (comma, semicolon, tab). Parquet files are automatically recognized and loaded.'
    },
    {
      question: 'How does AI preprocessing work?',
      answer: 'Our AI analyzes your dataset and identifies common data quality issues like missing values, outliers, incorrect data types, and duplicates. It then suggests appropriate preprocessing steps tailored to your data.'
    },
    {
      question: 'What algorithms are available for training?',
      answer: 'For classification: Random Forest, Logistic Regression, SVM. For regression: Random Forest, Linear Regression, SVM. Each algorithm is optimized for its respective task type.'
    },
    {
      question: 'Where are processed datasets stored?',
      answer: 'Processed datasets are saved as Parquet files in the data/processed directory. Original files are moved to data/bin to preserve backups. The processed file keeps the same name with a .parquet extension.'
    },
    {
      question: 'How can I export my trained model?',
      answer: 'Go to the Reports page, select a completed training job, and click "Export Model". The model will be exported as a ZIP file containing the model file and training report.'
    },
    {
      question: 'What happens to reports after training?',
      answer: 'Training reports are automatically generated and saved as HTML files. You can view them in the Reports page under the Training Reports section. They persist even after server restarts.'
    }
  ];

  const tips = [
    {
      icon: Lightbulb,
      title: 'Use AI Analysis First',
      description: 'Always run AI analysis before manual preprocessing. It can identify issues you might miss and suggest optimal preprocessing strategies.'
    },
    {
      icon: Zap,
      title: 'Preview Before Processing',
      description: 'Use the manual preview feature to see how your preprocessing changes will affect the data before applying them.'
    },
    {
      icon: TrendingUp,
      title: 'Compare Models',
      description: 'Train multiple models with different algorithms and compare their performance metrics to find the best one for your data.'
    },
    {
      icon: Shield,
      title: 'Backup Your Data',
      description: 'Original datasets are automatically moved to the bin directory after preprocessing, so you always have a backup.'
    }
  ];

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Breadcrumb */}
      <Breadcrumb items={[{ label: 'Help & Support' }]} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="animate-fade-in-left">
          <h1 className="text-3xl font-bold text-gradient flex items-center gap-2">
            <HelpCircle className="h-8 w-8" />
            Help & Support
          </h1>
          <p className="text-muted-foreground mt-2">
            Everything you need to know about AutoTrain Advanced
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-border/50 pb-4">
        {[
          { id: 'overview', label: 'Overview', icon: Info },
          { id: 'shortcuts', label: 'Keyboard Shortcuts', icon: Keyboard },
          { id: 'features', label: 'Features', icon: Rocket },
          { id: 'quickstart', label: 'Quick Start', icon: Zap },
          { id: 'faq', label: 'FAQ', icon: HelpCircle },
          { id: 'tips', label: 'Tips & Tricks', icon: Lightbulb }
        ].map((tab) => (
          <Button
            key={tab.id}
            variant={activeSection === tab.id ? 'default' : 'ghost'}
            onClick={() => setActiveSection(tab.id)}
            className="btn-interactive"
          >
            <tab.icon className="h-4 w-4 mr-2" />
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Overview Section */}
      {activeSection === 'overview' && (
        <div className="space-y-6">
          <Card className="glassmorphism">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Info className="h-5 w-5" />
                <span>About AutoTrain Advanced</span>
              </CardTitle>
              <CardDescription>
                A comprehensive machine learning platform for data preprocessing and model training
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                AutoTrain Advanced is an AI-powered platform that simplifies the entire machine learning workflow,
                from data preprocessing to model training and deployment. Whether you're working with tabular data
                or images, our platform provides intelligent automation and comprehensive tools to help you build
                better models faster.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div className="p-4 rounded-lg border border-border/50 bg-card/50">
                  <div className="flex items-center space-x-2 mb-2">
                    <Rocket className="h-5 w-5 text-primary" />
                    <span className="font-semibold">AI-Powered</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Intelligent data analysis and preprocessing suggestions
                  </p>
                </div>
                <div className="p-4 rounded-lg border border-border/50 bg-card/50">
                  <div className="flex items-center space-x-2 mb-2">
                    <Zap className="h-5 w-5 text-primary" />
                    <span className="font-semibold">Fast & Efficient</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Optimized workflows for quick model development
                  </p>
                </div>
                <div className="p-4 rounded-lg border border-border/50 bg-card/50">
                  <div className="flex items-center space-x-2 mb-2">
                    <Shield className="h-5 w-5 text-primary" />
                    <span className="font-semibold">Secure & Reliable</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Data backups and comprehensive error handling
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Keyboard Shortcuts Section */}
      {activeSection === 'shortcuts' && (
        <div className="space-y-6">
          <Card className="glassmorphism">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Keyboard className="h-5 w-5" />
                <span>Keyboard Shortcuts</span>
              </CardTitle>
              <CardDescription>
                Navigate faster with these keyboard shortcuts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {['Navigation', 'General'].map((category) => (
                  <div key={category}>
                    <h3 className="text-lg font-semibold mb-3">{category}</h3>
                    <div className="space-y-2">
                      {shortcuts
                        .filter(s => s.category === category)
                        .map((shortcut, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card/50 hover:bg-card/80 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-primary/10">
                                <shortcut.icon className="h-4 w-4 text-primary" />
                              </div>
                              <span>{shortcut.description}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="font-mono text-xs">
                                {shortcut.key}
                              </Badge>
                              {shortcut.macKey && (
                                <Badge variant="outline" className="font-mono text-xs text-muted-foreground">
                                  {shortcut.macKey}
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground text-center">
                  <span className="font-medium">Pro Tip:</span> Press <kbd className="px-2 py-1 bg-background rounded border text-xs">?</kbd> anytime to toggle the shortcuts overlay
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Features Section */}
      {activeSection === 'features' && (
        <div className="space-y-6">
          <Card className="glassmorphism">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Rocket className="h-5 w-5" />
                <span>Platform Features</span>
              </CardTitle>
              <CardDescription>
                Explore all the powerful features available in AutoTrain Advanced
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {features.map((feature, index) => (
                  <Card
                    key={index}
                    className="border border-border/50 bg-card/50 hover:bg-card/80 transition-all cursor-pointer"
                    onClick={() => navigate(feature.path)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-3">
                        <div className={`p-2 rounded-lg bg-primary/10 ${feature.color}`}>
                          <feature.icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold mb-1">{feature.title}</h3>
                          <p className="text-sm text-muted-foreground mb-3">{feature.description}</p>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="btn-interactive"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(feature.path);
                            }}
                          >
                            Explore <ArrowRight className="h-3 w-3 ml-1" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Start Section */}
      {activeSection === 'quickstart' && (
        <div className="space-y-6">
          <Card className="glassmorphism">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Zap className="h-5 w-5" />
                <span>Quick Start Guide</span>
              </CardTitle>
              <CardDescription>
                Get started with AutoTrain Advanced in 4 simple steps
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {quickStartSteps.map((step, index) => (
                  <div
                    key={index}
                    className="flex items-start space-x-4 p-4 rounded-lg border border-border/50 bg-card/50"
                  >
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <step.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <Badge variant="outline" className="font-mono">
                          Step {step.step}
                        </Badge>
                        <h3 className="font-semibold">{step.title}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{step.description}</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="btn-interactive btn-outline-interactive"
                        onClick={() => navigate(step.path)}
                      >
                        Go to {step.title} <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* FAQ Section */}
      {activeSection === 'faq' && (
        <div className="space-y-6">
          <Card className="glassmorphism">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <HelpCircle className="h-5 w-5" />
                <span>Frequently Asked Questions</span>
              </CardTitle>
              <CardDescription>
                Common questions and answers about AutoTrain Advanced
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {faqs.map((faq, index) => (
                  <div
                    key={index}
                    className="p-4 rounded-lg border border-border/50 bg-card/50"
                  >
                    <div className="flex items-start space-x-3">
                      <AlertCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="font-semibold mb-2">{faq.question}</h3>
                        <p className="text-sm text-muted-foreground">{faq.answer}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tips & Tricks Section */}
      {activeSection === 'tips' && (
        <div className="space-y-6">
          <Card className="glassmorphism">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Lightbulb className="h-5 w-5" />
                <span>Tips & Tricks</span>
              </CardTitle>
              <CardDescription>
                Best practices and helpful tips to get the most out of AutoTrain Advanced
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tips.map((tip, index) => (
                  <div
                    key={index}
                    className="p-4 rounded-lg border border-border/50 bg-card/50 hover:bg-card/80 transition-colors"
                  >
                    <div className="flex items-start space-x-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <tip.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold mb-1">{tip.title}</h3>
                        <p className="text-sm text-muted-foreground">{tip.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Help;

