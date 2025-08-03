import { PrismaClient } from '@prisma/client';
import { 
  BatchJobType, 
  BatchJobStatus, 
  BatchJobPriority,
  ProcessingStrategy,
  CreateBatchJobRequest,
  CreateBatchJobResponse,
  BatchJobStatusResponse,
  BatchJobSummary,
  ListBatchJobsResponse,
  BatchJobControlResponse,
  BatchJobParameters,
  BatchJobProgress,
  BatchJobLog,
  LogLevel,
  HistoricalBackfillRequest,
  RecalculateIndexRequest,
  BackfillResult,
  RecalculationResult
} from '../types/batchTypes';
import { logger } from '../utils/logger';
import { addDays, parseISO, format } from 'date-fns';

const prisma = new PrismaClient();

export class BatchJobService {
  
  async createBatchJob(request: CreateBatchJobRequest, userId?: string): Promise<CreateBatchJobResponse> {
    try {
      // Validate request
      this.validateBatchJobRequest(request);
      
      // Estimate duration based on job type and parameters
      const estimatedDuration = this.estimateJobDuration(request.type, request.parameters);
      
      // Create job in database
      const job = await prisma.batchJob.create({
        data: {
          jobType: request.type,
          status: BatchJobStatus.PENDING,
          priority: request.parameters.priority || BatchJobPriority.NORMAL,
          parameters: request.parameters as any,
          processingStrategy: request.parameters.processingStrategy || ProcessingStrategy.CHUNKED,
          estimatedDuration,
          metadata: request.metadata as any,
          createdBy: userId,
          totalItems: this.calculateTotalItems(request.type, request.parameters)
        }
      });

      // Log job creation
      await this.createJobLog(job.id, LogLevel.INFO, `Batch job created: ${request.type}`, {
        userId,
        parameters: request.parameters
      });

      // Get queue position (simplified - count pending jobs with higher/equal priority)
      const queuePosition = await this.getQueuePosition(job.priority as BatchJobPriority);

      logger.info(`Created batch job ${job.id} of type ${request.type}`, {
        jobId: job.id,
        type: request.type,
        userId,
        queuePosition
      });

      return {
        jobId: job.id,
        status: job.status as BatchJobStatus,
        estimatedDuration,
        createdAt: job.createdAt.toISOString(),
        queuePosition
      };

    } catch (error) {
      logger.error('Failed to create batch job', { error: error.message, request });
      throw new Error(`Failed to create batch job: ${error.message}`);
    }
  }

  async getBatchJobStatus(jobId: string): Promise<BatchJobStatusResponse | null> {
    try {
      const job = await prisma.batchJob.findUnique({
        where: { id: jobId },
        include: {
          result: true,
          logs: {
            where: { logLevel: LogLevel.ERROR },
            orderBy: { timestamp: 'desc' },
            take: 10
          }
        }
      });

      if (!job) {
        return null;
      }

      const progress: BatchJobProgress = {
        totalItems: job.totalItems,
        processedItems: job.processedItems,
        failedItems: job.failedItems,
        progressPercentage: Number(job.progressPercentage),
        itemsPerSecond: this.calculateItemsPerSecond(job),
        estimatedTimeRemaining: this.calculateEstimatedTimeRemaining(job)
      };

      return {
        jobId: job.id,
        type: job.jobType as BatchJobType,
        status: job.status as BatchJobStatus,
        priority: job.priority as BatchJobPriority,
        progress,
        execution: {
          startedAt: job.startedAt || undefined,
          completedAt: job.completedAt || undefined,
          duration: job.startedAt && job.completedAt 
            ? job.completedAt.getTime() - job.startedAt.getTime() 
            : undefined,
          estimatedTimeRemaining: progress.estimatedTimeRemaining
        },
        result: job.result ? {
          id: job.result.id,
          jobId: job.result.jobId,
          resultType: job.result.resultType,
          resultData: job.result.resultData,
          filePath: job.result.filePath || undefined,
          createdAt: job.result.createdAt.toISOString()
        } : undefined,
        errors: job.logs.map(log => ({
          id: log.id.toString(),
          timestamp: log.timestamp.toISOString(),
          level: log.logLevel as LogLevel,
          message: log.message,
          context: log.context
        }))
      };

    } catch (error) {
      logger.error('Failed to get batch job status', { error: error.message, jobId });
      throw new Error(`Failed to get batch job status: ${error.message}`);
    }
  }

