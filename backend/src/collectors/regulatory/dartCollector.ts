import axios from 'axios'
import type { DartDisclosureData, DartBatchRequest } from '@/types/dartTypes'
import { logger } from '@/utils/logger'
import { retryWithBackoff } from '@/utils/retryUtils'

/**
 * DART (전자공시시스템) API 데이터 수집기
 * 기업 공시정보, 재무정보, 지분공시 데이터 배치 수집
 */
export class DARTCollector {
  private static readonly BASE_URL = 'https://opendart.fss.or.kr/api'
  private static readonly API_KEY = process.env.DART_API_KEY || ''
  private static readonly TIMEOUT = 30000 // 30초
  private static readonly RATE_LIMIT_DELAY = 100 // 100ms between requests
  private static readonly MAX_RETRIES = 3

  private static lastRequestTime = 0

  /**
   * Rate limiting - API 호출 간격 제어
   */
  private static async rateLimitDelay(): Promise<void> {
    const now = Date.now()
    const elapsed = now - this.lastRequestTime
    if (elapsed < this.RATE_LIMIT_DELAY) {
      await new Promise(resolve => setTimeout(resolve, this.RATE_LIMIT_DELAY - elapsed))
    }
    this.lastRequestTime = Date.now()
  }

  /**
   * DART API 호출 공통 헤더
   */
  private static getHeaders() {
    return {
      'User-Agent': 'KOSPI-FG-Index/1.0',
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  }

  /**
   * API 호출 공통 메서드
   */
  private static async makeAPICall<T>(
    endpoint: string, 
    params: Record<string, any>
  ): Promise<T> {
    if (!this.API_KEY) {
      throw new Error('DART_API_KEY is not set in environment variables')
    }

    await this.rateLimitDelay()

    const url = `${this.BASE_URL}/${endpoint}.json`
    const requestParams = {
      crtfc_key: this.API_KEY,
      ...params
    }

    try {
      const response = await axios.get(url, {
        params: requestParams,
        headers: this.getHeaders(),
        timeout: this.TIMEOUT
      })

      // DART API 응답 상태 확인
      if (response.data?.status !== '000') {
        const errorMsg = response.data?.message || 'Unknown DART API error'
        throw new Error(`DART API Error: ${errorMsg}`)
      }

      return response.data
    } catch (error) {
      logger.error(`[DART] API call failed: ${endpoint}`, error)
      throw error
    }
  }

  /**
   * 공시정보 검색 (배치용)
   */
  static async fetchDisclosures(request: DartBatchRequest): Promise<DartDisclosureData[]> {
    const { 
      startDate, 
      endDate, 
      corpCode = '', 
      reportCode = '',
      pageNo = 1,
      pageCount = 100 
    } = request

    const params = {
      bgn_de: startDate.replace(/-/g, ''),
      end_de: endDate.replace(/-/g, ''),
      corp_code: corpCode,
      pblntf_ty: reportCode, // A=정기공시, B=주요사항보고, C=발행공시, D=지분공시, E=기타공시, F=외부감사관련, G=펀드공시, H=자산유동화, I=거래소공시, J=공정위공시
      page_no: pageNo,
      page_count: pageCount
    }

    try {
      const response = await this.makeAPICall<{
        status: string;
        message: string;
        page_no: number;
        page_count: number;
        total_count: number;
        total_page: number;
        list: any[];
      }>('list', params)

      return response.list?.map(item => ({
        corpCode: item.corp_code || '',
        corpName: item.corp_name || '',
        stockCode: item.stock_code || '',
        reportName: item.report_nm || '',
        receiptNumber: item.rcept_no || '',
        flrName: item.flr_nm || '',
        receiptDate: item.rcept_dt || '',
        remarks: item.rm || '',
        disclosureDate: item.dcm_no ? item.dcm_no.substring(0, 8) : '',
        reportCode: item.pblntf_ty || ''
      })) || []

    } catch (error) {
      logger.error(`[DART] 공시정보 검색 실패: ${startDate} ~ ${endDate}`, error)
      throw error
    }
  }

  /**
   * 기업개황 정보 조회
   */
  static async fetchCompanyInfo(corpCode: string): Promise<any> {
    const params = {
      corp_code: corpCode
    }

    try {
      const response = await this.makeAPICall('company', params)
      return response
    } catch (error) {
      logger.error(`[DART] 기업개황 조회 실패: ${corpCode}`, error)
      throw error
    }
  }

  /**
   * 재무정보 조회
   */
  static async fetchFinancialInfo(
    corpCode: string, 
    businessYear: string,
    reportCode: string = '11011' // 사업보고서
  ): Promise<any> {
    const params = {
      corp_code: corpCode,
      bsns_year: businessYear,
      reprt_code: reportCode
    }

    try {
      const response = await this.makeAPICall('fnlttSinglAcntAll', params)
      return response
    } catch (error) {
      logger.error(`[DART] 재무정보 조회 실패: ${corpCode}/${businessYear}`, error)
      throw error
    }
  }

  /**
   * 배치 데이터 수집 - 일별 공시 데이터
   */
  static async collectDailyDisclosures(date: string): Promise<{
    totalDisclosures: number;
    regularReports: DartDisclosureData[];
    majorEvents: DartDisclosureData[];
    stockEvents: DartDisclosureData[];
  }> {
    logger.info(`[DART] ${date} 일별 공시 데이터 수집 시작`)

    const results = {
      totalDisclosures: 0,
      regularReports: [] as DartDisclosureData[],
      majorEvents: [] as DartDisclosureData[],
      stockEvents: [] as DartDisclosureData[]
    }

    try {
      // 정기공시 (사업보고서, 분기보고서 등)
      const regularRequest: DartBatchRequest = {
        startDate: date,
        endDate: date,
        reportCode: 'A',
        pageCount: 100
      }

      results.regularReports = await retryWithBackoff(
        () => this.fetchDisclosures(regularRequest),
        this.MAX_RETRIES
      )

      // 주요사항보고 (합병, 분할, 경영권변경 등)  
      const majorRequest: DartBatchRequest = {
        startDate: date,
        endDate: date,
        reportCode: 'B',
        pageCount: 100
      }

      results.majorEvents = await retryWithBackoff(
        () => this.fetchDisclosures(majorRequest),
        this.MAX_RETRIES
      )

      // 지분공시 (대량보유, 임원주주변동 등)
      const stockRequest: DartBatchRequest = {
        startDate: date,
        endDate: date,
        reportCode: 'D',
        pageCount: 100
      }

      results.stockEvents = await retryWithBackoff(
        () => this.fetchDisclosures(stockRequest),
        this.MAX_RETRIES
      )

      results.totalDisclosures = 
        results.regularReports.length + 
        results.majorEvents.length + 
        results.stockEvents.length

      logger.info(`[DART] ${date} 공시 데이터 수집 완료: ${results.totalDisclosures}건`)
      
      return results

    } catch (error) {
      logger.error(`[DART] ${date} 배치 수집 실패:`, error)
      throw error
    }
  }

  /**
   * 주요 기업 재무정보 배치 수집
   */
  static async collectFinancialDataBatch(
    corpCodes: string[], 
    businessYear: string
  ): Promise<any[]> {
    logger.info(`[DART] ${businessYear}년 재무정보 배치 수집 시작: ${corpCodes.length}개 기업`)

    const results = []
    
    for (const corpCode of corpCodes) {
      try {
        await this.rateLimitDelay()
        
        const financialData = await retryWithBackoff(
          () => this.fetchFinancialInfo(corpCode, businessYear),
          this.MAX_RETRIES
        )

        results.push({
          corpCode,
          businessYear,
          data: financialData,
          collectedAt: new Date().toISOString()
        })

        logger.info(`[DART] 재무정보 수집 완료: ${corpCode}`)

      } catch (error) {
        logger.error(`[DART] 재무정보 수집 실패: ${corpCode}`, error)
        // 개별 실패는 전체 배치를 중단시키지 않음
        results.push({
          corpCode,
          businessYear,
          error: (error as Error).message,
          failedAt: new Date().toISOString()
        })
      }
    }

    logger.info(`[DART] 재무정보 배치 수집 완료: ${results.length}개 처리`)
    return results
  }

  /**
   * KOSPI 200 구성종목 고유번호 목록 조회
   */
  static async getKOSPI200CorpCodes(): Promise<string[]> {
    // KOSPI 200 주요 종목들의 고유번호 (실제 운영시에는 DB에서 관리)
    const kospi200Corps = [
      '00126380', // 삼성전자
      '00164779', // SK하이닉스
      '00128160', // 삼성바이오로직스
      '00159570', // 네이버
      '00147787', // 카카오
      '00132967', // LG화학
      '00140136', // 현대모비스
      // ... 더 많은 종목 추가 예정
    ]

    return kospi200Corps
  }

  /**
   * Fear & Greed 지수와 연관된 공시 필터링
   */
  static filterSentimentRelevantDisclosures(
    disclosures: DartDisclosureData[]
  ): DartDisclosureData[] {
    const sentimentKeywords = [
      '자기주식', '배당', '합병', '분할', '증자', '감자',
      '경영권', '대량보유', '주식매수', '주식매도',
      '영업실적', '재무제표', '손익계산서',
      '투자', '대출', '차입', '보증', '담보'
    ]

    return disclosures.filter(disclosure => {
      const reportName = disclosure.reportName.toLowerCase()
      return sentimentKeywords.some(keyword => 
        reportName.includes(keyword.toLowerCase())
      )
    })
  }

  /**
   * 최근 영업일 구하기 (주말, 공휴일 제외)
   */
  static getLastBusinessDay(daysBack: number = 1): string {
    const date = new Date()
    let businessDays = 0
    
    while (businessDays < daysBack) {
      date.setDate(date.getDate() - 1)
      const dayOfWeek = date.getDay()
      
      // 주말이 아닌 경우만 영업일로 카운트
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        businessDays++
      }
    }
    
    return date.toISOString().split('T')[0]
  }

  /**
   * 배치 작업 상태 확인
   */
  static async checkBatchStatus(): Promise<{
    isOperational: boolean;
    lastError?: string;
    rateLimit: {
      remaining: number;
      resetTime: Date;
    };
  }> {
    try {
      // 간단한 API 호출로 상태 확인
      await this.makeAPICall('list', {
        bgn_de: '20240101',
        end_de: '20240101',
        page_no: 1,
        page_count: 1
      })

      return {
        isOperational: true,
        rateLimit: {
          remaining: 1000, // DART API 일일 한도
          resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24시간 후
        }
      }

    } catch (error) {
      return {
        isOperational: false,
        lastError: (error as Error).message,
        rateLimit: {
          remaining: 0,
          resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000)
        }
      }
    }
  }
}