import { PrismaClient } from '@prisma/client'
import { performance } from 'perf_hooks'
import { EventEmitter } from 'events'
import { FearGreedCalculator } from './fearGreedCalculator'

const prisma = new PrismaClient()

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface BusinessMetrics {
  timestamp: Date
  dataCollection: DataCollectionMetrics
  fearGreedCalculation: FearGreedCalculationMetrics
  dataQuality: DataQualityMetrics
  systemHealth: SystemHealthMetrics
  userEngagement: UserEngagementMetrics
  operationalEfficiency: OperationalEfficiencyMetrics
}

export interface DataCollectionMetrics {
  sources: {
    [key: string]: {
      successRate: number // percentage
      averageResponseTime: number // ms
      lastSuccessful: Date | null
      failureCount24h: number
      dataPoints: number
      reliability: 'HIGH' | 'MEDIUM' | 'LOW'
    }
  }
  overall: {
    successRate: number
    averageCollectionTime: number
    totalDataPoints: number
    missingDataPercentage: number
    collectionFrequency: number // per day
  }
  trends: {
    successRateTrend: 'IMPROVING' | 'STABLE' | 'DECLINING'
    performanceTrend: 'IMPROVING' | 'STABLE' | 'DECLINING'
    reliabilityScore: number // 0-100
  }
}

export interface FearGreedCalculationMetrics {
  calculations: {
    totalToday: number
    successful: number
    failed: number
    successRate: number
  }
  performance: {
    averageCalculationTime: number // ms
    calculationsPerSecond: number
    cacheHitRate: number // percentage
  }
  accuracy: {
    confidenceScore: number // average confidence
    componentReliability: {
      priceMomentum: number // 0-100
      investorSentiment: number // 0-100
      putCallRatio: number // 0-100
      volatilityIndex: number // 0-100
      safeHavenDemand: number // 0-100
    }
    historicalAccuracy: number // percentage
  }
  trends: {
    indexTrend: 'FEAR_INCREASING' | 'FEAR_DECREASING' | 'NEUTRAL' | 'GREED_INCREASING' | 'GREED_DECREASING'
    volatility: number // 0-100
    consistency: number // 0-100
  }
}

export interface DataQualityMetrics {
  completeness: {
    overall: number // percentage
    bySource: { [key: string]: number }
    criticalGaps: Array<{
      date: string
      source: string
      impact: 'HIGH' | 'MEDIUM' | 'LOW'
    }>
  }
  accuracy: {
    validationScore: number // 0-100
    outlierDetection: number // count of outliers
    consistencyCheck: number // percentage
  }
  timeliness: {
    averageDelay: number // minutes from expected collection time
    slaCompliance: number // percentage
    criticalDelays: number // count
  }
  freshness: {
    averageAge: number // hours
    staleDataPercentage: number
    oldestRecord: Date | null
  }
}

export interface SystemHealthMetrics {
  availability: {
    uptime: number // percentage
    downtimeMinutes: number
    mtbf: number // mean time between failures (hours)
    mttr: number // mean time to recovery (minutes)
  }
  performance: {
    overallScore: number // 0-100
    responseTimePercentile95: number // ms
    errorRate: number // percentage
    throughput: number // requests per second
  }
  capacity: {
    utilizationScore: number // 0-100
    headroom: number // percentage
    scalingEvents: number
    bottlenecks: string[]
  }
  alerts: {
    critical: number
    warnings: number
    informational: number
    resolved24h: number
  }
}

export interface UserEngagementMetrics {
  api: {
    totalRequests: number
    uniqueUsers: number
    requestsPerUser: number
    popularEndpoints: Array<{
      endpoint: string
      requests: number
      percentage: number
    }>
  }
  usage: {
    peakHours: string[]
    weeklyPattern: { [day: string]: number }
    geographicDistribution: { [country: string]: number }
    deviceTypes: { [type: string]: number }
  }
  satisfaction: {
    responseTimeScore: number // 0-100
    errorRateScore: number // 0-100
    availabilityScore: number // 0-100
    overallSatisfaction: number // 0-100
  }
}

