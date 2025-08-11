/**
 * DART API 타입 정의
 * 전자공시시스템 데이터 수집을 위한 TypeScript 타입들
 */

// DART 배치 요청 인터페이스
export interface DartBatchRequest {
  startDate: string      // YYYY-MM-DD
  endDate: string        // YYYY-MM-DD
  corpCode?: string      // 기업 고유번호 (8자리)
  reportCode?: string    // A=정기공시, B=주요사항보고, C=발행공시, D=지분공시 등
  pageNo?: number        // 페이지 번호 (기본값: 1)
  pageCount?: number     // 페이지당 건수 (최대 100)
}

// 공시정보 데이터 구조
export interface DartDisclosureData {
  corpCode: string        // 기업 고유번호
  corpName: string        // 기업명
  stockCode: string       // 주식코드
  reportName: string      // 보고서명
  receiptNumber: string   // 접수번호
  flrName: string        // 공시제출인명
  receiptDate: string    // 접수일자 (YYYYMMDD)
  remarks: string        // 비고
  disclosureDate: string // 공시일자
  reportCode: string     // 보고서 코드
}

// 기업개황 정보
export interface DartCompanyInfo {
  corpCode: string       // 기업 고유번호
  corpName: string       // 기업명
  corpNameEng: string    // 기업명(영문)
  stockName: string      // 종목명
  stockCode: string      // 주식코드
  ceoName: string        // 대표자명
  corpCls: string        // 기업구분 (Y=유가, K=코스닥, N=코넥스, E=기타)
  jurirNo: string        // 법인번호
  bizrNo: string         // 사업자번호
  adres: string          // 주소
  homUrl: string         // 홈페이지
  irUrl: string          // IR홈페이지
  phnNo: string          // 전화번호
  faxNo: string          // 팩스번호
  indutyCode: string     // 업종코드
  estDate: string        // 설립일자
  accMt: string          // 결산월
}

// 재무정보 데이터
export interface DartFinancialInfo {
  corpCode: string           // 기업 고유번호
  businessYear: string       // 사업연도
  reportCode: string         // 보고서 코드
  reprtNm: string           // 보고서명
  acntNm: string            // 계정명
  thstrmNm: string          // 당기명
  thstrmAmount: string      // 당기금액
  frmtrmNm: string          // 전기명
  frmtrmAmount: string      // 전기금액
  bfefrmtrmNm: string       // 전전기명
  bfefrmtrmAmount: string   // 전전기금액
  ord: string               // 계정순서
  currency: string          // 통화단위
  fsCls: string             // 재무제표구분
  sjNm: string              // 재무제표명
}

// 배치 작업 결과
export interface DartBatchResult {
  jobId: string                    // 작업 ID
  status: 'pending' | 'running' | 'completed' | 'failed'
  startTime: Date                  // 시작 시간
  endTime?: Date                   // 종료 시간
  processedCount: number           // 처리된 건수
  successCount: number             // 성공 건수
  failedCount: number              // 실패 건수
  errors: string[]                 // 오류 메시지 목록
  resultSummary: {
    totalDisclosures: number
    regularReports: number
    majorEvents: number
    stockEvents: number
  }
}

// Fear & Greed 지수 관련 공시 분류
export interface SentimentRelevantDisclosure extends DartDisclosureData {
  sentimentImpact: 'positive' | 'negative' | 'neutral'  // 시장 심리 영향도
  impactScore: number                                    // 영향 점수 (0-100)
  keywords: string[]                                     // 매칭된 키워드
  category: 'dividend' | 'merger' | 'acquisition' | 'financial' | 'management' | 'other'
}

// 대량보유 현황
export interface DartStockHoldingData {
  corpCode: string        // 기업 고유번호
  corpName: string        // 기업명
  stockCode: string       // 주식코드
  reportDate: string      // 보고일자
  reporterName: string    // 보고자명
  holdingRatio: number    // 보유비율 (%)
  holdingShares: number   // 보유주식수
  changeRatio: number     // 변동비율 (%)
  changeShares: number    // 변동주식수
  changeReason: string    // 변동사유
}

// 공시 데이터 필터 옵션
export interface DartFilterOptions {
  corpCodes?: string[]           // 특정 기업들만 필터링
  reportTypes?: string[]         // 특정 보고서 타입만 필터링
  keywords?: string[]            // 제목/내용 키워드 필터링
  sentimentRelevant?: boolean    // Fear & Greed 지수 관련 공시만 필터링
  minImpactScore?: number        // 최소 영향 점수
  excludeWeekends?: boolean      // 주말 데이터 제외
}

// DART API 에러 응답
export interface DartApiError {
  status: string      // 에러 코드
  message: string     // 에러 메시지
}

// 배치 스케줄링 설정
export interface DartBatchSchedule {
  id: string
  name: string
  cronExpression: string    // cron 표현식
  isActive: boolean
  batchType: 'daily' | 'weekly' | 'monthly'
  filterOptions: DartFilterOptions
  notifyOnComplete: boolean
  retryOnFailure: boolean
  maxRetries: number
  lastRun?: Date
  nextRun?: Date
  
}

// 데이터 수집 통계
export interface DartCollectionStats {
  date: string
  totalApiCalls: number
  successfulCalls: number
  failedCalls: number
  dataPoints: number
  averageResponseTime: number   // ms
  rateLimit: {
    limit: number
    remaining: number
    resetTime: Date
  }
}

// 공시 알림 설정
export interface DartAlertConfig {
  id: string
  name: string
  corpCodes: string[]          // 모니터링할 기업 코드
  keywords: string[]           // 알림 키워드
  reportTypes: string[]        // 알림 대상 보고서 유형
  minImpactScore: number       // 최소 영향 점수
  channels: ('email' | 'slack' | 'webhook')[]  // 알림 채널
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

// 배치 작업 큐 아이템
export interface DartBatchQueueItem {
  id: string
  type: 'disclosure' | 'financial' | 'company_info'
  priority: 'high' | 'medium' | 'low'
  payload: any
  status: 'pending' | 'processing' | 'completed' | 'failed'
  attempts: number
  maxAttempts: number
  createdAt: Date
  scheduledAt: Date
  startedAt?: Date
  completedAt?: Date
  error?: string
}

// 실시간 공시 모니터링
export interface DartRealtimeMonitor {
  id: string
  isActive: boolean
  monitoringCorps: string[]     // 실시간 모니터링 기업들
  lastCheckTime: Date
  newDisclosures: DartDisclosureData[]
  alertsSent: number
}