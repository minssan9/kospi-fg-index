import { formatDate } from '@/utils/dateUtils'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Fear & Greed Index 계산 결과 인터페이스
 */
export interface FearGreedResult {
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

/**
 * Fear & Greed Index 계산기
 */
export class FearGreedCalculator {
  
  /**
   * 구성요소별 가중치 (총합 100%)
   */
  private static readonly WEIGHTS = {
    priceMomentum: 0.25,      // 주가 모멘텀 25%
    investorSentiment: 0.25,  // 투자자 심리 25%
    putCallRatio: 0.15,       // 풋/콜 비율 15%
    volatilityIndex: 0.20,    // 변동성 지수 20%
    safeHavenDemand: 0.15     // 안전자산 수요 15%
  }

  /**
   * Fear & Greed Index 레벨 분류
   */
  private static getLevel(value: number): string {
    if (value <= 20) return 'Extreme Fear'
    if (value <= 40) return 'Fear'
    if (value <= 60) return 'Neutral'
    if (value <= 80) return 'Greed'
    return 'Extreme Greed'
  }

  /**
   * 각 구성요소 계산
   */
  private static async calculateComponents(date: string): Promise<{
    priceMomentum: number
    investorSentiment: number
    putCallRatio: number
    volatilityIndex: number
    safeHavenDemand: number
  }> {
    const [
      priceMomentum,
      investorSentiment,
      putCallRatio,
      volatilityIndex,
      safeHavenDemand
    ] = await Promise.all([
      this.calculatePriceMomentum(date),
      this.calculateInvestorSentiment(date),
      this.calculatePutCallRatio(date),
      this.calculateVolatilityIndex(date),
      this.calculateSafeHavenDemand(date)
    ])

    return {
      priceMomentum,
      investorSentiment,
      putCallRatio,
      volatilityIndex,
      safeHavenDemand
    }
  }

  /**
   * 특정 날짜의 Fear & Greed Index 계산
   */
  static async calculateIndex(date: string): Promise<FearGreedResult> {
    console.log(`[FearGreed] ${date} Fear & Greed Index 계산 시작`)

    try {
      const components = await this.calculateComponents(date)
      
      // 가중평균으로 최종 지수 계산
      const value = Math.round(
        components.priceMomentum * this.WEIGHTS.priceMomentum +
        components.investorSentiment * this.WEIGHTS.investorSentiment +
        components.putCallRatio * this.WEIGHTS.putCallRatio +
        components.volatilityIndex * this.WEIGHTS.volatilityIndex +
        components.safeHavenDemand * this.WEIGHTS.safeHavenDemand
      )

      // 신뢰도 계산 (모든 구성요소가 있으면 100%)
      const confidence = this.calculateConfidence(components)

      const result: FearGreedResult = {
        date,
        value,
        level: this.getLevel(value),
        confidence,
        components
      }

      console.log(`[FearGreed] ${date} 계산 완료: ${value} (${result.level})`)
      return result

    } catch (error) {
      console.error(`[FearGreed] ${date} 계산 실패:`, error)
      throw error
    }
  }

  /**
   * 주가 모멘텀 계산 (0-100)
   */
  private static async calculatePriceMomentum(date: string): Promise<number> {
    try {
      // 120일 전 데이터까지 조회
      const historicalData = await prisma.kospiData.findMany({
        where: {
          date: {
            lte: new Date(date)
          }
        },
        orderBy: {
          date: 'desc'
        },
        take: 120
      })

      if (historicalData.length < 20) {
        console.warn('[FearGreed] 주가 모멘텀 계산을 위한 데이터 부족')
        return 50 // 중립값 반환
      }

      // 20일/120일 이동평균 계산
      const ma20 = historicalData.slice(0, 20).reduce((sum, data) => 
        sum + Number(data.stck_prpr), 0) / 20
      const ma120 = historicalData.reduce((sum, data) => 
        sum + Number(data.stck_prpr), 0) / historicalData.length

      // 모멘텀 점수 계산 (MA20이 MA120 대비 ±10% 범위를 0-100으로 변환)
      const momentum = ((ma20 / ma120 - 0.9) * 500)
      return Math.max(0, Math.min(100, momentum))

    } catch (error) {
      console.error('[FearGreed] 주가 모멘텀 계산 실패:', error)
      return 50 // 오류 시 중립값 반환
    }
  }

  /**
   * 투자자 심리 계산 (0-100)
   */
  private static async calculateInvestorSentiment(date: string): Promise<number> {
    try {
      // 5일간의 투자자 데이터 조회
      const tradingData = await prisma.investorTrading.findMany({
        where: {
          date: {
            lte: new Date(date)
          }
        },
        orderBy: {
          date: 'desc'
        },
        take: 5
      })

      if (tradingData.length === 0) {
        console.warn('[FearGreed] 투자자 심리 계산을 위한 데이터 부족')
        return 50 // 중립값 반환
      }

      // 외국인과 기관의 순매수 합산
      let totalNetBuying = 0
      tradingData.forEach(data => {
        // 외국인 순매수 = 매수 - 매도 (거래대금 기준)
        const foreignNet = Number(data.frgn_shnu_tr_pbmn || 0) - Number(data.frgn_seln_tr_pbmn || 0)
        // 기관 순매수 = 매수 - 매도 (거래대금 기준)
        const institutionalNet = Number(data.orgn_shnu_tr_pbmn || 0) - Number(data.orgn_seln_tr_pbmn || 0)
        totalNetBuying += foreignNet + institutionalNet
      })

      // 순매수를 0-100 점수로 변환 (±10조원 범위)
      const maxRange = 10000000000000 // 10조원
      const score = ((totalNetBuying + maxRange) * 100) / (maxRange * 2)
      return Math.max(0, Math.min(100, score))

    } catch (error) {
      console.error('[FearGreed] 투자자 심리 계산 실패:', error)
      return 50 // 오류 시 중립값 반환
    }
  }

