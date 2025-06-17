import axios from 'axios'

// KRX API 데이터 타입 정의
export interface KOSPIData {
  date: string
  index: number
  change: number
  changePercent: number
  volume: number
  value: number
}

export interface InvestorTradingData {
  date: string
  foreignBuying: number
  foreignSelling: number
  individualBuying: number
  individualSelling: number
  institutionalBuying: number
  institutionalSelling: number
}

export interface OptionData {
  date: string
  putVolume: number
  callVolume: number
  putCallRatio: number
}

export class KRXCollector {
  private static readonly BASE_URL = 'http://data.krx.co.kr/comm/bldAttendant/getJsonData.cmd'
  private static readonly TIMEOUT = 10000

  /**
   * KOSPI 지수 데이터 수집
   */
  static async fetchKOSPIData(date: string): Promise<KOSPIData | null> {
    try {
      console.log(`[KRX] KOSPI 데이터 수집 시작: ${date}`)
      
      const params = {
        bld: 'dbms/MDC/STAT/standard/MDCSTAT01501',
        locale: 'ko_KR',
        trdDd: date.replace(/-/g, ''), // YYYYMMDD 형식으로 변환
        mktId: 'STK',
        share: '1',
        csvxls_isNo: 'false'
      }

      const response = await axios.post(this.BASE_URL, null, {
        params,
        timeout: this.TIMEOUT,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      })

      if (response.data && response.data.OutBlock_1 && response.data.OutBlock_1.length > 0) {
        const kospiData = response.data.OutBlock_1.find((item: any) => 
          item.IDX_NM && item.IDX_NM.includes('KOSPI')
        )

        if (kospiData) {
          return {
            date,
            index: parseFloat(kospiData.CLSPRC_IDX || '0'),
            change: parseFloat(kospiData.CMPPREVDD_IDX || '0'),
            changePercent: parseFloat(kospiData.PRD_DE_RATE || '0'),
            volume: parseInt(kospiData.ACC_TRDVOL || '0'),
            value: parseInt(kospiData.ACC_TRDVAL || '0')
          }
        }
      }

      console.log(`[KRX] KOSPI 데이터 없음: ${date}`)
      return null

    } catch (error) {
      console.error(`[KRX] KOSPI 데이터 수집 실패 (${date}):`, (error as any)?.message)
      return null
    }
  }

  /**
   * 투자자별 매매동향 데이터 수집
   */
  static async fetchInvestorTradingData(date: string): Promise<InvestorTradingData | null> {
    try {
      console.log(`[KRX] 투자자별 매매동향 수집 시작: ${date}`)

      const params = {
        bld: 'dbms/MDC/STAT/standard/MDCSTAT02203',
        locale: 'ko_KR',
        trdDd: date.replace(/-/g, ''),
        mktId: 'STK',
        share: '1',
        csvxls_isNo: 'false'
      }

      const response = await axios.post(this.BASE_URL, null, {
        params,
        timeout: this.TIMEOUT,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      })

      if (response.data && response.data.OutBlock_1 && response.data.OutBlock_1.length > 0) {
        const tradingData = response.data.OutBlock_1

        // 외국인, 개인, 기관 데이터 추출
        const foreignData = tradingData.find((item: any) => 
          item.INVST_TP_NM && item.INVST_TP_NM.includes('외국인')
        )
        const individualData = tradingData.find((item: any) => 
          item.INVST_TP_NM && item.INVST_TP_NM.includes('개인')
        )
        const institutionalData = tradingData.find((item: any) => 
          item.INVST_TP_NM && item.INVST_TP_NM.includes('기관')
        )

        return {
          date,
          foreignBuying: parseInt(String(foreignData?.ASK_TRDVAL || '0')),
          foreignSelling: parseInt(String(foreignData?.BID_TRDVAL || '0')),
          individualBuying: parseInt(String(individualData?.ASK_TRDVAL || '0')),
          individualSelling: parseInt(String(individualData?.BID_TRDVAL || '0')),
          institutionalBuying: parseInt(String(institutionalData?.ASK_TRDVAL || '0')),
          institutionalSelling: parseInt(String(institutionalData?.BID_TRDVAL || '0'))
        }
      }

      console.log(`[KRX] 투자자별 매매동향 데이터 없음: ${date}`)
      return null

    } catch (error) {
      console.error(`[KRX] 투자자별 매매동향 수집 실패 (${date}):`, (error as any)?.message)
      return null
    }
  }

