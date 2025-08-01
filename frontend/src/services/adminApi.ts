import { api } from '@/boot/axios'

// Admin API 응답 타입 정의
export interface DataCollectionRequest {
  date: string
  sources: string[]
}

export interface DataCollectionResult {
  source: string
  status: 'SUCCESS' | 'FAILED'
  message: string
}

export interface DataCollectionResponse {
  date: string
  results: DataCollectionResult[]
}

export interface CalculateIndexRequest {
  date: string
}

export interface CalculateIndexResponse {
  date: string
  value: number
  level: string
  confidence: number
  components: {
    priceMomentum: number
    investorSentiment: number
    putCallRatio: number
    volatilityIndex: number
    safeHavenDemand: number
  }
}

export interface AdminUser {
  id: string
  username: string
  role: 'admin' | 'viewer'
  lastLogin: string
  permissions: string[]
}

// Admin API 서비스
export const adminApi = {
  // 인증 관련
  async login(username: string, password: string): Promise<{ token: string; user: AdminUser }> {
    try {
      // 실제 API 구현 전까지 mock 데이터 사용
      if (username === 'admin' && password === 'admin123') {
        const mockResponse = {
          token: 'mock_admin_token_' + Date.now(),
          user: {
            id: '1',
            username: 'admin',
            role: 'admin' as const,
            lastLogin: new Date().toISOString(),
            permissions: ['read', 'write', 'delete', 'admin']
          }
        }
        return mockResponse
      } else {
        throw new Error('Invalid credentials')
      }
    } catch (error) {
      throw new Error('로그인에 실패했습니다.')
    }
  },

  async validateToken(token: string): Promise<AdminUser> {
    try {
      // Token validation logic here
      // For now, return mock user if token exists
      if (token.startsWith('mock_admin_token_')) {
        return {
          id: '1',
          username: 'admin',
          role: 'admin',
          lastLogin: new Date().toISOString(),
          permissions: ['read', 'write', 'delete', 'admin']
        }
      }
      throw new Error('Invalid token')
    } catch (error) {
      throw new Error('토큰 검증에 실패했습니다.')
    }
  },

  // 데이터 수집 관리
  async collectData(request: DataCollectionRequest): Promise<DataCollectionResponse> {
    try {
      const response = await api.post<{ success: boolean; data: DataCollectionResponse }>(
        '/admin/collect-data', 
        request
      )
      return response.data.data
    } catch (error) {
      console.error('Data collection failed:', error)
      throw new Error('데이터 수집에 실패했습니다.')
    }
  },

  // Fear & Greed 계산 관리
  async calculateIndex(request: CalculateIndexRequest): Promise<CalculateIndexResponse> {
    try {
      const response = await api.post<{ success: boolean; data: CalculateIndexResponse }>(
        '/admin/calculate-index',
        request
      )
      return response.data.data
    } catch (error) {
      console.error('Index calculation failed:', error)
      throw new Error('Fear & Greed Index 계산에 실패했습니다.')
    }
  },

  async recalculateRange(startDate: string, endDate: string): Promise<any[]> {
    try {
      const response = await api.post<{ success: boolean; data: any[] }>(
        '/admin/recalculate-range',
        { startDate, endDate }
      )
      return response.data.data
    } catch (error) {
      console.error('Range recalculation failed:', error)
      throw new Error('범위 재계산에 실패했습니다.')
    }
  }
}

export default adminApi