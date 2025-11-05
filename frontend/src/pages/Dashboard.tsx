import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { StatsCard } from '@/components/ui/stats-card';
import { EmptyState } from '@/components/ui/empty-state';
import { TooltipSimple } from '@/components/ui/tooltip-simple';
import { SkeletonCard } from '@/components/ui/skeleton';
import { WelcomeScreen } from '@/components/WelcomeScreen';
import { 
  Database, 
  Brain, 
  TrendingUp,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  ListChecks,
  Activity,
  Circle,
  Minus,
  ArrowRight,
  Sparkles,
  FileText,
  Settings,
  Target,
  Play,
  BarChart3,
  HelpCircle
} from 'lucide-react';
import { trainingAPI, datasetAPI } from '@/services/api';
import type { TrainingJob, AxiosErrorResponse } from '@/types/api';

interface DashboardData {
  totalDatasets: number;
  totalJobs: number;
  completedJobs: number;
  recentJobs: TrainingJob[];
}

const Dashboard = () => {
  const [data, setData] = useState<DashboardData>({
    totalDatasets: 0,
    totalJobs: 0,
    completedJobs: 0,
    recentJobs: []
  });
  const [loading, setLoading] = useState(false); // Start with false so dashboard renders immediately
  const [refreshing, setRefreshing] = useState(false);
  const [tutorial, setTutorial] = useState<{ [key: string]: boolean }>({});
  const [showWelcome, setShowWelcome] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);
  const isLoadingRef = useRef(false);
  const hasInitialLoadRef = useRef(false);

  const loadDashboardData = useCallback(async (isRefresh = false) => {
    // Cancel any pending requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    // Prevent multiple simultaneous loads
    if (isLoadingRef.current && !isRefresh) {
      return;
    }

    isLoadingRef.current = true;

    try {
      if (isRefresh) {
        setRefreshing(true);
      } else if (!hasInitialLoadRef.current) {
        // Only set loading on initial load
        setLoading(true);
      }
      
      // Load datasets and training jobs in parallel with timeout
      // Use Promise.allSettled to handle individual failures gracefully
      const requests = Promise.allSettled([
        datasetAPI.list().catch(err => ({ error: err, data: { datasets: [] } })),
        trainingAPI.listJobs().catch(err => ({ error: err, data: { jobs: [] } }))
      ]);

      // Add overall timeout (15 seconds)
      const timeoutId = setTimeout(() => {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
      }, 15000);

      const results = await requests;
      clearTimeout(timeoutId);

      // Extract responses, using defaults on failure
      const datasetsResult = results[0];
      const jobsResult = results[1];
      
      const datasetsResponse = datasetsResult.status === 'fulfilled' 
        ? datasetsResult.value 
        : { data: { datasets: [] } };
      const jobsResponse = jobsResult.status === 'fulfilled'
        ? jobsResult.value
        : { data: { jobs: [] } };

      // Check if component is still mounted and request wasn't aborted
      if (!isMountedRef.current || signal.aborted) {
        return;
      }

      const totalDatasets = datasetsResponse.data.datasets?.length || 0;
      const allJobs = jobsResponse.data.jobs || [];
      const recentJobsWithStatus = allJobs.slice(0, 5);
      const completedJobs = allJobs.filter((job: TrainingJob) => job.status === 'completed').length;

      setData({
        totalDatasets,
        totalJobs: allJobs.length,
        completedJobs,
        recentJobs: recentJobsWithStatus
      });
      
      // Show welcome screen if no data
      const hasData = totalDatasets > 0 || allJobs.length > 0;
      const hasSeenWelcome = localStorage.getItem('hasSeenWelcome') === 'true';
      setShowWelcome(!hasData && !hasSeenWelcome);
      
    } catch (error) {
      // Don't update state if request was aborted
      if (signal.aborted || !isMountedRef.current) {
        return;
      }

      console.error('Error loading dashboard data:', error);
      const err = error as AxiosErrorResponse & { code?: string; message?: string };
      
      // Only log if it's not a cancellation error
      if (err?.code !== 'ERR_CANCELED' && err?.code !== 'ERR_ABORTED' && err?.message !== 'Request timeout') {
        console.error('Error details:', err?.response?.data?.detail || err?.message);
      }

      // Set default values on error to prevent infinite loading
      // This allows the dashboard to render even if backend is unavailable
      setData({
        totalDatasets: 0,
        totalJobs: 0,
        completedJobs: 0,
        recentJobs: []
      });
    } finally {
      isLoadingRef.current = false;
      if (isMountedRef.current && !signal.aborted) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    await loadDashboardData(true);
  }, [loadDashboardData]);

  useEffect(() => {
    isMountedRef.current = true;
    
    // Only load once on initial mount
    if (!hasInitialLoadRef.current) {
      hasInitialLoadRef.current = true;
      // Load data asynchronously without blocking render
      const loadData = async () => {
        await loadDashboardData();
      };
      loadData();
    }

    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Tutorial persistence - load on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('autotrain_tutorial_progress');
      if (saved) {
        const parsed = JSON.parse(saved);
        setTutorial(parsed);
      }
    } catch (error) {
      console.warn('Failed to restore tutorial progress from localStorage:', error);
    }
  }, []);

  // Tutorial persistence - save with debounce
  useEffect(() => {
    if (Object.keys(tutorial).length === 0) return; // Don't save if empty (initial load)
    
    const timeoutId = setTimeout(() => {
      try {
        localStorage.setItem('autotrain_tutorial_progress', JSON.stringify(tutorial));
      } catch (error) {
        console.warn('Failed to persist tutorial progress to localStorage:', error);
      }
    }, 300); // Debounce by 300ms

    return () => clearTimeout(timeoutId);
  }, [tutorial]);

  const getStepStatus = useCallback((id: string): 'done' | 'in-progress' | 'skipped' | 'not-started' => {
    if (tutorial[id]) return 'done';
    // Check if any previous step is done to mark as in-progress
    const allSteps = [
      'upload', 'ai_analyze', 'manual_preview', 'apply_ops', 'view_report',
      'select_dataset', 'pick_target', 'choose_algo', 'start_training', 'review_report'
    ];
    const currentIndex = allSteps.indexOf(id);
    if (currentIndex > 0 && tutorial[allSteps[currentIndex - 1]]) {
      return 'in-progress';
    }
    return 'not-started';
  }, [tutorial]);

  const markStep = useCallback((id: string, status: 'done' | 'in-progress' | 'skipped') => {
    setTutorial(prev => {
      // Only update if state actually changes
      const currentValue = prev[id];
      const currentSkipped = prev[`${id}_skipped`];
      
      if (status === 'done' && currentValue === true) {
        return prev; // No change needed
      }
      if (status === 'skipped' && currentSkipped === true) {
        return prev; // No change needed
      }
      if (status === 'in-progress' && currentValue === false && currentSkipped === false) {
        return prev; // Already in progress state
      }

      const newState = { ...prev };
      if (status === 'done') {
        newState[id] = true;
        delete newState[`${id}_skipped`];
      } else if (status === 'skipped') {
        newState[id] = false;
        newState[`${id}_skipped`] = true;
      } else {
        newState[id] = false;
        delete newState[`${id}_skipped`];
      }
      return newState;
    });
  }, []);

  const calculateProgress = useMemo(() => {
    const allSteps = [
      'upload', 'ai_analyze', 'manual_preview', 'apply_ops', 'view_report',
      'select_dataset', 'pick_target', 'choose_algo', 'start_training', 'review_report'
    ];
    const completed = allSteps.filter(id => tutorial[id]).length;
    return Math.round((completed / allSteps.length) * 100);
  }, [tutorial]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'running':
        return <Clock className="h-4 w-4 text-blue-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'failed':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'running':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default:
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Failed';
      case 'running':
        return 'Running';
      default:
        return 'Pending';
    }
  };

  const getSecondaryText = (job: TrainingJob) => {
    if (job.status === 'completed' && job.accuracy) {
      return `Accuracy: ${(job.accuracy * 100).toFixed(1)}%`;
    }
    if (job.status === 'failed' && job.error) {
      return job.error;
    }
    return `${job.algorithm} • ${job.dataset_name}`;
  };

  const stats = useMemo(() => [
    {
      title: 'Total Datasets',
      value: data.totalDatasets,
      icon: Database,
      description: 'Uploaded datasets'
    },
    {
      title: 'Training Jobs',
      value: data.totalJobs,
      icon: Brain,
      description: 'Total jobs created'
    },
    {
      title: 'Completed Jobs',
      value: data.completedJobs,
      icon: CheckCircle,
      description: 'Successfully completed'
    },
    {
      title: 'Success Rate',
      value: data.totalJobs > 0 ? `${Math.round((data.completedJobs / data.totalJobs) * 100)}%` : '0%',
      icon: TrendingUp,
      description: 'Job completion rate'
    }
  ], [data.totalDatasets, data.totalJobs, data.completedJobs]);

  // Always render dashboard - don't block on loading
  // Data will update asynchronously when API calls complete

  // Show welcome screen if appropriate
  if (showWelcome) {
    return <WelcomeScreen onDismiss={() => {
      localStorage.setItem('hasSeenWelcome', 'true');
      setShowWelcome(false);
    }} />;
  }

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Backend Test */}
      {/* <BackendTest /> */} {/* Uncomment this to test backend connection to frontend */}
      
      {/* Breadcrumb */}
      <Breadcrumb items={[{ label: 'Dashboard' }]} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="animate-fade-in-left">
          <h1 className="text-3xl font-bold text-gradient flex items-center gap-2">
            <Activity className="h-8 w-8" />
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            Overview of your machine learning projects
          </p>
        </div>
        <TooltipSimple content="Refresh all dashboard data">
          <Button 
            onClick={handleRefresh} 
            disabled={refreshing}
            variant="outline"
            size="sm"
            className="animate-fade-in-right btn-interactive btn-outline-interactive"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </TooltipSimple>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <StatsCard
            key={index}
            title={stat.title}
            value={stat.value}
            description={stat.description}
            icon={stat.icon}
            delay={index * 0.1}
          />
        ))}
      </div>

      {/* Guided Tutorial - Roadmap Style */}
      <Card className="glassmorphism animate-fade-in-up">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <ListChecks className="h-5 w-5" />
                <span>Getting Started Roadmap</span>
              </CardTitle>
              <CardDescription>Follow this roadmap to preprocess data and train your first model</CardDescription>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-2xl font-bold text-primary">{calculateProgress}%</div>
                <div className="text-xs text-muted-foreground">Complete</div>
              </div>
              <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-500"
                  style={{ width: `${calculateProgress}%` }}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            {/* Stage 1: Foundation */}
            <div className="roadmap-stage">
              <div className="flex items-center space-x-3 mb-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 border-2 border-primary">
                  <Database className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Stage 1: Foundation</h3>
                  <p className="text-sm text-muted-foreground">Prepare your dataset</p>
                </div>
              </div>
              <div className="ml-[52px] space-y-3">
                {[
                  { 
                    id: 'upload', 
                    label: 'Upload or select a dataset', 
                    description: 'Go to Datasets page and upload your CSV or Parquet file',
                    href: '/datasets',
                    icon: Database
                  }
                ].map((step, index, array) => {
                  const status = getStepStatus(step.id);
                  const isDone = tutorial[step.id];
                  const isSkipped = tutorial[`${step.id}_skipped`];
                  const isLast = index === array.length - 1;
                  
                  return (
                    <div key={step.id} className="relative">
                      {/* Connector line - connect to next step if not last */}
                      {!isLast && (
                        <div className={`absolute left-5 top-8 w-0.5 ${
                          isDone ? 'bg-green-500' : 'bg-border'
                        }`} style={{ height: 'calc(100% + 0.75rem)', top: '2rem' }} />
                      )}
                      
                      <div 
                        className={`flex items-start space-x-4 p-4 rounded-lg border-2 transition-all cursor-pointer hover:shadow-md ${
                          isDone 
                            ? 'border-green-500/50 bg-green-500/5' 
                            : isSkipped
                            ? 'border-gray-500/30 bg-gray-500/5 opacity-60'
                            : status === 'in-progress'
                            ? 'border-blue-500/50 bg-blue-500/5'
                            : 'border-border/50 bg-card/50 hover:border-primary/50'
                        }`}
                        onClick={(e) => {
                          if (e.shiftKey) {
                            markStep(step.id, 'in-progress');
                          } else if (e.altKey || e.metaKey) {
                            markStep(step.id, 'skipped');
                          } else {
                            markStep(step.id, 'done');
                          }
                        }}
                      >
                        <div className="flex-shrink-0 mt-1">
                          {isDone ? (
                            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                              <CheckCircle className="h-5 w-5 text-white" />
                            </div>
                          ) : isSkipped ? (
                            <div className="w-8 h-8 rounded-full bg-gray-500/30 flex items-center justify-center">
                              <Minus className="h-5 w-5 text-gray-500" />
                            </div>
                          ) : status === 'in-progress' ? (
                            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center animate-pulse">
                              <Circle className="h-5 w-5 text-white fill-white" />
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-full border-2 border-border flex items-center justify-center">
                              <step.icon className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className={`font-medium ${isDone ? 'text-green-600 dark:text-green-400' : isSkipped ? 'text-gray-500 line-through' : ''}`}>
                                {step.label}
                              </h4>
                              <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
                            </div>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.location.assign(step.href);
                              }}
                              className="btn-interactive"
                            >
                              Go <ArrowRight className="h-3 w-3 ml-1" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Stage 2: Preprocessing */}
            <div className="roadmap-stage">
              <div className="flex items-center space-x-3 mb-4">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  tutorial['upload'] ? 'bg-purple-500/10 border-purple-500' : 'bg-muted border-border'
                }`}>
                  <Sparkles className={`h-5 w-5 ${tutorial['upload'] ? 'text-purple-500' : 'text-muted-foreground'}`} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Stage 2: Preprocessing</h3>
                  <p className="text-sm text-muted-foreground">Clean and prepare your data</p>
                </div>
              </div>
              <div className="ml-[52px] space-y-3">
                {[
                  { 
                    id: 'ai_analyze', 
                    label: 'Run AI Analysis', 
                    description: 'Get intelligent cleaning suggestions from AI',
                    href: '/preprocessing',
                    icon: Sparkles
                  },
                  { 
                    id: 'manual_preview', 
                    label: 'Preview Columns', 
                    description: 'Open Manual tab and review column statistics',
                    href: '/preprocessing',
                    icon: FileText
                  },
                  { 
                    id: 'apply_ops', 
                    label: 'Apply Preprocessing', 
                    description: 'Apply manual operations or AI suggestions',
                    href: '/preprocessing',
                    icon: Settings
                  },
                  { 
                    id: 'view_report', 
                    label: 'View Preprocessing Report', 
                    description: 'Check the preprocessing report in Reports tab',
                    href: '/preprocessing',
                    icon: BarChart3
                  }
                ].map((step, index, array) => {
                  const status = getStepStatus(step.id);
                  const isDone = tutorial[step.id];
                  const isSkipped = tutorial[`${step.id}_skipped`];
                  const isLast = index === array.length - 1;
                  
                  return (
                    <div key={step.id} className="relative">
                      {/* Connector line - connect to next step if not last */}
                      {!isLast && (
                        <div className={`absolute left-5 top-8 w-0.5 ${
                          isDone ? 'bg-green-500' : 'bg-border'
                        }`} style={{ height: 'calc(100% + 0.75rem)', top: '2rem' }} />
                      )}
                      
                      <div 
                        className={`flex items-start space-x-4 p-4 rounded-lg border-2 transition-all cursor-pointer hover:shadow-md ${
                          isDone 
                            ? 'border-green-500/50 bg-green-500/5' 
                            : isSkipped
                            ? 'border-gray-500/30 bg-gray-500/5 opacity-60'
                            : status === 'in-progress'
                            ? 'border-blue-500/50 bg-blue-500/5'
                            : 'border-border/50 bg-card/50 hover:border-primary/50'
                        }`}
                        onClick={(e) => {
                          if (e.shiftKey) {
                            markStep(step.id, 'in-progress');
                          } else if (e.altKey || e.metaKey) {
                            markStep(step.id, 'skipped');
                          } else {
                            markStep(step.id, 'done');
                          }
                        }}
                      >
                        <div className="flex-shrink-0 mt-1">
                          {isDone ? (
                            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                              <CheckCircle className="h-5 w-5 text-white" />
                            </div>
                          ) : isSkipped ? (
                            <div className="w-8 h-8 rounded-full bg-gray-500/30 flex items-center justify-center">
                              <Minus className="h-5 w-5 text-gray-500" />
                            </div>
                          ) : status === 'in-progress' ? (
                            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center animate-pulse">
                              <Circle className="h-5 w-5 text-white fill-white" />
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-full border-2 border-border flex items-center justify-center">
                              <step.icon className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className={`font-medium ${isDone ? 'text-green-600 dark:text-green-400' : isSkipped ? 'text-gray-500 line-through' : ''}`}>
                                {step.label}
                              </h4>
                              <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
                            </div>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.location.assign(step.href);
                              }}
                              className="btn-interactive"
                            >
                              Go <ArrowRight className="h-3 w-3 ml-1" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Stage 3: Training */}
            <div className="roadmap-stage">
              <div className="flex items-center space-x-3 mb-4">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  tutorial['view_report'] ? 'bg-blue-500/10 border-blue-500' : 'bg-muted border-border'
                }`}>
                  <Brain className={`h-5 w-5 ${tutorial['view_report'] ? 'text-blue-500' : 'text-muted-foreground'}`} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Stage 3: Training</h3>
                  <p className="text-sm text-muted-foreground">Train your machine learning model</p>
                </div>
              </div>
              <div className="ml-[52px] space-y-3">
                {[
                  { 
                    id: 'select_dataset', 
                    label: 'Select Dataset', 
                    description: 'Choose your dataset (CSV or processed Parquet)',
                    href: '/training',
                    icon: Database
                  },
                  { 
                    id: 'pick_target', 
                    label: 'Choose Target & Task Type', 
                    description: 'Select target column and task type (classification/regression)',
                    href: '/training',
                    icon: Target
                  },
                  { 
                    id: 'choose_algo', 
                    label: 'Select Algorithm', 
                    description: 'Pick an algorithm and configure parameters',
                    href: '/training',
                    icon: Settings
                  },
                  { 
                    id: 'start_training', 
                    label: 'Start Training', 
                    description: 'Launch training job and monitor progress',
                    href: '/training',
                    icon: Play
                  },
                  { 
                    id: 'review_report', 
                    label: 'Review Results', 
                    description: 'Check training report, metrics, and export model',
                    href: '/reports',
                    icon: BarChart3
                  }
                ].map((step, index, array) => {
                  const status = getStepStatus(step.id);
                  const isDone = tutorial[step.id];
                  const isSkipped = tutorial[`${step.id}_skipped`];
                  const isLast = index === array.length - 1;
                  
                  return (
                    <div key={step.id} className="relative">
                      {/* Connector line - connect to next step if not last */}
                      {!isLast && (
                        <div className={`absolute left-5 top-8 w-0.5 ${
                          isDone ? 'bg-green-500' : 'bg-border'
                        }`} style={{ height: 'calc(100% + 0.75rem)', top: '2rem' }} />
                      )}
                      
                      <div 
                        className={`flex items-start space-x-4 p-4 rounded-lg border-2 transition-all cursor-pointer hover:shadow-md ${
                          isDone 
                            ? 'border-green-500/50 bg-green-500/5' 
                            : isSkipped
                            ? 'border-gray-500/30 bg-gray-500/5 opacity-60'
                            : status === 'in-progress'
                            ? 'border-blue-500/50 bg-blue-500/5'
                            : 'border-border/50 bg-card/50 hover:border-primary/50'
                        }`}
                        onClick={(e) => {
                          if (e.shiftKey) {
                            markStep(step.id, 'in-progress');
                          } else if (e.altKey || e.metaKey) {
                            markStep(step.id, 'skipped');
                          } else {
                            markStep(step.id, 'done');
                          }
                        }}
                      >
                        <div className="flex-shrink-0 mt-1">
                          {isDone ? (
                            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                              <CheckCircle className="h-5 w-5 text-white" />
                            </div>
                          ) : isSkipped ? (
                            <div className="w-8 h-8 rounded-full bg-gray-500/30 flex items-center justify-center">
                              <Minus className="h-5 w-5 text-gray-500" />
                            </div>
                          ) : status === 'in-progress' ? (
                            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center animate-pulse">
                              <Circle className="h-5 w-5 text-white fill-white" />
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-full border-2 border-border flex items-center justify-center">
                              <step.icon className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className={`font-medium ${isDone ? 'text-green-600 dark:text-green-400' : isSkipped ? 'text-gray-500 line-through' : ''}`}>
                                {step.label}
                              </h4>
                              <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
                            </div>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.location.assign(step.href);
                              }}
                              className="btn-interactive"
                            >
                              Go <ArrowRight className="h-3 w-3 ml-1" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Help Text */}
            <div className="mt-6 p-4 rounded-lg bg-muted/50 border border-border/50">
              <div className="flex items-start space-x-3">
                <HelpCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div className="flex-1 text-sm text-muted-foreground">
                  <p className="font-medium mb-2">How to use this roadmap:</p>
                  <ul className="space-y-1 list-disc list-inside">
                    <li><strong>Click</strong> a step to mark it as done</li>
                    <li><strong>Shift + Click</strong> to mark as in progress</li>
                    <li><strong>Alt/Option + Click</strong> to skip a step</li>
                    <li>Progress is automatically saved and persists across sessions</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Jobs */}
      <Card className="glassmorphism animate-fade-in-up">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Brain className="h-5 w-5" />
            <span>Recent Training Jobs</span>
          </CardTitle>
          <CardDescription>
            Latest training job activities and their status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.recentJobs.length === 0 ? (
            <EmptyState
              icon={Brain}
              title="No training jobs yet"
              description="Start by creating your first training job to see it here"
              action={{
                label: "Go to Training",
                onClick: () => window.location.assign('/training')
              }}
            />
          ) : (
            <div className="space-y-4">
              {data.recentJobs.map((job) => (
                <div key={job.job_id} className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-card/50">
                  <div className="flex items-center space-x-4">
                    {getStatusIcon(job.status)}
                    <div>
                      <p className="font-medium">Job #{typeof job.job_id === 'string' ? job.job_id.slice(0, 8) : 'Unknown'}</p>
                      <p className="text-sm text-muted-foreground">
                        {getSecondaryText(job)}
                      </p>
                    </div>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={getStatusColor(job.status)}
                  >
                    {getStatusText(job.status)}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;