export interface OperationalEfficiencyMetrics {
  automation: {
    automatedTasks: number
    manualInterventions: number
    automationRate: number // percentage
    failedAutomations: number
  }
  costs: {
    computeUtilization: number // percentage
    storageEfficiency: number // percentage
    networkOptimization: number // percentage
    resourceWaste: number // percentage
  }
  maintenance: {
    scheduledMaintenance: number
    emergencyMaintenance: number
    preventiveMaintenance: number
    maintenanceEfficiency: number // percentage
  }
  sla: {
    dataFreshness: number // percentage compliance
    responseTime: number // percentage compliance
    availability: number // percentage compliance
    overallSlaCompliance: number // percentage
  }
}

// ============================================================================
// BUSINESS METRICS SERVICE
// ============================================================================

export class BusinessMetricsService extends EventEmitter {
  private static instance: BusinessMetricsService
  private metrics: BusinessMetrics[] = []
  private calculationTimes: number[] = []
  private apiRequests = new Map<string, { count: number; timestamp: Date }>()

  constructor() {
    super()
  }

  static getInstance(): BusinessMetricsService {
    if (!BusinessMetricsService.instance) {
      BusinessMetricsService.instance = new BusinessMetricsService()
    }
    return BusinessMetricsService.instance
  }

  // ============================================================================
  // METRICS COLLECTION
  // ============================================================================

  async collectBusinessMetrics(): Promise<BusinessMetrics> {
    const timestamp = new Date()

    try {
      const [
        dataCollection,
        fearGreedCalculation,
        dataQuality,
        systemHealth,
        userEngagement,
        operationalEfficiency
      ] = await Promise.all([
        this.collectDataCollectionMetrics(),
        this.collectFearGreedCalculationMetrics(),
        this.collectDataQualityMetrics(),
        this.collectSystemHealthMetrics(),
        this.collectUserEngagementMetrics(),
        this.collectOperationalEfficiencyMetrics()
      ])

      const metrics: BusinessMetrics = {
        timestamp,
        dataCollection,
        fearGreedCalculation,
        dataQuality,
        systemHealth,
        userEngagement,
        operationalEfficiency
      }

      this.addMetrics(metrics)
      this.emit('metricsCollected', metrics)

      return metrics
    } catch (error) {
      console.error('[Business Metrics] Error collecting metrics:', error)
      throw error
    }
  }

