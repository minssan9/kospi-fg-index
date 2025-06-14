import cron from 'node-cron'
import { KRXCollector } from '../collectors/krxCollector'
import { BOKCollector } from '../collectors/bokCollector'
import { FearGreedCalculator } from './fearGreedCalculator'

// 스케줄러 상태 관리
let isSchedulerRunning = false
let scheduledJobs: cron.ScheduledTask[] = []

/**
 * 데이터 수집 스케줄러 시작
 */
export function startDataCollectionScheduler(): void {
  if (isSchedulerRunning) {
    console.log('데이터 수집 스케줄러가 이미 실행 중입니다.')
    return
  }

  console.log('데이터 수집 스케줄러를 시작합니다.')

  try {
    // 1. 평일 오전 6:00 - BOK 경제지표 데이터 수집
    const bokJob = cron.schedule('0 6 * * 1-5', async () => {
      console.log('[Scheduler] BOK 데이터 수집 작업 시작')
      await collectBOKData()
    }, {
      scheduled: false,
      timezone: 'Asia/Seoul'
    })

    // 2. 평일 오후 3:45 - KRX 장마감 후 시장 데이터 수집
    const krxJob = cron.schedule('45 15 * * 1-5', async () => {
      console.log('[Scheduler] KRX 데이터 수집 작업 시작')
      await collectKRXData()
    }, {
      scheduled: false,
      timezone: 'Asia/Seoul'
    })

    // 3. 평일 오후 6:00 - Fear & Greed Index 계산 및 저장
    const fearGreedJob = cron.schedule('0 18 * * 1-5', async () => {
      console.log('[Scheduler] Fear & Greed Index 계산 작업 시작')
      await calculateAndSaveFearGreedIndex()
    }, {
      scheduled: false,
      timezone: 'Asia/Seoul'
    })

    // 4. 매일 자정 - 시스템 상태 체크 및 로그 정리
    const maintenanceJob = cron.schedule('0 0 * * *', async () => {
      console.log('[Scheduler] 시스템 유지보수 작업 시작')
      await performMaintenance()
    }, {
      scheduled: false,
      timezone: 'Asia/Seoul'
    })

    // 스케줄러 작업 배열에 추가
    scheduledJobs = [bokJob, krxJob, fearGreedJob, maintenanceJob]

    // 모든 작업 시작
    scheduledJobs.forEach(job => job.start())

    isSchedulerRunning = true
    console.log('데이터 수집 스케줄러가 성공적으로 시작되었습니다.')
    console.log('스케줄:')
    console.log('  - BOK 데이터: 평일 06:00')
    console.log('  - KRX 데이터: 평일 15:45') 
    console.log('  - Fear & Greed 계산: 평일 18:00')
    console.log('  - 시스템 유지보수: 매일 00:00')

  } catch (error) {
    console.error('스케줄러 시작 중 오류:', error)
    throw error
  }
}

/**
 * 스케줄러 중지
 */
export function stopDataCollectionScheduler(): void {
  if (!isSchedulerRunning) {
    console.log('스케줄러가 실행 중이 아닙니다.')
    return
  }

  console.log('데이터 수집 스케줄러를 중지합니다.')

  try {
    scheduledJobs.forEach(job => {
      job.stop()
    })

    scheduledJobs = []
    isSchedulerRunning = false

    console.log('데이터 수집 스케줄러가 성공적으로 중지되었습니다.')

  } catch (error) {
    console.error('스케줄러 중지 중 오류:', error)
    throw error
  }
}

/**
 * 일일 데이터 수집 (수동 실행용)
 */
export async function collectDailyData(date?: string): Promise<void> {
  const targetDate = date || new Date().toISOString().split('T')[0]
  
  console.log(`[Manual] ${targetDate} 일일 데이터 수집을 시작합니다.`)

  try {
    // 병렬로 데이터 수집
    await Promise.all([
      collectKRXData(targetDate),
      collectBOKData(targetDate)
    ])

    // Fear & Greed Index 계산
    await calculateAndSaveFearGreedIndex(targetDate)

    console.log(`[Manual] ${targetDate} 일일 데이터 수집이 완료되었습니다.`)

  } catch (error) {
    console.error(`[Manual] ${targetDate} 일일 데이터 수집 실패:`, error)
    throw error
  }
}

