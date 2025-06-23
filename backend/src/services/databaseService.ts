import { PrismaClient } from '@prisma/client'
import type { 
  KOSPIData, 
  KOSDAQData, 
  InvestorTradingData, 
  OptionData 
} from '../collectors/krxCollector'
import type { 
  InterestRateData, 
  ExchangeRateData, 
  EconomicIndicatorData 
} from '../collectors/bokCollector'
import type { FearGreedResult } from './fearGreedCalculator'

const prisma = new PrismaClient()

/**
 * 데이터베이스 서비스 클래스
 */
export class DatabaseService {
  
  /**
   * KOSPI 데이터 저장
   */
  static async saveKOSPIData(data: KOSPIData): Promise<void> {
    try {
      await prisma.kospiData.upsert({
        where: { date: new Date(data.date) },
        update: {
          index: data.index,
          change: data.change,
          changePercent: data.changePercent,
          volume: BigInt(data.volume),
          value: BigInt(data.value),
          updatedAt: new Date()
        },
        create: {
          date: new Date(data.date),
          index: data.index,
          change: data.change,
          changePercent: data.changePercent,
          volume: BigInt(data.volume),
          value: BigInt(data.value)
        }
      })
      
      console.log(`[DB] KOSPI 데이터 저장 완료: ${data.date}`)
    } catch (error) {
      console.error(`[DB] KOSPI 데이터 저장 실패 (${data.date}):`, error)
      throw error
    }
  }

  /**
   * KOSDAQ 데이터 저장
   */
  static async saveKOSDAQData(data: KOSDAQData): Promise<void> {
    try {
      await prisma.kosdaqData.upsert({
        where: { date: new Date(data.date) },
        update: {
          openPrice: data.openPrice,
          closePrice: data.closePrice,
          highPrice: data.highPrice,
          lowPrice: data.lowPrice,
          volume: BigInt(data.volume),
          marketCap: data.marketCap ? BigInt(data.marketCap) : null,
          change: data.change,
          changePercent: data.changePercent,
          updatedAt: new Date()
        },
        create: {
          date: new Date(data.date),
          openPrice: data.openPrice,
          closePrice: data.closePrice,
          highPrice: data.highPrice,
          lowPrice: data.lowPrice,
          volume: BigInt(data.volume),
          marketCap: data.marketCap ? BigInt(data.marketCap) : null,
          change: data.change,
          changePercent: data.changePercent
        }
      })
      console.log(`[DB] KOSDAQ 데이터 저장 완료: ${data.date}`)
    } catch (error) {
      console.error(`[DB] KOSDAQ 데이터 저장 실패 (${data.date}):`, error)
      throw error
    }
  }

  /**
   * 투자자별 매매동향 데이터 저장
   */
  static async saveInvestorTradingData(data: InvestorTradingData): Promise<void> {
    try {
      await prisma.investorTrading.upsert({
        where: { date: new Date(data.date) },
        update: {
          foreignBuying: BigInt(data.foreignBuying),
          foreignSelling: BigInt(data.foreignSelling),
          individualBuying: BigInt(data.individualBuying),
          individualSelling: BigInt(data.individualSelling),
          institutionalBuying: BigInt(data.institutionalBuying),
          institutionalSelling: BigInt(data.institutionalSelling),
          updatedAt: new Date()
        },
        create: {
          date: new Date(data.date),
          foreignBuying: BigInt(data.foreignBuying),
          foreignSelling: BigInt(data.foreignSelling),
          individualBuying: BigInt(data.individualBuying),
          individualSelling: BigInt(data.individualSelling),
          institutionalBuying: BigInt(data.institutionalBuying),
          institutionalSelling: BigInt(data.institutionalSelling)
        }
      })
      
      console.log(`[DB] 투자자별 매매동향 저장 완료: ${data.date}`)
    } catch (error) {
      console.error(`[DB] 투자자별 매매동향 저장 실패 (${data.date}):`, error)
      throw error
    }
  }

  /**
   * 옵션 데이터 저장
   */
  static async saveOptionData(data: OptionData): Promise<void> {
    try {
      await prisma.optionData.upsert({
        where: { date: new Date(data.date) },
        update: {
          putVolume: BigInt(data.putVolume),
          callVolume: BigInt(data.callVolume),
          putCallRatio: data.putCallRatio,
          updatedAt: new Date()
        },
        create: {
          date: new Date(data.date),
          putVolume: BigInt(data.putVolume),
          callVolume: BigInt(data.callVolume),
          putCallRatio: data.putCallRatio
        }
      })
      
      console.log(`[DB] 옵션 데이터 저장 완료: ${data.date}`)
    } catch (error) {
      console.error(`[DB] 옵션 데이터 저장 실패 (${data.date}):`, error)
      throw error
    }
  }