  async listBatchJobs(
    page: number = 1, 
    limit: number = 20,
    status?: BatchJobStatus,
    type?: BatchJobType,
    userId?: string
  ): Promise<ListBatchJobsResponse> {
    try {
      const offset = (page - 1) * limit;
      
      const where: any = {};
      if (status) where.status = status;
      if (type) where.jobType = type;
      if (userId) where.createdBy = userId;

      const [jobs, total] = await Promise.all([
        prisma.batchJob.findMany({
          where,
          orderBy: [
            { priority: 'desc' },
            { createdAt: 'desc' }
          ],
          skip: offset,
          take: limit,
          select: {
            id: true,
            jobType: true,
            status: true,
            priority: true,
            progressPercentage: true,
            createdAt: true,
            startedAt: true,
            completedAt: true,
            createdBy: true
          }
        }),
        prisma.batchJob.count({ where })
      ]);

      const jobSummaries: BatchJobSummary[] = jobs.map(job => ({
        jobId: job.id,
        type: job.jobType as BatchJobType,
        status: job.status as BatchJobStatus,
        priority: job.priority as BatchJobPriority,
        progressPercentage: Number(job.progressPercentage),
        createdAt: job.createdAt.toISOString(),
        startedAt: job.startedAt?.toISOString(),
        completedAt: job.completedAt?.toISOString(),
        createdBy: job.createdBy || undefined
      }));

      return {
        jobs: jobSummaries,
        pagination: {
          total,
          page,
          limit,
          hasNext: offset + limit < total,
          hasPrev: page > 1
        }
      };

    } catch (error) {
      logger.error('Failed to list batch jobs', { error: error.message });
      throw new Error(`Failed to list batch jobs: ${error.message}`);
    }
  }

  async startBatchJob(jobId: string): Promise<BatchJobControlResponse> {
    return this.updateJobStatus(jobId, BatchJobStatus.RUNNING);
  }

  async pauseBatchJob(jobId: string): Promise<BatchJobControlResponse> {
    return this.updateJobStatus(jobId, BatchJobStatus.PAUSED);
  }

  async cancelBatchJob(jobId: string): Promise<BatchJobControlResponse> {
    return this.updateJobStatus(jobId, BatchJobStatus.FAILED, 'Job cancelled by user');
  }

  async updateJobProgress(
    jobId: string, 
    processedItems: number, 
    failedItems: number = 0,
    currentItem?: string
  ): Promise<void> {
    try {
      const job = await prisma.batchJob.findUnique({
        where: { id: jobId },
        select: { totalItems: true }
      });

      if (!job) {
        throw new Error(`Job ${jobId} not found`);
      }

      const progressPercentage = job.totalItems > 0 
        ? Math.min(100, (processedItems / job.totalItems) * 100)
        : 0;

      await prisma.batchJob.update({
        where: { id: jobId },
        data: {
          processedItems,
          failedItems,
          progressPercentage
        }
      });

      // Log progress at key milestones
      if (progressPercentage % 10 === 0) {
        await this.createJobLog(jobId, LogLevel.INFO, 
          `Progress update: ${progressPercentage.toFixed(1)}% complete`,
          { processedItems, failedItems, currentItem }
        );
      }

    } catch (error) {
      logger.error('Failed to update job progress', { error: error.message, jobId });
    }
  }

  async completeJob(jobId: string, result: any): Promise<void> {
    try {
      const now = new Date();
      
      await prisma.$transaction(async (tx) => {
        // Update job status
        await tx.batchJob.update({
          where: { id: jobId },
          data: {
            status: BatchJobStatus.COMPLETED,
            completedAt: now,
            progressPercentage: 100
          }
        });

        // Store result
        await tx.batchJobResult.create({
          data: {
            jobId,
            resultType: this.getResultType(result),
            resultData: result
          }
        });
      });

      await this.createJobLog(jobId, LogLevel.INFO, 'Job completed successfully', { result });
      
      logger.info(`Batch job ${jobId} completed successfully`);

    } catch (error) {
      logger.error('Failed to complete job', { error: error.message, jobId });
      throw error;
    }
  }

