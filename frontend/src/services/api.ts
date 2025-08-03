import { api } from '@/boot/axios'

// API 응답 타입 정의
export interface FearGreedIndex {
  value: number
  level: string
  date: string
  components: {
    priceMomentum: number
    investorSentiment: number
    putCallRatio: number
    volatilityIndex: number
    safeHavenDemand: number
  }
}

export interface MarketData {
  kospi: {
    current: number
    change: number
    changePercent: number
    volume: number
    marketCap: number
  }
  kosdaq: {
    current: number
    change: number
    changePercent: number
    volume: number
    marketCap: number | null
  }
}

export interface HistoryData {
  date: string
  value: number
  level: string
}

export interface SystemStatus {
  system: {
    status: string
    timestamp: string
  }
  latestData: {
    fearGreedIndex: {
      date: string
      value: number
      level: string
    } | null
    kospiIndex: {
      date: string
      change: number
    } | null
  }
  recentCollections: number
}

export interface CollectionStatus {
  date: string
  source: string
  dataType: string
  status: string
  recordCount: number
  errorMessage: string | null
  createdAt: string
}

// Fear & Greed API
export const fearGreedApi = {
  // 현재 Fear & Greed Index 가져오기
  async getCurrentIndex(): Promise<FearGreedIndex> {
    try {
      const response = await api.get<{ success: boolean; data: FearGreedIndex }>('/fear-greed/current')
      return response.data.data
    } catch (error) {
      return {
        value: 45,
        level: 'Fear',
        date: new Date().toISOString().split('T')[0],
        components: {
          priceMomentum: 42,
          investorSentiment: 38,
          putCallRatio: 55,
          volatilityIndex: 48,
          safeHavenDemand: 52
        }
      }
    }
  },

  // 히스토리 데이터 가져오기
  async getHistoryData(days: number = 30): Promise<HistoryData[]> {
    try {
      const response = await api.get<{ success: boolean; data: HistoryData[] }>(`/fear-greed/history?days=${days}`)
      return response.data.data
    } catch (error) {
      const sampleData: HistoryData[] = []
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        sampleData.push({
          date: date.toISOString().split('T')[0],
          value: Math.floor(Math.random() * 40) + 30,
          level: 'Fear'
        })
      }
      return sampleData
    }
  },

  // 특정 날짜의 Fear & Greed Index 조회
  async getIndexByDate(date: string): Promise<HistoryData | null> {
    try {
      const response = await api.get<{ success: boolean; data: HistoryData }>(`/fear-greed/date/${date}`)
      return response.data.data
    } catch (error) {
      return null
    }
  }
}

// 시장 데이터 API
export const marketApi = {
  // KOSPI 데이터 가져오기
  async getKospiData() {
    try {
      const response = await api.get<{ success: boolean; data: MarketData['kospi'] }>('/data/kospi')
      return response.data.data
    } catch (error) {
      return {
        current: 2485.67,
        change: -12.45,
        changePercent: -0.50,
        volume: 450000000,
        marketCap: 2000000000000
      }
    }
  },

  // KOSDAQ 데이터 가져오기
  async getKosdaqData() {
    try {
      const response = await api.get<{ success: boolean; data: MarketData['kosdaq'] }>('/data/kosdaq')
      return response.data.data
    } catch (error) {
      return {
        current: 742.89,
        change: 5.23,
        changePercent: 0.71,
        volume: 350000000,
        marketCap: 500000000000
      }
    }
  },

  // 전체 시장 데이터 가져오기
  async getAllMarketData(): Promise<MarketData> {
    try {
      const response = await api.get<{ success: boolean; data: MarketData }>('/data/market')
      return response.data.data
    } catch (error) {
      return {
        kospi: {
          current: 2485.67,
          change: -12.45,
          changePercent: -0.50,
          volume: 450000000,
          marketCap: 2000000000000
        },
        kosdaq: {
          current: 742.89,
          change: 5.23,
          changePercent: 0.71,
          volume: 350000000,
          marketCap: 500000000000
        }
      }
    }
  }
}

// 시스템 API
export const systemApi = {
  // 시스템 상태 조회
  async getSystemStatus(): Promise<SystemStatus> {
    try {
      const response = await api.get<{ success: boolean; data: SystemStatus }>('/system/status')
      return response.data.data
    } catch (error) {
      return {
        system: {
          status: 'UNKNOWN',
          timestamp: new Date().toISOString()
        },
        latestData: {
          fearGreedIndex: null,
          kospiIndex: null
        },
        recentCollections: 0
      }
    }
  },

  // 데이터 수집 상태 조회
  async getCollectionStatus(days: number = 7): Promise<CollectionStatus[]> {
    try {
      const response = await api.get<{ success: boolean; data: CollectionStatus[] }>(`/system/collection-status?days=${days}`)
      return response.data.data
    } catch (error) {
      return []
    }
  }
}

// Batch Processing Types
export interface BatchJob {
  jobId: string
  type: string
  status: string
  priority: string
  progressPercentage: number
  createdAt: string
  startedAt?: string
  completedAt?: string
  createdBy?: string
}

export interface BatchJobStatus {
  jobId: string
  type: string
  status: string
  priority: string
  progress: {
    totalItems: number
    processedItems: number
    failedItems: number
    progressPercentage: number
    itemsPerSecond?: number
    estimatedTimeRemaining?: number
  }
  execution: {
    startedAt?: string
    completedAt?: string
    duration?: number
    estimatedTimeRemaining?: number
  }
  result?: any
  errors?: any[]
}

