import express from 'express';
import { Request, Response } from 'express';
import { batchJobService } from '../services/batchJobService';
import { 
  BatchJobType, 
  BatchJobStatus,
  CreateBatchJobRequest,
  HistoricalBackfillRequest,
  RecalculateIndexRequest,
  DataValidationRequest,
  BulkReportRequest
} from '../types/batchTypes';
import { logger } from '../utils/logger';
import Joi from 'joi';

const router = express.Router();

// Validation schemas
const createJobSchema = Joi.object({
  type: Joi.string().valid(...Object.values(BatchJobType)).required(),
  parameters: Joi.object({
    dateRange: Joi.object({
      startDate: Joi.string().isoDate().required(),
      endDate: Joi.string().isoDate().required()
    }),
    targetMarkets: Joi.array().items(Joi.string().valid('KOSPI', 'KOSDAQ')),
    processingStrategy: Joi.string().valid('CHUNKED', 'STREAM', 'PARALLEL'),
    chunkSize: Joi.number().min(1).max(1000),
    priority: Joi.string().valid('LOW', 'NORMAL', 'HIGH'),
    overwriteExisting: Joi.boolean(),
    validationLevel: Joi.string().valid('BASIC', 'COMPREHENSIVE'),
    components: Joi.array().items(Joi.string()),
    newWeights: Joi.object({
      priceMomentum: Joi.number().min(0).max(1),
      investorSentiment: Joi.number().min(0).max(1),
      putCallRatio: Joi.number().min(0).max(1),
      volatility: Joi.number().min(0).max(1),
      safeHaven: Joi.number().min(0).max(1)
    })
  }).required(),
  metadata: Joi.object({
    description: Joi.string(),
    tags: Joi.array().items(Joi.string()),
    requestedBy: Joi.string()
  })
});

const historicalBackfillSchema = Joi.object({
  dateRange: Joi.object({
    startDate: Joi.string().isoDate().required(),
    endDate: Joi.string().isoDate().required()
  }).required(),
  components: Joi.array().items(Joi.string().valid(
    'PRICE_MOMENTUM', 'INVESTOR_SENTIMENT', 'PUT_CALL_RATIO', 'VOLATILITY', 'SAFE_HAVEN'
  )),
  overwriteExisting: Joi.boolean().required(),
  validationLevel: Joi.string().valid('BASIC', 'COMPREHENSIVE').required()
});

// Middleware for request validation
const validateRequest = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: express.NextFunction) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.details.map(d => d.message)
      });
    }
    next();
  };
};

// GET /api/batch/jobs - List batch jobs
router.get('/jobs', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const status = req.query.status as BatchJobStatus;
    const type = req.query.type as BatchJobType;
    const userId = req.query.userId as string;

    const result = await batchJobService.listBatchJobs(page, limit, status, type, userId);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Failed to list batch jobs', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to list batch jobs',
      message: error.message
    });
  }
});

// POST /api/batch/jobs - Create new batch job
router.post('/jobs', validateRequest(createJobSchema), async (req: Request, res: Response) => {
  try {
    const createRequest: CreateBatchJobRequest = req.body;
    const userId = req.headers['user-id'] as string; // In real app, extract from auth token

    const result = await batchJobService.createBatchJob(createRequest, userId);

    res.status(201).json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Failed to create batch job', { error: error.message, body: req.body });
    res.status(500).json({
      success: false,
      error: 'Failed to create batch job',
      message: error.message
    });
  }
});

// GET /api/batch/jobs/:jobId - Get job status
router.get('/jobs/:jobId', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const result = await batchJobService.getBatchJobStatus(jobId);

    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
        message: `Batch job ${jobId} not found`
      });
    }

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Failed to get batch job status', { error: error.message, jobId: req.params.jobId });
    res.status(500).json({
      success: false,
      error: 'Failed to get batch job status',
      message: error.message
    });
  }
});

// POST /api/batch/jobs/:jobId/start - Start job
router.post('/jobs/:jobId/start', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const result = await batchJobService.startBatchJob(jobId);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Failed to start batch job', { error: error.message, jobId: req.params.jobId });
    res.status(500).json({
      success: false,
      error: 'Failed to start batch job',
      message: error.message
    });
  }
});

// POST /api/batch/jobs/:jobId/pause - Pause job
router.post('/jobs/:jobId/pause', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const result = await batchJobService.pauseBatchJob(jobId);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Failed to pause batch job', { error: error.message, jobId: req.params.jobId });
    res.status(500).json({
      success: false,
      error: 'Failed to pause batch job',
      message: error.message
    });
  }
});