  /**
   * 금리 데이터 저장
   */
  static async saveInterestRateData(data: InterestRateData): Promise<void> {
    try {
      await prisma.interestRateData.upsert({
        where: { date: new Date(data.date) },
        update: {
          baseRate: data.baseRate,
          callRate: data.callRate,
          cd91Rate: data.cd91Rate,
          treasuryBond3Y: data.treasuryBond3Y,
          treasuryBond10Y: data.treasuryBond10Y,
          updatedAt: new Date()
        },
        create: {
          date: new Date(data.date),
          baseRate: data.baseRate,
          callRate: data.callRate,
          cd91Rate: data.cd91Rate,
          treasuryBond3Y: data.treasuryBond3Y,
          treasuryBond10Y: data.treasuryBond10Y
        }
      })
      
      console.log(`[DB] 금리 데이터 저장 완료: ${data.date}`)
    } catch (error) {
      console.error(`[DB] 금리 데이터 저장 실패 (${data.date}):`, error)
      throw error
    }
  }

  /**
   * 환율 데이터 저장
   */
  static async saveExchangeRateData(data: ExchangeRateData): Promise<void> {
    try {
      await prisma.exchangeRateData.upsert({
        where: { date: new Date(data.date) },
        update: {
          usdKrw: data.usdKrw,
          eurKrw: data.eurKrw,
          jpyKrw: data.jpyKrw,
          cnyKrw: data.cnyKrw,
          updatedAt: new Date()
        },
        create: {
          date: new Date(data.date),
          usdKrw: data.usdKrw,
          eurKrw: data.eurKrw,
          jpyKrw: data.jpyKrw,
          cnyKrw: data.cnyKrw
        }
      })
      
      console.log(`[DB] 환율 데이터 저장 완료: ${data.date}`)
    } catch (error) {
      console.error(`[DB] 환율 데이터 저장 실패 (${data.date}):`, error)
      throw error
    }
  }

  /**
   * 경제지표 데이터 저장
   */
  static async saveEconomicIndicatorData(data: EconomicIndicatorData): Promise<void> {
    try {
      await prisma.economicIndicatorData.upsert({
        where: { date: new Date(data.date) },
        update: {
          cpi: data.cpi,
          ppi: data.ppi,
          unemploymentRate: data.unemploymentRate,
          gdpGrowthRate: data.gdpGrowthRate,
          updatedAt: new Date()
        },
        create: {
          date: new Date(data.date),
          cpi: data.cpi,
          ppi: data.ppi,
          unemploymentRate: data.unemploymentRate,
          gdpGrowthRate: data.gdpGrowthRate
        }
      })
      
      console.log(`[DB] 경제지표 데이터 저장 완료: ${data.date}`)
    } catch (error) {
      console.error(`[DB] 경제지표 데이터 저장 실패 (${data.date}):`, error)
      throw error
    }
  }

  /**
   * Fear & Greed Index 저장
   */
  static async saveFearGreedIndex(data: FearGreedResult): Promise<void> {
    try {
      await prisma.fearGreedIndex.upsert({
        where: { date: new Date(data.date) },
        update: {
          value: data.value,
          level: data.level,
          confidence: data.confidence,
          priceMomentum: data.components.priceMomentum,
          investorSentiment: data.components.investorSentiment,
          putCallRatio: data.components.putCallRatio,
          volatilityIndex: data.components.volatilityIndex,
          safeHavenDemand: data.components.safeHavenDemand,
          updatedAt: new Date()
        },
        create: {
          date: new Date(data.date),
          value: data.value,
          level: data.level,
          confidence: data.confidence,
          priceMomentum: data.components.priceMomentum,
          investorSentiment: data.components.investorSentiment,
          putCallRatio: data.components.putCallRatio,
          volatilityIndex: data.components.volatilityIndex,
          safeHavenDemand: data.components.safeHavenDemand
        }
      })
      
      console.log(`[DB] Fear & Greed Index 저장 완료: ${data.date} (${data.value})`)
    } catch (error) {
      console.error(`[DB] Fear & Greed Index 저장 실패 (${data.date}):`, error)
      throw error
    }
  }

