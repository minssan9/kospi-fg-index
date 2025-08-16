import axios from 'axios'
import type { krxStockData, InvestorTradingData, OptionData } from '@/types/collectors/krxTypes'

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
   * KRX 지수 데이터 수집 (KIS OpenAPI, KOSPI/KOSDAQ)
   */
  static async fetchKRXStockData(date: string, market: 'KOSPI' | 'KOSDAQ'): Promise<krxStockData> {
    const marketCode = market === 'KOSPI' ? '0001' : '1001'
    try {
      const response = await axios.get(
        `${this.BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-price`,
        {
          params: {
            fid_cond_mrkt_div_code: 'U',
            fid_input_iscd: marketCode,
          },
          headers: await this.getHeaders('FHPUP02100000'),
          timeout: this.TIMEOUT,
        }
      )
      const data = response.data?.output
      if (!data) throw new Error(`No ${market} data returned`)
      return {
        date,
        iscd_stat_cls_code: data.iscd_stat_cls_code ?? '',
        marg_rate: data.marg_rate ?? '',
        rprs_mrkt_kor_name: data.rprs_mrkt_kor_name ?? '',
        new_hgpr_lwpr_cls_code: data.new_hgpr_lwpr_cls_code ?? '',
        bstp_kor_isnm: data.bstp_kor_isnm ?? '',
        temp_stop_yn: data.temp_stop_yn ?? '',
        oprc_rang_cont_yn: data.oprc_rang_cont_yn ?? '',
        clpr_rang_cont_yn: data.clpr_rang_cont_yn ?? '',
        crdt_able_yn: data.crdt_able_yn ?? '',
        grmn_rate_cls_code: data.grmn_rate_cls_code ?? '',
        elw_pblc_yn: data.elw_pblc_yn ?? '',
        stck_prpr: data.stck_prpr ?? '',
        prdy_vrss: data.prdy_vrss ?? '',
        prdy_vrss_sign: data.prdy_vrss_sign ?? '',
        prdy_ctrt: data.prdy_ctrt ?? '',
        acml_tr_pbmn: data.acml_tr_pbmn ?? '',
        acml_vol: data.acml_vol ?? '',
        prdy_vrss_vol_rate: data.prdy_vrss_vol_rate ?? '',
        stck_oprc: data.stck_oprc ?? '',
        stck_hgpr: data.stck_hgpr ?? '',
        stck_lwpr: data.stck_lwpr ?? '',
        stck_mxpr: data.stck_mxpr ?? '',
        stck_llam: data.stck_llam ?? '',
        stck_sdpr: data.stck_sdpr ?? '',
        wghn_avrg_stck_prc: data.wghn_avrg_stck_prc ?? '',
        hts_frgn_ehrt: data.hts_frgn_ehrt ?? '',
        frgn_ntby_qty: data.frgn_ntby_qty ?? '',
        pgtr_ntby_qty: data.pgtr_ntby_qty ?? '',
        pvt_scnd_dmrs_prc: data.pvt_scnd_dmrs_prc ?? '',
        pvt_frst_dmrs_prc: data.pvt_frst_dmrs_prc ?? '',
        pvt_pont_val: data.pvt_pont_val ?? '',
        pvt_frst_dmsp_prc: data.pvt_frst_dmsp_prc ?? '',
        pvt_scnd_dmsp_prc: data.pvt_scnd_dmsp_prc ?? '',
        dmrs_val: data.dmrs_val ?? '',
        dmsp_val: data.dmsp_val ?? '',
        cpfn: data.cpfn ?? '',
        rstc_wdth_prc: data.rstc_wdth_prc ?? '',
        stck_fcam: data.stck_fcam ?? '',
        stck_sspr: data.stck_sspr ?? '',
        aspr_unit: data.aspr_unit ?? '',
        hts_deal_qty_unit_val: data.hts_deal_qty_unit_val ?? '',
        lstn_stcn: data.lstn_stcn ?? '',
        hts_avls: data.hts_avls ?? '',
        per: data.per ?? '',
        pbr: data.pbr ?? '',
        stac_month: data.stac_month ?? '',
        vol_tnrt: data.vol_tnrt ?? '',
        eps: data.eps ?? '',
        bps: data.bps ?? '',
        d250_hgpr: data.d250_hgpr ?? '',
        d250_hgpr_date: data.d250_hgpr_date ?? '',
        d250_hgpr_vrss_prpr_rate: data.d250_hgpr_vrss_prpr_rate ?? '',
        d250_lwpr: data.d250_lwpr ?? '',
        d250_lwpr_date: data.d250_lwpr_date ?? '',
        d250_lwpr_vrss_prpr_rate: data.d250_lwpr_vrss_prpr_rate ?? '',
        stck_dryy_hgpr: data.stck_dryy_hgpr ?? '',
        dryy_hgpr_vrss_prpr_rate: data.dryy_hgpr_vrss_prpr_rate ?? '',
        dryy_hgpr_date: data.dryy_hgpr_date ?? '',
        stck_dryy_lwpr: data.stck_dryy_lwpr ?? '',
        dryy_lwpr_vrss_prpr_rate: data.dryy_lwpr_vrss_prpr_rate ?? '',
        dryy_lwpr_date: data.dryy_lwpr_date ?? '',
        w52_hgpr: data.w52_hgpr ?? '',
        w52_hgpr_vrss_prpr_ctrt: data.w52_hgpr_vrss_prpr_ctrt ?? '',
        w52_hgpr_date: data.w52_hgpr_date ?? '',
        w52_lwpr: data.w52_lwpr ?? '',
        w52_lwpr_vrss_prpr_ctrt: data.w52_lwpr_vrss_prpr_ctrt ?? '',
        w52_lwpr_date: data.w52_lwpr_date ?? '',
        whol_loan_rmnd_rate: data.whol_loan_rmnd_rate ?? '',
        ssts_yn: data.ssts_yn ?? '',
        stck_shrn_iscd: data.stck_shrn_iscd ?? '',
        fcam_cnnm: data.fcam_cnnm ?? '',
        cpfn_cnnm: data.cpfn_cnnm ?? '',
        apprch_rate: data.apprch_rate ?? '',
        frgn_hldn_qty: data.frgn_hldn_qty ?? '',
        vi_cls_code: data.vi_cls_code ?? '',
        ovtm_vi_cls_code: data.ovtm_vi_cls_code ?? '',
        last_ssts_cntg_qty: data.last_ssts_cntg_qty ?? '',
        invt_caful_yn: data.invt_caful_yn ?? '',
        mrkt_warn_cls_code: data.mrkt_warn_cls_code ?? '',
        short_over_yn: data.short_over_yn ?? '',
        sltr_yn: data.sltr_yn ?? '',
        mang_issu_cls_code: data.mang_issu_cls_code ?? ''
      }
    } catch (error) {
      const errorMessage = `[KIS] ${market} 데이터 수집 실패 (${date}): ${(error as any)?.message}`
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

      return {
        date,
        frgn_seln_vol: data.frgn_seln_vol ?? '',
        frgn_shnu_vol: data.frgn_shnu_vol ?? '',
        frgn_ntby_qty: data.frgn_ntby_qty ?? '',
        frgn_seln_tr_pbmn: data.frgn_seln_tr_pbmn ?? '',
        frgn_shnu_tr_pbmn: data.frgn_shnu_tr_pbmn ?? '',
        frgn_ntby_tr_pbmn: data.frgn_ntby_tr_pbmn ?? '',
        prsn_seln_vol: data.prsn_seln_vol ?? '',
        prsn_shnu_vol: data.prsn_shnu_vol ?? '',
        prsn_ntby_qty: data.prsn_ntby_qty ?? '',
        prsn_seln_tr_pbmn: data.prsn_seln_tr_pbmn ?? '',
        prsn_shnu_tr_pbmn: data.prsn_shnu_tr_pbmn ?? '',
        prsn_ntby_tr_pbmn: data.prsn_ntby_tr_pbmn ?? '',
        orgn_seln_vol: data.orgn_seln_vol ?? '',
        orgn_shnu_vol: data.orgn_shnu_vol ?? '',
        orgn_ntby_qty: data.orgn_ntby_qty ?? '',
        orgn_seln_tr_pbmn: data.orgn_seln_tr_pbmn ?? '',
        orgn_shnu_tr_pbmn: data.orgn_shnu_tr_pbmn ?? '',
        orgn_ntby_tr_pbmn: data.orgn_ntby_tr_pbmn ?? '',
        scrt_seln_vol: data.scrt_seln_vol ?? '',
        scrt_shnu_vol: data.scrt_shnu_vol ?? '',
        scrt_ntby_qty: data.scrt_ntby_qty ?? '',
        scrt_seln_tr_pbmn: data.scrt_seln_tr_pbmn ?? '',
        scrt_shnu_tr_pbmn: data.scrt_shnu_tr_pbmn ?? '',
        scrt_ntby_tr_pbmn: data.scrt_ntby_tr_pbmn ?? '',
        ivtr_seln_vol: data.ivtr_seln_vol ?? '',
        ivtr_shnu_vol: data.ivtr_shnu_vol ?? '',
        ivtr_ntby_qty: data.ivtr_ntby_qty ?? '',
        ivtr_seln_tr_pbmn: data.ivtr_seln_tr_pbmn ?? '',
        ivtr_shnu_tr_pbmn: data.ivtr_shnu_tr_pbmn ?? '',
        ivtr_ntby_tr_pbmn: data.ivtr_ntby_tr_pbmn ?? '',
        pe_fund_seln_tr_pbmn: data.pe_fund_seln_tr_pbmn ?? '',
        pe_fund_seln_vol: data.pe_fund_seln_vol ?? '',
        pe_fund_ntby_vol: data.pe_fund_ntby_vol ?? '',
        pe_fund_shnu_tr_pbmn: data.pe_fund_shnu_tr_pbmn ?? '',
        pe_fund_shnu_vol: data.pe_fund_shnu_vol ?? '',
        pe_fund_ntby_tr_pbmn: data.pe_fund_ntby_tr_pbmn ?? '',
        bank_seln_vol: data.bank_seln_vol ?? '',
        bank_shnu_vol: data.bank_shnu_vol ?? '',
        bank_ntby_qty: data.bank_ntby_qty ?? '',
        bank_seln_tr_pbmn: data.bank_seln_tr_pbmn ?? '',
        bank_shnu_tr_pbmn: data.bank_shnu_tr_pbmn ?? '',
        bank_ntby_tr_pbmn: data.bank_ntby_tr_pbmn ?? '',
        insu_seln_vol: data.insu_seln_vol ?? '',
        insu_shnu_vol: data.insu_shnu_vol ?? '',
        insu_ntby_qty: data.insu_ntby_qty ?? '',
        insu_seln_tr_pbmn: data.insu_seln_tr_pbmn ?? '',
        insu_shnu_tr_pbmn: data.insu_shnu_tr_pbmn ?? '',
        insu_ntby_tr_pbmn: data.insu_ntby_tr_pbmn ?? '',
        mrbn_seln_vol: data.mrbn_seln_vol ?? '',
        mrbn_shnu_vol: data.mrbn_shnu_vol ?? '',
        mrbn_ntby_qty: data.mrbn_ntby_qty ?? '',
        mrbn_seln_tr_pbmn: data.mrbn_seln_tr_pbmn ?? '',
        mrbn_shnu_tr_pbmn: data.mrbn_shnu_tr_pbmn ?? '',
        mrbn_ntby_tr_pbmn: data.mrbn_ntby_tr_pbmn ?? '',
        fund_seln_vol: data.fund_seln_vol ?? '',
        fund_shnu_vol: data.fund_shnu_vol ?? '',
        fund_ntby_qty: data.fund_ntby_qty ?? '',
        fund_seln_tr_pbmn: data.fund_seln_tr_pbmn ?? '',
        fund_shnu_tr_pbmn: data.fund_shnu_tr_pbmn ?? '',
        fund_ntby_tr_pbmn: data.fund_ntby_tr_pbmn ?? '',
        etc_orgt_seln_vol: data.etc_orgt_seln_vol ?? '',
        etc_orgt_shnu_vol: data.etc_orgt_shnu_vol ?? '',
        etc_orgt_ntby_vol: data.etc_orgt_ntby_vol ?? '',
        etc_orgt_seln_tr_pbmn: data.etc_orgt_seln_tr_pbmn ?? '',
        etc_orgt_shnu_tr_pbmn: data.etc_orgt_shnu_tr_pbmn ?? '',
        etc_orgt_ntby_tr_pbmn: data.etc_orgt_ntby_tr_pbmn ?? '',
        etc_corp_seln_vol: data.etc_corp_seln_vol ?? '',
        etc_corp_shnu_vol: data.etc_corp_shnu_vol ?? '',
        etc_corp_ntby_vol: data.etc_corp_ntby_vol ?? '',
        etc_corp_seln_tr_pbmn: data.etc_corp_seln_tr_pbmn ?? '',
        etc_corp_shnu_tr_pbmn: data.etc_corp_shnu_tr_pbmn ?? '',
        etc_corp_ntby_tr_pbmn: data.etc_corp_ntby_tr_pbmn ?? '',
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
   * 특정 날짜의 모든 KRX 데이터 수집
   */
  static async collectDailyData(date: string): Promise<{
    kospiData: krxStockData | null
    kosdaqData: krxStockData | null
    kospiInvestorTrading: InvestorTradingData | null
    kosdaqInvestorTrading: InvestorTradingData | null
  }> {
    console.log(`[KRX] ${date} 일일 데이터 수집 시작`)
    
    const results = {
      kospiData: null as krxStockData | null,
      kosdaqData: null as krxStockData | null,
      kospiInvestorTrading: null as InvestorTradingData | null,
      kosdaqInvestorTrading: null as InvestorTradingData | null
    }

    try {
      // KOSPI 지수 데이터 수집
      try {
        results.kospiData = await this.fetchKRXStockData(date, 'KOSPI')
        console.log(`[KRX] KOSPI 지수 데이터 수집 완료: ${date}`)
      } catch (error) {
        console.error(`[KRX] KOSPI 지수 데이터 수집 실패 (${date}):`, (error as any)?.message)
      }

      // KOSDAQ 지수 데이터 수집
      try {
        results.kosdaqData = await this.fetchKRXStockData(date, 'KOSDAQ')
        console.log(`[KRX] KOSDAQ 지수 데이터 수집 완료: ${date}`)
      } catch (error) {
        console.error(`[KRX] KOSDAQ 지수 데이터 수집 실패 (${date}):`, (error as any)?.message)
      }

      // KOSPI 투자자별 매매동향 수집
      try {
        results.kospiInvestorTrading = await this.fetchInvestorTradingData(date, 'KOSPI')
        console.log(`[KRX] KOSPI 투자자별 매매동향 수집 완료: ${date}`)
      } catch (error) {
        console.error(`[KRX] KOSPI 투자자별 매매동향 수집 실패 (${date}):`, (error as any)?.message)
      }

      // KOSDAQ 투자자별 매매동향 수집
      try {
        results.kosdaqInvestorTrading = await this.fetchInvestorTradingData(date, 'KOSDAQ')
        console.log(`[KRX] KOSDAQ 투자자별 매매동향 수집 완료: ${date}`)
      } catch (error) {
        console.error(`[KRX] KOSDAQ 투자자별 매매동향 수집 실패 (${date}):`, (error as any)?.message)
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
    let daysToSubtract = 1
    if (day === 1) daysToSubtract = 3
    else if (day === 0) daysToSubtract = 2
    else if (day === 6) daysToSubtract = 1
    const lastBusinessDay = new Date(today)
    lastBusinessDay.setDate(today.getDate() - daysToSubtract)
    return lastBusinessDay.toISOString().split('T')[0] as string
  }
} 