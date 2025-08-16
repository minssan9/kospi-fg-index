import * as express from 'express'
import { Request, Response } from 'express'
import * as os from 'os'
import { performance } from 'perf_hooks'
import { DatabaseService } from '@/services/core/databaseService'
import { FearGreedCalculator } from '@/services/core/fearGreedCalculator'
import { KRXCollector } from '@/collectors/financial/krxCollector'
import { BOKCollector } from '@/collectors/financial/bokCollector'
import { formatDate } from '@/utils/common/dateUtils'
import { 
  authenticateAdmin, 
  generateToken, 
  verifyToken,
  requireAdmin, 
  requirePermission,
  requireAdminRole,
  AuthenticatedRequest 
} from '../middleware/adminAuth'

const router = express.Router()

// ============================================================================
// AUTHENTICATION ROUTES
// ============================================================================

/**
 * Admin Login
 * POST /api/admin/login
 * Body: { username: string, password: string }
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body

    // Validate input
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: '사용자명과 비밀번호를 입력해주세요.',
        code: 'MISSING_CREDENTIALS'
      })
    }

    // Authenticate user
    const user = await authenticateAdmin(username, password)
    if (!user) {
      return res.status(401).json({
        success: false,
        message: '잘못된 사용자명 또는 비밀번호입니다.',
        code: 'INVALID_CREDENTIALS'
      })
    }

    // Generate JWT token
    const token = generateToken(user)

    // Log successful login
    console.log(`[Admin] Successful login: ${username} at ${new Date().toISOString()}`)

    return res.json({
      success: true,
      message: '로그인 성공',
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          permissions: user.permissions,
          lastLogin: user.lastLogin
        }
      }
    })
  } catch (error) {
    console.error('[Admin] Login error:', error)
    return res.status(500).json({
      success: false,
      message: '로그인 처리 중 오류가 발생했습니다.',
      code: 'LOGIN_ERROR'
    })
  }
})

/**
 * Validate Token
 * POST /api/admin/validate-token
 * Body: { token: string }
 */
router.post('/validate-token', async (req: Request, res: Response) => {
  try {
    const { token } = req.body

    if (!token) {
      return res.status(400).json({
        success: false,
        message: '토큰이 필요합니다.',
        code: 'MISSING_TOKEN'
      })
    }

    const user = verifyToken(token)
    if (!user) {
      return res.status(401).json({
        success: false,
        message: '유효하지 않은 토큰입니다.',
        code: 'INVALID_TOKEN'
      })
    }

    return res.json({
      success: true,
      message: '토큰 검증 성공',
      data: {
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          permissions: user.permissions
        }
      }
    })
  } catch (error) {
    console.error('[Admin] Token validation error:', error)
    return res.status(500).json({
      success: false,
      message: '토큰 검증 중 오류가 발생했습니다.',
      code: 'VALIDATION_ERROR'
    })
  }
})

// ============================================================================
// SYSTEM MONITORING ROUTES (Protected)
// ============================================================================

/**
 * System Health Check
 * GET /api/admin/system-health
 */
router.get('/system-health', requireAdmin, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const startTime = performance.now()
    
    // Check database connection
    let dbStatus = 'HEALTHY'
    let dbResponseTime = 0
    let dbConnections = 0
    
    try {
      const dbStart = performance.now()
      await DatabaseService.getLatestFearGreedIndex()
      dbResponseTime = Math.round(performance.now() - dbStart)
      dbConnections = 15 // Mock connection count
    } catch (error) {
      dbStatus = 'ERROR'
      dbResponseTime = -1
    }

    // API health check
    const apiResponseTime = Math.round(performance.now() - startTime)
    const uptime = process.uptime()
    const uptimeString = `${Math.floor(uptime / 86400)}d ${Math.floor((uptime % 86400) / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`

    // Data collection status
    let collectionStatus = 'IDLE'
    let collectionSuccessRate = 95.6
    let lastCollectionTime = new Date().toISOString()

    try {
      const recentLogs = await DatabaseService.getDataCollectionStatus(7)
      const successCount = recentLogs.filter(log => log.status === 'SUCCESS').length
      collectionSuccessRate = recentLogs.length > 0 ? (successCount / recentLogs.length) * 100 : 0
      if (recentLogs.length > 0 && recentLogs[0] && recentLogs[0].createdAt) {
        lastCollectionTime = recentLogs[0].createdAt.toISOString()
      }
    } catch (error) {
      console.warn('[Admin] Failed to get collection status:', error)
    }

    const healthData = {
      database: {
        status: dbStatus,
        responseTime: dbResponseTime,
        connections: dbConnections
      },
      api: {
        status: 'HEALTHY',
        responseTime: apiResponseTime,
        uptime: uptimeString
      },
      dataCollection: {
        lastRun: lastCollectionTime,
        status: collectionStatus,
        successRate: collectionSuccessRate
      }
    }

    return res.json({
      success: true,
      data: healthData
    })
  } catch (error) {
    console.error('[Admin] System health check failed:', error)
    return res.status(500).json({
      success: false,
      message: '시스템 상태 확인 중 오류가 발생했습니다.'
    })
  }
})

