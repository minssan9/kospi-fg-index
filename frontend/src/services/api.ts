import axios from 'axios'

// API 기본 설정
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
})

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
  }
  kosdaq: {
    current: number
    change: number
    changePercent: number
  }
}

export interface HistoryData {
  date: string
  value: number
}

// API 호출 함수들
export const fearGreedApi = {
  // 현재 Fear & Greed Index 가져오기
  async getCurrentIndex(): Promise<FearGreedIndex> {
    try {
      const response = await api.get<FearGreedIndex>('/fear-greed/current')
      return response.data
    } catch (error) {
      console.error('Failed to fetch current index:', error)
      // 에러 시 샘플 데이터 반환
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

  // 시장 데이터 가져오기
  async getMarketData(): Promise<MarketData> {
    try {
      const response = await api.get<MarketData>('/market/current')
      return response.data
    } catch (error) {
      console.error('Failed to fetch market data:', error)
      // 에러 시 샘플 데이터 반환
      return {
        kospi: {
          current: 2485.67,
          change: -12.45,
          changePercent: -0.50
        },
        kosdaq: {
          current: 742.89,
          change: 5.23,
          changePercent: 0.71
        }
      }
    }
  },

  // 히스토리 데이터 가져오기
  async getHistoryData(days: number = 30): Promise<HistoryData[]> {
    try {
      const response = await api.get<HistoryData[]>(`/fear-greed/history?days=${days}`)
      return response.data
    } catch (error) {
      console.error('Failed to fetch history data:', error)
      // 에러 시 샘플 데이터 반환
      const sampleData: HistoryData[] = []
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        sampleData.push({
          date: date.toISOString().split('T')[0],
          value: Math.floor(Math.random() * 40) + 30 // 30-70 사이 랜덤값
        })
      }
      return sampleData
    }
  }
}

export default api 