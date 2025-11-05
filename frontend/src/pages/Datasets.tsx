import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/modal';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { EmptyState } from '@/components/ui/empty-state';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { TooltipSimple } from '@/components/ui/tooltip-simple';
import { SkeletonCard } from '@/components/ui/skeleton';
import { 
  Database, 
  Upload, 
  FileText, 
  Trash2, 
  Download,
  Eye,
  RefreshCw,
  Plus,
  CheckCircle,
  ExternalLink,
  Brain,
  Zap,
  Settings
} from 'lucide-react';
import { datasetAPI, aiAnalysisAPI, trainingAPI, getStaticFileUrl } from '@/services/api';
import { useNavigate } from 'react-router-dom';
import type { Dataset, AIAnalysisResponse, AxiosErrorResponse, TrainingRequest } from '@/types/api';

interface DatasetPreviewRow {
  [key: string]: string | number | null;
}

const Datasets = () => {
  const navigate = useNavigate();
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [separator, setSeparator] = useState<string>(',');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewDataset, setViewDataset] = useState<Dataset | null>(null);
  const [datasetPreview, setDatasetPreview] = useState<DatasetPreviewRow[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisResponse | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedColumnsToDrop, setSelectedColumnsToDrop] = useState<string[]>([]);
  const [datasetColumns, setDatasetColumns] = useState<{[key: string]: string[]}>({});
  const [showColumnManager, setShowColumnManager] = useState<string | null>(null);
  const [columnSearchTerm, setColumnSearchTerm] = useState<string>('');
  const [startingTraining, setStartingTraining] = useState(false);

  const loadDatasets = async () => {
    try {
      setLoading(true);
      const response = await datasetAPI.list();
      setDatasets(response.data.datasets || []);
    } catch (error) {
      console.error('Error loading datasets:', error);
      setError('Failed to load datasets');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== 'text/csv') {
        setError('Please select a CSV file');
        return;
      }
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file first');
      return;
    }

    try {
      setUploading(true);
      setError(null);
      await datasetAPI.upload(selectedFile, separator);
      setSuccess('Dataset uploaded successfully!');
      setSelectedFile(null);
      // Reset file input
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      await loadDatasets();
    } catch (error) {
      console.error('Error uploading dataset:', error);
      setError('Failed to upload dataset');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (datasetName: string) => {
    if (!confirm(`Are you sure you want to delete ${datasetName}?`)) {
      return;
    }

    try {
      await datasetAPI.delete(datasetName);
      setSuccess('Dataset deleted successfully!');
      await loadDatasets();
    } catch (error) {
      console.error('Error deleting dataset:', error);
      setError('Failed to delete dataset');
    }
  };

  const handleViewDataset = async (dataset: Dataset) => {
    try {
      setViewDataset(dataset);
      setViewModalOpen(true);
      
      // Load a preview of the dataset (first 10 rows)
      const response = await datasetAPI.preview(dataset.name);
      setDatasetPreview(response.data.preview || []);
    } catch (error) {
      console.error('Error loading dataset preview:', error);
      setError('Failed to load dataset preview');
    }
  };

  const handleAIAnalysis = async (dataset: Dataset) => {
    try {
      setAnalyzing(true);
      setError(null);
      const response = await aiAnalysisAPI.analyzeDataset(dataset.name, separator);
      setAiAnalysis(response.data);
    } catch (error) {
      console.error('Error analyzing dataset:', error);
      setError('AI analysis failed. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleManageColumns = async (datasetName: string) => {
    try {
      const response = await datasetAPI.getInfo(datasetName, separator);
      setDatasetColumns(prev => ({
        ...prev,
        [datasetName]: response.data.column_names
      }));
      setShowColumnManager(datasetName);
      setSelectedColumnsToDrop([]);
    } catch (error) {
      console.error('Error loading dataset columns:', error);
      setError('Failed to load dataset columns');
    }
  };

  const handleDropColumns = async (datasetName: string) => {
    if (selectedColumnsToDrop.length === 0) {
      setError('Please select columns to drop');
      return;
    }

    try {
      const columnsToDropString = selectedColumnsToDrop.join(',');
      const response = await datasetAPI.dropColumns(datasetName, columnsToDropString, separator);
      setSuccess(`Columns dropped successfully! Removed: ${response.data.columns_dropped.join(', ')}`);
      setShowColumnManager(null);
      setSelectedColumnsToDrop([]);
      await loadDatasets();
    } catch (error) {
      console.error('Error dropping columns:', error);
      setError('Failed to drop columns');
    }
  };

  const handleDownloadDataset = async (dataset: Dataset) => {
    try {
      const response = await datasetAPI.download(dataset.name);
      // Create a blob from the response data
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = dataset.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading dataset:', error);
      setError('Failed to download dataset');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  const handleStartTrainingWithAI = async (datasetName: string) => {
    if (!aiAnalysis?.analysis?.ai_analysis?.target_suggestions?.length) {
      setError('No AI recommendations available. Please run AI analysis first.');
      return;
    }

    try {
      setStartingTraining(true);
      setError(null);

      // Get the best target suggestion (first one)
      const bestTarget = aiAnalysis.analysis.ai_analysis.target_suggestions[0];
      
      // Map algorithm names to API values
      const algorithmMap: {[key: string]: string} = {
        'Random Forest': 'random_forest',
        'Linear Regression': 'linear_regression',
        'Logistic Regression': 'logistic_regression',
        'Support Vector Machine': 'svm',
        'SVM': 'svm',
        'Neural Network': 'neural_network'
      };

      const selectedAlgorithm = algorithmMap[bestTarget.algorithms[0]] || 'random_forest';

      // Start training with AI recommendations
      const trainingData: TrainingRequest = {
        dataset_name: datasetName,
        target_column: bestTarget.column,
        task_type: bestTarget.task_type as 'classification' | 'regression',
        algorithm: selectedAlgorithm,
        test_size: 0.2,
        random_state: 42,
        preprocessing: {
          exclude_columns: [],
          ohe_columns: [],
          scale_columns: [],
          null_handling: 'drop',
          null_fill_value: ''
        }
      };

      const response = await trainingAPI.startTraining(trainingData);
      
      setSuccess(`Training started successfully! Job ID: ${response.data.job_id}`);
      
      // Navigate to training page to see the job
      setTimeout(() => {
        navigate('/training');
      }, 2000);

    } catch (error) {
      console.error('Error starting training:', error);
      const err = error as AxiosErrorResponse;
      setError(`Failed to start training: ${err?.response?.data?.detail || err?.message || 'Unknown error'}`);
    } finally {
      setStartingTraining(false);
    }
  };

  useEffect(() => {
    loadDatasets();
  }, []);

  if (loading) {
    return (
      <div className="space-y-8 animate-fade-in-up">
        <div className="skeleton skeleton-heading w-48"></div>
        <SkeletonCard />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Breadcrumb */}
      <Breadcrumb items={[{ label: 'Datasets' }]} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="animate-fade-in-left">
          <h1 className="text-3xl font-bold text-gradient flex items-center gap-2">
            <Database className="h-8 w-8" />
            Datasets
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage your machine learning datasets
          </p>
        </div>
        <TooltipSimple content="Refresh datasets list">
          <Button 
            onClick={loadDatasets} 
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

      {/* Upload Section */}
      <Card className="glassmorphism animate-fade-in-up">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Plus className="h-5 w-5 text-primary" />
            <span>Upload New Dataset</span>
          </CardTitle>
          <CardDescription>
            Upload a CSV file to get started with your machine learning project
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="file-upload" className="text-sm font-medium">
              Choose CSV File
            </Label>
            <Input
              id="file-upload"
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="cursor-pointer"
            />
          </div>

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


          {selectedFile && (
            <div className="flex items-center space-x-2 p-3 bg-muted rounded-lg">
              <FileText className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">{selectedFile.name}</span>
              <Badge variant="secondary">
                {formatFileSize(selectedFile.size)}
              </Badge>
            </div>
          )}

          <Button 
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className="w-full btn-interactive btn-primary-interactive"
            size="lg"
          >
            {uploading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload Dataset
              </>
            )}
          </Button>
        </CardContent>
      </Card>

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

      {/* Datasets List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Your Datasets</h2>
        
        {datasets.length === 0 ? (
          <Card className="glassmorphism">
            <CardContent className="py-6">
              <EmptyState
                icon={Database}
                title="No datasets yet"
                description="Upload your first CSV dataset to get started with machine learning"
                action={{
                  label: "Upload Dataset",
                  onClick: () => document.getElementById('file-upload')?.click()
                }}
              />
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {datasets.map((dataset, index) => (
              <Card 
                key={dataset.name} 
                className="glassmorphism hover:shadow-lg transition-all duration-300 animate-fade-in-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Database className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg truncate">{dataset.name}</CardTitle>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(dataset.name)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Rows</p>
                      <p className="font-medium">{dataset.rows.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Columns</p>
                      <p className="font-medium">{dataset.columns}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Size</p>
                      <p className="font-medium">{formatFileSize(dataset.size)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Uploaded</p>
                      <p className="font-medium">{formatDate(dataset.upload_date)}</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 btn-interactive btn-outline-interactive"
                      onClick={() => handleViewDataset(dataset)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 btn-interactive btn-outline-interactive"
                      onClick={() => handleAIAnalysis(dataset)}
                      disabled={analyzing}
                    >
                      {analyzing ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Brain className="h-4 w-4 mr-2" />
                      )}
                      {analyzing ? 'Analyzing...' : 'AI Analysis'}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 btn-interactive btn-outline-interactive"
                      onClick={() => navigate(`/preprocessing?dataset=${encodeURIComponent(dataset.name)}`)}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Preprocess
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 btn-interactive btn-outline-interactive"
                      onClick={() => handleManageColumns(dataset.name)}
                    >
                      <Database className="h-4 w-4 mr-2" />
                      Manage Columns
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 btn-interactive btn-outline-interactive"
                      onClick={() => handleDownloadDataset(dataset)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                    {aiAnalysis && aiAnalysis.dataset_name === dataset.name && (aiAnalysis.analysis?.ai_analysis?.target_suggestions?.length ?? 0) > 0 && (
                      <Button 
                        variant="default" 
                        size="sm" 
                        className="w-full btn-interactive btn-primary-interactive"
                        onClick={() => handleStartTrainingWithAI(dataset.name)}
                        disabled={startingTraining}
                      >
                        {startingTraining ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Starting Training...
                          </>
                        ) : (
                          <>
                            <Zap className="h-4 w-4 mr-2" />
                            Quick Train with AI
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* AI Analysis Results */}
      {aiAnalysis && (
        <Card className="glassmorphism animate-fade-in-up">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Brain className="h-5 w-5 text-primary" />
              <span>AI Analysis Results</span>
            </CardTitle>
            <CardDescription>
              AI-powered recommendations for your dataset
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {aiAnalysis.analysis?.ai_analysis && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-2">Dataset Type</h4>
                    <p className="text-sm">{aiAnalysis.analysis.ai_analysis.dataset_type}</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-2">Data Quality Score</h4>
                    <p className="text-sm">{aiAnalysis.analysis.ai_analysis.data_quality_score}/10</p>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-2">Business Context</h4>
                  <p className="text-sm">{aiAnalysis.analysis.ai_analysis.business_context}</p>
                </div>

                {aiAnalysis.analysis.ai_analysis.target_suggestions && (
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-2">Recommended Target Columns</h4>
                    <div className="space-y-2">
                      {aiAnalysis.analysis.ai_analysis.target_suggestions.map((target, index: number) => (
                        <div key={index} className={`p-3 border rounded-lg ${index === 0 ? 'bg-primary/10 border-primary/30' : 'bg-muted/50'}`}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">{target.column}</span>
                            <div className="flex items-center space-x-2">
                              {index === 0 && (
                                <Badge variant="default" className="text-xs">
                                  <Zap className="h-3 w-3 mr-1" />
                                  Auto-Selected
                                </Badge>
                              )}
                              <Badge variant="outline">
                                {target.task_type}
                              </Badge>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{target.reasoning}</p>
                          <div className="flex flex-wrap gap-1">
                            {target.algorithms.map((algo: string, algoIndex: number) => (
                              <Badge key={algoIndex} variant={index === 0 && algoIndex === 0 ? "default" : "secondary"} className="text-xs">
                                {algo}
                                {index === 0 && algoIndex === 0 && (
                                  <Zap className="h-2 w-2 ml-1" />
                                )}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {aiAnalysis.analysis.ai_analysis.preprocessing_suggestions && (
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-2">Preprocessing Suggestions</h4>
                    <ul className="text-sm space-y-1">
                      {aiAnalysis.analysis.ai_analysis.preprocessing_suggestions.map((suggestion: string, index: number) => (
                        <li key={index} className="flex items-center space-x-2">
                          <CheckCircle className="h-3 w-3 text-green-500" />
                          <span>{suggestion}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
            
            <div className="flex space-x-2 pt-4 border-t">
              <Button 
                onClick={() => setAiAnalysis(null)}
                variant="outline"
                className="btn-interactive btn-outline-interactive"
              >
                Close Analysis
              </Button>
              {(aiAnalysis.analysis?.ai_analysis?.target_suggestions?.length ?? 0) > 0 && (
                <Button 
                  onClick={() => handleStartTrainingWithAI(aiAnalysis.dataset_name)}
                  disabled={startingTraining}
                  className="btn-interactive btn-primary-interactive"
                >
                  {startingTraining ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Starting Training...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      Start Training with AI Config
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dataset View Modal */}
      <Modal
        isOpen={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        title={viewDataset ? `Dataset: ${viewDataset.name}` : 'Dataset Preview'}
      >
        {viewDataset && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Rows:</span>
                <span className="ml-2">{viewDataset.rows.toLocaleString()}</span>
              </div>
              <div>
                <span className="font-medium">Columns:</span>
                <span className="ml-2">{viewDataset.columns}</span>
              </div>
              <div>
                <span className="font-medium">Size:</span>
                <span className="ml-2">{formatFileSize(viewDataset.size)}</span>
              </div>
              <div>
                <span className="font-medium">Uploaded:</span>
                <span className="ml-2">{formatDate(viewDataset.upload_date)}</span>
              </div>
            </div>

            {datasetPreview.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Data Preview (First 10 rows)</h4>
                <div className="border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto max-h-96">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          {Object.keys(datasetPreview[0]).map((column) => (
                            <th key={column} className="px-3 py-2 text-left font-medium">
                              {column}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {datasetPreview.map((row, index) => (
                          <tr key={index} className="border-t">
                            {Object.values(row).map((value, colIndex) => (
                              <td key={colIndex} className="px-3 py-2">
                                {String(value)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            <div className="flex space-x-2">
              <Button 
                onClick={() => handleDownloadDataset(viewDataset)}
                className="flex-1 btn-interactive btn-primary-interactive"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Dataset
              </Button>
              <Button 
                onClick={() => window.open(getStaticFileUrl(`/api/datasets/${viewDataset.name}/download`), '_blank')}
                variant="outline"
                className="flex-1 btn-interactive btn-outline-interactive"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in New Tab
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Column Management Modal */}
      <Modal
        isOpen={showColumnManager !== null}
        onClose={() => {
          setShowColumnManager(null);
          setColumnSearchTerm('');
        }}
        title="Manage Columns"
      >
        {showColumnManager && datasetColumns[showColumnManager] && (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-3">
                Select columns to remove from <strong>{showColumnManager}</strong>
              </p>
              
              {/* Search Input */}
              <div className="mb-3">
                <Input
                  placeholder="Search columns..."
                  value={columnSearchTerm}
                  onChange={(e) => setColumnSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
              
              {/* Column Stats and Actions */}
              <div className="flex justify-between items-center mb-2">
                <div className="text-xs text-muted-foreground">
                  <span>Total columns: {datasetColumns[showColumnManager].length}</span>
                  <span className="ml-4">Selected: {selectedColumnsToDrop.length}</span>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const filteredColumns = datasetColumns[showColumnManager].filter(column => 
                        column.toLowerCase().includes(columnSearchTerm.toLowerCase())
                      );
                      setSelectedColumnsToDrop(filteredColumns);
                    }}
                    className="text-xs"
                  >
                    Select All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedColumnsToDrop([])}
                    className="text-xs"
                  >
                    Clear All
                  </Button>
                </div>
              </div>
              
              {/* Column List */}
              <div className="max-h-80 overflow-y-auto border border-input rounded-md p-3 space-y-2">
                {datasetColumns[showColumnManager]
                  .filter(column => 
                    column.toLowerCase().includes(columnSearchTerm.toLowerCase())
                  )
                  .map((column) => (
                    <label key={column} className="flex items-center space-x-2 text-sm hover:bg-muted/50 p-1 rounded">
                      <input
                        type="checkbox"
                        checked={selectedColumnsToDrop.includes(column)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedColumnsToDrop([...selectedColumnsToDrop, column]);
                          } else {
                            setSelectedColumnsToDrop(selectedColumnsToDrop.filter(col => col !== column));
                          }
                        }}
                        className="rounded border-input"
                      />
                      <span className="truncate flex-1">{column}</span>
                    </label>
                  ))}
                
                {datasetColumns[showColumnManager].filter(column => 
                  column.toLowerCase().includes(columnSearchTerm.toLowerCase())
                ).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No columns match your search
                  </p>
                )}
              </div>
              
              {selectedColumnsToDrop.length > 0 && (
                <div className="mt-3 p-2 bg-muted rounded-md">
                  <p className="text-xs text-muted-foreground mb-1">
                    Selected for removal:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {selectedColumnsToDrop.map((col) => (
                      <span key={col} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                        {col}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex space-x-2">
              <Button 
                onClick={() => handleDropColumns(showColumnManager)}
                disabled={selectedColumnsToDrop.length === 0}
                className="flex-1 btn-interactive btn-primary-interactive"
              >
                <Database className="h-4 w-4 mr-2" />
                Drop Selected Columns ({selectedColumnsToDrop.length})
              </Button>
              <Button 
                onClick={() => {
                  setShowColumnManager(null);
                  setColumnSearchTerm('');
                }}
                variant="outline"
                className="flex-1 btn-interactive btn-outline-interactive"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Datasets;