import { formatDate } from '../utils/dateUtils'

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
    putCallRatio: 0.20,       // 풋/콜 비율 20%
    volatilityIndex: 0.15,    // 변동성 지수 15%
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
   * 특정 날짜의 Fear & Greed Index 계산
   */
  static async calculateIndex(date: string): Promise<FearGreedResult> {
    console.log(`[FearGreed] ${date} Fear & Greed Index 계산 시작`)

    try {
      // 샘플 데이터를 사용한 계산 (실제 구현에서는 데이터베이스에서 조회)
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
   * 각 구성요소 계산
   */
  private static async calculateComponents(date: string): Promise<{
    priceMomentum: number
    investorSentiment: number
    putCallRatio: number
    volatilityIndex: number
    safeHavenDemand: number
  }> {
    // 실제 구현에서는 데이터베이스에서 데이터를 조회하여 계산
    // 현재는 샘플 값으로 계산
    
    return {
      priceMomentum: this.calculatePriceMomentum(),
      investorSentiment: this.calculateInvestorSentiment(),
      putCallRatio: this.calculatePutCallRatio(),
      volatilityIndex: this.calculateVolatilityIndex(),
      safeHavenDemand: this.calculateSafeHavenDemand()
    }
  }

  /**
   * 주가 모멘텀 계산 (0-100)
   */
  private static calculatePriceMomentum(): number {
    // 샘플 계산 - 실제로는 KOSPI 지수의 이동평균 대비 현재 위치 계산
    const momentum = 65 // 상승 추세
    return Math.max(0, Math.min(100, momentum))
  }

  /**
   * 투자자 심리 계산 (0-100)
   */
  private static calculateInvestorSentiment(): number {
    // 샘플 계산 - 실제로는 투자자별 매매동향 분석
    const sentiment = 45 // 약간 부정적
    return Math.max(0, Math.min(100, sentiment))
  }

  /**
   * 풋/콜 비율 계산 (0-100)
   */
  private static calculatePutCallRatio(): number {
    // 샘플 계산 - 실제로는 옵션 시장 데이터 분석
    const putCallScore = 60 // 중립적
    return Math.max(0, Math.min(100, putCallScore))
  }

  /**
   * 변동성 지수 계산 (0-100)
   */
  private static calculateVolatilityIndex(): number {
    // 샘플 계산 - 실제로는 VKOSPI 또는 역사적 변동성 분석
    const volatility = 40 // 낮은 변동성 (좋은 신호)
    return Math.max(0, Math.min(100, volatility))
  }

  /**
   * 안전자산 수요 계산 (0-100)
   */
  private static calculateSafeHavenDemand(): number {
    // 샘플 계산 - 실제로는 국채 수익률 커브 분석
    const safeHavenDemand = 50 // 중립적
    return Math.max(0, Math.min(100, safeHavenDemand))
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