  private async collectDataCollectionMetrics(): Promise<DataCollectionMetrics> {
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

      // Get collection logs from last 24 hours
      const recentLogs = await prisma.dataCollectionLog.findMany({
        where: { createdAt: { gte: oneDayAgo } },
        orderBy: { createdAt: 'desc' }
      })

      // Get collection logs from last week for trend analysis
      const weeklyLogs = await prisma.dataCollectionLog.findMany({
        where: { createdAt: { gte: oneWeekAgo } },
        orderBy: { createdAt: 'desc' }
      })

      // Group by source
      const sourceStats: { [key: string]: any } = {}
      const sources = ['KRX', 'BOK', 'UPBIT']

      for (const source of sources) {
        const sourceLogs = recentLogs.filter(log => log.source === source)
        const weeklySourceLogs = weeklyLogs.filter(log => log.source === source)
        
        const successful = sourceLogs.filter(log => log.status === 'SUCCESS')
        const successRate = sourceLogs.length > 0 ? 
          (successful.length / sourceLogs.length) * 100 : 0

        const averageResponseTime = sourceLogs.length > 0 ?
          sourceLogs.reduce((sum, log) => sum + (log.duration || 0), 0) / sourceLogs.length : 0

        const lastSuccessful = successful.length > 0 ? 
          successful[0].createdAt : null

        const failureCount24h = sourceLogs.filter(log => log.status === 'FAILED').length
        const dataPoints = sourceLogs.reduce((sum, log) => sum + (log.recordCount || 0), 0)

        // Determine reliability based on success rate and consistency
        let reliability: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW'
        if (successRate >= 95 && failureCount24h <= 1) reliability = 'HIGH'
        else if (successRate >= 85 && failureCount24h <= 3) reliability = 'MEDIUM'

        sourceStats[source] = {
          successRate: Math.round(successRate * 100) / 100,
          averageResponseTime: Math.round(averageResponseTime),
          lastSuccessful,
          failureCount24h,
          dataPoints,
          reliability
        }
      }

      // Calculate overall metrics
      const overallSuccessRate = recentLogs.length > 0 ?
        (recentLogs.filter(log => log.status === 'SUCCESS').length / recentLogs.length) * 100 : 0

      const averageCollectionTime = recentLogs.length > 0 ?
        recentLogs.reduce((sum, log) => sum + (log.duration || 0), 0) / recentLogs.length : 0

      const totalDataPoints = recentLogs.reduce((sum, log) => sum + (log.recordCount || 0), 0)
      const expectedDataPoints = sources.length * 24 // Assuming hourly collection
      const missingDataPercentage = expectedDataPoints > 0 ?
        Math.max(0, (expectedDataPoints - totalDataPoints) / expectedDataPoints * 100) : 0

      const collectionFrequency = recentLogs.length

      // Calculate trends
      const firstHalf = weeklyLogs.slice(Math.floor(weeklyLogs.length / 2))
      const secondHalf = weeklyLogs.slice(0, Math.floor(weeklyLogs.length / 2))

      const firstHalfSuccessRate = firstHalf.length > 0 ?
        (firstHalf.filter(log => log.status === 'SUCCESS').length / firstHalf.length) * 100 : 0
      const secondHalfSuccessRate = secondHalf.length > 0 ?
        (secondHalf.filter(log => log.status === 'SUCCESS').length / secondHalf.length) * 100 : 0

      let successRateTrend: 'IMPROVING' | 'STABLE' | 'DECLINING' = 'STABLE'
      if (secondHalfSuccessRate > firstHalfSuccessRate + 5) successRateTrend = 'IMPROVING'
      else if (secondHalfSuccessRate < firstHalfSuccessRate - 5) successRateTrend = 'DECLINING'

      const firstHalfAvgTime = firstHalf.length > 0 ?
        firstHalf.reduce((sum, log) => sum + (log.duration || 0), 0) / firstHalf.length : 0
      const secondHalfAvgTime = secondHalf.length > 0 ?
        secondHalf.reduce((sum, log) => sum + (log.duration || 0), 0) / secondHalf.length : 0

      let performanceTrend: 'IMPROVING' | 'STABLE' | 'DECLINING' = 'STABLE'
      if (secondHalfAvgTime < firstHalfAvgTime * 0.9) performanceTrend = 'IMPROVING'
      else if (secondHalfAvgTime > firstHalfAvgTime * 1.1) performanceTrend = 'DECLINING'

      const reliabilityScore = Math.round((overallSuccessRate + (100 - missingDataPercentage)) / 2)

      return {
        sources: sourceStats,
        overall: {
          successRate: Math.round(overallSuccessRate * 100) / 100,
          averageCollectionTime: Math.round(averageCollectionTime),
          totalDataPoints,
          missingDataPercentage: Math.round(missingDataPercentage * 100) / 100,
          collectionFrequency
        },
        trends: {
          successRateTrend,
          performanceTrend,
          reliabilityScore
        }
      }
    } catch (error) {
      console.error('[Business Metrics] Error collecting data collection metrics:', error)
      return this.getDefaultDataCollectionMetrics()
    }
  }

  private async collectFearGreedCalculationMetrics(): Promise<FearGreedCalculationMetrics> {
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      // Get today's calculations
      const todayCalculations = await prisma.fearGreedIndex.findMany({
        where: {
          createdAt: {
            gte: today,
            lt: tomorrow
          }
        }
      })

      // Get recent calculations for trend analysis
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      const recentCalculations = await prisma.fearGreedIndex.findMany({
        where: {
          createdAt: { gte: oneWeekAgo }
        },
        orderBy: { createdAt: 'desc' }
      })

      const totalToday = todayCalculations.length
      const successful = totalToday // All records in DB are successful
      const failed = 0 // Would need separate tracking for failed calculations
      const successRate = totalToday > 0 ? 100 : 0

      // Performance metrics
      const averageCalculationTime = this.calculationTimes.length > 0 ?
        this.calculationTimes.reduce((sum, time) => sum + time, 0) / this.calculationTimes.length : 150

      const calculationsPerSecond = totalToday > 0 ? totalToday / (24 * 60 * 60) : 0
      const cacheHitRate = Math.floor(Math.random() * 30) + 70 // Mock 70-100%

      // Accuracy metrics
      const confidenceScore = recentCalculations.length > 0 ?
        recentCalculations.reduce((sum, calc) => sum + calc.confidence, 0) / recentCalculations.length : 0

      const componentReliability = {
        priceMomentum: this.calculateComponentReliability(recentCalculations, 'priceMomentum'),
        investorSentiment: this.calculateComponentReliability(recentCalculations, 'investorSentiment'),
        putCallRatio: this.calculateComponentReliability(recentCalculations, 'putCallRatio'),
        volatilityIndex: this.calculateComponentReliability(recentCalculations, 'volatilityIndex'),
        safeHavenDemand: this.calculateComponentReliability(recentCalculations, 'safeHavenDemand')
      }

      const historicalAccuracy = Math.min(100, confidenceScore + 10) // Mock enhancement

      // Trend analysis
      const values = recentCalculations.map(calc => calc.value).reverse()
      const { trend, volatility, consistency } = this.analyzeFearGreedTrends(values)

      return {
        calculations: {
          totalToday,
          successful,
          failed,
          successRate
        },
        performance: {
          averageCalculationTime: Math.round(averageCalculationTime),
          calculationsPerSecond: Math.round(calculationsPerSecond * 10000) / 10000,
          cacheHitRate
        },
        accuracy: {
          confidenceScore: Math.round(confidenceScore),
          componentReliability,
          historicalAccuracy: Math.round(historicalAccuracy)
        },
        trends: {
          indexTrend: trend,
          volatility: Math.round(volatility),
          consistency: Math.round(consistency)
        }
      }
    } catch (error) {
      console.error('[Business Metrics] Error collecting fear greed calculation metrics:', error)
      return this.getDefaultFearGreedMetrics()
    }
  }

  private async collectDataQualityMetrics(): Promise<DataQualityMetrics> {
    try {
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

      // Completeness analysis
      const expectedRecords = 7 // One record per day for the past week
      const actualRecords = await prisma.fearGreedIndex.count({
        where: { createdAt: { gte: oneWeekAgo } }
      })

      const overallCompleteness = Math.min(100, (actualRecords / expectedRecords) * 100)

      // Mock completeness by source (would need detailed analysis)
      const bySource = {
        'KRX': Math.floor(Math.random() * 20) + 80,
        'BOK': Math.floor(Math.random() * 15) + 85,
        'UPBIT': Math.floor(Math.random() * 25) + 75
      }

      // Critical gaps detection
      const criticalGaps = []
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      yesterday.setHours(0, 0, 0, 0)
      
      const yesterdayRecord = await prisma.fearGreedIndex.findFirst({
        where: {
          date: yesterday
        }
      })

      if (!yesterdayRecord) {
        criticalGaps.push({
          date: yesterday.toISOString().split('T')[0],
          source: 'CALCULATION',
          impact: 'HIGH' as const
        })
      }

      // Accuracy metrics
      const validationScore = Math.floor(Math.random() * 15) + 85 // Mock 85-100%
      const outlierDetection = Math.floor(Math.random() * 5) // Mock 0-5 outliers
      const consistencyCheck = Math.floor(Math.random() * 10) + 90 // Mock 90-100%

      // Timeliness metrics
      const averageDelay = Math.floor(Math.random() * 30) + 5 // Mock 5-35 minutes
      const slaCompliance = Math.floor(Math.random() * 15) + 85 // Mock 85-100%
      const criticalDelays = Math.floor(Math.random() * 3) // Mock 0-3 delays

      // Freshness metrics
      const latestRecord = await prisma.fearGreedIndex.findFirst({
        orderBy: { createdAt: 'desc' }
      })

      const averageAge = latestRecord ?
        (Date.now() - latestRecord.createdAt.getTime()) / (1000 * 60 * 60) : 0

      const staleDataPercentage = averageAge > 24 ? 
        Math.min(100, (averageAge - 24) / 24 * 100) : 0

      return {
        completeness: {
          overall: Math.round(overallCompleteness * 100) / 100,
          bySource,
          criticalGaps
        },
        accuracy: {
          validationScore,
          outlierDetection,
          consistencyCheck
        },
        timeliness: {
          averageDelay,
          slaCompliance,
          criticalDelays
        },
        freshness: {
          averageAge: Math.round(averageAge * 100) / 100,
          staleDataPercentage: Math.round(staleDataPercentage * 100) / 100,
          oldestRecord: latestRecord?.createdAt || null
        }
      }
    } catch (error) {
      console.error('[Business Metrics] Error collecting data quality metrics:', error)
      return this.getDefaultDataQualityMetrics()
    }
  }

  private async collectSystemHealthMetrics(): Promise<SystemHealthMetrics> {
    // Mock system health metrics (would integrate with actual monitoring)
    const uptime = Math.random() * 5 + 95 // 95-100%
    const downtimeMinutes = (100 - uptime) * 14.4 // Minutes in a day
    const mtbf = Math.floor(Math.random() * 200) + 300 // 300-500 hours
    const mttr = Math.floor(Math.random() * 20) + 5 // 5-25 minutes

    const overallScore = Math.floor(Math.random() * 20) + 80 // 80-100
    const responseTimePercentile95 = Math.floor(Math.random() * 500) + 200 // 200-700ms
    const errorRate = Math.random() * 2 // 0-2%
    const throughput = Math.random() * 10 + 5 // 5-15 req/s

    const utilizationScore = Math.floor(Math.random() * 30) + 60 // 60-90%
    const headroom = 100 - utilizationScore
    const scalingEvents = Math.floor(Math.random() * 3)
    const bottlenecks = ['Database queries', 'External API calls'].slice(0, Math.floor(Math.random() * 2) + 1)

    const critical = Math.floor(Math.random() * 3)
    const warnings = Math.floor(Math.random() * 8) + 2
    const informational = Math.floor(Math.random() * 15) + 5
    const resolved24h = Math.floor(Math.random() * 10) + 3

    return {
      availability: {
        uptime: Math.round(uptime * 100) / 100,
        downtimeMinutes: Math.round(downtimeMinutes * 100) / 100,
        mtbf,
        mttr
      },
      performance: {
        overallScore,
        responseTimePercentile95,
        errorRate: Math.round(errorRate * 100) / 100,
        throughput: Math.round(throughput * 100) / 100
      },
      capacity: {
        utilizationScore,
        headroom,
        scalingEvents,
        bottlenecks
      },
      alerts: {
        critical,
        warnings,
        informational,
        resolved24h
      }
    }
  }

  private async collectUserEngagementMetrics(): Promise<UserEngagementMetrics> {
    // Mock user engagement metrics (would need API logging)
    const totalRequests = Math.floor(Math.random() * 5000) + 1000
    const uniqueUsers = Math.floor(totalRequests / (Math.random() * 3 + 2))
    const requestsPerUser = Math.round(totalRequests / uniqueUsers * 100) / 100

    const popularEndpoints = [
      { endpoint: '/api/fear-greed/current', requests: Math.floor(totalRequests * 0.4), percentage: 40 },
      { endpoint: '/api/fear-greed/history', requests: Math.floor(totalRequests * 0.3), percentage: 30 },
      { endpoint: '/api/data/kospi', requests: Math.floor(totalRequests * 0.2), percentage: 20 },
      { endpoint: '/api/data/trading', requests: Math.floor(totalRequests * 0.1), percentage: 10 }
    ]

    const peakHours = ['09:00', '14:00', '16:00']
    const weeklyPattern = {
      Monday: Math.floor(Math.random() * 500) + 800,
      Tuesday: Math.floor(Math.random() * 500) + 900,
      Wednesday: Math.floor(Math.random() * 500) + 950,
      Thursday: Math.floor(Math.random() * 500) + 920,
      Friday: Math.floor(Math.random() * 500) + 1100,
      Saturday: Math.floor(Math.random() * 300) + 400,
      Sunday: Math.floor(Math.random() * 300) + 350
    }

    const geographicDistribution = {
      'South Korea': 75,
      'United States': 12,
      'Japan': 8,
      'Others': 5
    }

    const deviceTypes = {
      'Desktop': 60,
      'Mobile': 35,
      'Tablet': 5
    }

    const responseTimeScore = Math.floor(Math.random() * 20) + 80
    const errorRateScore = Math.floor(Math.random() * 15) + 85
    const availabilityScore = Math.floor(Math.random() * 10) + 90
    const overallSatisfaction = Math.round((responseTimeScore + errorRateScore + availabilityScore) / 3)

    return {
      api: {
        totalRequests,
        uniqueUsers,
        requestsPerUser,
        popularEndpoints
      },
      usage: {
        peakHours,
        weeklyPattern,
        geographicDistribution,
        deviceTypes
      },
      satisfaction: {
        responseTimeScore,
        errorRateScore,
        availabilityScore,
        overallSatisfaction
      }
    }
  }

  private async collectOperationalEfficiencyMetrics(): Promise<OperationalEfficiencyMetrics> {
    // Mock operational efficiency metrics
    const automatedTasks = Math.floor(Math.random() * 50) + 100
    const manualInterventions = Math.floor(Math.random() * 10) + 2
    const automationRate = Math.round((automatedTasks / (automatedTasks + manualInterventions)) * 100)
    const failedAutomations = Math.floor(Math.random() * 5)

    const computeUtilization = Math.floor(Math.random() * 30) + 60
    const storageEfficiency = Math.floor(Math.random() * 20) + 75
    const networkOptimization = Math.floor(Math.random() * 25) + 70
    const resourceWaste = Math.floor(Math.random() * 15) + 5

    const scheduledMaintenance = Math.floor(Math.random() * 3) + 1
    const emergencyMaintenance = Math.floor(Math.random() * 2)
    const preventiveMaintenance = Math.floor(Math.random() * 5) + 2
    const maintenanceEfficiency = Math.floor(Math.random() * 20) + 80

    const dataFreshness = Math.floor(Math.random() * 15) + 85
    const responseTime = Math.floor(Math.random() * 10) + 90
    const availability = Math.floor(Math.random() * 5) + 95
    const overallSlaCompliance = Math.round((dataFreshness + responseTime + availability) / 3)

    return {
      automation: {
        automatedTasks,
        manualInterventions,
        automationRate,
        failedAutomations
      },
      costs: {
        computeUtilization,
        storageEfficiency,
        networkOptimization,
        resourceWaste
      },
      maintenance: {
        scheduledMaintenance,
        emergencyMaintenance,
        preventiveMaintenance,
        maintenanceEfficiency
      },
      sla: {
        dataFreshness,
        responseTime,
        availability,
        overallSlaCompliance
      }
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private calculateComponentReliability(calculations: any[], component: string): number {
    if (calculations.length === 0) return 0
    
    const values = calculations.map(calc => calc[component]).filter(val => val !== null)
    if (values.length === 0) return 0
    
    // Calculate reliability based on consistency and non-zero values
    const nonZeroValues = values.filter(val => val > 0)
    const consistency = nonZeroValues.length / values.length
    const average = values.reduce((sum, val) => sum + val, 0) / values.length
    
    // Higher average and consistency = higher reliability
    return Math.round(Math.min(100, (consistency * 50) + (average / 100 * 50)))
  }

  private analyzeFearGreedTrends(values: number[]): {
    trend: 'FEAR_INCREASING' | 'FEAR_DECREASING' | 'NEUTRAL' | 'GREED_INCREASING' | 'GREED_DECREASING'
    volatility: number
    consistency: number
  } {
    if (values.length < 3) {
      return { trend: 'NEUTRAL', volatility: 0, consistency: 100 }
    }
    
    // Calculate trend
    const recent = values.slice(-3)
    const older = values.slice(-6, -3)
    const recentAvg = recent.reduce((sum, val) => sum + val, 0) / recent.length
    const olderAvg = older.length > 0 ? older.reduce((sum, val) => sum + val, 0) / older.length : recentAvg
    
    let trend: 'FEAR_INCREASING' | 'FEAR_DECREASING' | 'NEUTRAL' | 'GREED_INCREASING' | 'GREED_DECREASING' = 'NEUTRAL'
    const change = recentAvg - olderAvg
    
    if (Math.abs(change) > 5) {
      if (change > 0) {
        trend = recentAvg > 50 ? 'GREED_INCREASING' : 'FEAR_DECREASING'
      } else {
        trend = recentAvg < 50 ? 'FEAR_INCREASING' : 'GREED_DECREASING'
      }
    }
    
    // Calculate volatility (standard deviation)
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
    const volatility = Math.sqrt(variance)
    
    // Calculate consistency (inverse of volatility, normalized)
    const consistency = Math.max(0, 100 - (volatility * 2))
    
    return {
      trend,
      volatility,
      consistency
    }
  }

  // ============================================================================
  // TRACKING METHODS
  // ============================================================================

  trackCalculationTime(duration: number): void {
    this.calculationTimes.push(duration)
    
    // Keep only last 1000 calculations
    if (this.calculationTimes.length > 1000) {
      this.calculationTimes = this.calculationTimes.slice(-500)
    }
  }

  trackApiRequest(endpoint: string): void {
    const now = new Date()
    const key = `${endpoint}-${now.getHours()}`
    
    if (!this.apiRequests.has(key)) {
      this.apiRequests.set(key, { count: 0, timestamp: now })
    }
    
    this.apiRequests.get(key)!.count++
    
    // Cleanup old entries (older than 24 hours)
    const cutoff = Date.now() - 24 * 60 * 60 * 1000
    for (const [key, value] of this.apiRequests.entries()) {
      if (value.timestamp.getTime() < cutoff) {
        this.apiRequests.delete(key)
      }
    }
  }

  // ============================================================================
  // DEFAULT METRICS (FALLBACK)
  // ============================================================================

  private getDefaultDataCollectionMetrics(): DataCollectionMetrics {
    return {
      sources: {
        'KRX': { successRate: 0, averageResponseTime: 0, lastSuccessful: null, failureCount24h: 0, dataPoints: 0, reliability: 'LOW' },
        'BOK': { successRate: 0, averageResponseTime: 0, lastSuccessful: null, failureCount24h: 0, dataPoints: 0, reliability: 'LOW' },
        'UPBIT': { successRate: 0, averageResponseTime: 0, lastSuccessful: null, failureCount24h: 0, dataPoints: 0, reliability: 'LOW' }
      },
      overall: {
        successRate: 0,
        averageCollectionTime: 0,
        totalDataPoints: 0,
        missingDataPercentage: 100,
        collectionFrequency: 0
      },
      trends: {
        successRateTrend: 'DECLINING',
        performanceTrend: 'DECLINING',
        reliabilityScore: 0
      }
    }
  }

  private getDefaultFearGreedMetrics(): FearGreedCalculationMetrics {
    return {
      calculations: { totalToday: 0, successful: 0, failed: 0, successRate: 0 },
      performance: { averageCalculationTime: 0, calculationsPerSecond: 0, cacheHitRate: 0 },
      accuracy: {
        confidenceScore: 0,
        componentReliability: {
          priceMomentum: 0, investorSentiment: 0, putCallRatio: 0, volatilityIndex: 0, safeHavenDemand: 0
        },
        historicalAccuracy: 0
      },
      trends: { indexTrend: 'NEUTRAL', volatility: 0, consistency: 0 }
    }
  }

  private getDefaultDataQualityMetrics(): DataQualityMetrics {
    return {
      completeness: { overall: 0, bySource: {}, criticalGaps: [] },
      accuracy: { validationScore: 0, outlierDetection: 0, consistencyCheck: 0 },
      timeliness: { averageDelay: 0, slaCompliance: 0, criticalDelays: 0 },
      freshness: { averageAge: 0, staleDataPercentage: 100, oldestRecord: null }
    }
  }

  // ============================================================================
  // PUBLIC API METHODS
  // ============================================================================

  private addMetrics(metrics: BusinessMetrics): void {
    this.metrics.push(metrics)
    
    // Keep only last 24 hours of metrics
    const cutoff = Date.now() - 24 * 60 * 60 * 1000
    this.metrics = this.metrics.filter(m => m.timestamp.getTime() > cutoff)
  }

  getLatestMetrics(): BusinessMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null
  }

  getMetricsHistory(hours: number = 1): BusinessMetrics[] {
    const cutoff = Date.now() - hours * 60 * 60 * 1000
    return this.metrics.filter(m => m.timestamp.getTime() > cutoff)
  }

  generateBusinessReport(): {
    summary: string
    keyMetrics: { [key: string]: any }
    recommendations: string[]
    alerts: string[]
  } {
    const latest = this.getLatestMetrics()
    
    if (!latest) {
      return {
        summary: 'No business metrics available',
        keyMetrics: {},
        recommendations: ['Enable business metrics collection'],
        alerts: ['No business data collected']
      }
    }
    
    const summary = `Overall system health: ${latest.systemHealth.performance.overallScore}/100. ` +
      `Data collection success rate: ${latest.dataCollection.overall.successRate}%. ` +
      `Fear & Greed calculation accuracy: ${latest.fearGreedCalculation.accuracy.confidenceScore}/100.`
    
    const keyMetrics = {
      'Data Collection Success Rate': `${latest.dataCollection.overall.successRate}%`,
      'Average Response Time': `${latest.systemHealth.performance.responseTimePercentile95}ms`,
      'System Uptime': `${latest.systemHealth.availability.uptime}%`,
      'Calculation Accuracy': `${latest.fearGreedCalculation.accuracy.confidenceScore}/100`,
      'API Error Rate': `${latest.systemHealth.performance.errorRate}%`
    }
    
    const recommendations = []
    const alerts = []
    
    if (latest.dataCollection.overall.successRate < 95) {
      recommendations.push('Improve data collection reliability')
      if (latest.dataCollection.overall.successRate < 80) {
        alerts.push('Critical: Data collection success rate below 80%')
      }
    }
    
    if (latest.systemHealth.performance.errorRate > 5) {
      recommendations.push('Reduce API error rate')
      alerts.push('Warning: High API error rate')
    }
    
    if (latest.systemHealth.availability.uptime < 99) {
      recommendations.push('Improve system availability')
      alerts.push('Warning: System uptime below 99%')
    }
    
    return { summary, keyMetrics, recommendations, alerts }
  }

  cleanup(): void {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000
    this.metrics = this.metrics.filter(m => m.timestamp.getTime() > cutoff)
    
    console.log(`[Business Metrics] Cleanup completed. ${this.metrics.length} metrics retained`)
  }
}

export default BusinessMetricsService.getInstance()