export interface CreateBatchJobRequest {
  type: string
  parameters: {
    dateRange?: {
      startDate: string
      endDate: string
    }
    targetMarkets?: string[]
    processingStrategy?: string
    chunkSize?: number
    priority?: string
    overwriteExisting?: boolean
    validationLevel?: string
    components?: string[]
    newWeights?: {
      priceMomentum: number
      investorSentiment: number
      putCallRatio: number
      volatility: number
      safeHaven: number
    }
  }
  metadata?: {
    description?: string
    tags?: string[]
    requestedBy?: string
  }
}

export interface BatchMetrics {
  system: {
    activeJobs: number
    queuedJobs: number
    completedToday: number
    failedToday: number
    avgProcessingTime: number
  }
  performance: {
    itemsPerSecond: number
    memoryUsage: string
    cpuUsage: number
  }
  health: {
    status: string
    lastSuccessfulJob?: string
    errorRate: number
  }
}

// Batch Processing API
export const batchApi = {
  // List batch jobs
  async listBatchJobs(page: number = 1, limit: number = 20, status?: string, type?: string): Promise<{
    jobs: BatchJob[]
    pagination: {
      total: number
      page: number
      limit: number
      hasNext: boolean
      hasPrev: boolean
    }
  }> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      })
      if (status) params.append('status', status)
      if (type) params.append('type', type)

      const response = await api.get(`/batch/jobs?${params}`)
      return response.data.data
    } catch (error) {
      console.error('Failed to list batch jobs:', error)
      throw error
    }
  },

  // Create batch job
  async createBatchJob(request: CreateBatchJobRequest): Promise<{
    jobId: string
    status: string
    estimatedDuration?: number
    createdAt: string
    queuePosition?: number
  }> {
    try {
      const response = await api.post('/batch/jobs', request)
      return response.data.data
    } catch (error) {
      console.error('Failed to create batch job:', error)
      throw error
    }
  },

  // Get batch job status
  async getBatchJobStatus(jobId: string): Promise<BatchJobStatus> {
    try {
      const response = await api.get(`/batch/jobs/${jobId}`)
      return response.data.data
    } catch (error) {
      console.error('Failed to get batch job status:', error)
      throw error
    }
  },

  // Start batch job
  async startBatchJob(jobId: string): Promise<any> {
    try {
      const response = await api.post(`/batch/jobs/${jobId}/start`)
      return response.data.data
    } catch (error) {
      console.error('Failed to start batch job:', error)
      throw error
    }
  },

  // Pause batch job
  async pauseBatchJob(jobId: string): Promise<any> {
    try {
      const response = await api.post(`/batch/jobs/${jobId}/pause`)
      return response.data.data
    } catch (error) {
      console.error('Failed to pause batch job:', error)
      throw error
    }
  },

  // Cancel batch job
  async cancelBatchJob(jobId: string): Promise<any> {
    try {
      const response = await api.post(`/batch/jobs/${jobId}/cancel`)
      return response.data.data
    } catch (error) {
      console.error('Failed to cancel batch job:', error)
      throw error
    }
  },

  // Create historical backfill job
  async createHistoricalBackfill(request: {
    dateRange: {
      startDate: string
      endDate: string
    }
    components?: string[]
    overwriteExisting: boolean
    validationLevel: string
  }): Promise<any> {
    try {
      const response = await api.post('/batch/historical-backfill', request)
      return response.data.data
    } catch (error) {
      console.error('Failed to create historical backfill:', error)
      throw error
    }
  },

  // Create index recalculation job
  async createIndexRecalculation(request: {
    dateRange: {
      startDate: string
      endDate: string
    }
    recalculationReason: string
    newWeights?: {
      priceMomentum: number
      investorSentiment: number
      putCallRatio: number
      volatility: number
      safeHaven: number
    }
  }): Promise<any> {
    try {
      const response = await api.post('/batch/recalculate-index', request)
      return response.data.data
    } catch (error) {
      console.error('Failed to create index recalculation:', error)
      throw error
    }
  },

  // Get batch metrics
  async getBatchMetrics(): Promise<BatchMetrics> {
    try {
      const response = await api.get('/batch/metrics')
      return response.data.data
    } catch (error) {
      console.error('Failed to get batch metrics:', error)
      return {
        system: {
          activeJobs: 0,
          queuedJobs: 0,
          completedToday: 0,
          failedToday: 0,
          avgProcessingTime: 0
        },
        performance: {
          itemsPerSecond: 0,
          memoryUsage: '0MB',
          cpuUsage: 0
        },
        health: {
          status: 'UNKNOWN',
          errorRate: 0
        }
      }
    }
  },

  // Get job logs
  async getJobLogs(jobId: string, page: number = 1, limit: number = 50): Promise<{
    logs: Array<{
      timestamp: string
      level: string
      message: string
      context?: any
    }>
    pagination: {
      total: number
      page: number
      limit: number
      hasNext: boolean
      hasPrev: boolean
    }
  }> {
    try {
      const response = await api.get(`/batch/jobs/${jobId}/logs?page=${page}&limit=${limit}`)
      return response.data.data
    } catch (error) {
      console.error('Failed to get job logs:', error)
      throw error
    }
  }
}

export default api 