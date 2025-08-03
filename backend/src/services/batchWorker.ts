import { PrismaClient } from '@prisma/client';
import { batchJobService } from './batchJobService';
import { BatchJobType, BatchJobStatus, ProcessingStrategy } from '../types/batchTypes';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export class BatchWorker {
  private isRunning = false;
  private workerId: string;
  private processingInterval: NodeJS.Timeout | null = null;

  constructor(workerId: string = `worker-${Date.now()}`) {
    this.workerId = workerId;
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn(`Worker ${this.workerId} is already running`);
      return;
    }

    this.isRunning = true;
    logger.info(`Starting batch worker ${this.workerId}`);

    // Process jobs every 5 seconds
    this.processingInterval = setInterval(() => {
      this.processNextJob().catch(error => {
        logger.error(`Error in batch worker ${this.workerId}:`, error);
      });
    }, 5000);
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    logger.info(`Stopping batch worker ${this.workerId}`);

    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
  }

  private async processNextJob(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    try {
      // Get next pending job with highest priority
      const job = await prisma.batchJob.findFirst({
        where: {
          status: BatchJobStatus.PENDING
        },
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'asc' }
        ]
      });

      if (!job) {
        // No pending jobs
        return;
      }

      logger.info(`Worker ${this.workerId} processing job ${job.id} of type ${job.jobType}`);

      // Mark job as running
      await batchJobService.startBatchJob(job.id);

      // Process job based on type
      await this.executeJob(job);

    } catch (error) {
      logger.error(`Failed to process job in worker ${this.workerId}:`, error);
    }
  }

  private async executeJob(job: any): Promise<void> {
    try {
      switch (job.jobType as BatchJobType) {
        case BatchJobType.HISTORICAL_BACKFILL:
          await this.processHistoricalBackfill(job);
          break;
        case BatchJobType.INDEX_RECALCULATION:
          await this.processIndexRecalculation(job);
          break;
        case BatchJobType.DATA_VALIDATION:
          await this.processDataValidation(job);
          break;
        case BatchJobType.BULK_REPORT_GENERATION:
          await this.processBulkReportGeneration(job);
          break;
        default:
          throw new Error(`Unsupported job type: ${job.jobType}`);
      }

      logger.info(`Worker ${this.workerId} completed job ${job.id} successfully`);

    } catch (error) {
      logger.error(`Worker ${this.workerId} failed to execute job ${job.id}:`, error);
      await batchJobService.failJob(job.id, error.message);
    }
  }

  private async processHistoricalBackfill(job: any): Promise<void> {
    const parameters = job.parameters;
    
    if (!parameters.dateRange) {
      throw new Error('Date range is required for historical backfill');
    }

    logger.info(`Processing historical backfill from ${parameters.dateRange.startDate} to ${parameters.dateRange.endDate}`);

    // Use the service method
    const result = await batchJobService.processHistoricalBackfill(job.id, {
      dateRange: parameters.dateRange,
      components: parameters.components || [],
      overwriteExisting: parameters.overwriteExisting || false,
      validationLevel: parameters.validationLevel || 'COMPREHENSIVE'
    });

    await batchJobService.completeJob(job.id, result);
  }

  private async processIndexRecalculation(job: any): Promise<void> {
    const parameters = job.parameters;
    
    if (!parameters.dateRange) {
      throw new Error('Date range is required for index recalculation');
    }

    logger.info(`Processing index recalculation from ${parameters.dateRange.startDate} to ${parameters.dateRange.endDate}`);

    // Simplified recalculation logic
    const startDate = new Date(parameters.dateRange.startDate);
    const endDate = new Date(parameters.dateRange.endDate);
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    let processedDays = 0;
    const changes: any[] = [];

    for (let i = 0; i < days; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);

      try {
        // Simulate recalculation
        await this.simulateProcessing(100); // 100ms per day

        // Find existing index for this date
        const existingIndex = await prisma.fearGreedIndex.findUnique({
          where: { date: currentDate }
        });

        if (existingIndex) {
          // Simulate new calculation with different weights
          const oldValue = existingIndex.value;
          const newValue = Math.max(0, Math.min(100, oldValue + Math.floor(Math.random() * 10) - 5));
          
          if (oldValue !== newValue) {
            // Update the index
            await prisma.fearGreedIndex.update({
              where: { date: currentDate },
              data: { value: newValue }
            });

            changes.push({
              date: currentDate.toISOString().split('T')[0],
              oldValue,
              newValue,
              difference: newValue - oldValue
            });
          }
        }

        processedDays++;
        await batchJobService.updateJobProgress(job.id, processedDays, 0, currentDate.toISOString().split('T')[0]);

      } catch (error) {
        logger.error(`Failed to recalculate index for ${currentDate.toISOString()}:`, error);
      }
    }

    const result = {
      totalRecalculated: processedDays,
      changes,
      summary: {
        avgChange: changes.length > 0 ? changes.reduce((sum, c) => sum + Math.abs(c.difference), 0) / changes.length : 0,
        maxChange: changes.length > 0 ? Math.max(...changes.map(c => Math.abs(c.difference))) : 0,
        changedDates: changes.length
      }
    };

    await batchJobService.completeJob(job.id, result);
  }

  private async processDataValidation(job: any): Promise<void> {
    const parameters = job.parameters;
    
    logger.info('Processing data validation job');

    // Simplified validation logic
    let totalRecords = 0;
    let validRecords = 0;
    let invalidRecords = 0;
    const errors: any[] = [];

    // Validate Fear & Greed Index data
    const fearGreedData = await prisma.fearGreedIndex.findMany({
      where: parameters.dateRange ? {
        date: {
          gte: new Date(parameters.dateRange.startDate),
          lte: new Date(parameters.dateRange.endDate)
        }
      } : {}
    });

    totalRecords = fearGreedData.length;

    for (const record of fearGreedData) {
      let isValid = true;
      const recordErrors: string[] = [];

      // Validate value range
      if (record.value < 0 || record.value > 100) {
        isValid = false;
        recordErrors.push(`Invalid value: ${record.value} (should be 0-100)`);
      }

      // Validate component values
      if (record.priceMomentum < 0 || record.priceMomentum > 100) {
        isValid = false;
        recordErrors.push(`Invalid price momentum: ${record.priceMomentum}`);
      }

      // Add more validations as needed...

      if (isValid) {
        validRecords++;
      } else {
        invalidRecords++;
        errors.push({
          field: 'fearGreedIndex',
          rule: 'RANGE',
          count: recordErrors.length,
          examples: recordErrors
        });
      }
    }

    await batchJobService.updateJobProgress(job.id, totalRecords, 0);

    const result = {
      totalRecords,
      validRecords,
      invalidRecords,
      errors: this.aggregateErrors(errors)
    };

    await batchJobService.completeJob(job.id, result);
  }

  private async processBulkReportGeneration(job: any): Promise<void> {
    const parameters = job.parameters;
    
    logger.info('Processing bulk report generation job');

    // Simplified report generation
    await this.simulateProcessing(5000); // 5 seconds

    const result = {
      reportType: parameters.reportType || 'CUSTOM',
      generatedAt: new Date().toISOString(),
      recordCount: 100,
      filePath: `/reports/batch-report-${job.id}.pdf`
    };

    await batchJobService.updateJobProgress(job.id, 1, 0);
    await batchJobService.completeJob(job.id, result);
  }

  private async simulateProcessing(durationMs: number): Promise<void> {
    return new Promise(resolve => {
      setTimeout(resolve, durationMs);
    });
  }

  private aggregateErrors(errors: any[]): any[] {
    const errorMap = new Map();

    for (const error of errors) {
      const key = `${error.field}-${error.rule}`;
      if (errorMap.has(key)) {
        const existing = errorMap.get(key);
        existing.count += error.count;
        existing.examples.push(...error.examples);
      } else {
        errorMap.set(key, { ...error });
      }
    }

    return Array.from(errorMap.values());
  }
}

// Global worker instance
let globalWorker: BatchWorker | null = null;

export const startBatchWorker = (): void => {
  if (globalWorker) {
    logger.warn('Batch worker is already running');
    return;
  }

  globalWorker = new BatchWorker();
  globalWorker.start();

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM, stopping batch worker...');
    if (globalWorker) {
      await globalWorker.stop();
      globalWorker = null;
    }
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    logger.info('Received SIGINT, stopping batch worker...');
    if (globalWorker) {
      await globalWorker.stop();
      globalWorker = null;
    }
    process.exit(0);
  });
};

export const stopBatchWorker = async (): Promise<void> => {
  if (globalWorker) {
    await globalWorker.stop();
    globalWorker = null;
  }
};