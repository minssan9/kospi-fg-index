import express from 'express'
import { DARTCollector } from '../collectors/dartCollector'
import { DartBatchService } from '@/services/dartBatchService'
import adminAuth from '../middleware/adminAuth'
import { rateLimiter } from '../middleware/rateLimiter'
import { logger } from '../utils/logger'

const router = express.Router()

/**
 * DART API 라우터
 * 공시 데이터 조회, 배치 작업 관리, 통계 조회 등
 */

// Rate limiting 적용 (DART API는 외부 API 호출이므로 제한)
router.use('/batch', (req, res, next) => {
  // Rate limiting logic would be implemented here
  next()
})
router.use('/disclosures', (req, res, next) => {
  // Rate limiting logic would be implemented here  
  next()
})

/**
 * GET /api/dart/disclosures
 * 공시 데이터 조회
 */
router.get('/disclosures', async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      corpCode,
      reportCode,
      sentimentOnly,
      page = 1,
      limit = 50
    } = req.query

    // 파라미터 검증
    if (!startDate || !endDate) {
      return res.status(400).json({
        error: 'startDate와 endDate는 필수 파라미터입니다.',
        example: '?startDate=2024-01-01&endDate=2024-01-31'
      })
    }

    // 날짜 형식 검증
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(startDate as string) || !dateRegex.test(endDate as string)) {
      return res.status(400).json({
        error: '날짜 형식이 올바르지 않습니다. (YYYY-MM-DD)',
        startDate,
        endDate
      })
    }

    // DART API 호출
    const disclosures = await DARTCollector.fetchDisclosures({
      startDate: startDate as string,
      endDate: endDate as string,
      corpCode: corpCode as string,
      reportCode: reportCode as string,
      pageNo: parseInt(page as string),
      pageCount: Math.min(parseInt(limit as string), 100) // 최대 100개 제한
    })

    // Fear & Greed 관련 필터링 적용
    const filteredDisclosures = sentimentOnly === 'true' 
      ? DARTCollector.filterSentimentRelevantDisclosures(disclosures)
      : disclosures

    res.json({
      success: true,
      data: {
        disclosures: filteredDisclosures,
        total: filteredDisclosures.length,
        params: {
          startDate,
          endDate,
          corpCode: corpCode || null,
          reportCode: reportCode || null,
          sentimentOnly: sentimentOnly === 'true',
          page: parseInt(page as string),
          limit: Math.min(parseInt(limit as string), 100)
        }
      }
    })

    logger.info(`[DART API] 공시 조회: ${startDate} ~ ${endDate}, ${filteredDisclosures.length}건`)

  } catch (error) {
    logger.error('[DART API] 공시 조회 실패:', error)
    return res.status(500).json({
      error: '공시 데이터 조회 중 오류가 발생했습니다.',
      message: (error as Error).message
    })
  }
})

/**
 * GET /api/dart/companies
 * 기업 정보 조회
 */
router.get('/companies', async (req, res) => {
  try {
    const { corpCode } = req.query

    if (!corpCode) {
      return res.status(400).json({
        error: 'corpCode는 필수 파라미터입니다.',
        example: '?corpCode=00126380'
      })
    }

    const companyInfo = await DARTCollector.fetchCompanyInfo(corpCode as string)

    res.json({
      success: true,
      data: companyInfo
    })

    logger.info(`[DART API] 기업 정보 조회: ${corpCode}`)

  } catch (error) {
    logger.error('[DART API] 기업 정보 조회 실패:', error)
    res.status(500).json({
      error: '기업 정보 조회 중 오류가 발생했습니다.',
      message: (error as Error).message
    })
  }
})

/**
 * GET /api/dart/financial
 * 재무 정보 조회
 */
router.get('/financial', async (req, res) => {
  try {
    const { corpCode, businessYear, reportCode = '11011' } = req.query

    if (!corpCode || !businessYear) {
      return res.status(400).json({
        error: 'corpCode와 businessYear는 필수 파라미터입니다.',
        example: '?corpCode=00126380&businessYear=2023'
      })
    }

    const financialInfo = await DARTCollector.fetchFinancialInfo(
      corpCode as string,
      businessYear as string,
      reportCode as string
    )

    res.json({
      success: true,
      data: financialInfo
    })

    logger.info(`[DART API] 재무 정보 조회: ${corpCode}/${businessYear}`)

  } catch (error) {
    logger.error('[DART API] 재무 정보 조회 실패:', error)
    res.status(500).json({
      error: '재무 정보 조회 중 오류가 발생했습니다.',
      message: (error as Error).message
    })
  }
})

/**
 * GET /api/dart/kospi200
 * KOSPI 200 구성 종목 리스트
 */
router.get('/kospi200', async (req, res) => {
  try {
    const corpCodes = await DARTCollector.getKOSPI200CorpCodes()

    res.json({
      success: true,
      data: {
        corpCodes,
        count: corpCodes.length,
        description: 'KOSPI 200 구성 종목의 DART 고유번호 목록'
      }
    })

    logger.info(`[DART API] KOSPI 200 조회: ${corpCodes.length}개 종목`)

  } catch (error) {
    logger.error('[DART API] KOSPI 200 조회 실패:', error)
    res.status(500).json({
      error: 'KOSPI 200 목록 조회 중 오류가 발생했습니다.',
      message: (error as Error).message
    })
  }
})

// ============ 관리자 전용 배치 관리 API ============

