import { Router, Request, Response } from 'express';
import { DatabaseService } from '../services/databaseService';

const router = Router();

// KOSPI 지수 데이터 조회
router.get('/kospi', async (req: Request, res: Response) => {
  try {
    const kospi = await DatabaseService.getLatestKOSPIData();
    if (!kospi) {
      return res.status(404).json({ success: false, message: 'KOSPI 데이터가 없습니다.' });
    }
    res.json({
      success: true,
      data: {
        current: parseFloat(kospi.index.toString()),
        change: parseFloat(kospi.change.toString()),
        changePercent: parseFloat(kospi.changePercent.toString()),
        volume: Number(kospi.volume),
        marketCap: Number(kospi.value)
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

// KOSDAQ 지수 데이터 조회
router.get('/kosdaq', async (req: Request, res: Response) => {
  try {
    const kosdaq = await DatabaseService.getLatestKOSDAQData();
    if (!kosdaq) {
      return res.status(404).json({ success: false, message: 'KOSDAQ 데이터가 없습니다.' });
    }
    res.json({
      success: true,
      data: {
        current: parseFloat(kosdaq.closePrice.toString()),
        change: parseFloat(kosdaq.change.toString()),
        changePercent: parseFloat(kosdaq.changePercent.toString()),
        volume: Number(kosdaq.volume),
        marketCap: kosdaq.marketCap ? Number(kosdaq.marketCap) : null
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

// 전체 시장 데이터 조회
router.get('/market', async (req: Request, res: Response) => {
  try {
    const [kospi, kosdaq] = await Promise.all([
      DatabaseService.getLatestKOSPIData(),
      DatabaseService.getLatestKOSDAQData()
    ]);
    if (!kospi && !kosdaq) {
      return res.status(404).json({ success: false, message: '시장 데이터가 없습니다.' });
    }
    res.json({
      success: true,
      data: {
        kospi: kospi ? {
          current: parseFloat(kospi.index.toString()),
          change: parseFloat(kospi.change.toString()),
          changePercent: parseFloat(kospi.changePercent.toString()),
          volume: Number(kospi.volume),
          marketCap: Number(kospi.value)
        } : null,
        kosdaq: kosdaq ? {
          current: parseFloat(kosdaq.closePrice.toString()),
          change: parseFloat(kosdaq.change.toString()),
          changePercent: parseFloat(kosdaq.changePercent.toString()),
          volume: Number(kosdaq.volume),
          marketCap: kosdaq.marketCap ? Number(kosdaq.marketCap) : null
        } : null
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

export default router; 