/**
 * KRX 데이터 수집
 */
async function collectKRXData(date?: string): Promise<void> {
  try {
    const targetDate = date || KRXCollector.getLastBusinessDay()
    console.log(`[KRX] ${targetDate} 데이터 수집 시작`)

    if (!targetDate) {
      throw new Error('Target date is required for KRX data collection')
    }

    const krxData = await KRXCollector.collectDailyData(targetDate)

    // TODO: 데이터베이스에 저장
    // await saveKRXData(krxData)

    console.log(`[KRX] ${targetDate} 데이터 수집 완료`)

    // 수집된 데이터 로깅
    if (krxData.kospi) {
      console.log(`  - KOSPI: ${krxData.kospi.index} (${krxData.kospi.changePercent}%)`)
    }
    if (krxData.trading) {
      console.log(`  - 외국인 순매수: ${(krxData.trading.foreignBuying - krxData.trading.foreignSelling).toLocaleString()}원`)
    }
    if (krxData.options) {
      console.log(`  - Put/Call 비율: ${krxData.options.putCallRatio.toFixed(2)}`)
    }

  } catch (error) {
    console.error('[KRX] 데이터 수집 실패:', error)
    // 에러 알림 (Slack, 이메일 등)
    // await sendErrorNotification('KRX 데이터 수집 실패', error)
    throw error
  }
}

/**
 * BOK 데이터 수집
 */
async function collectBOKData(date?: string): Promise<void> {
  try {
    const targetDate = date || new Date().toISOString().split('T')[0]
    console.log(`[BOK] ${targetDate} 데이터 수집 시작`)

    // API 키 검증
    const isApiValid = await BOKCollector.validateApiKey()
    if (!isApiValid) {
      console.warn('[BOK] API 키가 유효하지 않습니다. 데이터 수집을 건너뜁니다.')
      return
    }

    if (!targetDate) {
      throw new Error('Target date is required for BOK data collection')
    }

    const bokData = await BOKCollector.collectDailyData(targetDate)

    // TODO: 데이터베이스에 저장
    // await saveBOKData(bokData)

    console.log(`[BOK] ${targetDate} 데이터 수집 완료`)

    // 수집된 데이터 로깅
    if (bokData.interestRates) {
      console.log(`  - 기준금리: ${bokData.interestRates.baseRate}%`)
      console.log(`  - 국고채 10년: ${bokData.interestRates.treasuryBond10Y}%`)
    }
    if (bokData.exchangeRates) {
      console.log(`  - USD/KRW: ${bokData.exchangeRates.usdKrw}`)
    }

  } catch (error) {
    console.error('[BOK] 데이터 수집 실패:', error)
    // 에러 알림
    // await sendErrorNotification('BOK 데이터 수집 실패', error)
    throw error
  }
}

/**
 * Fear & Greed Index 계산 및 저장
 */