/**
 * Performance Metrics
 * GET /api/admin/performance-metrics
 */
router.get('/performance-metrics', requireAdmin, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    // CPU usage (mock calculation)
    const cpuUsage = Math.floor(Math.random() * 40) + 20

    // Memory usage
    const memUsed = process.memoryUsage()
    const totalMem = os.totalmem()
    const freeMem = os.freemem()
    const memoryUsage = Math.round(((totalMem - freeMem) / totalMem) * 100)

    // Disk usage (mock)
    const diskUsage = Math.floor(Math.random() * 30) + 50

    // Network I/O (mock)
    const networkIO = {
      inbound: Math.floor(Math.random() * 1000) + 500,  // bytes/sec
      outbound: Math.floor(Math.random() * 800) + 200   // bytes/sec
    }

    const metricsData = {
      cpu: cpuUsage,
      memory: memoryUsage,
      diskUsage: diskUsage,
      networkIO: networkIO,
      processInfo: {
        pid: process.pid,
        uptime: process.uptime(),
        nodeVersion: process.version,
        memoryUsage: {
          rss: Math.round(memUsed.rss / 1024 / 1024), // MB
          heapTotal: Math.round(memUsed.heapTotal / 1024 / 1024), // MB
          heapUsed: Math.round(memUsed.heapUsed / 1024 / 1024), // MB
          external: Math.round(memUsed.external / 1024 / 1024) // MB
        }
      }
    }

    return res.json({
      success: true,
      data: metricsData
    })
  } catch (error) {
    console.error('[Admin] Performance metrics failed:', error)
    return res.status(500).json({
      success: false,
      message: '성능 지표 조회 중 오류가 발생했습니다.'
    })
  }
})

// ============================================================================
// DATA COLLECTION ROUTES (Protected)
// ============================================================================

/**
 * Enhanced Data Collection (existing endpoint with auth)
 * POST /api/admin/collect-data
 * Body: { date?: string, sources?: string[] }
 */
