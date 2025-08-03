// Batch Processing Types for DART System

export enum BatchJobType {
  HISTORICAL_BACKFILL = 'HISTORICAL_BACKFILL',
  INDEX_RECALCULATION = 'INDEX_RECALCULATION',
  DATA_VALIDATION = 'DATA_VALIDATION',
  BULK_REPORT_GENERATION = 'BULK_REPORT_GENERATION',
  DATA_MIGRATION = 'DATA_MIGRATION'
}

export enum BatchJobStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  PAUSED = 'PAUSED'
}

export enum BatchJobPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH'
}

export enum ProcessingStrategy {
  CHUNKED = 'CHUNKED',
  STREAM = 'STREAM',
  PARALLEL = 'PARALLEL'
}

export enum LogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

// Core Batch Job Interfaces
export interface BatchJobParameters {
  dateRange?: {
    startDate: string;
    endDate: string;
  };
  targetMarkets?: ('KOSPI' | 'KOSDAQ')[];
  processingStrategy?: ProcessingStrategy;
  chunkSize?: number;
  priority?: BatchJobPriority;
  overwriteExisting?: boolean;
  validationLevel?: 'BASIC' | 'COMPREHENSIVE';
  components?: string[];
  newWeights?: {
    priceMomentum: number;
    investorSentiment: number;
    putCallRatio: number;
    volatility: number;
    safeHaven: number;
  };
}

export interface BatchJobMetadata {
  description?: string;
  tags?: string[];
  requestedBy?: string;
  estimatedDuration?: number;
  resourceRequirements?: {
    memory?: string;
    cpu?: string;
  };
}

export interface BatchJobProgress {
  totalItems: number;
  processedItems: number;
  failedItems: number;
  progressPercentage: number;
  currentItem?: string;
  itemsPerSecond?: number;
  estimatedTimeRemaining?: number;
}

export interface BatchJobExecutionInfo {
  startedAt?: Date;
  completedAt?: Date;
  duration?: number; // in milliseconds
  estimatedTimeRemaining?: number; // in milliseconds
}

// API Request/Response Types
export interface CreateBatchJobRequest {
  type: BatchJobType;
  parameters: BatchJobParameters;
  metadata?: BatchJobMetadata;
}

export interface CreateBatchJobResponse {
  jobId: string;
  status: BatchJobStatus;
  estimatedDuration?: number;
  createdAt: string;
  queuePosition?: number;
}

export interface BatchJobStatusResponse {
  jobId: string;
  type: BatchJobType;
  status: BatchJobStatus;
  priority: BatchJobPriority;
  progress: BatchJobProgress;
  execution: BatchJobExecutionInfo;
  result?: BatchJobResult;
  errors?: BatchJobError[];
}

export interface BatchJobSummary {
  jobId: string;
  type: BatchJobType;
  status: BatchJobStatus;
  priority: BatchJobPriority;
  progressPercentage: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  createdBy?: string;
}

export interface ListBatchJobsResponse {
  jobs: BatchJobSummary[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface BatchJobResult {
  id: string;
  jobId: string;
  resultType: string;
  resultData: any;
  filePath?: string;
  createdAt: string;
}

export interface BatchJobError {
  id: string;
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: any;
}

export interface BatchJobLog {
  id: string;
  jobId: string;
  timestamp: string;
  logLevel: LogLevel;
  message: string;
  context?: any;
}

// Batch Job Control Operations
export interface BatchJobControlResponse {
  jobId: string;
  previousStatus: BatchJobStatus;
  newStatus: BatchJobStatus;
  message: string;
  timestamp: string;
}

// System Metrics and Monitoring
export interface BatchMetricsResponse {
  system: {
    activeJobs: number;
    queuedJobs: number;
    completedToday: number;
    failedToday: number;
    avgProcessingTime: number; // in milliseconds
  };
  performance: {
    itemsPerSecond: number;
    memoryUsage: string;
    cpuUsage: number;
  };
  health: {
    status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
    lastSuccessfulJob?: string;
    errorRate: number;
  };
}

// Specific Job Type Requests
export interface HistoricalBackfillRequest {
  dateRange: {
    startDate: string;
    endDate: string;
  };
  components?: ('PRICE_MOMENTUM' | 'INVESTOR_SENTIMENT' | 'PUT_CALL_RATIO' | 'VOLATILITY' | 'SAFE_HAVEN')[];
  overwriteExisting: boolean;
  validationLevel: 'BASIC' | 'COMPREHENSIVE';
}

export interface RecalculateIndexRequest {
  dateRange: {
    startDate: string;
    endDate: string;
  };
  recalculationReason: string;
  newWeights?: {
    priceMomentum: number;
    investorSentiment: number;
    putCallRatio: number;
    volatility: number;
    safeHaven: number;
  };
}

export interface DataValidationRequest {
  dateRange: {
    startDate: string;
    endDate: string;
  };
  validationRules: ValidationRule[];
  autoCorrect: boolean;
  reportLevel: 'SUMMARY' | 'DETAILED';
}

export interface ValidationRule {
  field: string;
  rule: 'NOT_NULL' | 'RANGE' | 'PATTERN' | 'CUSTOM';
  parameters?: any;
}

export interface BulkReportRequest {
  reportType: 'MONTHLY_SUMMARY' | 'QUARTERLY_ANALYSIS' | 'YEARLY_TRENDS' | 'CUSTOM';
  dateRange: {
    startDate: string;
    endDate: string;
  };
  outputFormat: 'PDF' | 'EXCEL' | 'CSV' | 'JSON';
  includeCharts: boolean;
  recipients?: string[];
}

// WebSocket Events for Real-time Progress
export interface BatchJobProgressEvent {
  jobId: string;
  progress: BatchJobProgress;
  performance: {
    itemsPerSecond: number;
    estimatedTimeRemaining: number;
  };
  timestamp: string;
}

// Processing Result Types
export interface BackfillResult {
  totalDays: number;
  processedDays: number;
  failedDays: number;
  duplicateSkipped: number;
  dataGaps: string[];
  summary: {
    earliestDate: string;
    latestDate: string;
    avgProcessingTime: number;
  };
}

export interface RecalculationResult {
  totalRecalculated: number;
  changes: {
    date: string;
    oldValue: number;
    newValue: number;
    difference: number;
  }[];
  summary: {
    avgChange: number;
    maxChange: number;
    changedDates: number;
  };
}

export interface ValidationResult {
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  errors: {
    field: string;
    rule: string;
    count: number;
    examples: any[];
  }[];
  corrections?: {
    field: string;
    oldValue: any;
    newValue: any;
    date: string;
  }[];
}