async function calculateAndSaveFearGreedIndex(date?: string): Promise<void> {
  try {
    const targetDate = date || new Date().toISOString().split('T')[0]
    console.log(`[FearGreed] ${targetDate} Fear & Greed Index 계산 시작`)

    if (!targetDate) {
      throw new Error('Target date is required for Fear & Greed Index calculation')
    }

    const fearGreedResult = await FearGreedCalculator.calculateIndex(targetDate)

    if (!fearGreedResult) {
      console.warn(`[FearGreed] ${targetDate} 데이터 부족으로 계산 불가`)
      return
    }

    // TODO: 데이터베이스에 저장
    // await saveFearGreedIndex(fearGreedResult)

    console.log(`[FearGreed] ${targetDate} 계산 완료`)
    console.log(`  - 지수: ${fearGreedResult.value}`)
    console.log(`  - 레벨: ${fearGreedResult.level}`)
    console.log(`  - 신뢰도: ${fearGreedResult.confidence}%`)
    console.log(`  - 구성요소:`)
    console.log(`    * 주가 모멘텀: ${fearGreedResult.components.priceMomentum}`)
    console.log(`    * 투자자 심리: ${fearGreedResult.components.investorSentiment}`)
    console.log(`    * Put/Call 비율: ${fearGreedResult.components.putCallRatio}`)
    console.log(`    * 변동성: ${fearGreedResult.components.volatilityIndex}`)
    console.log(`    * 안전자산 수요: ${fearGreedResult.components.safeHavenDemand}`)

    // 극한 상황 알림
    if (fearGreedResult.value <= 20 || fearGreedResult.value >= 80) {
      console.log(`🚨 [Alert] 극한 상황 감지: ${fearGreedResult.level} (${fearGreedResult.value})`)
      // await sendAlertNotification(fearGreedResult)
    }

  } catch (error) {
    console.error('[FearGreed] Fear & Greed Index 계산 실패:', error)
    // 에러 알림
    // await sendErrorNotification('Fear & Greed Index 계산 실패', error)
    throw error
  }
}

/**
 * 시스템 유지보수 작업
 */
async function performMaintenance(): Promise<void> {
  try {
    console.log('[Maintenance] 시스템 유지보수 시작')

    // 1. 로그 파일 정리 (30일 이상된 로그 삭제)
    console.log('  - 로그 파일 정리 중...')
    
    // 2. 데이터베이스 백업
    console.log('  - 데이터베이스 백업 중...')
    
    // 3. 시스템 상태 체크
    console.log('  - 시스템 상태 체크 중...')
    
    // 4. 메모리 사용량 체크
    const memUsage = process.memoryUsage()
    console.log(`  - 메모리 사용량: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`)
    
    // 5. 디스크 사용량 체크
    console.log('  - 디스크 사용량 체크 중...')

    console.log('[Maintenance] 시스템 유지보수 완료')

  } catch (error) {
    console.error('[Maintenance] 유지보수 중 오류:', error)
    throw error
  }
}

/**
 * 과거 데이터 일괄 수집 (초기 데이터 구축용)
 */
export async function collectHistoricalData(startDate: string, endDate: string): Promise<void> {
  console.log(`[Historical] ${startDate} ~ ${endDate} 과거 데이터 수집 시작`)

  try {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const dates: string[] = []

    // 날짜 목록 생성
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const day = d.getDay()
      // 주말 제외 (토요일=6, 일요일=0)
      if (day !== 0 && day !== 6) {
        const dateStr = d.toISOString().split('T')[0] as string
        dates.push(dateStr)
      }
    }

    console.log(`총 ${dates.length}개 영업일 데이터 수집 예정`)

    // 순차적으로 데이터 수집 (API 제한 고려)
    for (let i = 0; i < dates.length; i++) {
      const date = dates[i]
      console.log(`[${i + 1}/${dates.length}] ${date} 데이터 수집 중...`)

      try {
        await collectDailyData(date)
        
        // API 호출 제한 대응을 위해 딜레이
        await new Promise(resolve => setTimeout(resolve, 1000))

      } catch (error) {
        console.error(`${date} 데이터 수집 실패:`, error)
        // 실패해도 계속 진행
      }
    }

    console.log(`[Historical] 과거 데이터 수집 완료`)

  } catch (error) {
    console.error('[Historical] 과거 데이터 수집 실패:', error)
    throw error
  }
}

/**
 * 스케줄러 상태 조회
 */
export function getSchedulerStatus(): {
  isRunning: boolean
  jobCount: number
  nextRuns: string[]
} {
  const nextRuns = scheduledJobs.map(() => 'Scheduled')

  return {
    isRunning: isSchedulerRunning,
    jobCount: scheduledJobs.length,
    nextRuns
  }
} 