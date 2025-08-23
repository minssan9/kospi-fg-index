import { DartApiClient } from '@/clients/dart/DartApiClient'
import { DartCollectionService } from '@/services/collectors/DartCollectionService'
import { DartDisclosureRepository } from '@/repositories/dart/DartDisclosureRepository'
import { logger } from '@/utils/common/logger'
import { 
  DartBatchResult, 
  DartBatchQueueItem, 
  DartFilterOptions, 
  SentimentRelevantDisclosure,
  DartCollectionStats 
} from '@/types/collectors/dartTypes'
import cron from 'node-cron'

/**
 * DART 배치 처리 서비스
 * 공시 데이터 수집, 처리, 저장을 관리하는 메인 서비스
 */
export class DartBatchService {
  private static batchQueue: DartBatchQueueItem[] = []
  private static isProcessing = false
  private static stats: DartCollectionStats = {
    date: new Date().toISOString().split('T')[0] as string,
    totalApiCalls: 0,
    successfulCalls: 0,
    failedCalls: 0,
    dataPoints: 0,
    averageResponseTime: 0,
    rateLimit: {
      limit: 10000, // DART API 일일 한도
      remaining: 10000,
      resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000)
    }
  }

  /**
   * 배치 서비스 초기화
   */
  static async initialize(): Promise<void> {
    logger.info('[DART Batch] 서비스 초기화 시작')

    try {
      // 기존 실행 중인 작업 상태 복구
      await this.recoverPendingJobs()

      // 스케줄러 시작
      this.startScheduler()

      // 큐 프로세서 시작
      this.startQueueProcessor()

      logger.info('[DART Batch] 서비스 초기화 완료')

    } catch (error) {
      logger.error('[DART Batch] 서비스 초기화 실패:', error)
      throw error
    }
  }

  /**
   * 일별 공시 데이터 배치 수집 작업 생성
   */
  static async scheduleDailyDisclosureCollection(
    date: string, 
    options?: DartFilterOptions
  ): Promise<string> {
    const jobId = `daily-${date}-${Date.now()}`

    const queueItem: DartBatchQueueItem = {
      id: jobId,
      type: 'disclosure',
      priority: 'high',
      payload: { date, options },
      status: 'pending',
      attempts: 0,
      maxAttempts: 3,
      createdAt: new Date(),
      scheduledAt: new Date()
    }

    this.batchQueue.push(queueItem)
    logger.info(`[DART Batch] 일별 공시 수집 작업 생성: ${jobId}`)

    // 데이터베이스에 작업 상태 저장
    await this.saveBatchStatus(jobId, 'pending')

    return jobId
  }

  /**
   * KOSPI 200 기업 재무 데이터 배치 수집
   */
  static async scheduleFinancialDataCollection(
    businessYear: string
  ): Promise<string> {
    const jobId = `financial-${businessYear}-${Date.now()}`
    // TODO: Implement getKOSPI200CorpCodes in DartCollectionService
    const kospi200Corps: string[] = [] // Placeholder until implemented

    const queueItem: DartBatchQueueItem = {
      id: jobId,
      type: 'financial',
      priority: 'medium',
      payload: { businessYear, corpCodes: kospi200Corps },
      status: 'pending',
      attempts: 0,
      maxAttempts: 2,
      createdAt: new Date(),
      scheduledAt: new Date()
    }

    this.batchQueue.push(queueItem)
    logger.info(`[DART Batch] 재무 데이터 수집 작업 생성: ${jobId}`)

    await this.saveBatchStatus(jobId, 'pending')
    return jobId
  }

  /**
   * 큐 프로세서 시작
   */
  private static startQueueProcessor(): void {
    setInterval(async () => {
      if (this.isProcessing || this.batchQueue.length === 0) return

      this.isProcessing = true

      try {
        // 우선순위 순으로 정렬
        this.batchQueue.sort((a, b) => {
          const priorityOrder = { high: 3, medium: 2, low: 1 }
          return priorityOrder[b.priority] - priorityOrder[a.priority]
        })

        const job = this.batchQueue.shift()
        if (job) {
          await this.processQueueItem(job)
        }

      } catch (error) {
        logger.error('[DART Batch] 큐 처리 중 오류:', error)
      } finally {
        this.isProcessing = false
      }
    }, 5000) // 5초마다 큐 체크
  }

  /**
   * 개별 큐 아이템 처리
   */
  private static async processQueueItem(item: DartBatchQueueItem): Promise<void> {
    logger.info(`[DART Batch] 작업 처리 시작: ${item.id}`)
    
    item.status = 'processing'
    item.startedAt = new Date()
    item.attempts++

    await this.saveBatchStatus(item.id, 'processing')

    try {
      let result: any

      switch (item.type) {
        case 'disclosure':
          result = await this.processDailyDisclosures(item.payload.date, item.payload.options)
          break
          
        case 'financial':
          result = await this.processFinancialData(item.payload.businessYear, item.payload.corpCodes)
          break
          
        case 'company_info':
          result = await this.processCompanyInfo(item.payload.corpCodes)
          break
          
        default:
          throw new Error(`알 수 없는 작업 유형: ${item.type}`)
      }

      item.status = 'completed'
      item.completedAt = new Date()

      await this.saveBatchResult(item.id, result)
      logger.info(`[DART Batch] 작업 완료: ${item.id}`)

    } catch (error) {
      item.error = (error as Error).message
      
      if (item.attempts < item.maxAttempts) {
        item.status = 'pending'
        // 재시도를 위해 큐에 다시 추가 (5분 후)
        setTimeout(() => {
          this.batchQueue.push(item)
        }, 5 * 60 * 1000)
        
        logger.warn(`[DART Batch] 작업 재시도 예약: ${item.id} (${item.attempts}/${item.maxAttempts})`)
      } else {
        item.status = 'failed'
        await this.saveBatchStatus(item.id, 'failed', item.error)
        logger.error(`[DART Batch] 작업 최종 실패: ${item.id}`, error)
      }
    }
  }

  /**
   * 일별 공시 데이터 처리
   */
  private static async processDailyDisclosures(
    date: string, 
    options?: DartFilterOptions
  ): Promise<any> {
    const startTime = Date.now()
    
    // DART API 호출 - 새로운 서비스 사용
    const disclosures = await DartCollectionService.collectDailyDisclosures(date, false)
    
    // Fear & Greed 지수 관련 공시 필터링
    const allDisclosures = [
      ...disclosures.regularReports,
      ...disclosures.majorEvents,
      ...disclosures.stockEvents
    ]
    const sentimentRelevant = DartCollectionService.filterSentimentRelevantDisclosures(allDisclosures)

    // 데이터베이스에 저장
    await this.saveDartDisclosures(sentimentRelevant, date)

    // 통계 업데이트
    this.updateStats(1, Date.now() - startTime, sentimentRelevant.length)

    return {
      date,
      totalDisclosures: disclosures.totalDisclosures,
      sentimentRelevantCount: sentimentRelevant.length,
      processingTime: Date.now() - startTime
    }
  }

  /**
   * 재무 데이터 처리
   */
  private static async processFinancialData(
    businessYear: string, 
    corpCodes: string[]
  ): Promise<any> {
    const startTime = Date.now()
    
    // TODO: Implement collectFinancialDataBatch in DartCollectionService
    const results: any[] = [] // Placeholder until implemented
    
    // 성공적으로 수집된 재무 데이터만 저장
    const successResults = results.filter(r => !r.error)
    await this.saveFinancialData(successResults)

    this.updateStats(corpCodes.length, Date.now() - startTime, successResults.length)

    return {
      businessYear,
      totalCorps: corpCodes.length,
      successCount: successResults.length,
      failureCount: results.length - successResults.length,
      processingTime: Date.now() - startTime
    }
  }

  /**
   * 기업정보 처리
   */
  private static async processCompanyInfo(corpCodes: string[]): Promise<any> {
    const startTime = Date.now()
    const results = []

    for (const corpCode of corpCodes) {
      try {
        const companyInfo = await DartApiClient.fetchCompanyInfo(corpCode)
        results.push({ corpCode, data: companyInfo })
      } catch (error) {
        results.push({ corpCode, error: (error as Error).message })
      }
    }

    const successResults = results.filter(r => !r.error)
    await this.saveCompanyInfo(successResults)

    this.updateStats(corpCodes.length, Date.now() - startTime, successResults.length)

    return {
      totalCorps: corpCodes.length,
      successCount: successResults.length,
      processingTime: Date.now() - startTime
    }
  }

  /**
   * 스케줄러 시작 (매일 오후 6시 실행)
   */
  private static startScheduler(): void {
    // 매일 오후 6시에 전일 공시 데이터 수집
    cron.schedule('0 18 * * 1-5', async () => {
      const yesterday = DartCollectionService.getLastBusinessDay(1)
      await this.scheduleDailyDisclosureCollection(yesterday)
    })

    // 매주 월요일 오전 2시에 주간 통계 생성
    cron.schedule('0 2 * * 1', async () => {
      await this.generateWeeklyReport()
    })

    logger.info('[DART Batch] 스케줄러 시작됨')
  }

  /**
   * 데이터베이스 저장 메서드들 - 새로운 Repository 사용
   */
  private static async saveDartDisclosures(
    disclosures: SentimentRelevantDisclosure[], 
    date: string
  ): Promise<void> {
    try {
      // DartDisclosureRepository 사용하여 배치 저장
      const result = await DartDisclosureRepository.saveDisclosuresBatch(
        disclosures.map(d => ({
          receiptNumber: d.receiptNumber,
          corpCode: d.corpCode,
          corpName: d.corpName,
          reportName: d.reportName,
          receiptDate: d.receiptDate,
          flrName: d.flrName,
          remarks: d.remarks,
          stockCode: d.stockCode,
          disclosureDate: d.disclosureDate,
          reportCode: d.reportCode
        }))
      )
      logger.info(`[DART Batch] 공시 데이터 저장: ${result.success}건 성공, ${result.failed}건 실패 (${date})`)
    } catch (error) {
      logger.error('[DART Batch] 공시 데이터 저장 실패:', error)
      throw error
    }
  }

  private static async saveFinancialData(results: any[]): Promise<void> {
    try {
      // TODO: 재무 데이터용 Repository 추가 시 구현
      logger.info(`[DART Batch] 재무 데이터 저장: ${results.length}건 (Repository 구현 필요)`)
    } catch (error) {
      logger.error('[DART Batch] 재무 데이터 저장 실패:', error)
      throw error
    }
  }

  private static async saveCompanyInfo(results: any[]): Promise<void> {
    try {
      // TODO: 기업 정보용 Repository 추가 시 구현
      logger.info(`[DART Batch] 기업 정보 저장: ${results.length}건 (Repository 구현 필요)`)
    } catch (error) {
      logger.error('[DART Batch] 기업 정보 저장 실패:', error)
      throw error
    }
  }

  private static async saveBatchStatus(
    jobId: string, 
    status: string, 
    error?: string
  ): Promise<void> {
    // 배치 작업 상태를 데이터베이스에 저장
    logger.info(`[DART Batch] 상태 업데이트: ${jobId} -> ${status}`)
  }

  private static async saveBatchResult(jobId: string, result: any): Promise<void> {
    logger.info(`[DART Batch] 결과 저장: ${jobId}`, result)
  }

  /**
   * 통계 업데이트
   */
  private static updateStats(
    apiCalls: number, 
    responseTime: number, 
    dataPoints: number
  ): void {
    this.stats.totalApiCalls += apiCalls
    this.stats.successfulCalls += apiCalls
    this.stats.dataPoints += dataPoints
    this.stats.averageResponseTime = 
      (this.stats.averageResponseTime + responseTime) / 2
  }

  /**
   * 주간 리포트 생성
   */
  private static async generateWeeklyReport(): Promise<void> {
    logger.info('[DART Batch] 주간 리포트 생성 시작')
    // 주간 통계 및 리포트 생성 로직
  }

  /**
   * 미완료 작업 복구
   */
  private static async recoverPendingJobs(): Promise<void> {
    logger.info('[DART Batch] 미완료 작업 복구 중')
    // 시스템 재시작 시 미완료 작업들을 큐에 다시 추가
  }

  /**
   * 서비스 상태 조회
   */
  static getStatus() {
    return {
      isProcessing: this.isProcessing,
      queueLength: this.batchQueue.length,
      stats: this.stats,
      uptime: process.uptime()
    }
  }

  /**
   * 서비스 종료
   */
  static async shutdown(): Promise<void> {
    logger.info('[DART Batch] 서비스 종료 시작')
    
    // 진행 중인 작업 완료까지 대기
    while (this.isProcessing) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    logger.info('[DART Batch] 서비스 종료 완료')
  }
}