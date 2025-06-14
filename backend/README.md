# KOSPI Fear & Greed Index Backend

한국 주식시장(KOSPI)의 Fear & Greed Index를 계산하고 제공하는 백엔드 시스템입니다.

## 🎯 주요 기능

### 📊 Fear & Greed Index 계산
- **5가지 구성요소**를 기반으로 한 종합적인 시장 심리 지수
- 0-100 범위의 점수와 5단계 레벨 분류
- 실시간 신뢰도 평가 시스템

### 📈 데이터 수집 시스템
- **KRX (한국거래소)**: KOSPI 지수, 투자자별 매매동향, 옵션 데이터
- **BOK (한국은행)**: 금리, 환율, 경제지표 데이터
- 자동화된 일일 데이터 수집 스케줄러

### 🔄 API 서비스
- RESTful API를 통한 데이터 제공
- 실시간 지수 조회 및 히스토리 데이터
- 관리자용 수동 데이터 수집 기능

## 🏗️ 시스템 아키텍처

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Data Sources  │    │   Collectors    │    │   Calculator    │
│                 │    │                 │    │                 │
│ • KRX API       │───▶│ • KRXCollector  │───▶│ FearGreedCalc   │
│ • BOK API       │    │ • BOKCollector  │    │                 │
│ • Public APIs   │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
┌─────────────────┐    ┌─────────────────┐             │
│   Database      │    │   API Server    │             │
│                 │    │                 │             │
│ • MySQL/Prisma  │◀───│ • Express.js    │◀────────────┘
│ • Data Models   │    │ • REST APIs     │
│ • Logging       │    │ • Middleware    │
└─────────────────┘    └─────────────────┘
```

## 📋 Fear & Greed Index 구성요소

| 구성요소 | 가중치 | 설명 |
|---------|--------|------|
| **주가 모멘텀** | 25% | KOSPI 지수의 이동평균 분석 |
| **투자자 심리** | 25% | 외국인/개인/기관 매매 흐름 |
| **Put/Call 비율** | 20% | 옵션 시장의 풋/콜 거래 비율 |
| **변동성 지수** | 15% | VKOSPI 또는 역사적 변동성 |
| **안전자산 수요** | 15% | 국채 수익률 커브 분석 |

### 지수 레벨 분류
- **0-20**: Extreme Fear (극도의 공포)
- **21-40**: Fear (공포)
- **41-60**: Neutral (중립)
- **61-80**: Greed (탐욕)
- **81-100**: Extreme Greed (극도의 탐욕)

## 🚀 설치 및 실행

### 1. 환경 설정

```bash
# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env
```

### 2. 환경 변수 설정 (.env)

```env
# 데이터베이스
DATABASE_URL="mysql://username:password@localhost:3306/kospi_fg_index"

# API 키
BOK_API_KEY="your_bok_api_key_here"
KRX_API_KEY="your_krx_api_key_here"

# 서버 설정
PORT=3000
NODE_ENV=development

# 보안 설정
CORS_ENABLED=true
HELMET_ENABLED=true
ALLOWED_ORIGINS="http://localhost:8080,http://localhost:3000"
```

### 3. 데이터베이스 설정

```bash
# Prisma 마이그레이션
npx prisma migrate dev

# Prisma 클라이언트 생성
npx prisma generate
```

### 4. 서버 실행

```bash
# 개발 모드
npm run dev

