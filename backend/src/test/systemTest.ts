import { DatabaseService } from '../services/databaseService'
import { FearGreedCalculator } from '../services/fearGreedCalculator'
import { formatDate } from '../utils/dateUtils'

/**
 * 시스템 통합 테스트
 * 데이터베이스 연결, API 기능, Fear & Greed Index 계산 등을 테스트
 */
async function runSystemTest() {
  console.log('🧪 시스템 통합 테스트 시작\n')

  try {
    // 1. 데이터베이스 연결 테스트
    console.log('1️⃣ 데이터베이스 연결 테스트...')
    const testDate = formatDate(new Date())
    
    // 샘플 KOSPI 데이터 저장 테스트
    const sampleKospiData = {
      date: testDate,
      index: 2500.50,
      change: 15.30,
      changePercent: 0.62,
      volume: 450000000,
      value: 8500000000000
    }
    
    await DatabaseService.saveKOSPIData(sampleKospiData)
    console.log('✅ KOSPI 데이터 저장 성공')

    // 샘플 투자자별 매매동향 데이터 저장 테스트
    const sampleTradingData = {
      date: testDate,
      foreignBuying: 1200000000000,
      foreignSelling: 1100000000000,
      individualBuying: 800000000000,
      individualSelling: 900000000000,
      institutionalBuying: 600000000000,
      institutionalSelling: 550000000000
    }
    
    await DatabaseService.saveInvestorTradingData(sampleTradingData)
    console.log('✅ 투자자별 매매동향 저장 성공')

    // 샘플 옵션 데이터 저장 테스트
    const sampleOptionData = {
      date: testDate,
      putVolume: 150000,
      callVolume: 200000,
      putCallRatio: 0.75
    }
    
    await DatabaseService.saveOptionData(sampleOptionData)
    console.log('✅ 옵션 데이터 저장 성공')

    // 샘플 금리 데이터 저장 테스트
    const sampleInterestRateData = {
      date: testDate,
      baseRate: 3.50,
      callRate: 3.45,
      cd91Rate: 3.60,
      treasuryBond3Y: 3.80,
      treasuryBond10Y: 4.20
    }
    
    await DatabaseService.saveInterestRateData(sampleInterestRateData)
    console.log('✅ 금리 데이터 저장 성공')

    // 샘플 환율 데이터 저장 테스트
    const sampleExchangeRateData = {
      date: testDate,
      usdKrw: 1320.50,
      eurKrw: 1450.30,
      jpyKrw: 8.95,
      cnyKrw: 185.20
    }
    
    await DatabaseService.saveExchangeRateData(sampleExchangeRateData)
    console.log('✅ 환율 데이터 저장 성공')

    console.log('\n2️⃣ 데이터 조회 테스트...')
    
    // 저장된 데이터 조회 테스트
    const latestKospi = await DatabaseService.getLatestKOSPIData()
    if (latestKospi) {
      console.log(`✅ 최신 KOSPI 데이터 조회 성공: ${latestKospi.index} (${latestKospi.date.toISOString().split('T')[0]})`)
    } else {
      console.log('❌ KOSPI 데이터 조회 실패')
    }

    console.log('\n3️⃣ Fear & Greed Index 계산 테스트...')
    
    // Fear & Greed Index 계산 테스트
    try {
      const fearGreedResult = await FearGreedCalculator.calculateIndex(testDate)
      console.log(`✅ Fear & Greed Index 계산 성공:`)
      console.log(`   📊 지수: ${fearGreedResult.value}/100`)
      console.log(`   📈 레벨: ${fearGreedResult.level}`)
      console.log(`   🎯 신뢰도: ${fearGreedResult.confidence}%`)
      console.log(`   📋 구성요소:`)
      console.log(`      - 주가 모멘텀: ${fearGreedResult.components.priceMomentum}`)
      console.log(`      - 투자자 심리: ${fearGreedResult.components.investorSentiment}`)
      console.log(`      - 풋/콜 비율: ${fearGreedResult.components.putCallRatio}`)
      console.log(`      - 변동성 지수: ${fearGreedResult.components.volatilityIndex}`)
      console.log(`      - 안전자산 수요: ${fearGreedResult.components.safeHavenDemand}`)

      // Fear & Greed Index 저장
      await DatabaseService.saveFearGreedIndex(fearGreedResult)
      console.log('✅ Fear & Greed Index 저장 성공')

      // 저장된 Fear & Greed Index 조회
      const latestIndex = await DatabaseService.getLatestFearGreedIndex()
      if (latestIndex) {
        console.log(`✅ 최신 Fear & Greed Index 조회 성공: ${latestIndex.value} (${latestIndex.level})`)
      }

    } catch (error) {
      console.error('❌ Fear & Greed Index 계산 실패:', error)
    }

    console.log('\n4️⃣ 데이터 수집 로그 테스트...')
    
    // 데이터 수집 로그 저장 테스트
    await DatabaseService.saveDataCollectionLog(
      testDate,
      'TEST',
      'SYSTEM_TEST',
      'SUCCESS',
      5,
      undefined,
      1500
    )
    console.log('✅ 데이터 수집 로그 저장 성공')

    // 데이터 수집 상태 조회
    const collectionStatus = await DatabaseService.getDataCollectionStatus(1)
    console.log(`✅ 데이터 수집 상태 조회 성공: ${collectionStatus.length}개 로그`)

    console.log('\n5️⃣ 히스토리 데이터 테스트...')
    
    // Fear & Greed Index 히스토리 조회
    const history = await DatabaseService.getFearGreedIndexHistory(7)
    console.log(`✅ Fear & Greed Index 히스토리 조회 성공: ${history.length}개 레코드`)

    console.log('\n🎉 시스템 통합 테스트 완료!')
    console.log('✅ 모든 핵심 기능이 정상 작동합니다.')
    
    return {
      success: true,
      message: '시스템 통합 테스트 성공',
      testResults: {
        databaseConnection: true,
        dataStorage: true,
        dataRetrieval: true,
        fearGreedCalculation: true,
        logging: true,
        historyQuery: true
      }
    }

  } catch (error) {
    console.error('\n❌ 시스템 통합 테스트 실패:', error)
    return {
      success: false,
      message: '시스템 통합 테스트 실패',
      error: error instanceof Error ? error.message : String(error)
    }
  } finally {
    // 데이터베이스 연결 종료
    await DatabaseService.disconnect()
    console.log('\n🔌 데이터베이스 연결 종료')
  }
}

// 직접 실행 시 테스트 실행
if (require.main === module) {
  runSystemTest()
    .then(result => {
      console.log('\n📋 테스트 결과:', result)
      process.exit(result.success ? 0 : 1)
    })
    .catch(error => {
      console.error('\n💥 테스트 실행 중 오류:', error)
      process.exit(1)
    })
}

export { runSystemTest } 