# 🇰🇷 KOSPI Fear & Greed Index

> KOSPI 시장의 투자자 심리를 종합적으로 분석하는 Fear & Greed Index 웹 애플리케이션

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node.js](https://img.shields.io/badge/node.js-18+-green.svg)
![Vue](https://img.shields.io/badge/vue-3.x-brightgreen.svg)
![TypeScript](https://img.shields.io/badge/typescript-5.x-blue.svg)

## 📊 프로젝트 개요

**KOSPI Fear & Greed Index**는 한국 주식시장(KOSPI)의 투자자 심리를 종합적으로 분석하여 0-100 스케일의 지수로 시각화하는 웹 애플리케이션입니다. CNN Fear & Greed Index를 참고하여 한국 시장에 특화된 지표들을 활용해 자체적인 심리지수를 산출합니다.

### ✨ 주요 기능

- 📈 **일별 Fear & Greed Index 산출 및 시각화**
- 📊 **실시간 시장 데이터 기반 종합 분석**
- 📱 **반응형 웹 디자인** (모바일, 태블릿, 데스크톱)
- 🎯 **직관적인 차트 및 대시보드**
- 💰 **Google AdSense 수익화**
- 🔄 **자동 데이터 수집 시스템**

## 🏗 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (Vue 3)                        │
│              Quasar + Chart.js + Pinia + AdSense               │
└─────────────────────────────────────────────────────────────────┘
                                │
                        HTTPS/REST API
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Backend (Node.js)                          │
│            Express + TypeScript + PostgreSQL                   │
└─────────────────────────────────────────────────────────────────┘
                                │
                ┌───────────────┼───────────────┐
                ▼               ▼               ▼
    ┌───────────────┐  ┌─────────────────┐  ┌─────────────────┐
    │ Data Collector│  │   Database      │  │  External APIs  │
    │  (Scheduler)  │  │ (PostgreSQL)    │  │  (KRX, BOK)     │
    └───────────────┘  └─────────────────┘  └─────────────────┘
```

## 🎯 Fear & Greed Index 구성 요소

### 📊 지표 구성 (가중치)

1. **주가 모멘텀** (25%) - KOSPI 지수 변화율 및 이동평균 분석
2. **투자자 심리** (25%) - 개인/외국인/기관 투자자 매매 동향  
3. **풋/콜 비율** (20%) - KOSPI200 옵션 풋/콜 거래 비율
4. **변동성 지수** (15%) - V-KOSPI 변동성 지수 역수
5. **안전자산 수요** (15%) - 국채 수익률 및 원/달러 환율 변동

### 📈 지수 해석

| 범위 | 상태 | 설명 |
|------|------|------|
| 0-25 | 극도의 공포 | 시장 과매도 상태, 매수 기회 |
| 25-45 | 공포 | 시장 불안, 신중한 접근 |
| 45-55 | 중립 | 균형 잡힌 시장 심리 |
| 55-75 | 탐욕 | 시장 과열, 주의 필요 |
| 75-100 | 극도의 탐욕 | 시장 과매수 상태, 매도 고려 |

## 🛠 기술 스택

### Frontend
- **Framework**: Vue 3 + Composition API
- **UI Library**: Quasar Framework
- **Charts**: Chart.js + ECharts
- **State Management**: Pinia
- **Build Tool**: Vite
- **Language**: TypeScript

### Backend  
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: PostgreSQL + Prisma ORM
- **Language**: TypeScript
- **Scheduler**: node-cron
- **Authentication**: JWT

### Infrastructure
- **Containerization**: Docker + Docker Compose
- **CI/CD**: GitHub Actions
- **Monitoring**: Winston + Sentry
- **Hosting**: AWS/GCP/Azure

## 🚀 빠른 시작

### 필수 요구사항

- Node.js 18+
- PostgreSQL 15+
- npm 또는 yarn

### 1. 저장소 클론

```bash
git clone https://github.com/username/kospi-fg-index.git
cd kospi-fg-index
```

### 2. 환경 변수 설정

```bash
# 환경 변수 파일 복사
cp .env.example .env

# 필요한 API 키 및 설정 입력
nano .env
```

### 3. 데이터베이스 설정

```bash
# PostgreSQL 데이터베이스 생성
createdb feargreed

# 데이터베이스 마이그레이션
npm run db:migrate

# 초기 데이터 시드
npm run db:seed
```

### 4. 의존성 설치

```bash
# 루트 디렉토리에서
npm install

# Frontend 의존성
cd frontend && npm install
npm install -g @quasar/cli

# Backend 의존성  
cd ../backend && npm install
```

### 5. 개발 서버 실행

```bash
# 전체 서비스 실행 (Docker Compose)
docker-compose up -dev

# 또는 개별 실행
npm run dev:backend  # Backend: http://localhost:3000
npm run dev:frontend # Frontend: http://localhost:5000
```

### 6. 웹 애플리케이션 접속

브라우저에서 `http://localhost:5000`으로 접속

## 📁 프로젝트 구조

```
kospi-fg-index/
├── docs/                    # 프로젝트 문서
│   ├── TODO.md             # 할 일 목록
│   ├── API_RESEARCH.md     # API 조사 결과
│   └── TECH_STACK.md       # 기술 스택 문서
├── frontend/               # Vue.js 프론트엔드
│   ├── src/
│   │   ├── components/     # Vue 컴포넌트
│   │   ├── pages/          # 페이지 컴포넌트
│   │   ├── stores/         # Pinia 스토어
│   │   ├── composables/    # Composition API
│   │   └── utils/          # 유틸리티
│   └── public/             # 정적 파일
├── backend/                # Node.js 백엔드
│   ├── src/
│   │   ├── controllers/    # API 컨트롤러
│   │   ├── services/       # 비즈니스 로직
│   │   ├── collectors/     # 데이터 수집기
│   │   ├── schedulers/     # 작업 스케줄러
│   │   └── utils/          # 유틸리티
│   └── prisma/             # 데이터베이스 스키마
├── docker-compose.yml      # Docker 컨테이너 설정
├── .github/workflows/      # CI/CD 파이프라인
└── README.md              # 프로젝트 README
```

## 📊 데이터 소스

### 공공 API 활용

1. **한국거래소(KRX) API**
   - KOSPI/KOSDAQ 지수 데이터
   - 투자자별 매매 동향
   - 파생상품 거래 현황

2. **한국은행(BOK) API**  
   - 경제심리지수(ESI)
   - 기업경기조사(BSI)
   - 소비자동향조사(CSI)
   - 금리 및 환율 데이터

3. **금융위원회 공공데이터**
   - 금융투자협회 통계
   - 자금 동향 데이터

### 데이터 수집 스케줄

```
06:00 - 한국은행 API (금리, 환율)
09:30 - KRX API (장 시작 후 데이터)  
15:45 - KRX API (장 마감 후 확정 데이터)
18:00 - Fear & Greed Index 계산 및 저장
```

## 🎨 UI/UX 디자인

### 메인 페이지

- **Hero Section**: 현재 Fear & Greed Index 대형 표시
- **차트 영역**: 일별 추이 라인 차트, 히트맵, 히스토그램
- **정보 카드**: 오늘의 지수, 변화율, 평균, 시장 요약
- **Google AdSense**: 상단, 사이드바, 컨텐츠 중간 배치

### 주요 화면

1. **대시보드**: 종합 현황 및 주요 지표
2. **차트 분석**: 상세 차트 및 필터링
3. **과거 데이터**: 히스토리 테이블 및 다운로드
4. **정보**: 지수 설명 및 해석 가이드

## 🔧 개발 가이드

### API 엔드포인트

```typescript
// Fear & Greed Index API
GET /api/feargreed/current          # 현재 지수
GET /api/feargreed/history          # 과거 데이터
GET /api/feargreed/chart/:period    # 차트 데이터

// 시장 데이터 API
GET /api/market/kospi               # KOSPI 지수
GET /api/market/investors           # 투자자별 매매
GET /api/market/derivatives         # 파생상품 데이터
```

### 환경 변수

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/feargreed

# External APIs
KRX_API_KEY=your_krx_api_key
BOK_API_KEY=your_bok_api_key

# Google AdSense
GOOGLE_ADSENSE_CLIENT=ca-pub-xxxxxxxxx

# Application
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5000
JWT_SECRET=your_jwt_secret
```

## 🧪 테스트

```bash
# 전체 테스트 실행
npm test

# 단위 테스트
npm run test:unit

# 통합 테스트  
npm run test:integration

# E2E 테스트
npm run test:e2e

# 커버리지 확인
npm run test:coverage
```

## 📦 배포

### Production 빌드

```bash
# Frontend 빌드
npm run build:frontend

# Backend 빌드
npm run build:backend

# Docker 이미지 빌드
docker-compose build
```

### Docker 배포

```bash
# 프로덕션 환경 실행
docker-compose -f docker-compose.prod.yml up -d

# 로그 확인
docker-compose logs -f
```

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참고하세요.

## 📞 문의

- **프로젝트 홈페이지**: [https://kospi-feargreed.com](https://kospi-feargreed.com)
- **이슈 트래커**: [GitHub Issues](https://github.com/username/kospi-fg-index/issues)
- **이메일**: contact@kospi-feargreed.com

## 🙏 감사의 말

- [CNN Fear & Greed Index](https://www.cnn.com/markets/fear-and-greed) - 영감을 준 원본 지수
- [한국거래소](http://www.krx.co.kr) - 시장 데이터 제공
- [한국은행](https://www.bok.or.kr) - 경제 지표 제공
- Vue.js, Quasar, Chart.js 커뮤니티

---

**⭐ 이 프로젝트가 도움이 되었다면 스타를 눌러주세요!** 