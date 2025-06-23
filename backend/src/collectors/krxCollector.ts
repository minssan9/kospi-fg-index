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

export interface KOSDAQData {
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
  private static readonly BASE_URL = 'https://openapi.koreainvestment.com:9443'
  private static readonly APP_KEY = process.env.KIS_API_KEY || ''
  private static readonly APP_SECRET = process.env.KIS_API_SECRET || ''
  private static readonly TIMEOUT = 10000
  private static readonly CUSTOMER_TYPE = 'P' // 개인
  private static accessToken: string | null = null

  /**
   * KIS API 접근 토큰 발급
   */
  private static async issueAccessToken(): Promise<void> {
    try {
      if (!this.APP_KEY || !this.APP_SECRET) {
        throw new Error('KIS API Key or Secret is not set in environment variables.')
      }

      const response = await axios.post(
        `${this.BASE_URL}/oauth2/tokenP`,
        {
          grant_type: 'client_credentials',
          appkey: this.APP_KEY,
          appsecret: this.APP_SECRET,
        },
        {
          headers: { 'content-type': 'application/json' },
          timeout: this.TIMEOUT,
        }
      )

      const token = response.data?.access_token
      if (!token) {
        throw new Error('Failed to retrieve access token from KIS API.')
      }
      this.accessToken = token
      console.log('[KIS] Access token issued successfully.')
    } catch (error) {
      const errorMessage = `[KIS] Access token issuance failed: ${
        (error as any).response?.data?.msg1 || (error as any).message
      }`
      console.error(errorMessage)
      throw new Error(errorMessage)
    }
  }

  /**
   * 유효한 접근 토큰 반환 (없으면 발급)
   */
  private static async getAccessToken(): Promise<string> {
    // For production, you should handle token expiration and refresh.
    // Here we fetch it once if it's not available.
    if (!this.accessToken) {
      await this.issueAccessToken()
    }
    return this.accessToken!
  }

  private static async getHeaders(tr_id: string) {
    const accessToken = await this.getAccessToken()
    return {
      'content-type': 'application/json',
      authorization: `Bearer ${accessToken}`,
      appkey: this.APP_KEY,
      appsecret: this.APP_SECRET,
      tr_id: tr_id,
      custtype: this.CUSTOMER_TYPE,
    }
  }

  /**
   * KOSPI 지수 데이터 수집 (KIS OpenAPI)
   */
  static async fetchKOSPIData(date: string): Promise<KOSPIData> {
    try {
      const response = await axios.get(
        `${this.BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-price`,
        {
          params: {
            fid_cond_mrkt_div_code: 'U',
            fid_input_iscd: '0001', // KOSPI
          }, 
          headers: await this.getHeaders('FHPUP02100000'),
          timeout: this.TIMEOUT,
        }
      )
      const data = response.data?.output
      if (!data) throw new Error('No KOSPI data returned')
      return {
        date,
        index: parseFloat(data.stck_prpr), // 현재가
        change: parseFloat(data.prdy_vrss), // 전일대비
        changePercent: parseFloat(data.prdy_ctrt), // 등락률
        volume: parseInt(data.acml_vol), // 누적거래량
        value: parseInt(data.acml_tr_pbmn), // 누적거래대금
      }
    } catch (error) {
      const errorMessage = `[KIS] KOSPI 데이터 수집 실패 (${date}): ${(error as any)?.message}`
      console.error(errorMessage)
      throw new Error(errorMessage)
    }
  }