  /**
   * 옵션 Put/Call 비율 데이터 수집
   */
  static async fetchOptionData(date: string): Promise<OptionData | null> {
    try {
      console.log(`[KRX] 옵션 데이터 수집 시작: ${date}`)

      const params = {
        bld: 'dbms/MDC/STAT/standard/MDCSTAT30801',
        locale: 'ko_KR',
        trdDd: date.replace(/-/g, ''),
        share: '1',
        csvxls_isNo: 'false'
      }

      const response = await axios.post(this.BASE_URL, null, {
        params,
        timeout: this.TIMEOUT,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      })

      if (response.data && response.data.OutBlock_1 && response.data.OutBlock_1.length > 0) {
        let putVolume = 0
        let callVolume = 0

        response.data.OutBlock_1.forEach((item: any) => {
          if (item.ISU_ABBRV && item.ISU_ABBRV.includes('P')) {
            putVolume += parseInt(String(item.ACC_TRDVOL || '0'))
          } else if (item.ISU_ABBRV && item.ISU_ABBRV.includes('C')) {
            callVolume += parseInt(String(item.ACC_TRDVOL || '0'))
          }
        })

        const putCallRatio = callVolume > 0 ? putVolume / callVolume : 0

        return {
          date,
          putVolume,
          callVolume,
          putCallRatio
        }
      }

      console.log(`[KRX] 옵션 데이터 없음: ${date}`)
      return null

    } catch (error) {
      console.error(`[KRX] 옵션 데이터 수집 실패 (${date}):`, (error as any)?.message)
      return null
    }
  }

  /**
   * 특정 날짜의 모든 KRX 데이터 수집
   */
  static async collectDailyData(date: string): Promise<{
    kospi: KOSPIData | null
    trading: InvestorTradingData | null
    options: OptionData | null
  }> {
    console.log(`[KRX] ${date} 일일 데이터 수집 시작`)
    
    const results = {
      kospi: null as KOSPIData | null,
      trading: null as InvestorTradingData | null,
      options: null as OptionData | null
    }

    try {
      // KOSPI 지수 데이터 수집
      try {
        results.kospi = await this.fetchKOSPIData(date)
        console.log(`[KRX] KOSPI 데이터 수집 완료: ${date}`)
      } catch (error) {
        console.error(`[KRX] KOSPI 데이터 수집 실패 (${date}):`, (error as any)?.message)
      }

      // 투자자별 매매동향 수집
      try {
        results.trading = await this.fetchInvestorTradingData(date)
        console.log(`[KRX] 투자자별 매매동향 수집 완료: ${date}`)
      } catch (error) {
        console.error(`[KRX] 투자자별 매매동향 수집 실패 (${date}):`, (error as any)?.message)
      }

      // 옵션 데이터 수집
      try {
        results.options = await this.fetchOptionData(date)
        console.log(`[KRX] 옵션 데이터 수집 완료: ${date}`)
      } catch (error) {
        console.error(`[KRX] 옵션 데이터 수집 실패 (${date}):`, (error as any)?.message)
      }

      console.log(`[KRX] ${date} 일일 데이터 수집 완료`)
      return results

    } catch (error) {
      console.error(`[KRX] ${date} 일일 데이터 수집 중 오류:`, (error as any)?.message)
      return results
    }
  }

  /**
   * 최근 영업일 확인 (주말, 공휴일 제외)
   */
  static getLastBusinessDay(): string {
    const today = new Date()
    const day = today.getDay()
    
    // 월요일(1)이면 3일 전 (금요일)
    // 일요일(0)이면 2일 전 (금요일)
    // 토요일(6)이면 1일 전 (금요일)
    let daysToSubtract = 1
    if (day === 1) daysToSubtract = 3
    else if (day === 0) daysToSubtract = 2
    else if (day === 6) daysToSubtract = 1

    const lastBusinessDay = new Date(today)
    lastBusinessDay.setDate(today.getDate() - daysToSubtract)
    
    return lastBusinessDay.toISOString().split('T')[0] as string
  }
} 