  async failJob(jobId: string, error: string): Promise<void> {
    try {
      await prisma.batchJob.update({
        where: { id: jobId },
        data: {
          status: BatchJobStatus.FAILED,
          completedAt: new Date()
        }
      });

      await this.createJobLog(jobId, LogLevel.ERROR, `Job failed: ${error}`, { error });
      
      logger.error(`Batch job ${jobId} failed`, { error });

    } catch (err) {
      logger.error('Failed to mark job as failed', { error: err.message, jobId });
    }
  }

  // Historical Backfill Implementation
  async processHistoricalBackfill(jobId: string, request: HistoricalBackfillRequest): Promise<BackfillResult> {
    const startDate = parseISO(request.dateRange.startDate);
    const endDate = parseISO(request.dateRange.endDate);
    const dates = this.generateDateRange(startDate, endDate);
    
    const result: BackfillResult = {
      totalDays: dates.length,
      processedDays: 0,
      failedDays: 0,
      duplicateSkipped: 0,
      dataGaps: [],
      summary: {
        earliestDate: request.dateRange.startDate,
        latestDate: request.dateRange.endDate,
        avgProcessingTime: 0
      }
    };

    await this.createJobLog(jobId, LogLevel.INFO, 
      `Starting historical backfill for ${dates.length} days`,
      { dateRange: request.dateRange }
    );

    for (let i = 0; i < dates.length; i++) {
      const date = dates[i];
      const dateStr = format(date, 'yyyy-MM-dd');
      
      try {
        // Check if data already exists
        const existing = await prisma.fearGreedIndex.findUnique({
          where: { date }
        });

        if (existing && !request.overwriteExisting) {
          result.duplicateSkipped++;
          await this.updateJobProgress(jobId, result.processedDays + result.duplicateSkipped, result.failedDays, dateStr);
          continue;
        }

        // Process the date (simplified - would integrate with actual Fear & Greed calculation)
        await this.processDateForBackfill(date, jobId);
        result.processedDays++;

        await this.updateJobProgress(jobId, result.processedDays, result.failedDays, dateStr);

      } catch (error) {
        result.failedDays++;
        result.dataGaps.push(dateStr);
        
        await this.createJobLog(jobId, LogLevel.ERROR, 
          `Failed to process date ${dateStr}: ${error.message}`,
          { date: dateStr, error: error.message }
        );

        await this.updateJobProgress(jobId, result.processedDays, result.failedDays, dateStr);
      }
    }

    result.summary.avgProcessingTime = dates.length > 0 ? 1000 : 0; // Simplified

    return result;
  }

  // Private helper methods
  private validateBatchJobRequest(request: CreateBatchJobRequest): void {
    if (!request.type || !Object.values(BatchJobType).includes(request.type)) {
      throw new Error('Invalid job type');
    }

    if (!request.parameters) {
      throw new Error('Job parameters are required');
    }

    // Additional validation based on job type
    switch (request.type) {
      case BatchJobType.HISTORICAL_BACKFILL:
        if (!request.parameters.dateRange) {
          throw new Error('Date range is required for historical backfill');
        }
        break;
      case BatchJobType.INDEX_RECALCULATION:
        if (!request.parameters.dateRange) {
          throw new Error('Date range is required for index recalculation');
        }
        break;
    }
  }

  private estimateJobDuration(type: BatchJobType, parameters: BatchJobParameters): number {
    // Simplified estimation logic
    switch (type) {
      case BatchJobType.HISTORICAL_BACKFILL:
        if (parameters.dateRange) {
          const start = parseISO(parameters.dateRange.startDate);
          const end = parseISO(parameters.dateRange.endDate);
          const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
          return days * 30; // 30 seconds per day
        }
        return 3600; // 1 hour default
      case BatchJobType.INDEX_RECALCULATION:
        return 1800; // 30 minutes
      default:
        return 600; // 10 minutes default
    }
  }

  private calculateTotalItems(type: BatchJobType, parameters: BatchJobParameters): number {
    switch (type) {
      case BatchJobType.HISTORICAL_BACKFILL:
        if (parameters.dateRange) {
          const start = parseISO(parameters.dateRange.startDate);
          const end = parseISO(parameters.dateRange.endDate);
          return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        }
        return 0;
      default:
        return 1;
    }
  }