  /**
   * KOSDAQ 지수 데이터 수집 (KIS OpenAPI)
   */
  static async fetchKOSDAQData(date: string): Promise<KOSDAQData> {
    try {
      const response = await axios.get(
        `${this.BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-price`,
        {
          params: {
            fid_cond_mrkt_div_code: 'U',
            fid_input_iscd: '1001', // KOSDAQ
          }, 
          headers: await this.getHeaders('FHPUP02100000'),
          timeout: this.TIMEOUT,
        }
      )
      const data = response.data?.output
      if (!data) throw new Error('No KOSDAQ data returned')
      return {
        date,
        index: parseFloat(data.stck_prpr), // 현재가
        change: parseFloat(data.prdy_vrss), // 전일대비
        changePercent: parseFloat(data.prdy_ctrt), // 등락률
        volume: parseInt(data.acml_vol), // 누적거래량
        value: parseInt(data.acml_tr_pbmn), // 누적거래대금
      }
    } catch (error) {
      const errorMessage = `[KIS] KOSDAQ 데이터 수집 실패 (${date}): ${(error as any)?.message}`
      console.error(errorMessage)
      throw new Error(errorMessage)
    }
  }

  /**
   * 투자자별 매매동향 데이터 수집 (KIS OpenAPI)
   */
  static async fetchInvestorTradingData(
    date: string,
    market: 'KOSPI' | 'KOSDAQ' = 'KOSPI'
  ): Promise<InvestorTradingData> {
    const marketCode = market === 'KOSPI' ? '0001' : '1001'
    const marketName = market

    try {
      const response = await axios.get(
        `${this.BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-investor-time-by-market`,
        {
          params: {
            fid_cond_mrkt_div_code: 'J',
            fid_input_iscd: marketCode,
            fid_input_date_1: date.replace(/-/g, ''),
            fid_input_date_2: date.replace(/-/g, ''),
            fid_vol_cnt_gb_cd: '1', // 1: 수량, 2: 금액
          },
          headers: await this.getHeaders('FHPTJ04030000'),
          timeout: this.TIMEOUT,
        }
      )
      const data = response.data?.output1[0] // output1 is an array
      if (!data) throw new Error(`No investor trading data returned for ${marketName}`)
      
      // KIS API는 순매수/순매도량을 제공, 우리는 매수/매도를 분리해야 함
      // 여기서는 순매수량을 각 'buying' 필드에, 0을 'selling' 필드에 할당
      // 이는 완벽한 데이터는 아니지만, Fear & Greed Index 계산 로직과 호환됨
      // 순매수량 (양수: 순매수, 음수: 순매도)
      const foreignNet = parseInt(data.frgn_ntby_qty || '0')
      const individualNet = parseInt(data.prsn_ntby_qty || '0')
      const institutionalNet = parseInt(data.orgn_ntby_qty || '0')

      return {
        date,
        foreignBuying: foreignNet > 0 ? foreignNet : 0,
        foreignSelling: foreignNet < 0 ? -foreignNet : 0,
        individualBuying: individualNet > 0 ? individualNet : 0,
        individualSelling: individualNet < 0 ? -individualNet : 0,
        institutionalBuying: institutionalNet > 0 ? institutionalNet : 0,
        institutionalSelling: institutionalNet < 0 ? -institutionalNet : 0,
      }
    } catch (error) {
      const errorMessage = `[KIS] ${marketName} 투자자별 매매동향 수집 실패 (${date}): ${
        (error as any)?.message
      }`
      console.error(errorMessage)
      throw new Error(errorMessage)
    }
  }

  /**
   * 옵션 Put/Call 비율 데이터 수집 (Not supported in KIS OpenAPI)
   */
  static async fetchOptionData(date: string): Promise<OptionData> {
    throw new Error('Option data (Put/Call ratio) is not supported by Korea Investment & Securities Open API.')
  }

  /**
   * 최근 영업일 확인 (주말, 공휴일 제외)
   */
  static getLastBusinessDay(): string {
    const today = new Date()
    const day = today.getDay()
    let daysToSubtract = 1
    if (day === 1) daysToSubtract = 3
    else if (day === 0) daysToSubtract = 2
    else if (day === 6) daysToSubtract = 1
    const lastBusinessDay = new Date(today)
    lastBusinessDay.setDate(today.getDate() - daysToSubtract)
    return lastBusinessDay.toISOString().split('T')[0] as string
  }
} 