/**
 * POST /api/dart/batch/daily
 * 일별 공시 데이터 배치 수집 예약 (관리자 전용)
 */
router.post('/batch/daily', adminAuth, async (req, res) => {
  try {
    const { date, options } = req.body

    if (!date) {
      return res.status(400).json({
        error: 'date는 필수 파라미터입니다.',
        example: { date: '2024-01-15', options: {} }
      })
    }

    const jobId = await DartBatchService.scheduleDailyDisclosureCollection(date, options)

    res.json({
      success: true,
      data: {
        jobId,
        message: `${date} 일별 공시 배치 수집이 예약되었습니다.`
      }
    })

    logger.info(`[DART Batch] 일별 배치 예약: ${date} (Job ID: ${jobId})`)

  } catch (error) {
    logger.error('[DART Batch] 일별 배치 예약 실패:', error)
    res.status(500).json({
      error: '배치 작업 예약 중 오류가 발생했습니다.',
      message: (error as Error).message
    })
  }
})

/**
 * POST /api/dart/batch/financial
 * 재무 데이터 배치 수집 예약 (관리자 전용)
 */
router.post('/batch/financial', adminAuth, async (req, res) => {
  try {
    const { businessYear } = req.body

    if (!businessYear) {
      return res.status(400).json({
        error: 'businessYear는 필수 파라미터입니다.',
        example: { businessYear: '2023' }
      })
    }

    const jobId = await DartBatchService.scheduleFinancialDataCollection(businessYear)

    res.json({
      success: true,
      data: {
        jobId,
        message: `${businessYear}년 재무 데이터 배치 수집이 예약되었습니다.`
      }
    })

    logger.info(`[DART Batch] 재무 배치 예약: ${businessYear} (Job ID: ${jobId})`)

  } catch (error) {
    logger.error('[DART Batch] 재무 배치 예약 실패:', error)
    res.status(500).json({
      error: '배치 작업 예약 중 오류가 발생했습니다.',
      message: (error as Error).message
    })
  }
})

/**
 * GET /api/dart/batch/status
 * 배치 서비스 상태 조회 (관리자 전용)
 */
router.get('/batch/status', adminAuth, async (req, res) => {
  try {
    const status = await DartBatchService.getStatus()

    res.json({
      success: true,
      data: status
    })

  } catch (error) {
    logger.error('[DART Batch] 상태 조회 실패:', error)
    res.status(500).json({
      error: '배치 서비스 상태 조회 중 오류가 발생했습니다.',
      message: (error as Error).message
    })
  }
})

/**
 * GET /api/dart/health
 * DART API 헬스 체크
 */
router.get('/health', async (req, res) => {
  try {
    const status = await DARTCollector.checkBatchStatus()

    res.json({
      success: true,
      data: {
        isOperational: status.isOperational,
        rateLimit: status.rateLimit,
        timestamp: new Date().toISOString(),
        lastError: status.lastError || null
      }
    })

  } catch (error) {
    logger.error('[DART Health] 헬스 체크 실패:', error)
    res.status(503).json({
      success: false,
      error: 'DART 서비스 헬스 체크 실패',
      message: (error as Error).message
    })
  }
})

/**
 * GET /api/dart/stats
 * DART 수집 통계 조회
 */
router.get('/stats', async (req, res) => {
  try {
    const { date } = req.query
    const targetDate = date as string || new Date().toISOString().split('T')[0]

    // 실제로는 데이터베이스에서 통계 조회
    // 여기서는 mock 데이터 반환
    const stats = {
      date: targetDate,
      totalDisclosures: 0,
      sentimentRelevant: 0,
      apiCalls: 0,
      successRate: 100.0,
      averageResponseTime: 0
    }

    res.json({
      success: true,
      data: stats
    })

  } catch (error) {
    logger.error('[DART Stats] 통계 조회 실패:', error)
    res.status(500).json({
      error: '통계 조회 중 오류가 발생했습니다.',
      message: (error as Error).message
    })
  }
})

/**
 * POST /api/dart/test
 * DART 수집기 테스트 (개발/테스트 환경 전용)
 */
router.post('/test', async (req, res) => {
  // 프로덕션 환경에서는 접근 차단
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      error: '프로덕션 환경에서는 테스트 API를 사용할 수 없습니다.'
    })
  }

  try {
    const { testType = 'basic', date } = req.body
    const testDate = date || DARTCollector.getLastBusinessDay(1)

    let result: any

    switch (testType) {
      case 'disclosures':
        result = await DARTCollector.collectDailyDisclosures(testDate)
        break
      case 'kospi200':
        result = await DARTCollector.getKOSPI200CorpCodes()
        break
      case 'filter':
        const mockData = [
          {
            corpCode: '00126380', corpName: '삼성전자', stockCode: '005930',
            reportName: '주식등의대량보유상황보고서', receiptNumber: '20240101000001',
            flrName: '삼성전자', receiptDate: '20240101', remarks: '',
            disclosureDate: '20240101', reportCode: 'D'
          }
        ]
        result = DARTCollector.filterSentimentRelevantDisclosures(mockData)
        break
      default:
        result = await DARTCollector.checkBatchStatus()
    }

    res.json({
      success: true,
      testType,
      testDate,
      data: result
    })

    logger.info(`[DART Test] 테스트 실행: ${testType}`)

  } catch (error) {
    logger.error('[DART Test] 테스트 실패:', error)
    res.status(500).json({
      error: '테스트 실행 중 오류가 발생했습니다.',
      message: (error as Error).message
    })
  }
})

export default router