  /**
   * VKOSPI 데이터 저장
   */
  static async saveVKOSPIData(date: string, value: number): Promise<void> {
    try {
      await prisma.vkospiData.upsert({
        where: { date: new Date(date) },
        update: {
          value: value,
          updatedAt: new Date()
        },
        create: {
          date: new Date(date),
          value: value
        }
      })
      
      console.log(`[DB] VKOSPI 데이터 저장 완료: ${date} (${value})`)
    } catch (error) {
      console.error(`[DB] VKOSPI 데이터 저장 실패 (${date}):`, error)
      throw error
    }
  }

  /**
   * 국채 수익률 커브 데이터 저장
   */
  static async saveBondYieldCurveData(date: string, yields: {
    yield1Y: number | null
    yield3Y: number | null
    yield5Y: number | null
    yield10Y: number | null
    yield20Y: number | null
  }): Promise<void> {
    try {
      await prisma.bondYieldCurveData.upsert({
        where: { date: new Date(date) },
        update: {
          yield1Y: yields.yield1Y,
          yield3Y: yields.yield3Y,
          yield5Y: yields.yield5Y,
          yield10Y: yields.yield10Y,
          yield20Y: yields.yield20Y,
          updatedAt: new Date()
        },
        create: {
          date: new Date(date),
          yield1Y: yields.yield1Y,
          yield3Y: yields.yield3Y,
          yield5Y: yields.yield5Y,
          yield10Y: yields.yield10Y,
          yield20Y: yields.yield20Y
        }
      })
      
      console.log(`[DB] 국채 수익률 커브 저장 완료: ${date}`)
    } catch (error) {
      console.error(`[DB] 국채 수익률 커브 저장 실패 (${date}):`, error)
      throw error
    }
  }

  /**
   * 데이터 수집 로그 저장
   */
  static async saveDataCollectionLog(
    date: string,
    source: string,
    dataType: string,
    status: 'SUCCESS' | 'FAILED' | 'PARTIAL',
    recordCount?: number,
    errorMessage?: string,
    duration?: number
  ): Promise<void> {
    try {
      await prisma.dataCollectionLog.create({
        data: {
          date: new Date(date),
          source,
          dataType,
          status,
          recordCount: recordCount ?? null,
          errorMessage: errorMessage ?? null,
          duration: duration ?? null
        }
      })
      
      console.log(`[DB] 데이터 수집 로그 저장: ${source}/${dataType} - ${status}`)
    } catch (error) {
      console.error(`[DB] 데이터 수집 로그 저장 실패:`, error)
      // 로그 저장 실패는 전체 프로세스를 중단시키지 않음
    }
  }

  /**
   * KRX 데이터 일괄 저장
   */
  static async saveKRXData(date: string, data: {
    kospi: KOSPIData | null
    trading: InvestorTradingData | null
    options: OptionData | null
  }): Promise<void> {
    const startTime = Date.now()
    let recordCount = 0
    let errors: string[] = []

    try {
      // KOSPI 데이터 저장
      if (data.kospi) {
        await this.saveKOSPIData(data.kospi)
        recordCount++
      }

      // 투자자별 매매동향 저장
      if (data.trading) {
        await this.saveInvestorTradingData(data.trading)
        recordCount++
      }

      // 옵션 데이터 저장
      if (data.options) {
        await this.saveOptionData(data.options)
        recordCount++
      }

      const duration = Date.now() - startTime
      const status = errors.length > 0 ? 'PARTIAL' : 'SUCCESS'
      
      await this.saveDataCollectionLog(
        date,
        'KRX',
        'MARKET_DATA',
        status,
        recordCount,
        errors.length > 0 ? errors.join('; ') : undefined,
        duration
      )

      console.log(`[DB] KRX 데이터 일괄 저장 완료: ${recordCount}개 레코드`)

    } catch (error) {
      const duration = Date.now() - startTime
      await this.saveDataCollectionLog(
        date,
        'KRX',
        'MARKET_DATA',
        'FAILED',
        recordCount,
        error instanceof Error ? error.message : String(error),
        duration
      )
      throw error
    }
  }