// POST /api/batch/jobs/:jobId/cancel - Cancel job
router.post('/jobs/:jobId/cancel', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const result = await batchJobService.cancelBatchJob(jobId);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Failed to cancel batch job', { error: error.message, jobId: req.params.jobId });
    res.status(500).json({
      success: false,
      error: 'Failed to cancel batch job',
      message: error.message
    });
  }
});

// POST /api/batch/historical-backfill - Create historical backfill job
router.post('/historical-backfill', validateRequest(historicalBackfillSchema), async (req: Request, res: Response) => {
  try {
    const backfillRequest: HistoricalBackfillRequest = req.body;
    const userId = req.headers['user-id'] as string;

    const createRequest: CreateBatchJobRequest = {
      type: BatchJobType.HISTORICAL_BACKFILL,
      parameters: {
        dateRange: backfillRequest.dateRange,
        components: backfillRequest.components,
        overwriteExisting: backfillRequest.overwriteExisting,
        validationLevel: backfillRequest.validationLevel,
        processingStrategy: 'CHUNKED'
      },
      metadata: {
        description: `Historical backfill from ${backfillRequest.dateRange.startDate} to ${backfillRequest.dateRange.endDate}`,
        requestedBy: userId
      }
    };

    const result = await batchJobService.createBatchJob(createRequest, userId);

    res.status(201).json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Failed to create historical backfill job', { error: error.message, body: req.body });
    res.status(500).json({
      success: false,
      error: 'Failed to create historical backfill job',
      message: error.message
    });
  }
});

// POST /api/batch/recalculate-index - Create index recalculation job
router.post('/recalculate-index', async (req: Request, res: Response) => {
  try {
    const recalcRequest: RecalculateIndexRequest = req.body;
    const userId = req.headers['user-id'] as string;

    // Validate request
    const schema = Joi.object({
      dateRange: Joi.object({
        startDate: Joi.string().isoDate().required(),
        endDate: Joi.string().isoDate().required()
      }).required(),
      recalculationReason: Joi.string().required(),
      newWeights: Joi.object({
        priceMomentum: Joi.number().min(0).max(1),
        investorSentiment: Joi.number().min(0).max(1),
        putCallRatio: Joi.number().min(0).max(1),
        volatility: Joi.number().min(0).max(1),
        safeHaven: Joi.number().min(0).max(1)
      })
    });

    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.details.map(d => d.message)
      });
    }

    const createRequest: CreateBatchJobRequest = {
      type: BatchJobType.INDEX_RECALCULATION,
      parameters: {
        dateRange: recalcRequest.dateRange,
        newWeights: recalcRequest.newWeights,
        processingStrategy: 'CHUNKED'
      },
      metadata: {
        description: `Index recalculation: ${recalcRequest.recalculationReason}`,
        requestedBy: userId
      }
    };

    const result = await batchJobService.createBatchJob(createRequest, userId);

    res.status(201).json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Failed to create index recalculation job', { error: error.message, body: req.body });
    res.status(500).json({
      success: false,
      error: 'Failed to create index recalculation job',
      message: error.message
    });
  }
});

// GET /api/batch/metrics - Get system metrics
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    // This would be implemented with actual metrics collection
    const metrics = {
      system: {
        activeJobs: 5,
        queuedJobs: 12,
        completedToday: 23,
        failedToday: 2,
        avgProcessingTime: 1250
      },
      performance: {
        itemsPerSecond: 15.5,
        memoryUsage: '245MB',
        cpuUsage: 65
      },
      health: {
        status: 'HEALTHY' as const,
        lastSuccessfulJob: new Date().toISOString(),
        errorRate: 0.05
      }
    };

    res.json({
      success: true,
      data: metrics
    });

  } catch (error) {
    logger.error('Failed to get batch metrics', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to get batch metrics',
      message: error.message
    });
  }
});

// GET /api/batch/jobs/:jobId/logs - Get job logs
router.get('/jobs/:jobId/logs', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const level = req.query.level as string;

    // Implementation would fetch logs from database
    const logs = {
      jobId,
      logs: [
        {
          timestamp: new Date().toISOString(),
          level: 'INFO',
          message: 'Job started successfully',
          context: { startTime: new Date() }
        }
      ],
      pagination: {
        total: 1,
        page,
        limit,
        hasNext: false,
        hasPrev: false
      }
    };

    res.json({
      success: true,
      data: logs
    });

  } catch (error) {
    logger.error('Failed to get job logs', { error: error.message, jobId: req.params.jobId });
    res.status(500).json({
      success: false,
      error: 'Failed to get job logs',
      message: error.message
    });
  }
});

// Error handling middleware
router.use((err: Error, req: Request, res: Response, next: express.NextFunction) => {
  logger.error('Batch API error', { 
    error: err.message, 
    stack: err.stack,
    path: req.path,
    method: req.method 
  });

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

export default router;