  private async getQueuePosition(priority: BatchJobPriority): Promise<number> {
    const priorityOrder = { HIGH: 3, NORMAL: 2, LOW: 1 };
    const currentPriorityValue = priorityOrder[priority];

    const count = await prisma.batchJob.count({
      where: {
        status: BatchJobStatus.PENDING,
        priority: {
          in: Object.keys(priorityOrder).filter(p => priorityOrder[p] >= currentPriorityValue)
        }
      }
    });

    return count;
  }

  private calculateItemsPerSecond(job: any): number {
    if (!job.startedAt || job.processedItems === 0) return 0;
    
    const elapsedSeconds = (new Date().getTime() - job.startedAt.getTime()) / 1000;
    return elapsedSeconds > 0 ? job.processedItems / elapsedSeconds : 0;
  }

  private calculateEstimatedTimeRemaining(job: any): number {
    const itemsPerSecond = this.calculateItemsPerSecond(job);
    if (itemsPerSecond === 0) return 0;
    
    const remainingItems = job.totalItems - job.processedItems;
    return remainingItems / itemsPerSecond * 1000; // Convert to milliseconds
  }

  private async updateJobStatus(jobId: string, newStatus: BatchJobStatus, message?: string): Promise<BatchJobControlResponse> {
    try {
      const job = await prisma.batchJob.findUnique({
        where: { id: jobId },
        select: { status: true }
      });

      if (!job) {
        throw new Error(`Job ${jobId} not found`);
      }

      const previousStatus = job.status as BatchJobStatus;
      const updateData: any = { status: newStatus };
      
      if (newStatus === BatchJobStatus.RUNNING && !job.startedAt) {
        updateData.startedAt = new Date();
      }
      if ([BatchJobStatus.COMPLETED, BatchJobStatus.FAILED].includes(newStatus)) {
        updateData.completedAt = new Date();
      }

      await prisma.batchJob.update({
        where: { id: jobId },
        data: updateData
      });

      const logMessage = message || `Job status changed from ${previousStatus} to ${newStatus}`;
      await this.createJobLog(jobId, LogLevel.INFO, logMessage);

      return {
        jobId,
        previousStatus,
        newStatus,
        message: logMessage,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Failed to update job status', { error: error.message, jobId });
      throw new Error(`Failed to update job status: ${error.message}`);
    }
  }

  private async createJobLog(jobId: string, level: LogLevel, message: string, context?: any): Promise<void> {
    try {
      await prisma.batchJobLog.create({
        data: {
          jobId,
          logLevel: level,
          message,
          context: context as any
        }
      });
    } catch (error) {
      logger.error('Failed to create job log', { error: error.message, jobId });
    }
  }

  private getResultType(result: any): string {
    if (result.totalDays !== undefined) return 'BACKFILL_SUMMARY';
    if (result.totalRecalculated !== undefined) return 'RECALCULATION_REPORT';
    if (result.totalRecords !== undefined) return 'VALIDATION_REPORT';
    return 'GENERIC_RESULT';
  }

  private generateDateRange(startDate: Date, endDate: Date): Date[] {
    const dates: Date[] = [];
    let currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      dates.push(new Date(currentDate));
      currentDate = addDays(currentDate, 1);
    }
    
    return dates;
  }

  private async processDateForBackfill(date: Date, jobId: string): Promise<void> {
    // Simplified implementation - would integrate with actual Fear & Greed calculation service
    // This is a placeholder that simulates processing
    
    await new Promise(resolve => setTimeout(resolve, 100)); // Simulate processing time
    
    // Store in batch history table
    await prisma.fearGreedBatchHistory.create({
      data: {
        jobId,
        calculationDate: date,
        indexValue: Math.floor(Math.random() * 100), // Placeholder calculation
        confidenceScore: 85.5,
        components: {
          priceMomentum: Math.floor(Math.random() * 100),
          investorSentiment: Math.floor(Math.random() * 100),
          putCallRatio: Math.floor(Math.random() * 100),
          volatilityIndex: Math.floor(Math.random() * 100),
          safeHavenDemand: Math.floor(Math.random() * 100)
        },
        calculationMethod: 'BATCH_V1'
      }
    });
  }
}

export const batchJobService = new BatchJobService();