  /**
   * BOK 데이터 일괄 저장
   */
  static async saveBOKData(date: string, data: {
    interestRates: InterestRateData | null
    exchangeRates: ExchangeRateData | null
    economicIndicators: EconomicIndicatorData | null
  }): Promise<void> {
    const startTime = Date.now()
    let recordCount = 0
    let errors: string[] = []

    try {
      // 금리 데이터 저장
      if (data.interestRates) {
        await this.saveInterestRateData(data.interestRates)
        recordCount++
      }

      // 환율 데이터 저장
      if (data.exchangeRates) {
        await this.saveExchangeRateData(data.exchangeRates)
        recordCount++
      }

      // 경제지표 데이터 저장
      if (data.economicIndicators) {
        await this.saveEconomicIndicatorData(data.economicIndicators)
        recordCount++
      }

      const duration = Date.now() - startTime
      const status = errors.length > 0 ? 'PARTIAL' : 'SUCCESS'
      
      await this.saveDataCollectionLog(
        date,
        'BOK',
        'ECONOMIC_DATA',
        status,
        recordCount,
        errors.length > 0 ? errors.join('; ') : undefined,
        duration
      )

      console.log(`[DB] BOK 데이터 일괄 저장 완료: ${recordCount}개 레코드`)

    } catch (error) {
      const duration = Date.now() - startTime
      await this.saveDataCollectionLog(
        date,
        'BOK',
        'ECONOMIC_DATA',
        'FAILED',
        recordCount,
        error instanceof Error ? error.message : String(error),
        duration
      )
      throw error
    }
  }

  /**
   * 데이터베이스 연결 종료
   */
  static async disconnect(): Promise<void> {
    await prisma.$disconnect()
  }

  /**
   * 최신 Fear & Greed Index 조회
   */
  static async getLatestFearGreedIndex() {
    return await prisma.fearGreedIndex.findFirst({
      orderBy: { date: 'desc' }
    })
  }

  /**
   * Fear & Greed Index 히스토리 조회
   */
  static async getFearGreedIndexHistory(days: number = 30) {
    return await prisma.fearGreedIndex.findMany({
      orderBy: { date: 'desc' },
      take: days
    })
  }

  /**
   * 최신 KOSPI 데이터 조회
   */
  static async getLatestKOSPIData() {
    return await prisma.kospiData.findFirst({
      orderBy: { date: 'desc' }
    })
  }

  /**
   * 최신 KOSDAQ 데이터 조회
   */
  static async getLatestKOSDAQData() {
    return await prisma.kosdaqData.findFirst({
      orderBy: { date: 'desc' }
    });
  }

  /**
   * 데이터 수집 상태 조회
   */
  static async getDataCollectionStatus(days: number = 7) {
    return await prisma.dataCollectionLog.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000)
        }
      },
      orderBy: { createdAt: 'desc' }
    })
  }

  /**
   * Upbit Index 데이터 저장
   */
  static async saveUpbitIndexData(data: { date: string, value: number }): Promise<void> {
    try {
      await prisma.upbitIndexData.upsert({
        where: { date: new Date(data.date) },
        update: {
          value: data.value,
          updatedAt: new Date()
        },
        create: {
          date: new Date(data.date),
          value: data.value
        }
      })
      console.log(`[DB] Upbit Index 데이터 저장 완료: ${data.date} (${data.value})`)
    } catch (error) {
      console.error(`[DB] Upbit Index 데이터 저장 실패 (${data.date}):`, error)
      throw error
    }
  }

  /**
   * CNN Fear & Greed Index 데이터 저장
   */
  static async saveCnnFearGreedIndexData(data: { date: string, value: number }): Promise<void> {
    try {
      await prisma.cnnFearGreedIndexData.upsert({
        where: { date: new Date(data.date) },
        update: {
          value: data.value,
          updatedAt: new Date()
        },
        create: {
          date: new Date(data.date),
          value: data.value
        }
      })
      console.log(`[DB] CNN Fear & Greed Index 데이터 저장 완료: ${data.date} (${data.value})`)
    } catch (error) {
      console.error(`[DB] CNN Fear & Greed Index 데이터 저장 실패 (${data.date}):`, error)
      throw error
    }
  }

  /**
   * Korea FG Index 데이터 저장
   */
  static async saveKoreaFGIndexData(data: { date: string, value: number }): Promise<void> {
    try {
      await prisma.koreaFGIndexData.upsert({
        where: { date: new Date(data.date) },
        update: {
          value: data.value,
          updatedAt: new Date()
        },
        create: {
          date: new Date(data.date),
          value: data.value
        }
      })
      console.log(`[DB] Korea FG Index 데이터 저장 완료: ${data.date} (${data.value})`)
    } catch (error) {
      console.error(`[DB] Korea FG Index 데이터 저장 실패 (${data.date}):`, error)
      throw error
    }
  }
} 