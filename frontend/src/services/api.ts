import axios from 'axios'
import type { TrainingRequest, ExportRequest, PreprocessingRequest, ImageTrainingRequest } from '@/types/api'

// const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'
const API_BASE_URL = 'http://localhost:8000/api'
// const BACKEND_BASE_URL = import.meta.env.VITE_BACKEND_BASE_URL || 'http://localhost:8000'
const BACKEND_BASE_URL = 'http://localhost:8000'

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 10000, // 10 second timeout
})

// Helper function to get full URL for static files
export const getStaticFileUrl = (path: string) => {
    return `${BACKEND_BASE_URL}${path}`
}

// Dataset API
export const datasetAPI = {
    list: () => api.get('/datasets/'),
    upload: (file: File, separator: string = ',') => {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('separator', separator)
        return api.post('/datasets/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        })
    },
    getInfo: (datasetName: string, separator: string = ',') => api.get(`/datasets/${datasetName}?separator=${separator}`),
    download: (datasetName: string) => api.get(`/datasets/${datasetName}/download`),
    preview: (datasetName: string, limit: number = 10) => api.get(`/datasets/${datasetName}/preview?limit=${limit}`),
    previewColumns: (file: File, separator: string = ',') => {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('separator', separator)
        return api.post('/datasets/preview-columns', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        })
    },
    dropColumns: (datasetName: string, columnsToDrop: string, separator: string = ',') => {
        const formData = new FormData()
        formData.append('columns_to_drop', columnsToDrop)
        formData.append('separator', separator)
        return api.post(`/datasets/${datasetName}/drop-columns`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        })
    },
    delete: (datasetName: string) => api.delete(`/datasets/${datasetName}`)
}

// EDA API
export const edaAPI = {
    generateReport: (datasetName: string) => api.post(`/eda/generate/${datasetName}`),
    getReport: (datasetName: string) => api.get(`/eda/report/${datasetName}`),
    listReports: () => api.get('/eda/reports'),
    viewReport: (filename: string) => `${BACKEND_BASE_URL}/api/eda/view/${filename}`,
    deleteReport: (filename: string) => api.delete(`/eda/reports/${filename}`)
}

// Training API
export const trainingAPI = {
    startTraining: (request: TrainingRequest) => api.post('/training/start', request),
    start: (request: TrainingRequest) => api.post('/training/start', request),
    getStatus: (jobId: string) => api.get(`/training/status/${jobId}`),
    listJobs: () => api.get('/training/jobs'),
    listReports: () => api.get('/training/reports'),
    getReport: (filename: string) => api.get(`/training/reports/${filename}`),
    viewReport: (filename: string) => `${BACKEND_BASE_URL}/api/training/reports/${filename}`,
    deleteReport: (filename: string) => api.delete(`/training/reports/${filename}`)
}

// Export API
export const exportAPI = {
    exportModel: (request: ExportRequest) => api.post('/export/model', request),
    download: (filename: string) => api.get(`/export/download/${filename}`),
    listExports: () => api.get('/export/list'),
    deleteExport: (filename: string) => api.delete(`/export/${filename}`)
}

// Image Training API
export const imageTrainingAPI = {
    uploadDataset: (file: File, taskType: string) => {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('task_type', taskType)
        return api.post('/image-training/upload-dataset', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        })
    },
    startTraining: (request: ImageTrainingRequest) => api.post('/image-training/start-training', request),
    getStatus: (jobId: string) => api.get(`/image-training/jobs/${jobId}`),
    listJobs: () => api.get('/image-training/jobs'),
    getModels: () => api.get('/image-training/models'),
    listDatasets: () => api.get('/image-training/datasets')
}

// AI Analysis API
export const aiAnalysisAPI = {
    analyzeDataset: (datasetName: string, separator: string = ',') =>
        api.post(`/ai/analyze/${datasetName}?separator=${separator}`),
    getSuggestions: (datasetName: string, separator: string = ',') =>
        api.get(`/ai/suggestions/${datasetName}?separator=${separator}`),
    healthCheck: () => api.get('/ai/health')
}

// Preprocessing API
export const preprocessingAPI = {
    startPreprocessing: (request: PreprocessingRequest) => api.post('/preprocessing/start', request),
    startManual: (params: {
        dataset_name: string,
        handle_missing_values?: boolean,
        missing_values_method?: string,
        handle_outliers?: boolean,
        remove_duplicates?: boolean,
        convert_data_types?: boolean,
        data_types?: Record<string, string>
    }) => api.post('/preprocessing/manual', null, { params }),
    getStatus: (jobId: string) => api.get(`/preprocessing/status/${jobId}`),
    listJobs: () => api.get('/preprocessing/jobs'),
    aiAnalyze: (datasetName: string) => api.post(`/preprocessing/ai-analyze/${datasetName}`),
    downloadProcessedData: (jobId: string) => api.get(`/preprocessing/download/${jobId}`, { responseType: 'blob' }),
    getReport: (jobId: string) => api.get(`/preprocessing/reports/${jobId}`),
    listReports: () => api.get('/preprocessing/reports'),
    viewReport: (filename: string) => `${BACKEND_BASE_URL}/api/preprocessing/view/${filename}`,
    deleteReport: (filename: string) => api.delete(`/preprocessing/reports/${filename}`),
    // New manual preprocessing endpoints
    manualPreview: (datasetName: string, targetColumn?: string, separator: string = ',') =>
        api.get(`/preprocessing/manual/preview/${datasetName}?target_column=${targetColumn || ''}&separator=${separator}`),
    manualApply: (request: {
        dataset_name: string,
        operations: {
            drop_columns?: string[],
            change_types?: Record<string, string>,
            missing?: Record<string, { method: string, value?: string | number }>,
            balance?: { method: string, target_column: string }
        },
        separator?: string
    }) => api.post('/preprocessing/manual/apply', request)
}

export default api
