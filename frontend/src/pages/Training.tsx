import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { EmptyState } from '@/components/ui/empty-state';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { TooltipSimple } from '@/components/ui/tooltip-simple';
import { SkeletonCard } from '@/components/ui/skeleton';
import { 
  Brain, 
  Play, 
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  Settings,
  Zap,
  HelpCircle
} from 'lucide-react';
import { trainingAPI, datasetAPI } from '@/services/api';
import type { TrainingRequest } from '@/types/api';

interface TrainingJob {
  job_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  dataset_name: string;
  algorithm: string;
  target_column: string;
  task_type: string;
  accuracy?: number;
  error?: string;
  created_at: string;
}

interface Dataset {
  name: string;
  size: number;
  rows: number;
  columns: number;
  upload_date: number;
}

const Training = () => {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [jobs, setJobs] = useState<TrainingJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [training, setTraining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [selectedDataset, setSelectedDataset] = useState('');
  const [targetColumn, setTargetColumn] = useState('');
  const [taskType, setTaskType] = useState('classification');
  const [algorithm, setAlgorithm] = useState('random_forest');

  // Define algorithms based on task type
  const getAlgorithms = () => {
    if (taskType === 'classification') {
      return [
        { value: 'random_forest', label: 'Random Forest' },
        { value: 'logistic_regression', label: 'Logistic Regression' },
        { value: 'svm', label: 'Support Vector Machine' },
        { value: 'neural_network', label: 'Neural Network' }
        ].filter(alg => alg.value && alg.value.trim() !== '');
    } else {
      return [
        { value: 'linear_regression', label: 'Linear Regression' },
        { value: 'random_forest', label: 'Random Forest' },
        { value: 'svm', label: 'Support Vector Machine' },
        { value: 'neural_network', label: 'Neural Network' }
      ].filter(alg => alg.value && alg.value.trim() !== '');
    }
  };

  // Reset algorithm when task type changes
  useEffect(() => {
    const algorithms = getAlgorithms();
    if (!algorithms.find(alg => alg.value === algorithm)) {
      setAlgorithm(algorithms[0].value);
    }
  }, [taskType, algorithm]);

  const [testSize, setTestSize] = useState(0.2);
  const [randomState, setRandomState] = useState(42);

  // Preprocessing options
  const [excludeColumns, setExcludeColumns] = useState<string[]>([]);
  const [oheColumns, setOheColumns] = useState<string[]>([]);
  const [scaleColumns, setScaleColumns] = useState<string[]>([]);
  const [nullHandling, setNullHandling] = useState('drop');
  const [nullFillValue, setNullFillValue] = useState('');
  const [datasetColumns, setDatasetColumns] = useState<string[]>([]);
  const [separator, setSeparator] = useState<string>(',');

  // Load dataset columns when dataset changes
  useEffect(() => {
    if (selectedDataset) {
      loadDatasetColumns(selectedDataset);
    }
  }, [selectedDataset, separator]);

  const loadDatasets = async () => {
    try {
      const response = await datasetAPI.list();
      setDatasets(response.data.datasets || []);
    } catch (error) {
      console.error('Error loading datasets:', error);
    }
  };

  const loadDatasetColumns = async (datasetName: string) => {
    if (!datasetName) {
      setDatasetColumns([]);
      return;
    }
    
    try {
      console.log('Loading columns for dataset:', datasetName, 'with separator:', separator);
      const response = await datasetAPI.getInfo(datasetName, separator);
      console.log('Dataset info response:', response.data);
      const columns = response.data.column_names || response.data.columns || [];
      setDatasetColumns(columns);
      
      // Reset preprocessing options when dataset changes
      setExcludeColumns([]);
      setOheColumns([]);
      setScaleColumns([]);
    } catch (error) {
      console.error('Error loading dataset columns:', error);
      setDatasetColumns([]);
    }
  };

  const loadJobs = async () => {
    try {
      const response = await trainingAPI.listJobs();
      const allJobs = response.data.jobs || [];
      
      // Jobs now come with full details, no need to fetch status separately
      setJobs(allJobs);
    } catch (error) {
      console.error('Error loading jobs:', error);
      setJobs([]);
    }
  };

  const handleStartTraining = async () => {
    if (!selectedDataset) {
      setError('Please select a dataset');
      return;
    }
    if (!targetColumn) {
      setError('Please specify a target column');
      return;
    }

    try {
      setTraining(true);
      setError(null);
      
      const request: TrainingRequest = {
        dataset_name: selectedDataset,
        target_column: targetColumn,
        task_type: taskType as 'classification' | 'regression',
        algorithm: algorithm,
        test_size: testSize,
        random_state: randomState,
        exclude_columns: excludeColumns,
        ohe_columns: oheColumns,
        scale_columns: scaleColumns,
        null_handling: nullHandling,
        null_fill_value: nullFillValue,
        separator: separator
      };

      const response = await trainingAPI.start(request);
      setSuccess(`Training job started! Job ID: ${response.data.job_id.slice(0, 8)}`);
      
      // Reset form
      setSelectedDataset('');
      setTargetColumn('');
      
      // Refresh jobs
      await loadJobs();
    } catch (error) {
      console.error('Error starting training:', error);
      setError('Failed to start training job');
    } finally {
      setTraining(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'running':
        return <Clock className="h-4 w-4 text-blue-500 animate-pulse" />;
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

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([loadDatasets(), loadJobs()]);
      setLoading(false);
    };
    loadData();
  }, []);


  if (loading) {
    return (
      <div className="space-y-8 animate-fade-in-up">
        <div className="skeleton skeleton-heading w-48"></div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Breadcrumb */}
      <Breadcrumb items={[{ label: 'Training' }]} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="animate-fade-in-left">
          <h1 className="text-3xl font-bold text-gradient flex items-center gap-2">
            <Brain className="h-8 w-8" />
            Model Training
          </h1>
          <p className="text-muted-foreground mt-2">
            Train machine learning models with your datasets
          </p>
        </div>
        <TooltipSimple content="Refresh training jobs">
          <Button
            onClick={loadJobs}
            disabled={loading}
            variant="outline"
            size="sm"
            className="animate-fade-in-right btn-interactive btn-outline-interactive"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </TooltipSimple>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Training Configuration */}
        <Card className="glassmorphism animate-fade-in-left">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5 text-primary" />
              <span>Training Configuration</span>
            </CardTitle>
            <CardDescription>
              Configure your machine learning training parameters
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Dataset Selection */}
            <div className="space-y-2 relative" style={{ zIndex: 10 }}>
              <div className="flex items-center justify-between">
                <Label htmlFor="dataset">Dataset</Label>
                <TooltipSimple content="Choose a dataset to train your model on">
                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                </TooltipSimple>
              </div>
              <div className="relative" style={{ zIndex: 10 }}>
                <Select value={selectedDataset} onValueChange={setSelectedDataset}>
                  <SelectTrigger className="relative">
                    <SelectValue placeholder="Select a dataset" />
                  </SelectTrigger>
                  <SelectContent className="z-[99999]" style={{ zIndex: 99999 }}>
                    {datasets.length === 0 ? (
                      <SelectItem value="no-datasets" disabled>
                        No datasets available
                      </SelectItem>
                    ) : (
                      datasets.map((dataset) => (
                        <SelectItem key={dataset.name} value={dataset.name}>
                          {dataset.name} ({dataset.rows} rows, {dataset.columns} columns)
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Target Column */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="target">Target Column</Label>
                <TooltipSimple content="The column you want to predict">
                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                </TooltipSimple>
              </div>
              <Input
                id="target"
                value={targetColumn}
                onChange={(e) => setTargetColumn(e.target.value)}
                placeholder="e.g., price, label, category"
                className={!targetColumn && selectedDataset ? "border-warning" : ""}
              />
              {!targetColumn && selectedDataset && (
                <p className="text-xs text-warning">Target column is required</p>
              )}
            </div>

            {/* Task Type */}
            <div className="space-y-2 relative" style={{ zIndex: 10 }}>
              <Label htmlFor="task-type">Task Type</Label>
              <div className="relative" style={{ zIndex: 10 }}>
                <Select value={taskType} onValueChange={setTaskType}>
                  <SelectTrigger className="relative">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[99999]" style={{ zIndex: 99999 }}>
                    <SelectItem value="classification">Classification</SelectItem>
                    <SelectItem value="regression">Regression</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Algorithm */}
            <div className="space-y-2 relative" style={{ zIndex: 10 }}>
              <Label htmlFor="algorithm">Algorithm</Label>
              <div className="relative" style={{ zIndex: 10 }}>
                <Select value={algorithm} onValueChange={setAlgorithm}>
                  <SelectTrigger className="relative">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[99999]" style={{ zIndex: 99999 }}>
                    {getAlgorithms().map((alg) => (
                      <SelectItem key={alg.value} value={alg.value}>
                        {alg.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Advanced Settings */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="test-size">Test Size</Label>
                <Input
                  id="test-size"
                  type="number"
                  min="0.1"
                  max="0.5"
                  step="0.1"
                  value={testSize}
                  onChange={(e) => setTestSize(parseFloat(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="random-state">Random State</Label>
                <Input
                  id="random-state"
                  type="number"
                  value={randomState}
                  onChange={(e) => setRandomState(parseInt(e.target.value))}
                />
              </div>
            </div>

            {/* CSV Separator */}
            <div className="space-y-2">
              <Label htmlFor="separator" className="text-sm font-medium">
                CSV Separator
              </Label>
              <select
                id="separator"
                value={separator}
                onChange={(e) => setSeparator(e.target.value)}
                className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
              >
                <option value=",">Comma (,)</option>
                <option value=";">Semicolon (;)</option>
                <option value="\t">Tab (\t)</option>
                <option value="|">Pipe (|)</option>
                <option value=" ">Space ( )</option>
              </select>
              <p className="text-xs text-muted-foreground">
                Select the character used to separate columns in your CSV file
              </p>
            </div>

            {/* Data Preprocessing */}
            {datasetColumns.length > 0 && (
              <div className="space-y-4 border-t pt-4">
                <div className="flex items-center space-x-2">
                  <Zap className="h-4 w-4 text-primary" />
                  <Label className="text-sm font-medium">Data Preprocessing</Label>
                </div>
                
                {/* Exclude Columns */}
                <div className="space-y-2">
                  <Label className="text-sm">Exclude Columns</Label>
                  <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border rounded p-2">
                    {datasetColumns.map((column) => (
                      <label key={column} className="flex items-center space-x-2 text-sm">
                        <input
                          type="checkbox"
                          checked={excludeColumns.includes(column)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setExcludeColumns([...excludeColumns, column]);
                            } else {
                              setExcludeColumns(excludeColumns.filter(c => c !== column));
                            }
                          }}
                          className="rounded"
                        />
                        <span className="truncate">{column}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* One-Hot Encoding */}
                <div className="space-y-2">
                  <Label className="text-sm">One-Hot Encoding (Categorical Columns)</Label>
                  <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border rounded p-2">
                    {datasetColumns.filter(col => !excludeColumns.includes(col) && col !== targetColumn).map((column) => (
                      <label key={column} className="flex items-center space-x-2 text-sm">
                        <input
                          type="checkbox"
                          checked={oheColumns.includes(column)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setOheColumns([...oheColumns, column]);
                            } else {
                              setOheColumns(oheColumns.filter(c => c !== column));
                            }
                          }}
                          className="rounded"
                        />
                        <span className="truncate">{column}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Standard Scaling */}
                <div className="space-y-2">
                  <Label className="text-sm">Standard Scaling (Numerical Columns)</Label>
                  <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border rounded p-2">
                    {datasetColumns.filter(col => !excludeColumns.includes(col) && col !== targetColumn).map((column) => (
                      <label key={column} className="flex items-center space-x-2 text-sm">
                        <input
                          type="checkbox"
                          checked={scaleColumns.includes(column)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setScaleColumns([...scaleColumns, column]);
                            } else {
                              setScaleColumns(scaleColumns.filter(c => c !== column));
                            }
                          }}
                          className="rounded"
                        />
                        <span className="truncate">{column}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Null Value Handling */}
                <div className="space-y-2">
                  <Label className="text-sm">Null Value Handling</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Select value={nullHandling} onValueChange={setNullHandling}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="drop">Drop rows with nulls</SelectItem>
                          <SelectItem value="fill">Fill with value</SelectItem>
                          <SelectItem value="mean">Fill with mean</SelectItem>
                          <SelectItem value="median">Fill with median</SelectItem>
                          <SelectItem value="mode">Fill with mode</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {nullHandling === 'fill' && (
                      <div className="space-y-2">
                        <Label className="text-sm">Fill Value</Label>
                        <Input
                          value={nullFillValue}
                          onChange={(e) => setNullFillValue(e.target.value)}
                          placeholder="Enter fill value"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Start Training Button */}
            <Button 
              onClick={handleStartTraining}
              disabled={!selectedDataset || !targetColumn || training}
              className="w-full btn-interactive btn-primary-interactive"
              size="lg"
            >
              {training ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Starting Training...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Start Training
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Training Jobs */}
        <Card className="glassmorphism animate-fade-in-right">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Brain className="h-5 w-5 text-primary" />
              <span>Training Jobs</span>
            </CardTitle>
            <CardDescription>
              Monitor your training job progress
            </CardDescription>
          </CardHeader>
          <CardContent>
            {jobs.length === 0 ? (
              <EmptyState
                icon={Brain}
                title="No training jobs yet"
                description="Configure your training parameters and start your first training job"
              />
            ) : (
              <div className="space-y-4">
                {jobs.map((job, index) => (
                  <div 
                    key={job.job_id}
                    className="p-4 border rounded-lg hover:shadow-md transition-all duration-200 animate-fade-in-up"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(job.status)}
                        <span className="font-medium">Job #{typeof job.job_id === 'string' ? job.job_id.slice(0, 8) : 'Unknown'}</span>
                      </div>
                      <Badge 
                        variant="outline" 
                        className={getStatusColor(job.status)}
                      >
                        {getStatusText(job.status)}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Dataset:</span>
                        <span className="font-medium">{job.dataset_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Algorithm:</span>
                        <span className="font-medium">{job.algorithm}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Target:</span>
                        <span className="font-medium">{job.target_column}</span>
                      </div>
                      {job.accuracy && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Accuracy:</span>
                          <span className="font-medium text-green-600">
                            {(job.accuracy * 100).toFixed(1)}%
                          </span>
                        </div>
                      )}
                      {job.error && (
                        <div className="text-red-600 text-xs mt-2 p-2 bg-red-50 rounded">
                          {job.error}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <Alert variant="destructive" onClose={() => setError(null)}>
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert variant="success" onClose={() => setSuccess(null)}>
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default Training;