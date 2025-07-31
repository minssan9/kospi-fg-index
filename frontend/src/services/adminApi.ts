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

export interface SystemHealth {
  database: {
    status: 'HEALTHY' | 'WARNING' | 'ERROR'
    responseTime: number
    connections: number
  }
  api: {
    status: 'HEALTHY' | 'WARNING' | 'ERROR'
    responseTime: number
    uptime: string
  }
  dataCollection: {
    lastRun: string
    status: 'RUNNING' | 'IDLE' | 'ERROR'
    successRate: number
  }
}

export interface PerformanceMetrics {
  cpu: number
  memory: number
  diskUsage: number
  networkIO: {
    inbound: number
    outbound: number
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

  async getCollectionStatus(days: number = 7): Promise<any[]> {
    try {
      const response = await api.get<{ success: boolean; data: any[] }>(
        `/system/collection-status?days=${days}`
      )
      return response.data.data
    } catch (error) {
      console.error('Failed to get collection status:', error)
      return []
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
  },

  // 시스템 모니터링
  async getSystemHealth(): Promise<SystemHealth> {
    try {
      const response = await api.get<{ success: boolean; data: SystemHealth }>('/admin/system-health')
      return response.data.data
    } catch (error) {
      console.error('Failed to get system health:', error)
      // Return mock data for development
      return {
        database: {
          status: 'HEALTHY',
          responseTime: 45,
          connections: 12
        },
        api: {
          status: 'HEALTHY',
          responseTime: 120,
          uptime: '7d 12h 30m'
        },
        dataCollection: {
          lastRun: new Date().toISOString(),
          status: 'IDLE',
          successRate: 95.6
        }
      }
    }
  },

  async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    try {
      const response = await api.get<{ success: boolean; data: PerformanceMetrics }>('/admin/performance-metrics')
      return response.data.data
    } catch (error) {
      console.error('Failed to get performance metrics:', error)
      // Return mock data for development
      return {
        cpu: Math.floor(Math.random() * 40) + 10,
        memory: Math.floor(Math.random() * 30) + 40,
        diskUsage: Math.floor(Math.random() * 20) + 60,
        networkIO: {
          inbound: Math.floor(Math.random() * 1000) + 500,
          outbound: Math.floor(Math.random() * 800) + 200
        }
      }
    }
  },

  // 시스템 제어
  async restartService(serviceName: string): Promise<void> {
    try {
      await api.post(`/admin/restart-service/${serviceName}`)
    } catch (error) {
      console.error(`Failed to restart service ${serviceName}:`, error)
      throw new Error(`${serviceName} 서비스 재시작에 실패했습니다.`)
    }
  },

  async clearCache(): Promise<void> {
    try {
      await api.post('/admin/clear-cache')
    } catch (error) {
      console.error('Failed to clear cache:', error)
      throw new Error('캐시 삭제에 실패했습니다.')
    }
  },

  // 설정 관리
  async getSystemConfig(): Promise<Record<string, any>> {
    try {
      const response = await api.get<{ success: boolean; data: Record<string, any> }>('/admin/system-config')
      return response.data.data
    } catch (error) {
      console.error('Failed to get system config:', error)
      return {}
    }
  },

  async updateSystemConfig(config: Record<string, any>): Promise<void> {
    try {
      await api.put('/admin/system-config', config)
    } catch (error) {
      console.error('Failed to update system config:', error)
      throw new Error('시스템 설정 업데이트에 실패했습니다.')
    }
  }
}

export default adminApi