  /**
   * 풋/콜 비율 계산 (0-100)
   */
  private static async calculatePutCallRatio(date: string): Promise<number> {
    try {
      const optionData = await prisma.optionData.findFirst({
        where: {
          date: new Date(date)
        }
      })

      if (!optionData) {
        console.warn('[FearGreed] 풋/콜 비율 계산을 위한 데이터 부족')
        return 50 // 중립값 반환
      }

      // Put/Call 비율을 0-100 점수로 변환 (0.5~2.0 범위)
      // 비율이 높을수록 공포심리 (낮은 점수)
      const ratio = Number(optionData.putCallRatio)
      const score = 100 - ((ratio - 0.5) * 66.67)
      return Math.max(0, Math.min(100, score))

    } catch (error) {
      console.error('[FearGreed] 풋/콜 비율 계산 실패:', error)
      return 50 // 오류 시 중립값 반환
    }
  }

  /**
   * 변동성 지수 계산 (0-100)
   */
  private static async calculateVolatilityIndex(date: string): Promise<number> {
    try {
      const vkospiData = await prisma.vkospiData.findFirst({
        where: {
          date: new Date(date)
        }
      })

      if (!vkospiData) {
        console.warn('[FearGreed] 변동성 지수 계산을 위한 데이터 부족')
        return 50 // 중립값 반환
      }

      // VKOSPI를 0-100 점수로 변환 (10~40 범위)
      // 변동성이 높을수록 공포심리 (낮은 점수)
      const vkospi = Number(vkospiData.value)
      const score = 100 - ((vkospi - 10) * 3.33)
      return Math.max(0, Math.min(100, score))

    } catch (error) {
      console.error('[FearGreed] 변동성 지수 계산 실패:', error)
      return 50 // 오류 시 중립값 반환
    }
  }

  /**
   * 안전자산 수요 계산 (0-100)
   */
  private static async calculateSafeHavenDemand(date: string): Promise<number> {
    try {
      const yieldData = await prisma.bondYieldCurveData.findFirst({
        where: {
          date: new Date(date)
        }
      })

      if (!yieldData || !yieldData.yield3Y || !yieldData.yield10Y) {
        console.warn('[FearGreed] 안전자산 수요 계산을 위한 데이터 부족')
        return 50 // 중립값 반환
      }

      // 10년물과 3년물의 스프레드 계산
      const spread = Number(yieldData.yield10Y) - Number(yieldData.yield3Y)
      
      // 스프레드를 0-100 점수로 변환 (-0.5~2.0 범위)
      // 스프레드가 작을수록 공포심리 (낮은 점수)
      const score = ((spread + 0.5) * 40)
      return Math.max(0, Math.min(100, score))

    } catch (error) {
      console.error('[FearGreed] 안전자산 수요 계산 실패:', error)
      return 50 // 오류 시 중립값 반환
    }
  }

  /**
   * 신뢰도 계산
   */
  private static calculateConfidence(components: any): number {
    // 모든 구성요소가 유효하면 100% 신뢰도
    let availableComponents = 0
    const totalComponents = 5

    if (components.priceMomentum >= 0) availableComponents++
    if (components.investorSentiment >= 0) availableComponents++
    if (components.putCallRatio >= 0) availableComponents++
    if (components.volatilityIndex >= 0) availableComponents++
    if (components.safeHavenDemand >= 0) availableComponents++

    return Math.round((availableComponents / totalComponents) * 100)
  }

  /**
   * 여러 날짜의 Fear & Greed Index 일괄 계산
   */
  static async calculateIndexForDateRange(
    startDate: string, 
    endDate: string
  ): Promise<FearGreedResult[]> {
    const results: FearGreedResult[] = []
    
    const start = new Date(startDate)
    const end = new Date(endDate)
    
    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      try {
        const dateStr = formatDate(date)
        const result = await this.calculateIndex(dateStr)
        results.push(result)
      } catch (error) {
        console.error(`[FearGreed] ${formatDate(date)} 계산 실패:`, error)
      }
    }
    
    return results
  }

  /**
   * 현재 시장 상황 요약
   */
  static async getCurrentMarketSummary(): Promise<{
    fearGreedIndex: FearGreedResult
    marketStatus: string
    recommendation: string
  }> {
    const today = formatDate(new Date())
    const fearGreedIndex = await this.calculateIndex(today)
    
    let marketStatus = ''
    let recommendation = ''
    
    switch (fearGreedIndex.level) {
      case 'Extreme Fear':
        marketStatus = '극도의 공포 상태'
        recommendation = '매수 기회일 수 있으나 신중한 접근 필요'
        break
      case 'Fear':
        marketStatus = '공포 상태'
        recommendation = '점진적 매수 고려'
        break
      case 'Neutral':
        marketStatus = '중립 상태'
        recommendation = '균형잡힌 포트폴리오 유지'
        break
      case 'Greed':
        marketStatus = '탐욕 상태'
        recommendation = '수익 실현 고려'
        break
      case 'Extreme Greed':
        marketStatus = '극도의 탐욕 상태'
        recommendation = '매도 타이밍일 수 있음'
        break
    }
    
    return {
      fearGreedIndex,
      marketStatus,
      recommendation
    }
  }
} 