router.post('/collect-data', requireAdmin, requirePermission('write'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { date, sources } = req.body
    const targetDate = date || formatDate(new Date())
    const targetSources = sources || ['KRX', 'BOK']
    const results: any[] = []

    console.log(`[Admin] Data collection started by ${req.admin?.username}: ${targetDate}`)

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
      return res.status(400).json({
        success: false,
        message: '올바른 날짜 형식이 아닙니다. (YYYY-MM-DD)',
        code: 'INVALID_DATE_FORMAT'
      })
    }

    // Validate sources
    const validSources = ['KRX', 'BOK', 'UPBIT']
    const invalidSources = targetSources.filter((source: string) => !validSources.includes(source))
    if (invalidSources.length > 0) {
      return res.status(400).json({
        success: false,
        message: `지원하지 않는 데이터 소스: ${invalidSources.join(', ')}`,
        code: 'INVALID_DATA_SOURCE'
      })
    }

    // KRX 데이터 수집
    if (targetSources.includes('KRX')) {
      try {
        console.log(`[Admin] KRX 데이터 수집 시작: ${targetDate}`)
        const startTime = performance.now()
        const krxData = await KRXCollector.collectDailyData(targetDate)
        
        // Transform data to match DatabaseService format
        const transformedKrxData = {
          kospi: krxData.kospiData,
          trading: krxData.kospiInvestorTrading, // Use KOSPI trading data as primary
          options: null // Options not supported yet
        }
        
        await DatabaseService.saveKRXData(targetDate, transformedKrxData)
        const duration = Math.round(performance.now() - startTime)
        
        // Count non-null entries
        const recordCount = Object.values(krxData).filter(data => data !== null).length
        
        results.push({
          source: 'KRX',
          status: 'SUCCESS',
          message: 'KRX 데이터 수집 완료',
          duration: duration,
          recordCount: recordCount
        })
      } catch (error) {
        results.push({
          source: 'KRX',
          status: 'FAILED',
          message: error instanceof Error ? error.message : 'KRX 데이터 수집 실패',
          duration: null,
          recordCount: 0
        })
      }
    }

    // BOK 데이터 수집
    if (targetSources.includes('BOK')) {
      try {
        console.log(`[Admin] BOK 데이터 수집 시작: ${targetDate}`)
        const startTime = performance.now()
        const bokData = await BOKCollector.collectDailyData(targetDate)
        await DatabaseService.saveBOKData(targetDate, bokData)
        const duration = Math.round(performance.now() - startTime)
        
        results.push({
          source: 'BOK',
          status: 'SUCCESS',
          message: 'BOK 데이터 수집 완료',
          duration: duration,
          recordCount: Object.keys(bokData).length
        })
      } catch (error) {
        results.push({
          source: 'BOK',
          status: 'FAILED',
          message: error instanceof Error ? error.message : 'BOK 데이터 수집 실패',
          duration: null,
          recordCount: 0
        })
      }
    }

    return res.json({
      success: true,
      message: '데이터 수집 완료',
      data: {
        date: targetDate,
        results,
        summary: {
          total: results.length,
          successful: results.filter(r => r.status === 'SUCCESS').length,
          failed: results.filter(r => r.status === 'FAILED').length
        }
      }
    })

  } catch (error) {
    console.error('[Admin] 수동 데이터 수집 실패:', error)
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      code: 'COLLECTION_ERROR'
    })
  }
})

/**
 * Batch Recalculate Fear & Greed Index
 * POST /api/admin/recalculate-range
 * Body: { startDate: string, endDate: string }
 */
router.post('/recalculate-range', requireAdmin, requirePermission('write'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.body

    // Validate input
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: '시작 날짜와 종료 날짜를 입력해주세요.',
        code: 'MISSING_DATE_RANGE'
      })
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      return res.status(400).json({
        success: false,
        message: '올바른 날짜 형식이 아닙니다. (YYYY-MM-DD)',
        code: 'INVALID_DATE_FORMAT'
      })
    }

    // Validate date range
    if (new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({
        success: false,
        message: '시작 날짜는 종료 날짜보다 이전이어야 합니다.',
        code: 'INVALID_DATE_RANGE'
      })
    }

    console.log(`[Admin] Batch recalculation started by ${req.admin?.username}: ${startDate} to ${endDate}`)

    const results: any[] = []
    const currentDate = new Date(startDate)
    const endDateObj = new Date(endDate)

    while (currentDate <= endDateObj) {
      const dateStr = formatDate(currentDate)
      
      try {
        const result = await FearGreedCalculator.calculateIndex(dateStr)
        if (result) {
          await DatabaseService.saveFearGreedIndex(result)
          results.push({
            date: dateStr,
            status: 'SUCCESS',
            value: result.value,
            level: result.level,
            confidence: result.confidence
          })
        } else {
          results.push({
            date: dateStr,
            status: 'FAILED',
            message: '데이터 부족으로 인한 계산 실패'
          })
        }
      } catch (error) {
        results.push({
          date: dateStr,
          status: 'FAILED',
          message: error instanceof Error ? error.message : '계산 실패'
        })
      }

      currentDate.setDate(currentDate.getDate() + 1)
    }

    return res.json({
      success: true,
      message: '일괄 재계산 완료',
      data: {
        startDate,
        endDate,
        results,
        summary: {
          total: results.length,
          successful: results.filter(r => r.status === 'SUCCESS').length,
          failed: results.filter(r => r.status === 'FAILED').length
        }
      }
    })

  } catch (error) {
    console.error('[Admin] Batch recalculation failed:', error)
    return res.status(500).json({
      success: false,
      message: '일괄 재계산 중 오류가 발생했습니다.',
      code: 'RECALCULATION_ERROR'
    })
  }
})

// ============================================================================
// SYSTEM MANAGEMENT ROUTES (Admin Only)
// ============================================================================

/**
 * Restart Service
 * POST /api/admin/restart-service
 * Body: { service: string }
 */