# 프로덕션 빌드
npm run build
npm start
```

## 🧪 테스트

### 기본 시스템 테스트
```bash
npm run test:basic
```

### 데이터 수집기 테스트
```bash
npm run test:collectors
```

### 전체 시스템 테스트
```bash
npm run test:system
```

## 📡 API 엔드포인트

### Fear & Greed Index

#### 최신 지수 조회
```http
GET /api/fear-greed/latest
```

**응답 예시:**
```json
{
  "success": true,
  "data": {
    "date": "2024-01-15",
    "value": 53,
    "level": "Neutral",
    "confidence": 85,
    "components": {
      "priceMomentum": 65,
      "investorSentiment": 45,
      "putCallRatio": 60,
      "volatilityIndex": 40,
      "safeHavenDemand": 50
    },
    "updatedAt": "2024-01-15T18:00:00.000Z"
  }
}
```

#### 히스토리 조회
```http
GET /api/fear-greed/history?days=30
```

### 시장 데이터

#### 최신 KOSPI 데이터
```http
GET /api/market/kospi/latest
```

### 시스템 관리

#### 시스템 상태 조회
```http
GET /api/system/status
```

#### 수동 데이터 수집 (관리자)
```http
POST /api/admin/collect-data
Content-Type: application/json

{
  "date": "2024-01-15",
  "sources": ["KRX", "BOK"]
}
```

#### Fear & Greed Index 수동 계산 (관리자)
```http
POST /api/admin/calculate-index
Content-Type: application/json

{
  "date": "2024-01-15"
}
```

## ⏰ 자동화 스케줄

시스템은 다음 일정으로 자동 데이터 수집을 수행합니다:

- **06:00 (평일)**: BOK 경제 데이터 수집
- **15:45 (평일)**: KRX 시장 데이터 수집
- **18:00 (평일)**: Fear & Greed Index 계산
- **00:00 (매일)**: 시스템 유지보수

### 수동 스케줄러 제어

```bash
# 스케줄러 시작
npm run start:scheduler

# 특정 날짜 데이터 수집
npm run collect:data

# 과거 데이터 수집
npm run collect:historical
```

## 🗄️ 데이터베이스 스키마

### 주요 테이블

- **fear_greed_index**: Fear & Greed Index 일일 데이터
- **kospi_data**: KOSPI 지수 데이터
- **investor_trading**: 투자자별 매매동향
- **option_data**: 옵션 거래 데이터
- **interest_rate_data**: 금리 데이터
- **exchange_rate_data**: 환율 데이터
- **economic_indicator_data**: 경제지표 데이터
- **data_collection_log**: 데이터 수집 로그

## 🔧 개발 도구

### 코드 품질
```bash
# 린팅
npm run lint
npm run lint:fix

# 테스트 커버리지
npm run test:coverage
```

### 데이터베이스 관리
```bash
# Prisma Studio (GUI)
npx prisma studio

# 데이터베이스 리셋
npx prisma migrate reset
```

## 📊 모니터링 및 로깅

### 로그 레벨
- **INFO**: 일반적인 시스템 동작
- **WARN**: 주의가 필요한 상황
- **ERROR**: 오류 및 예외 상황

### 성능 메트릭
- 데이터 수집 소요 시간
- API 응답 시간
- 메모리 사용량
- 데이터베이스 연결 상태

## 🚨 문제 해결

### 일반적인 문제

#### 1. 데이터베이스 연결 실패
```bash
# 데이터베이스 상태 확인
npx prisma db push

# 연결 테스트
npm run test:basic
```

#### 2. API 키 오류
- `.env` 파일의 API 키 확인
- BOK/KRX API 키 유효성 검증

#### 3. 데이터 수집 실패
```bash
# 수집기 개별 테스트
npm run test:collectors

# 로그 확인
tail -f logs/application.log
```

## 🔐 보안 고려사항

- API 키는 환경 변수로 관리
- CORS 설정으로 허용된 도메인만 접근
- Helmet.js를 통한 보안 헤더 설정
- Rate limiting으로 API 남용 방지

## 📈 성능 최적화

- 데이터베이스 인덱싱
- API 응답 캐싱
- 병렬 데이터 수집
- 메모리 사용량 최적화

## 🤝 기여 가이드

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 라이선스

MIT License

## 📞 지원

문제가 발생하거나 질문이 있으시면 이슈를 생성해 주세요.

---

**개발자**: KOSPI Fear & Greed Index Team  
**버전**: 1.0.0  
**최종 업데이트**: 2024년 1월 