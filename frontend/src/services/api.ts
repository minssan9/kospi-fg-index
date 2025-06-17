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

export default api 