router.post('/restart-service', requireAdmin, requireAdminRole, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { service } = req.body

    if (!service) {
      return res.status(400).json({
        success: false,
        message: '재시작할 서비스를 지정해주세요.',
        code: 'MISSING_SERVICE'
      })
    }

    console.log(`[Admin] Service restart requested by ${req.admin?.username}: ${service}`)

    // Mock service restart (in production, implement actual restart logic)
    const validServices = ['api', 'collector', 'database', 'cache', 'all']
    if (!validServices.includes(service)) {
      return res.status(400).json({
        success: false,
        message: `지원하지 않는 서비스: ${service}`,
        code: 'INVALID_SERVICE'
      })
    }

    // Simulate restart delay
    await new Promise(resolve => setTimeout(resolve, 1000))

    return res.json({
      success: true,
      message: `${service} 서비스가 재시작되었습니다.`,
      data: {
        service,
        status: 'RESTARTED',
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('[Admin] Service restart failed:', error)
    return res.status(500).json({
      success: false,
      message: '서비스 재시작 중 오류가 발생했습니다.',
      code: 'RESTART_ERROR'
    })
  }
})

/**
 * Clear Cache
 * POST /api/admin/clear-cache
 */
router.post('/clear-cache', requireAdmin, requirePermission('write'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log(`[Admin] Cache clear requested by ${req.admin?.username}`)

    // Mock cache clearing (implement actual cache clearing logic)
    await new Promise(resolve => setTimeout(resolve, 500))

    return res.json({
      success: true,
      message: '캐시가 삭제되었습니다.',
      data: {
        timestamp: new Date().toISOString(),
        clearedItems: 147 // Mock count
      }
    })

  } catch (error) {
    console.error('[Admin] Cache clear failed:', error)
    return res.status(500).json({
      success: false,
      message: '캐시 삭제 중 오류가 발생했습니다.',
      code: 'CACHE_CLEAR_ERROR'
    })
  }
})

// ============================================================================
// CONFIGURATION MANAGEMENT ROUTES (Admin Only)
// ============================================================================

/**
 * Get System Configuration
 * GET /api/admin/system-config
 */
router.get('/system-config', requireAdmin, requireAdminRole, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    // Mock system configuration (in production, fetch from database)
    const config = {
      fearGreedCalculator: {
        componentWeights: {
          priceMomentum: 25,
          investorSentiment: 25,
          putCallRatio: 15,
          volatilityIndex: 20,
          safeHavenDemand: 15
        },
        confidenceThreshold: 70,
        dataRequiredDays: 30
      },
      dataCollection: {
        scheduleEnabled: true,
        collectionTime: '09:00',
        retryAttempts: 3,
        timeoutMs: 30000,
        enabledSources: ['KRX', 'BOK', 'UPBIT']
      },
      api: {
        rateLimitEnabled: true,
        maxRequestsPerMinute: 100,
        cacheEnabled: true,
        cacheTtlSeconds: 300
      },
      notifications: {
        emailEnabled: false,
        slackEnabled: false,
        webhookUrl: null
      },
      system: {
        logLevel: 'info',
        enableMetrics: true,
        backupEnabled: true,
        backupRetentionDays: 30
      }
    }

    return res.json({
      success: true,
      data: config
    })

  } catch (error) {
    console.error('[Admin] Get system config failed:', error)
    return res.status(500).json({
      success: false,
      message: '시스템 설정 조회 중 오류가 발생했습니다.',
      code: 'CONFIG_GET_ERROR'
    })
  }
})

/**
 * Update System Configuration
 * PUT /api/admin/system-config
 * Body: { config: object }
 */
