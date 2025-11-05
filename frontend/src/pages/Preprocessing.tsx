import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Database, 
  Brain, 
  Download,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Sparkles,
  Zap,
  BarChart3,
  RefreshCw,
  Trash2,
  Eye,
  Settings,
  Target
} from 'lucide-react';
import { preprocessingAPI, datasetAPI } from '@/services/api';
import type { Dataset } from '@/types/api';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { TooltipSimple } from '@/components/ui/tooltip-simple';

interface PreprocessingJob {
  job_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  dataset_name: string;
  preprocessing_options: Record<string, unknown>;
  ai_analysis: boolean;
  created_at: string;
  completed_at?: string;
  result?: Record<string, unknown>;
  error?: string;
}

interface AISuggestion {
  type: string;
  reason: string;
  method?: string;
  columns?: string[];
  target_type?: string;
}

interface ColumnSummary {
  name: string;
  dtype: string;
  non_null: number;
  nulls: number;
  unique: number;
  zeros: number;
  sample_values: Array<string | number | null>;
  stats: Record<string, number | null>;
}

interface ManualOperations {
  drop_columns: string[];
  change_types: Record<string, string>;
  missing: Record<string, { method: string; value?: string | number }>;
  balance?: { method: string; target_column: string };
}

const Preprocessing = () => {
  const [searchParams] = useSearchParams();
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<string>('');
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [appliedSuggestions, setAppliedSuggestions] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [jobs, setJobs] = useState<PreprocessingJob[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [manualOptions] = useState({
    handle_missing_values: false,
    missing_values_method: 'mean',
    handle_outliers: false,
    remove_duplicates: false,
    convert_data_types: false,
    data_types: {} as Record<string, string>,
  });
  const [reports, setReports] = useState<Array<{ filename: string; job_id: string; created: number; url: string; dataset_name?: string }>>([]);
  const [columnSummaries, setColumnSummaries] = useState<ColumnSummary[]>([]);
  const [classBalance, setClassBalance] = useState<Record<string, number> | null>(null);
  const [targetColumn, setTargetColumn] = useState<string>('');
  const [manualOps, setManualOps] = useState<ManualOperations>({
    drop_columns: [],
    change_types: {},
    missing: {},
    balance: undefined
  });
  const [previewLoading, setPreviewLoading] = useState(false);

  const loadDatasets = async () => {
    try {
      const response = await datasetAPI.list();
      setDatasets(response.data.datasets || []);
    } catch (error) {
      console.error('Error loading datasets:', error);
    }
  };

  const loadJobs = async () => {
    try {
      const response = await preprocessingAPI.listJobs();
      setJobs(response.data.jobs || []);
    } catch (error) {
      console.error('Error loading jobs:', error);
    }
  };

  const loadReports = async () => {
    try {
      const response = await preprocessingAPI.listReports();
      setReports(response.data.reports || []);
    } catch (error) {
      console.error('Error loading preprocessing reports:', error);
    }
  };

  const analyzeDataset = async () => {
    if (!selectedDataset) return;
    
    setAnalyzing(true);
    try {
      const response = await preprocessingAPI.aiAnalyze(selectedDataset);
      console.log('AI Analysis Response:', response.data);
      console.log('Suggested Preprocessing:', response.data.suggested_preprocessing);
      setAiSuggestions(response.data.suggested_preprocessing || []);
    } catch (error) {
      console.error('Error analyzing dataset:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  const applySuggestion = (index: number) => {
    setAppliedSuggestions(prev => new Set([...prev, index]));
  };

  const applyAllSuggestions = () => {
    setAppliedSuggestions(new Set(aiSuggestions.map((_, index) => index)));
  };

  const startPreprocessing = async () => {
    if (!selectedDataset || appliedSuggestions.size === 0) return;
    
    setLoading(true);
    try {
      // Get only the applied suggestions
      const selectedSuggestions = aiSuggestions.filter((_, index) => appliedSuggestions.has(index));
      
      const response = await preprocessingAPI.startPreprocessing({
        dataset_name: selectedDataset,
        preprocessing_options: {},
        ai_analysis: true,
        selected_suggestions: selectedSuggestions
      });
      
      // Refresh jobs list
      await loadJobs();
      
      // Reset applied suggestions
      setAppliedSuggestions(new Set());
      
      // Show success message
      console.log('Preprocessing started:', response.data);
    } catch (error) {
      console.error('Error starting preprocessing:', error);
    } finally {
      setLoading(false);
    }
  };

  const startManualPreprocessing = async () => {
    if (!selectedDataset) return;
    setLoading(true);
    try {
      await preprocessingAPI.startManual({
        dataset_name: selectedDataset,
        ...manualOptions,
      });
      await loadJobs();
    } catch (error) {
      console.error('Error starting manual preprocessing:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadColumnPreview = async () => {
    if (!selectedDataset) return;
    setPreviewLoading(true);
    try {
      const targetCol = targetColumn === 'none' ? undefined : targetColumn;
      const response = await preprocessingAPI.manualPreview(selectedDataset, targetCol);
      console.log('Column preview response:', response.data);
      setColumnSummaries(response.data.columns || []);
      setClassBalance(response.data.class_balance || null);
    } catch (error) {
      console.error('Error loading column preview:', error);
    } finally {
      setPreviewLoading(false);
    }
  };

  const applyManualOperations = async () => {
    if (!selectedDataset) return;
    setLoading(true);
    try {
      await preprocessingAPI.manualApply({
        dataset_name: selectedDataset,
        operations: manualOps,
        separator: ','
      });
      await loadJobs();
      // Reset operations
      setManualOps({
        drop_columns: [],
        change_types: {},
        missing: {},
        balance: undefined
      });
    } catch (error) {
      console.error('Error applying manual operations:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleColumnDrop = (columnName: string) => {
    setManualOps(prev => ({
      ...prev,
      drop_columns: prev.drop_columns.includes(columnName)
        ? prev.drop_columns.filter(c => c !== columnName)
        : [...prev.drop_columns, columnName]
    }));
  };

  const setColumnType = (columnName: string, newType: string) => {
    setManualOps(prev => ({
      ...prev,
      change_types: {
        ...prev.change_types,
        [columnName]: newType
      }
    }));
  };

  const setMissingHandling = (columnName: string, method: string, value?: string | number) => {
    setManualOps(prev => ({
      ...prev,
      missing: {
        ...prev.missing,
        [columnName]: { method, value }
      }
    }));
  };

  const downloadProcessedData = async (jobId: string) => {
    try {
      const response = await preprocessingAPI.downloadProcessedData(jobId);
      // Handle file download
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `processed_data_${jobId}.parquet`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading processed data:', error);
    }
  };

  const viewReport = (jobId: string) => {
    const url = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/preprocessing/reports/${jobId}`;
    window.open(url, '_blank');
  };

  useEffect(() => {
    loadDatasets();
    loadJobs();
    loadReports();
    
    // Check if dataset is provided in URL
    const datasetParam = searchParams.get('dataset');
    if (datasetParam) {
      setSelectedDataset(datasetParam);
    }
  }, [searchParams]);

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

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Breadcrumb */}
      <Breadcrumb items={[{ label: 'Preprocessing' }]} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="animate-fade-in-left">
          <h1 className="text-3xl font-bold text-gradient flex items-center gap-2">
            <Settings className="h-8 w-8" />
            Data Preprocessing
          </h1>
          <p className="text-muted-foreground mt-2">
            AI-powered data cleaning and preprocessing
          </p>
        </div>
        <TooltipSimple content="Refresh preprocessing jobs">
          <Button 
            onClick={loadJobs}
            variant="outline"
            size="sm"
            className="animate-fade-in-right btn-interactive btn-outline-interactive"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </TooltipSimple>
      </div>

      <Tabs defaultValue="preprocess" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="preprocess">AI Preprocess</TabsTrigger>
          <TabsTrigger value="manual">Manual Preprocess</TabsTrigger>
          <TabsTrigger value="jobs">Processing Jobs</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="preprocess" className="space-y-6">
          {/* Dataset Selection */}
          <Card className="glassmorphism">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Database className="h-5 w-5" />
                <span>Select Dataset</span>
              </CardTitle>
              <CardDescription>
                Choose a dataset to preprocess and clean
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="dataset">Dataset</Label>
                <Select value={selectedDataset} onValueChange={setSelectedDataset}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a dataset" />
                  </SelectTrigger>
                  <SelectContent>
                    {datasets.map((dataset) => (
                      <SelectItem key={dataset.name} value={dataset.name}>
                        <div className="flex items-center space-x-2">
                          <span>{dataset.name}</span>
                          <span className="text-xs text-muted-foreground">
                            ({dataset.rows} rows, {dataset.columns} columns)
                          </span>
                          <span className={`text-xs px-2 py-1 rounded ${
                            dataset.file_type === 'parquet' 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                          }`}>
                            {dataset.file_type?.toUpperCase() || 'CSV'}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {selectedDataset && (
                <div className="flex space-x-4">
                  <Button 
                    onClick={analyzeDataset} 
                    disabled={analyzing}
                    variant="outline"
                    size="sm"
                    className="btn-interactive btn-outline-interactive"
                  >
                    {analyzing ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Brain className="h-4 w-4 mr-2" />
                    )}
                    {analyzing ? 'Analyzing...' : 'AI Analyze'}
                  </Button>
                  <Button 
                    onClick={startManualPreprocessing}
                    disabled={!selectedDataset || loading}
                    variant="outline"
                    size="sm"
                    className="btn-interactive btn-outline-interactive"
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    Manual Preprocess
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Manual Preprocessing Options */}
          {/* <Card className="glassmorphism">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Zap className="h-5 w-5" />
                <span>Manual Preprocessing</span>
              </CardTitle>
              <CardDescription>
                Configure and run manual preprocessing without AI suggestions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={manualOptions.handle_missing_values}
                  onChange={(e) => setManualOptions({ ...manualOptions, handle_missing_values: e.target.checked })}
                />
                <Label>Handle Missing Values</Label>
                <Select
                  value={manualOptions.missing_values_method}
                  onValueChange={(v) => setManualOptions({ ...manualOptions, missing_values_method: v })}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mean">Mean</SelectItem>
                    <SelectItem value="median">Median</SelectItem>
                    <SelectItem value="mode">Mode</SelectItem>
                    <SelectItem value="drop">Drop Rows</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={manualOptions.handle_outliers}
                  onChange={(e) => setManualOptions({ ...manualOptions, handle_outliers: e.target.checked })}
                />
                <Label>Handle Outliers</Label>
              </div>

              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={manualOptions.remove_duplicates}
                  onChange={(e) => setManualOptions({ ...manualOptions, remove_duplicates: e.target.checked })}
                />
                <Label>Remove Duplicates</Label>
              </div>

              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={manualOptions.convert_data_types}
                  onChange={(e) => setManualOptions({ ...manualOptions, convert_data_types: e.target.checked })}
                />
                <Label>Convert Data Types</Label>
              </div>

              <div className="pt-2">
                <Button 
                  onClick={startManualPreprocessing}
                  disabled={!selectedDataset || loading}
                  className="btn-interactive btn-primary-interactive"
                >
                  {loading ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Zap className="h-4 w-4 mr-2" />
                  )}
                  {loading ? 'Starting...' : 'Run Manual Preprocessing'}
                </Button>
              </div>
            </CardContent>
          </Card> */}

          {/* AI Analysis Results */}
          {aiSuggestions.length > 0 ? (
            <Card className="glassmorphism">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center space-x-2">
                      <Sparkles className="h-5 w-5" />
                      <span>AI Analysis Results</span>
                    </CardTitle>
                    <CardDescription>
                      AI-powered suggestions for data cleaning
                    </CardDescription>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      onClick={applyAllSuggestions}
                      variant="outline"
                      size="sm"
                      className="btn-interactive btn-outline-interactive"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Apply All
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {aiSuggestions.map((suggestion, index) => (
                    <div key={index} className={`flex items-start space-x-3 p-4 rounded-lg border transition-all ${
                      appliedSuggestions.has(index) 
                        ? 'border-green-500/50 bg-green-500/10' 
                        : 'border-border/50 bg-card/50'
                    }`}>
                      <div className="flex-shrink-0 mt-1">
                        {appliedSuggestions.has(index) ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <Zap className="h-5 w-5 text-blue-500" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-lg">
                            {suggestion.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </p>
                          {!appliedSuggestions.has(index) && (
                            <Button
                              onClick={() => applySuggestion(index)}
                              variant="outline"
                              size="sm"
                              className="btn-interactive btn-outline-interactive"
                            >
                              Apply
                            </Button>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">{suggestion.reason}</p>
                        {suggestion.method && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Method: <span className="font-mono">{suggestion.method}</span>
                          </p>
                        )}
                        {suggestion.target_type && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Target Type: <span className="font-mono text-green-600 dark:text-green-400">{suggestion.target_type}</span>
                          </p>
                        )}
                        {suggestion.columns && suggestion.columns.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Columns: <span className="font-mono">{suggestion.columns.join(', ')}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : selectedDataset && !analyzing ? (
            <Card className="glassmorphism">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span>Dataset Analysis Complete</span>
                </CardTitle>
                <CardDescription>
                  Great news! Your dataset appears to be clean and well-structured.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-500" />
                  <h3 className="text-lg font-semibold mb-2">No Issues Found</h3>
                  <p className="text-muted-foreground mb-4">
                    AI analysis didn't find any data quality issues that need preprocessing.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Your dataset is ready for machine learning training!
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {/* Start Preprocessing */}
          {aiSuggestions.length > 0 && (
            <Card className="glassmorphism">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Brain className="h-5 w-5" />
                  <span>Ready to Process</span>
                </CardTitle>
                <CardDescription>
                  {appliedSuggestions.size > 0 
                    ? `${appliedSuggestions.size} suggestion${appliedSuggestions.size > 1 ? 's' : ''} selected for processing`
                    : 'Select suggestions above to start preprocessing'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={startPreprocessing}
                  disabled={!selectedDataset || loading || appliedSuggestions.size === 0}
                  className="w-full btn-interactive btn-primary-interactive"
                  size="lg"
                >
                  {loading ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Brain className="h-4 w-4 mr-2" />
                  )}
                  {loading ? 'Processing...' : `Start Preprocessing (${appliedSuggestions.size} suggestions)`}
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="manual" className="space-y-6">
          {/* Dataset Selection for Manual */}
          <Card className="glassmorphism">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>Manual Preprocessing Setup</span>
              </CardTitle>
              <CardDescription>
                Select dataset and target column for detailed manual preprocessing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dataset-manual">Dataset</Label>
                  <Select value={selectedDataset} onValueChange={setSelectedDataset}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a dataset" />
                    </SelectTrigger>
                    <SelectContent>
                      {datasets.map((dataset) => (
                        <SelectItem key={dataset.name} value={dataset.name}>
                          <div className="flex items-center space-x-2">
                            <span>{dataset.name}</span>
                            <span className="text-xs text-muted-foreground">
                              ({dataset.rows} rows, {dataset.columns} columns)
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="target-column">Target Column (Optional)</Label>
                  <Select value={targetColumn} onValueChange={setTargetColumn}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select target column" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No target column</SelectItem>
                      {columnSummaries.map((col) => (
                        <SelectItem key={col.name} value={col.name}>
                          {col.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {selectedDataset && (
                <Button 
                  onClick={loadColumnPreview} 
                  disabled={previewLoading}
                  className="btn-interactive btn-primary-interactive"
                >
                  {previewLoading ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Eye className="h-4 w-4 mr-2" />
                  )}
                  {previewLoading ? 'Loading...' : 'Preview Columns'}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Column Summaries and Operations */}
          {columnSummaries.length > 0 && (
            <Card className="glassmorphism">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Database className="h-5 w-5" />
                  <span>Column Analysis & Operations</span>
                </CardTitle>
                <CardDescription>
                  Review column statistics and configure preprocessing operations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {columnSummaries.map((col) => (
                    <div key={col.name} className="p-4 border rounded-lg bg-card/50">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-semibold text-lg">{col.name}</h4>
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            <span>Type: <code className="bg-muted px-1 rounded">{col.dtype}</code></span>
                            <span>Non-null: {col.non_null}</span>
                            <span>Nulls: {col.nulls}</span>
                            <span>Unique: {col.unique}</span>
                            {(col.dtype.includes('int') || col.dtype.includes('float') || col.dtype.includes('number')) && col.zeros !== undefined ? (
                              <span>Zeros: {col.zeros}</span>
                            ) : null}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={manualOps.drop_columns.includes(col.name)}
                            onChange={() => toggleColumnDrop(col.name)}
                            className="rounded"
                          />
                          <Label className="text-sm">Drop Column</Label>
                        </div>
                      </div>

                      {/* Sample Values */}
                      {col.sample_values.length > 0 && (
                        <div className="mb-3">
                          <Label className="text-sm font-medium">Sample Values:</Label>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {col.sample_values.slice(0, 5).map((val, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {String(val)}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Statistics for numeric columns */}
                      {Object.keys(col.stats).length > 0 && (
                        <div className="mb-3">
                          <Label className="text-sm font-medium">Statistics:</Label>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-1 text-xs">
                            {Object.entries(col.stats).map(([key, value]) => (
                              <div key={key} className="bg-muted/50 p-2 rounded">
                                <span className="font-medium">{key}:</span> {Number(value).toFixed(2)}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Operations */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Data Type Change */}
                        <div className="space-y-2">
                          <Label className="text-sm">Change Data Type:</Label>
                          <Select 
                            value={manualOps.change_types[col.name] || col.dtype} 
                            onValueChange={(value) => setColumnType(col.name, value)}
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={col.dtype}>Keep Current ({col.dtype})</SelectItem>
                              <SelectItem value="string">String</SelectItem>
                              <SelectItem value="numeric">Numeric</SelectItem>
                              <SelectItem value="datetime">DateTime</SelectItem>
                              <SelectItem value="category">Category</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Missing Value Handling */}
                        {col.nulls > 0 && (
                          <div className="space-y-2">
                            <Label className="text-sm">Handle Missing Values:</Label>
                            <Select 
                              value={manualOps.missing[col.name]?.method || 'none'} 
                              onValueChange={(value) => setMissingHandling(col.name, value)}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">No Action</SelectItem>
                                <SelectItem value="mean">Mean (numeric only)</SelectItem>
                                <SelectItem value="median">Median (numeric only)</SelectItem>
                                <SelectItem value="mode">Mode</SelectItem>
                                <SelectItem value="drop_rows">Drop Rows</SelectItem>
                                <SelectItem value="ffill">Forward Fill</SelectItem>
                                <SelectItem value="bfill">Backward Fill</SelectItem>
                                <SelectItem value="constant">Fill with Constant</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Class Balance Display */}
                {classBalance && targetColumn && targetColumn !== 'none' && (
                  <div className="mt-6 p-4 border rounded-lg bg-card/50">
                    <h4 className="font-semibold mb-2 flex items-center">
                      <Target className="h-4 w-4 mr-2" />
                      Class Balance for {targetColumn}
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {Object.entries(classBalance).map(([class_name, count]) => (
                        <div key={class_name} className="bg-muted/50 p-2 rounded text-center">
                          <div className="font-medium">{class_name}</div>
                          <div className="text-sm text-muted-foreground">{count} samples</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Apply Operations */}
                <div className="mt-6 flex justify-end">
                  <Button 
                    onClick={applyManualOperations}
                    disabled={loading}
                    className="btn-interactive btn-primary-interactive"
                  >
                    {loading ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Settings className="h-4 w-4 mr-2" />
                    )}
                    {loading ? 'Processing...' : 'Apply Manual Operations'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="jobs" className="space-y-6">
          {/* Processing Jobs */}
          <Card className="glassmorphism">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>Processing Jobs</span>
              </CardTitle>
              <CardDescription>
                Monitor and manage your data preprocessing jobs
              </CardDescription>
            </CardHeader>
            <CardContent>
              {jobs.length === 0 ? (
                <div className="text-center py-8">
                  <Database className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No preprocessing jobs yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Start by preprocessing your first dataset
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {jobs.map((job) => (
                    <div key={job.job_id} className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-card/50">
                      <div className="flex items-center space-x-4">
                        {getStatusIcon(job.status)}
                        <div>
                          <p className="font-medium">{job.dataset_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {job.ai_analysis ? 'AI-Powered' : 'Manual'} • {job.created_at}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge 
                          variant="outline" 
                          className={getStatusColor(job.status)}
                        >
                          {getStatusText(job.status)}
                        </Badge>
                        {job.status === 'completed' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="btn-interactive btn-outline-interactive"
                              onClick={() => downloadProcessedData(job.job_id)}
                            >
                              <Download className="h-4 w-4 mr-1" />
                              Download
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="btn-interactive btn-outline-interactive"
                              onClick={() => viewReport(job.job_id)}
                            >
                              <FileText className="h-4 w-4 mr-1" />
                              Report
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          {/* Preprocessing Reports */}
          <Card className="glassmorphism">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Preprocessing Reports</span>
              </CardTitle>
              <CardDescription>
                View detailed preprocessing reports and analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              {reports.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No reports yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reports.map((r) => (
                    <div key={r.filename} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card/50">
                      <div>
                        <p className="font-medium">{r.filename}</p>
                        <p className="text-xs text-muted-foreground">{r.dataset_name ? `Dataset: ${r.dataset_name} • ` : ''}{new Date(r.created * 1000).toLocaleString()}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="btn-interactive btn-outline-interactive"
                          onClick={() => viewReport(r.job_id)}
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="btn-interactive btn-outline-interactive"
                          onClick={async () => { await preprocessingAPI.deleteReport(r.filename); await loadReports(); }}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Preprocessing;
