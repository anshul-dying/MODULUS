import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { EmptyState } from '@/components/ui/empty-state';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { TooltipSimple } from '@/components/ui/tooltip-simple';
import { SkeletonCard } from '@/components/ui/skeleton';
import { 
  FileText, 
  Download, 
  Eye, 
  RefreshCw,
  BarChart3,
  Brain,
  ExternalLink,
  Trash2
} from 'lucide-react';
import { edaAPI, exportAPI, datasetAPI, trainingAPI, getStaticFileUrl } from '@/services/api';

interface EDAReport {
  filename: string;
  dataset_name: string;
  size: number;
  created: number;
  url: string;
}

interface ModelExport {
  filename: string;
  model_name: string;
  size: number;
  created: number;
  url: string;
}

interface TrainingReport {
  filename: string;
  size: number;
  created: number;
  url: string;
  job_id?: string;
  dataset_name?: string;
  algorithm?: string;
  task_type?: string;
  status?: string;
  created_at?: string;
  accuracy?: number;
}

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

const Reports = () => {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [edaReports, setEdaReports] = useState<EDAReport[]>([]);
  const [modelExports, setModelExports] = useState<ModelExport[]>([]);
  const [trainingReports, setTrainingReports] = useState<TrainingReport[]>([]);
  const [trainingJobs, setTrainingJobs] = useState<TrainingJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingEDA, setGeneratingEDA] = useState(false);
  const [exportingModel, setExportingModel] = useState(false);
  const [selectedDataset, setSelectedDataset] = useState('');
  const [selectedJob, setSelectedJob] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewContent, setViewContent] = useState<{ type: 'eda' | 'model', data: EDAReport | ModelExport } | null>(null);

  const loadDatasets = async () => {
    try {
      const response = await datasetAPI.list();
      setDatasets(response.data.datasets || []);
    } catch (error) {
      console.error('Error loading datasets:', error);
    }
  };

  const loadEdaReports = async () => {
    try {
      const response = await edaAPI.listReports();
      setEdaReports(response.data.reports || []);
    } catch (error) {
      console.error('Error loading EDA reports:', error);
      setEdaReports([]);
    }
  };

  const loadModelExports = async () => {
    try {
      const response = await exportAPI.listExports();
      setModelExports(response.data.exports || []);
    } catch (error) {
      console.error('Error loading model exports:', error);
      setModelExports([]);
    }
  };

  const loadTrainingJobs = async () => {
    try {
      const response = await trainingAPI.listJobs();
      console.log('Training jobs response:', response.data);
      const jobs = response.data.jobs || [];
      console.log('All jobs:', jobs);
      // Filter only completed jobs for export
      const completedJobs = jobs.filter((job: TrainingJob) => job.status === 'completed');
      console.log('Completed jobs:', completedJobs);
      setTrainingJobs(completedJobs);
    } catch (error) {
      console.error('Error loading training jobs:', error);
    }
  };

  const loadTrainingReports = async () => {
    try {
      const response = await trainingAPI.listReports();
      setTrainingReports(response.data.reports || []);
    } catch (error) {
      console.error('Error loading training reports:', error);
      setTrainingReports([]);
    }
  };

  const handleGenerateEDA = async () => {
    if (!selectedDataset) {
      setError('Please select a dataset');
      return;
    }

    try {
      setGeneratingEDA(true);
      setError(null);
      await edaAPI.generateReport(selectedDataset);
      setSuccess('EDA report generated successfully!');
      await loadEdaReports();
    } catch (error) {
      console.error('Error generating EDA report:', error);
      setError('Failed to generate EDA report');
    } finally {
      setGeneratingEDA(false);
    }
  };

  const handleExportModel = async () => {
    if (!selectedJob) {
      setError('Please select a completed training job to export');
      return;
    }

    try {
      setExportingModel(true);
      setError(null);
      await exportAPI.exportModel({ job_id: selectedJob, format: 'zip' });
      setSuccess('Model exported successfully!');
      await loadModelExports();
    } catch (error) {
      console.error('Error exporting model:', error);
      setError('Failed to export model');
    } finally {
      setExportingModel(false);
    }
  };

  const handleViewEDA = (report: EDAReport) => {
    setViewContent({ type: 'eda', data: report });
    setViewModalOpen(true);
  };

  const handleViewModel = (export_: ModelExport) => {
    setViewContent({ type: 'model', data: export_ });
    setViewModalOpen(true);
  };

  const handleDownloadEDA = (report: EDAReport) => {
    // Use the backend API to serve the EDA report
    const reportUrl = edaAPI.viewReport(report.filename);
    window.open(reportUrl, '_blank');
  };

  const handleDownloadModel = (export_: ModelExport) => {
    const url = getStaticFileUrl(export_.url);
    window.open(url, '_blank');
  };

  const handleDeleteEDA = async (report: EDAReport) => {
    if (window.confirm(`Are you sure you want to delete the EDA report for "${report.dataset_name}"?`)) {
      try {
        await edaAPI.deleteReport(report.filename);
        setEdaReports(edaReports.filter(r => r.filename !== report.filename));
        setSuccess('EDA report deleted successfully');
        setTimeout(() => setSuccess(''), 3000);
      } catch (error) {
        console.error('Error deleting EDA report:', error);
        setError('Failed to delete EDA report');
        setTimeout(() => setError(''), 3000);
      }
    }
  };

  const handleDeleteModel = async (export_: ModelExport) => {
    if (window.confirm(`Are you sure you want to delete the model export "${export_.model_name}"?`)) {
      try {
        await exportAPI.deleteExport(export_.filename);
        setModelExports(modelExports.filter(e => e.filename !== export_.filename));
        setSuccess('Model export deleted successfully');
        setTimeout(() => setSuccess(''), 3000);
      } catch (error) {
        console.error('Error deleting model export:', error);
        setError('Failed to delete model export');
        setTimeout(() => setError(''), 3000);
      }
    }
  };

  const handleViewTrainingReport = (report: TrainingReport) => {
    window.open(trainingAPI.viewReport(report.filename), '_blank');
  };

  const handleDeleteTrainingReport = async (report: TrainingReport) => {
    if (window.confirm(`Are you sure you want to delete the training report "${report.filename}"?`)) {
      try {
        await trainingAPI.deleteReport(report.filename);
        setTrainingReports(trainingReports.filter(r => r.filename !== report.filename));
        setSuccess('Training report deleted successfully');
        setTimeout(() => setSuccess(''), 3000);
      } catch (error) {
        console.error('Error deleting training report:', error);
        setError('Failed to delete training report');
        setTimeout(() => setError(''), 3000);
      }
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

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([loadDatasets(), loadEdaReports(), loadModelExports(), loadTrainingJobs(), loadTrainingReports()]);
      setLoading(false);
    };
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-8 animate-fade-in-up">
        <div className="skeleton skeleton-heading w-48"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SkeletonCard />
          <SkeletonCard />
        </div>
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
      <Breadcrumb items={[{ label: 'Reports & Exports' }]} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="animate-fade-in-left">
          <h1 className="text-3xl font-bold text-gradient flex items-center gap-2">
            <FileText className="h-8 w-8" />
            Reports & Exports
          </h1>
          <p className="text-muted-foreground mt-2">
            Generate EDA reports and export trained models
          </p>
        </div>
        <TooltipSimple content="Refresh all reports and exports">
          <Button 
            onClick={() => {
              loadEdaReports();
              loadModelExports();
              loadTrainingReports();
            }}
            disabled={loading}
            variant="outline"
            size="sm"
            className="animate-fade-in-right btn-interactive btn-outline-interactive"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh All
          </Button>
        </TooltipSimple>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Generate EDA Report */}
        <Card className="glassmorphism animate-fade-in-left">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <span>Generate EDA Report</span>
            </CardTitle>
            <CardDescription>
              Create comprehensive exploratory data analysis reports
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 relative z-10">
              <label className="text-sm font-medium">Select Dataset</label>
              <Select value={selectedDataset} onValueChange={setSelectedDataset}>
                <SelectTrigger className="relative z-10">
                  <SelectValue placeholder="Choose a dataset" />
                </SelectTrigger>
                <SelectContent className="z-[9999]">
                  {datasets.map((dataset) => (
                    <SelectItem key={dataset.name} value={dataset.name}>
                      {dataset.name} ({dataset.rows} rows, {dataset.columns} columns)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Button 
              onClick={handleGenerateEDA}
              disabled={!selectedDataset || generatingEDA}
              className="w-full btn-interactive btn-primary-interactive"
            >
              {generatingEDA ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Generate EDA Report
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Export Model */}
        <Card className="glassmorphism animate-fade-in-right">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Brain className="h-5 w-5 text-primary" />
                <span>Export Model</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={loadTrainingJobs}
                className="btn-interactive btn-outline-interactive"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </CardTitle>
            <CardDescription>
              Export your trained machine learning models
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 relative z-10">
              <label className="text-sm font-medium">Select Completed Training Job</label>
              <Select value={selectedJob} onValueChange={setSelectedJob}>
                <SelectTrigger className="relative z-10">
                  <SelectValue placeholder="Choose a completed training job" />
                </SelectTrigger>
                <SelectContent className="z-[9999]">
                  {trainingJobs.length === 0 ? (
                    <SelectItem value="no-jobs" disabled>
                      No completed training jobs available
                    </SelectItem>
                  ) : (
                    trainingJobs.map((job) => (
                      <SelectItem key={job.job_id} value={job.job_id}>
                        {job.dataset_name} - {job.algorithm} (Accuracy: {job.accuracy ? `${(job.accuracy * 100).toFixed(1)}%` : 'N/A'})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            
            <Button 
              onClick={handleExportModel}
              disabled={!selectedJob || exportingModel}
              className="w-full btn-interactive btn-primary-interactive"
            >
              {exportingModel ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4 mr-2" />
                  Export Model
                </>
              )}
            </Button>
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

      {/* Reports and Exports */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* EDA Reports */}
        <Card className="glassmorphism animate-fade-in-up">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <span>EDA Reports</span>
            </CardTitle>
            <CardDescription>
              Exploratory Data Analysis reports for your datasets
            </CardDescription>
          </CardHeader>
          <CardContent>
            {edaReports.length === 0 ? (
              <EmptyState
                icon={BarChart3}
                title="No EDA reports yet"
                description="Generate your first EDA report using the form above"
              />
            ) : (
              <div className="space-y-4">
                {edaReports.map((report, index) => (
                  <div 
                    key={report.filename}
                    className="p-4 border rounded-lg hover:shadow-md transition-all duration-200 animate-fade-in-up"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4 text-primary" />
                        <span className="font-medium">{report.dataset_name}</span>
                      </div>
                      <Badge variant="outline">EDA Report</Badge>
                    </div>
                    
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex justify-between">
                        <span>Size:</span>
                        <span>{formatFileSize(report.size)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Created:</span>
                        <span>{formatDate(report.created)}</span>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2 mt-3">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 btn-interactive btn-outline-interactive"
                        onClick={() => handleViewEDA(report)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 btn-interactive btn-outline-interactive"
                        onClick={() => handleDownloadEDA(report)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="btn-interactive btn-outline-interactive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => handleDeleteEDA(report)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Model Exports */}
        <Card className="glassmorphism animate-fade-in-up">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Brain className="h-5 w-5 text-primary" />
              <span>Model Exports</span>
            </CardTitle>
            <CardDescription>
              Exported machine learning models ready for deployment
            </CardDescription>
          </CardHeader>
          <CardContent>
            {modelExports.length === 0 ? (
              <EmptyState
                icon={Brain}
                title="No model exports yet"
                description="Export your first trained model using the form above"
              />
            ) : (
              <div className="space-y-4">
                {modelExports.map((export_, index) => (
                  <div 
                    key={export_.filename}
                    className="p-4 border rounded-lg hover:shadow-md transition-all duration-200 animate-fade-in-up"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <Brain className="h-4 w-4 text-primary" />
                        <span className="font-medium">{export_.model_name}</span>
                      </div>
                      <Badge variant="outline">Model</Badge>
                    </div>
                    
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex justify-between">
                        <span>Size:</span>
                        <span>{formatFileSize(export_.size)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Created:</span>
                        <span>{formatDate(export_.created)}</span>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2 mt-3">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 btn-interactive btn-outline-interactive"
                        onClick={() => handleViewModel(export_)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 btn-interactive btn-outline-interactive"
                        onClick={() => handleDownloadModel(export_)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="btn-interactive btn-outline-interactive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => handleDeleteModel(export_)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Training Reports */}
        <Card className="glassmorphism animate-fade-in-up">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-primary" />
              <span>Training Reports</span>
            </CardTitle>
            <CardDescription>
              HTML reports from completed training jobs
            </CardDescription>
          </CardHeader>
          <CardContent>
            {trainingReports.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No training reports yet"
                description="Training reports will appear here after completing training jobs"
              />
            ) : (
              <div className="space-y-4">
                {trainingReports.map((report, index) => (
                  <div 
                    key={report.filename}
                    className="p-4 border rounded-lg hover:shadow-md transition-all duration-200 animate-fade-in-up"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4 text-primary" />
                        <span className="font-medium">{report.dataset_name || report.filename}</span>
                      </div>
                      <Badge variant="outline">Training Report</Badge>
                    </div>
                    
                    <div className="space-y-2 text-sm text-muted-foreground">
                      {report.algorithm && (
                        <div className="flex justify-between">
                          <span>Algorithm:</span>
                          <span>{report.algorithm}</span>
                        </div>
                      )}
                      {report.accuracy !== undefined && (
                        <div className="flex justify-between">
                          <span>Accuracy:</span>
                          <span>{(report.accuracy * 100).toFixed(2)}%</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>Size:</span>
                        <span>{formatFileSize(report.size)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Created:</span>
                        <span>{formatDate(report.created)}</span>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2 mt-3">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 btn-interactive btn-outline-interactive"
                        onClick={() => handleViewTrainingReport(report)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="btn-interactive btn-outline-interactive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => handleDeleteTrainingReport(report)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* View Modal */}
      <Modal
        isOpen={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        title={viewContent?.type === 'eda' ? 'EDA Report' : 'Model Export'}
      >
        {viewContent && (
          <div className="space-y-4">
            {viewContent.type === 'eda' ? (
              <div>
                <h3 className="text-lg font-semibold mb-2">{(viewContent.data as EDAReport).dataset_name} - EDA Report</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium">File:</span>
                    <span>{(viewContent.data as EDAReport).filename}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Size:</span>
                    <span>{formatFileSize((viewContent.data as EDAReport).size)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Created:</span>
                    <span>{formatDate((viewContent.data as EDAReport).created)}</span>
                  </div>
                </div>
                <div className="mt-4">
                  <Button 
                    onClick={() => window.open(edaAPI.viewReport((viewContent.data as EDAReport).filename), '_blank')}
                    className="w-full btn-interactive btn-primary-interactive"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open Report in New Tab
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <h3 className="text-lg font-semibold mb-2">{(viewContent.data as ModelExport).model_name}</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium">File:</span>
                    <span>{(viewContent.data as ModelExport).filename}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Size:</span>
                    <span>{formatFileSize((viewContent.data as ModelExport).size)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Created:</span>
                    <span>{formatDate((viewContent.data as ModelExport).created)}</span>
                  </div>
                </div>
                <div className="mt-4">
                  <Button 
                    onClick={() => window.open(getStaticFileUrl((viewContent.data as ModelExport).url), '_blank')}
                    className="w-full btn-interactive btn-primary-interactive"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Download Model
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Reports;