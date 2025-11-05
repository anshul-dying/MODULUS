import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Upload,
  Play,
  RefreshCw,
  Image as ImageIcon,
  Brain,
  CheckCircle,
  XCircle,
  Clock,
  Layers
} from 'lucide-react';
import { imageTrainingAPI } from '@/services/api';
import type { AxiosErrorResponse } from '@/types/api';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { TooltipSimple } from '@/components/ui/tooltip-simple';

interface ModelOption {
  id: string;
  label: string;
}

interface ImageDataset {
  name: string;
  task_type: 'classification' | 'regression';
  created_at: string;
  classes?: string[];
  num_images?: number;
  num_records?: number;
  sample_targets?: (number | null)[];
  has_validation?: boolean;
}

interface ImageTrainingJob {
  job_id: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  task_type: string;
  dataset_name: string;
  project_name: string;
  base_model: string;
  created_at: string;
  started_at?: string;
  finished_at?: string;
  metrics?: Record<string, number>;
  error?: string;
  output_dir?: string;
}

const defaultModels: { classification: ModelOption[]; regression: ModelOption[] } = {
  classification: [],
  regression: []
};

const ImageTraining: React.FC = () => {
  const [datasets, setDatasets] = useState<ImageDataset[]>([]);
  const [jobs, setJobs] = useState<ImageTrainingJob[]>([]);
  const [models, setModels] = useState(defaultModels);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [training, setTraining] = useState(false);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedDataset, setSelectedDataset] = useState<string>('');
  const [taskType, setTaskType] = useState<'classification' | 'regression' | ''>('');
  const [projectName, setProjectName] = useState<string>('');
  const [baseModel, setBaseModel] = useState<string>('');
  const [epochs, setEpochs] = useState<string>('3');
  const [batchSize, setBatchSize] = useState<string>('8');
  const [learningRate, setLearningRate] = useState<string>('0.00005');
  const [gradientAccumulation, setGradientAccumulation] = useState<string>('1');
  const [warmupRatio, setWarmupRatio] = useState<string>('0.1');
  const [mixedPrecision, setMixedPrecision] = useState<string>('');
  const [autoFindBatchSize, setAutoFindBatchSize] = useState<boolean>(false);
  const [pushToHub, setPushToHub] = useState<boolean>(false);
  const [username, setUsername] = useState<string>('');
  const [token, setToken] = useState<string>('');
  const [logOption, setLogOption] = useState<string>('none');
  const [saveTotalLimit, setSaveTotalLimit] = useState<string>('1');
  const [seed, setSeed] = useState<string>('42');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [datasetsResponse, jobsResponse, modelsResponse] = await Promise.all([
        imageTrainingAPI.listDatasets(),
        imageTrainingAPI.listJobs(),
        imageTrainingAPI.getModels()
      ]);

      setDatasets(datasetsResponse.data.datasets || []);
      setJobs(jobsResponse.data.jobs || []);
      setModels(modelsResponse.data || defaultModels);
    } catch (error) {
      console.error('Error loading image training data:', error);
    } finally {
      setLoading(false);
    }
  };

  const activeDataset = useMemo(() => datasets.find(d => d.name === selectedDataset) || null, [datasets, selectedDataset]);

  useEffect(() => {
    if (activeDataset) {
      setTaskType(activeDataset.task_type);
      if (!projectName) {
        setProjectName(`${activeDataset.name}-run`);
      }
    }
  }, [activeDataset, projectName]);

  const availableModelsRaw = taskType ? models[taskType] || [] : [];
  const availableModels = useMemo(
    () => availableModelsRaw.filter((model): model is ModelOption => Boolean(model && model.id && model.label)),
    [availableModelsRaw]
  );

  useEffect(() => {
    if (!taskType) {
      setBaseModel('');
      return;
    }
    if (availableModels.length > 0) {
      setBaseModel(availableModels[0].id);
    } else {
      setBaseModel('');
    }
  }, [taskType, availableModels]);

  const handleFileUpload = async () => {
    if (!selectedFile || !taskType) {
      alert('Please select a ZIP file and task type before uploading.');
      return;
    }

    if (!selectedFile.name.endsWith('.zip')) {
      alert('Only .zip archives are supported.');
      return;
    }

    try {
      setUploading(true);
      await imageTrainingAPI.uploadDataset(selectedFile, taskType);
      alert('Dataset uploaded successfully!');
      setSelectedFile(null);
      await loadData();
    } catch (error) {
      console.error('Error uploading dataset:', error);
      alert('Error uploading dataset');
    } finally {
      setUploading(false);
    }
  };

  const handleStartTraining = async () => {
    if (!selectedDataset || !taskType || !baseModel || !projectName.trim()) {
      alert('Please select a dataset, task type, base model, and project name.');
      return;
    }

    const numericEpochs = Number(epochs);
    const numericBatchSize = Number(batchSize);
    const numericLearningRate = Number(learningRate);
    const numericGradAcc = Number(gradientAccumulation);
    const numericWarmup = Number(warmupRatio);
    const numericSaveLimit = Number(saveTotalLimit);
    const numericSeed = Number(seed);

    if (
      !Number.isFinite(numericEpochs) ||
      !Number.isFinite(numericBatchSize) ||
      !Number.isFinite(numericLearningRate) ||
      numericEpochs <= 0 ||
      numericBatchSize <= 0 ||
      numericLearningRate <= 0
    ) {
      alert('Please provide valid numeric values for epochs, batch size, and learning rate.');
      return;
    }

    const payload = {
      dataset_name: selectedDataset,
      project_name: projectName.trim(),
      task_type: taskType,
      base_model: baseModel,
      epochs: numericEpochs,
      batch_size: numericBatchSize,
      learning_rate: numericLearningRate,
      gradient_accumulation: Number.isFinite(numericGradAcc) ? numericGradAcc : 1,
      warmup_ratio: Number.isFinite(numericWarmup) ? numericWarmup : 0.1,
      mixed_precision: mixedPrecision || null,
      auto_find_batch_size: autoFindBatchSize,
      push_to_hub: pushToHub,
      username: pushToHub ? username || null : null,
      token: pushToHub ? token || null : null,
      log: logOption,
      save_total_limit: Number.isFinite(numericSaveLimit) ? numericSaveLimit : 1,
      seed: Number.isFinite(numericSeed) ? numericSeed : 42
    };

    try {
      setTraining(true);
      const response = await imageTrainingAPI.startTraining(payload);
      alert(`Training job queued! Job ID: ${response.data.job_id}`);
      await loadData();
    } catch (error) {
      console.error('Error starting training:', error);
      const err = error as AxiosErrorResponse;
      const message = err?.response?.data?.detail || err?.message || 'Error starting training';
      alert(message);
    } finally {
      setTraining(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'running':
        return <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'running':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Breadcrumb */}
      <Breadcrumb items={[{ label: 'Image Training' }]} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="animate-fade-in-left">
          <h1 className="text-3xl font-bold text-gradient flex items-center gap-2">
            <ImageIcon className="h-8 w-8" />
            Image Training
          </h1>
          <p className="text-muted-foreground mt-2">
            Fine-tune transformer vision models on your image datasets using the Hugging Face AutoTrain pipeline
          </p>
        </div>
        <TooltipSimple content="Refresh data">
          <Button
            onClick={loadData}
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

        <Card className="glassmorphism animate-fade-in-up border-2 border-dashed border-primary/30 hover:border-primary/50 transition-colors">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Image Dataset
            </CardTitle>
            <CardDescription>
              Upload a ZIP archive containing an `imagefolder` dataset (e.g. train/class_name/*). For regression, include metadata.jsonl files.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="file">Dataset Archive (.zip)</Label>
                <Input
                  id="file"
                  type="file"
                  accept=".zip"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="uploadTaskType">Task Type</Label>
                <Select value={taskType || ''} onValueChange={(value) => setTaskType(value as 'classification' | 'regression')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select task type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="classification">Classification</SelectItem>
                    <SelectItem value="regression">Regression</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col justify-end">
                <Button
                  onClick={handleFileUpload}
                  disabled={uploading || !selectedFile || !taskType}
                  className="w-full btn-interactive btn-primary-interactive"
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
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Tip: organise your archive as <code>train/&lt;class&gt;/image.jpg</code> (and optional <code>validation/</code>) for classification. For regression, add a <code>metadata.jsonl</code> with <code>file_name</code> and <code>target</code> columns.
            </p>
          </CardContent>
        </Card>

        <Card className="glassmorphism animate-fade-in-up">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Brain className="h-5 w-5 text-primary" />
              <span>Training Configuration</span>
            </CardTitle>
            <CardDescription>
              Configure your AutoTrain job and kick off fine-tuning
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="dataset">Dataset</Label>
                <Select value={selectedDataset || ''} onValueChange={setSelectedDataset}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select dataset" />
                  </SelectTrigger>
                  <SelectContent>
                    {datasets
                      .filter((dataset) => dataset?.name)
                      .map((dataset) => (
                        <SelectItem key={dataset.name} value={String(dataset.name)}>
                          {dataset.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="projectName">Project Name</Label>
                <Input
                  id="projectName"
                  placeholder="my-awesome-run"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="baseModel">Base Model</Label>
                <Select value={availableModels.length ? baseModel : ''} onValueChange={setBaseModel} disabled={availableModels.length === 0}>
                  <SelectTrigger>
                    <SelectValue placeholder={availableModels.length ? 'Select model' : 'No models available'} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableModels.map((model) => (
                      <SelectItem key={model.id} value={String(model.id)}>
                        {model.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="epochs">Epochs</Label>
                <Input id="epochs" type="number" min="1" max="20" value={epochs} onChange={(e) => setEpochs(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="batchSize">Batch Size</Label>
                <Input id="batchSize" type="number" min="1" max="64" value={batchSize} onChange={(e) => setBatchSize(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="learningRate">Learning Rate</Label>
                <Input id="learningRate" type="number" step="0.00001" value={learningRate} onChange={(e) => setLearningRate(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="gradientAccumulation">Gradient Accumulation</Label>
                <Input
                  id="gradientAccumulation"
                  type="number"
                  min="1"
                  max="128"
                  value={gradientAccumulation}
                  onChange={(e) => setGradientAccumulation(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="warmupRatio">Warmup Ratio</Label>
                <Input id="warmupRatio" type="number" step="0.01" value={warmupRatio} onChange={(e) => setWarmupRatio(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="mixedPrecision">Mixed Precision</Label>
                <Select value={mixedPrecision || ''} onValueChange={(value) => setMixedPrecision(value === '' ? '' : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Disabled" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="fp16">fp16</SelectItem>
                    <SelectItem value="bf16">bf16</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between rounded-lg border border-border/60 px-4 py-3">
                <div>
                  <Label className="text-sm font-medium">Auto-find Batch Size</Label>
                  <p className="text-xs text-muted-foreground">Let AutoTrain search for the largest stable batch size.</p>
                </div>
                <Switch checked={autoFindBatchSize} onCheckedChange={setAutoFindBatchSize} />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border/60 px-4 py-3">
                <div>
                  <Label className="text-sm font-medium">Push to Hub</Label>
                  <p className="text-xs text-muted-foreground">Upload trained weights to your Hugging Face account.</p>
                </div>
                <Switch checked={pushToHub} onCheckedChange={setPushToHub} />
              </div>
            </div>

            {pushToHub && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="username">HF Username</Label>
                  <Input
                    id="username"
                    placeholder="your-hf-username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="token">HF Token</Label>
                  <Input id="token" type="password" value={token} onChange={(e) => setToken(e.target.value)} />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="logOption">Experiment Logging</Label>
                <Select value={logOption || ''} onValueChange={setLogOption}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Disabled</SelectItem>
                    <SelectItem value="tensorboard">TensorBoard</SelectItem>
                    <SelectItem value="wandb">Weights & Biases</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="saveTotalLimit">Checkpoint Limit</Label>
                <Input
                  id="saveTotalLimit"
                  type="number"
                  min="1"
                  max="10"
                  value={saveTotalLimit}
                  onChange={(e) => setSaveTotalLimit(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="seed">Seed</Label>
                <Input id="seed" type="number" value={seed} onChange={(e) => setSeed(e.target.value)} />
              </div>
            </div>

            {activeDataset && (
              <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-4">
                <h3 className="font-semibold flex items-center gap-2 text-primary">
                  <Layers className="h-4 w-4" /> Dataset Summary
                </h3>
                <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                  <div>
                    <strong>Task:</strong> {activeDataset.task_type}
                  </div>
                  <div>
                    <strong>Validation Split:</strong> {activeDataset.has_validation ? 'Provided' : 'Will be created (20%)'}
                  </div>
                  {activeDataset.task_type === 'classification' && (
                    <>
                      <div>
                        <strong>Classes:</strong> {activeDataset.classes?.join(', ') || '—'}
                      </div>
                      <div>
                        <strong>Images:</strong> {activeDataset.num_images ?? '—'}
                      </div>
                    </>
                  )}
                  {activeDataset.task_type === 'regression' && (
                    <>
                      <div>
                        <strong>Records:</strong> {activeDataset.num_records ?? '—'}
                      </div>
                      <div>
                        <strong>Sample Targets:</strong> {activeDataset.sample_targets?.slice(0, 3).join(', ') || '—'}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <Button
                onClick={handleStartTraining}
                disabled={training || !selectedDataset || !taskType || !baseModel || !projectName.trim()}
                className="btn-interactive btn-primary-interactive"
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
              <Button onClick={loadData} variant="outline" className="btn-interactive btn-outline-interactive">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="glassmorphism animate-fade-in-up">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <ImageIcon className="h-5 w-5 text-primary" />
              <span>Training Jobs</span>
            </CardTitle>
            <CardDescription>
              Monitor the status of your AutoTrain image jobs
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <RefreshCw className="h-8 w-8 mx-auto animate-spin text-muted-foreground" />
                <p className="text-muted-foreground mt-2">Loading jobs...</p>
              </div>
            ) : jobs.length === 0 ? (
              <div className="text-center py-8">
                <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No image training jobs yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {jobs.map((job) => (
                  <div key={job.job_id} className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between p-4 rounded-lg border border-border/50 bg-card/50">
                    <div className="flex items-start gap-4">
                      <div className="mt-1">{getStatusIcon(job.status)}</div>
                      <div>
                        <p className="font-medium">Job #{job.job_id.slice(0, 10)}</p>
                        <p className="text-sm text-muted-foreground">
                          {job.task_type} • {job.base_model} • {job.dataset_name}
                        </p>
                        {job.metrics && Object.keys(job.metrics).length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2 text-xs text-green-600">
                            {Object.entries(job.metrics).map(([key, value]) => (
                              <Badge key={key} variant="outline" className="border-green-200 bg-green-100/40 text-green-700">
                                {key.replace('eval_', '')}: {typeof value === 'number' ? value.toFixed(4) : value}
                              </Badge>
                            ))}
                          </div>
                        )}
                        {job.status === 'failed' && job.error && (
                          <p className="text-sm text-red-600 mt-2">Error: {job.error}</p>
                        )}
                        {job.output_dir && job.status === 'completed' && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Artifacts saved to <code>{job.output_dir}</code>
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge className={getStatusColor(job.status)}>{job.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
    </div>
  );
};

export default ImageTraining;