router.put('/system-config', requireAdmin, requireAdminRole, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { config } = req.body

    if (!config || typeof config !== 'object') {
      return res.status(400).json({
        success: false,
        message: '올바른 설정 데이터를 제공해주세요.',
        code: 'INVALID_CONFIG'
      })
    }

    console.log(`[Admin] System config update by ${req.admin?.username}:`, JSON.stringify(config, null, 2))

    // Validate Fear & Greed weights if provided
    if (config.fearGreedCalculator?.componentWeights) {
      const weights = config.fearGreedCalculator.componentWeights
      const totalWeight = Object.values(weights).reduce((sum: number, weight: any) => sum + (Number(weight) || 0), 0 as number)
      
      if (Math.abs(totalWeight - 100) > 0.1) {
        return res.status(400).json({
          success: false,
          message: '가중치의 합이 100%가 되어야 합니다.',
          code: 'INVALID_WEIGHTS',
          currentTotal: totalWeight
        })
      }
    }

    // Mock configuration update (in production, save to database)
    await new Promise(resolve => setTimeout(resolve, 200))

    return res.json({
      success: true,
      message: '시스템 설정이 업데이트되었습니다.',
      data: {
        updatedAt: new Date().toISOString(),
        updatedBy: req.admin?.username
      }
    })

  } catch (error) {
    console.error('[Admin] Update system config failed:', error)
    return res.status(500).json({
      success: false,
      message: '시스템 설정 업데이트 중 오류가 발생했습니다.',
      code: 'CONFIG_UPDATE_ERROR'
    })
  }
})

// ============================================================================
// SYSTEM INFORMATION ROUTES
// ============================================================================

/**
 * Get System Information
 * GET /api/admin/system-info
 */
router.get('/system-info', requireAdmin, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const systemInfo = {
      application: {
        name: 'KOSPI Fear & Greed Index API',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version,
        uptime: process.uptime()
      },
      server: {
        platform: os.platform(),
        architecture: os.arch(),
        hostname: os.hostname(),
        cpus: os.cpus().length,
        totalMemory: Math.round(os.totalmem() / 1024 / 1024 / 1024 * 100) / 100, // GB
        freeMemory: Math.round(os.freemem() / 1024 / 1024 / 1024 * 100) / 100, // GB
        loadAverage: os.loadavg()
      },
      database: {
        type: 'MySQL',
        host: process.env.DATABASE_HOST || 'localhost',
        status: 'Connected' // Mock status
      },
      features: {
        authenticationEnabled: true,
        rateLimitingEnabled: true,
        corsEnabled: process.env.CORS_ENABLED === 'true',
        helmetEnabled: process.env.HELMET_ENABLED === 'true',
        schedulerEnabled: process.env.NODE_ENV === 'production'
      }
    }

    return res.json({
      success: true,
      data: systemInfo
    })

  } catch (error) {
    console.error('[Admin] Get system info failed:', error)
    return res.status(500).json({
      success: false,
      message: '시스템 정보 조회 중 오류가 발생했습니다.',
      code: 'SYSTEM_INFO_ERROR'
    })
  }
})

/**
 * Get API Logs (Last N entries)
 * GET /api/admin/logs?limit=100&level=error
 */
router.get('/logs', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 1000)
    const level = (req.query.level as string) || 'all'

    // Mock log entries (in production, fetch from logging system)
    const mockLogs = [
      {
        id: 1,
        timestamp: new Date().toISOString(),
        level: 'INFO',
        service: 'API',
        message: 'Server started successfully',
        details: null
      },
      {
        id: 2,
        timestamp: new Date(Date.now() - 60000).toISOString(),
        level: 'WARN',
        service: 'Database',
        message: 'Connection pool almost full',
        details: { connections: 19, maxConnections: 20 }
      },
      {
        id: 3,
        timestamp: new Date(Date.now() - 120000).toISOString(),
        level: 'ERROR',
        service: 'KRX Collector',
        message: 'Failed to fetch data from KRX API',
        details: { statusCode: 503, retryAttempt: 2 }
      },
      {
        id: 4,
        timestamp: new Date(Date.now() - 180000).toISOString(),
        level: 'INFO',
        service: 'Fear & Greed Calculator',
        message: 'Index calculated successfully',
        details: { date: '2024-01-15', value: 42, level: 'Fear' }
      }
    ]

    // Filter by level if specified
    let filteredLogs = mockLogs
    if (level !== 'all') {
      filteredLogs = mockLogs.filter(log => log.level.toLowerCase() === level.toLowerCase())
    }

    // Apply limit
    const logs = filteredLogs.slice(0, limit)

    return res.json({
      success: true,
      data: {
        logs,
        pagination: {
          total: filteredLogs.length,
          limit,
          level
        }
      }
    })

  } catch (error) {
    console.error('[Admin] Get logs failed:', error)
    return res.status(500).json({
      success: false,
      message: '로그 조회 중 오류가 발생했습니다.',
      code: 'LOGS_ERROR'
    })
  }
})

export default router