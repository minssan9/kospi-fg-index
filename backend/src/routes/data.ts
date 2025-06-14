import { Router, Request, Response } from 'express';

const router = Router();

// 샘플 시장 데이터
const sampleMarketData = {
  kospi: {
    current: 2485.67,
    change: -12.45,
    changePercent: -0.50,
    volume: 567890123,
    marketCap: 1234567890000
  },
  kosdaq: {
    current: 742.89,
    change: 5.23,
    changePercent: 0.71,
    volume: 234567890,
    marketCap: 456789012000
  }
};

// KOSPI 지수 데이터 조회
router.get('/kospi', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: sampleMarketData.kospi,
    timestamp: new Date().toISOString()
  });
});

// KOSDAQ 지수 데이터 조회
router.get('/kosdaq', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: sampleMarketData.kosdaq,
    timestamp: new Date().toISOString()
  });
});

// 전체 시장 데이터 조회
router.get('/market', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: sampleMarketData,
    timestamp: new Date().toISOString()
  });
});

export default router; 