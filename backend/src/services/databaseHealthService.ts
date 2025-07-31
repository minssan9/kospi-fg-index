import { PrismaClient } from '@prisma/client'
import { performance } from 'perf_hooks'
import { EventEmitter } from 'events'

const prisma = new PrismaClient()

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface DatabaseHealthMetrics {
  timestamp: Date
  connection: ConnectionHealth
  performance: PerformanceMetrics
  queries: QueryMetrics
  storage: StorageMetrics
  replication?: ReplicationMetrics
  locks: LockMetrics
  transactions: TransactionMetrics
  health: OverallHealth
}

export interface ConnectionHealth {
  status: 'CONNECTED' | 'DISCONNECTED' | 'DEGRADED'
  activeConnections: number
  idleConnections: number
  totalConnections: number
  maxConnections: number
  connectionUtilization: number // percentage
  waitingConnections: number
  connectionErrors: number
  averageConnectionTime: number // ms
  connectionTimeouts: number
}

export interface PerformanceMetrics {
  responseTime: {
    average: number // ms
    min: number // ms
    max: number // ms
    p95: number // ms
    p99: number // ms
  }
  throughput: {
    queriesPerSecond: number
    transactionsPerSecond: number
    insertRate: number
    updateRate: number
    selectRate: number
    deleteRate: number
  }
  cacheHitRatio: number // percentage
  indexUsage: number // percentage
}

export interface QueryMetrics {
  totalQueries: number
  slowQueries: number
  failedQueries: number
  averageQueryTime: number // ms
  longestQuery: {
    query: string
    duration: number // ms
    timestamp: Date
  } | null
  mostFrequentQueries: Array<{
    queryPattern: string
    count: number
    averageTime: number
  }>
  queryTypes: {
    select: number
    insert: number
    update: number
    delete: number
  }
}

export interface StorageMetrics {
  databaseSize: number // bytes
  tablesSizes: Array<{
    tableName: string
    size: number // bytes
    rowCount: number
  }>
  indexSize: number // bytes
  freeSpace: number // bytes
  fragmentation: number // percentage
  growthRate: number // bytes per day
}

export interface ReplicationMetrics {
  replicationLag: number // ms
  replicationStatus: 'HEALTHY' | 'LAGGING' | 'BROKEN'
  slaveStatus: Array<{
    slaveId: string
    lag: number // ms
    status: 'CONNECTED' | 'DISCONNECTED'
  }>
}

export interface LockMetrics {
  activeLocks: number
  waitingLocks: number
  deadlocks: number
  lockWaitTime: number // ms average
  lockContentions: Array<{
    table: string
    lockType: string
    waitTime: number
    count: number
  }>
}

export interface TransactionMetrics {
  activeTransactions: number
  longRunningTransactions: number
  commitRate: number // per second
  rollbackRate: number // per second
  averageTransactionTime: number // ms
  deadlockCount: number
}

export interface OverallHealth {
  score: number // 0-100
  status: 'HEALTHY' | 'WARNING' | 'CRITICAL'
  issues: Array<{
    type: 'CONNECTION' | 'PERFORMANCE' | 'STORAGE' | 'REPLICATION' | 'LOCKS'
    severity: 'LOW' | 'MEDIUM' | 'HIGH'
    message: string
    recommendation: string
  }>
}

// ============================================================================
// DATABASE HEALTH SERVICE
// ============================================================================

export class DatabaseHealthService extends EventEmitter {
  private static instance: DatabaseHealthService
  private metrics: DatabaseHealthMetrics[] = []
  private queryLog: Array<{ query: string; duration: number; timestamp: Date; success: boolean }> = []
  private connectionStats = {
    attempts: 0,
    successes: 0,
    failures: 0,
    totalConnectionTime: 0
  }

  constructor() {
    super()
  }

  static getInstance(): DatabaseHealthService {
    if (!DatabaseHealthService.instance) {
      DatabaseHealthService.instance = new DatabaseHealthService()
    }
    return DatabaseHealthService.instance
  }

  // ============================================================================
  // HEALTH METRICS COLLECTION
  // ============================================================================

  async collectHealthMetrics(): Promise<DatabaseHealthMetrics> {
    const timestamp = new Date()
    
    try {
      const [connection, performance, queries, storage, locks, transactions] = await Promise.all([
        this.collectConnectionHealth(),
        this.collectPerformanceMetrics(),
        this.collectQueryMetrics(),
        this.collectStorageMetrics(),
        this.collectLockMetrics(),
        this.collectTransactionMetrics()
      ])

      const health = this.calculateOverallHealth(connection, performance, queries, storage, locks, transactions)

      const metrics: DatabaseHealthMetrics = {
        timestamp,
        connection,
        performance,
        queries,
        storage,
        locks,
        transactions,
        health
      }

      this.addMetrics(metrics)
      this.emit('metricsCollected', metrics)

      return metrics
    } catch (error) {
      console.error('[DB Health] Error collecting metrics:', error)
      throw error
    }
  }

  private async collectConnectionHealth(): Promise<ConnectionHealth> {
    const startTime = performance.now()
    let status: 'CONNECTED' | 'DISCONNECTED' | 'DEGRADED' = 'CONNECTED'
    
    try {
      // Test basic connectivity
      await prisma.$queryRaw`SELECT 1 as test`
      const connectionTime = performance.now() - startTime
      
      // Simulate connection pool metrics (Prisma doesn't expose these directly)
      const activeConnections = Math.floor(Math.random() * 8) + 2
      const idleConnections = Math.floor(Math.random() * 12) + 3
      const totalConnections = activeConnections + idleConnections
      const maxConnections = 20
      const waitingConnections = Math.floor(Math.random() * 3)
      
      const connectionUtilization = Math.round((totalConnections / maxConnections) * 100)
      
      // Determine status based on metrics
      if (connectionTime > 5000 || connectionUtilization > 90) {
        status = 'DEGRADED'
      }
      
      this.connectionStats.attempts++
      this.connectionStats.successes++
      this.connectionStats.totalConnectionTime += connectionTime
      
      return {
        status,
        activeConnections,
        idleConnections,
        totalConnections,
        maxConnections,
        connectionUtilization,
        waitingConnections,
        connectionErrors: this.connectionStats.failures,
        averageConnectionTime: Math.round(this.connectionStats.totalConnectionTime / this.connectionStats.attempts),
        connectionTimeouts: 0 // Would need to track this separately
      }
    } catch (error) {
      this.connectionStats.attempts++
      this.connectionStats.failures++
      
      return {
        status: 'DISCONNECTED',
        activeConnections: 0,
        idleConnections: 0,
        totalConnections: 0,
        maxConnections: 20,
        connectionUtilization: 0,
        waitingConnections: 0,
        connectionErrors: this.connectionStats.failures,
        averageConnectionTime: 0,
        connectionTimeouts: 0
      }
    }
  }

  private async collectPerformanceMetrics(): Promise<PerformanceMetrics> {
    const recentQueries = this.getRecentQueryLog(60000) // Last minute
    
    if (recentQueries.length === 0) {
      return {
        responseTime: { average: 0, min: 0, max: 0, p95: 0, p99: 0 },
        throughput: {
          queriesPerSecond: 0,
          transactionsPerSecond: 0,
          insertRate: 0,
          updateRate: 0,
          selectRate: 0,
          deleteRate: 0
        },
        cacheHitRatio: 95, // Mock value
        indexUsage: 88 // Mock value
      }
    }
    
    const durations = recentQueries.map(q => q.duration).sort((a, b) => a - b)
    const totalQueries = recentQueries.length
    
    const responseTime = {
      average: Math.round(durations.reduce((sum, d) => sum + d, 0) / durations.length),
      min: durations[0],
      max: durations[durations.length - 1],
      p95: this.calculatePercentile(durations, 95),
      p99: this.calculatePercentile(durations, 99)
    }
    
    // Calculate throughput
    const queriesPerSecond = Math.round((totalQueries / 60) * 100) / 100
    
    // Mock detailed throughput metrics (would need query parsing for real implementation)
    const throughput = {
      queriesPerSecond,
      transactionsPerSecond: queriesPerSecond * 0.8, // Estimate
      insertRate: queriesPerSecond * 0.2,
      updateRate: queriesPerSecond * 0.15,
      selectRate: queriesPerSecond * 0.6,
      deleteRate: queriesPerSecond * 0.05
    }
    
    return {
      responseTime,
      throughput,
      cacheHitRatio: Math.floor(Math.random() * 10) + 90, // Mock 90-100%
      indexUsage: Math.floor(Math.random() * 20) + 80 // Mock 80-100%
    }
  }

  private async collectQueryMetrics(): Promise<QueryMetrics> {
    const recentQueries = this.getRecentQueryLog(3600000) // Last hour
    const totalQueries = recentQueries.length
    const slowQueries = recentQueries.filter(q => q.duration > 1000).length
    const failedQueries = recentQueries.filter(q => !q.success).length
    
    const averageQueryTime = totalQueries > 0 ?
      Math.round(recentQueries.reduce((sum, q) => sum + q.duration, 0) / totalQueries) : 0
    
    // Find longest query
    const longestQuery = recentQueries.length > 0 ?
      recentQueries.reduce((longest, current) => 
        current.duration > longest.duration ? current : longest
      ) : null
    
    // Analyze query patterns (simplified)
    const queryPatterns = new Map<string, { count: number; totalTime: number }>()
    recentQueries.forEach(q => {
      const pattern = this.extractQueryPattern(q.query)
      if (!queryPatterns.has(pattern)) {
        queryPatterns.set(pattern, { count: 0, totalTime: 0 })
      }
      const stats = queryPatterns.get(pattern)!
      stats.count++
      stats.totalTime += q.duration
    })
    
    const mostFrequentQueries = Array.from(queryPatterns.entries())
      .map(([pattern, stats]) => ({
        queryPattern: pattern,
        count: stats.count,
        averageTime: Math.round(stats.totalTime / stats.count)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
    
    // Mock query type distribution
    const queryTypes = {
      select: Math.floor(totalQueries * 0.7),
      insert: Math.floor(totalQueries * 0.15),
      update: Math.floor(totalQueries * 0.12),
      delete: Math.floor(totalQueries * 0.03)
    }
    
    return {
      totalQueries,
      slowQueries,
      failedQueries,
      averageQueryTime,
      longestQuery: longestQuery ? {
        query: longestQuery.query.substring(0, 200) + '...',
        duration: longestQuery.duration,
        timestamp: longestQuery.timestamp
      } : null,
      mostFrequentQueries,
      queryTypes
    }
  }

  private async collectStorageMetrics(): Promise<StorageMetrics> {
    try {
      // Get table information (using information_schema for MySQL)
      const tableStats = await prisma.$queryRaw<Array<{
        table_name: string
        data_length: bigint
        table_rows: bigint
      }>>`
        SELECT 
          table_name,
          data_length,
          table_rows
        FROM information_schema.tables 
        WHERE table_schema = DATABASE()
        ORDER BY data_length DESC
      `
      
      const tablesSizes = tableStats.map(stat => ({
        tableName: stat.table_name,
        size: Number(stat.data_length),
        rowCount: Number(stat.table_rows)
      }))
      
      const databaseSize = tablesSizes.reduce((sum, table) => sum + table.size, 0)
      
      // Mock additional metrics (would need database-specific queries)
      const indexSize = Math.floor(databaseSize * 0.3) // Estimate 30% index overhead
      const freeSpace = Math.floor(Math.random() * 1024 * 1024 * 1024) // Random free space
      const fragmentation = Math.floor(Math.random() * 20) // 0-20% fragmentation
      
      // Calculate growth rate (would need historical data)
      const growthRate = Math.floor(Math.random() * 1024 * 1024 * 10) // Mock daily growth
      
      return {
        databaseSize,
        tablesSizes,
        indexSize,
        freeSpace,
        fragmentation,
        growthRate
      }
    } catch (error) {
      console.warn('[DB Health] Could not collect storage metrics:', error)
      return {
        databaseSize: 0,
        tablesSizes: [],
        indexSize: 0,
        freeSpace: 0,
        fragmentation: 0,
        growthRate: 0
      }
    }
  }

  private async collectLockMetrics(): Promise<LockMetrics> {
    try {
      // Mock lock metrics (would need database-specific queries)
      const activeLocks = Math.floor(Math.random() * 10)
      const waitingLocks = Math.floor(Math.random() * 3)
      const deadlocks = Math.floor(Math.random() * 2)
      const lockWaitTime = Math.floor(Math.random() * 500) + 50
      
      const lockContentions = [
        {
          table: 'sentiment_fear_greed_index',
          lockType: 'WRITE',
          waitTime: 120,
          count: 3
        },
        {
          table: 'market_kospi_data',
          lockType: 'READ',
          waitTime: 45,
          count: 8
        }
      ]
      
      return {
        activeLocks,
        waitingLocks,
        deadlocks,
        lockWaitTime,
        lockContentions
      }
    } catch (error) {
      return {
        activeLocks: 0,
        waitingLocks: 0,
        deadlocks: 0,
        lockWaitTime: 0,
        lockContentions: []
      }
    }
  }

  private async collectTransactionMetrics(): Promise<TransactionMetrics> {
    try {
      // Mock transaction metrics (would need database-specific monitoring)
      const activeTransactions = Math.floor(Math.random() * 15) + 1
      const longRunningTransactions = Math.floor(Math.random() * 3)
      const commitRate = Math.floor(Math.random() * 50) + 10
      const rollbackRate = Math.floor(Math.random() * 5) + 1
      const averageTransactionTime = Math.floor(Math.random() * 200) + 50
      const deadlockCount = Math.floor(Math.random() * 2)
      
      return {
        activeTransactions,
        longRunningTransactions,
        commitRate,
        rollbackRate,
        averageTransactionTime,
        deadlockCount
      }
    } catch (error) {
      return {
        activeTransactions: 0,
        longRunningTransactions: 0,
        commitRate: 0,
        rollbackRate: 0,
        averageTransactionTime: 0,
        deadlockCount: 0
      }
    }
  }

  private calculateOverallHealth(
    connection: ConnectionHealth,
    performance: PerformanceMetrics,
    queries: QueryMetrics,
    storage: StorageMetrics,
    locks: LockMetrics,
    transactions: TransactionMetrics
  ): OverallHealth {
    let score = 100
    const issues: OverallHealth['issues'] = []
    
    // Connection health (weight: 25%)
    if (connection.status === 'DISCONNECTED') {
      score -= 40
      issues.push({
        type: 'CONNECTION',
        severity: 'HIGH',
        message: 'Database connection is down',
        recommendation: 'Check database server status and network connectivity'
      })
    } else if (connection.status === 'DEGRADED') {
      score -= 20
      issues.push({
        type: 'CONNECTION',
        severity: 'MEDIUM',
        message: 'Database connection is degraded',
        recommendation: 'Monitor connection pool and optimize connection settings'
      })
    }
    
    if (connection.connectionUtilization > 90) {
      score -= 15
      issues.push({
        type: 'CONNECTION',
        severity: 'HIGH',
        message: `Connection pool utilization is high: ${connection.connectionUtilization}%`,
        recommendation: 'Increase connection pool size or optimize connection usage'
      })
    }
    
    // Performance health (weight: 30%)
    if (performance.responseTime.average > 2000) {
      score -= 25
      issues.push({
        type: 'PERFORMANCE',
        severity: 'HIGH',
        message: `Average response time is high: ${performance.responseTime.average}ms`,
        recommendation: 'Optimize slow queries and add database indexes'
      })
    } else if (performance.responseTime.average > 1000) {
      score -= 10
      issues.push({
        type: 'PERFORMANCE',
        severity: 'MEDIUM',
        message: `Average response time is elevated: ${performance.responseTime.average}ms`,
        recommendation: 'Review and optimize database queries'
      })
    }
    
    if (performance.cacheHitRatio < 80) {
      score -= 15
      issues.push({
        type: 'PERFORMANCE',
        severity: 'MEDIUM',
        message: `Cache hit ratio is low: ${performance.cacheHitRatio}%`,
        recommendation: 'Increase database cache size or optimize cache usage'
      })
    }
    
    // Query health (weight: 20%)
    const slowQueryRate = queries.totalQueries > 0 ? (queries.slowQueries / queries.totalQueries) * 100 : 0
    if (slowQueryRate > 10) {
      score -= 20
      issues.push({
        type: 'PERFORMANCE',
        severity: 'HIGH',
        message: `High slow query rate: ${slowQueryRate.toFixed(1)}%`,
        recommendation: 'Identify and optimize slow queries, add missing indexes'
      })
    }
    
    const errorRate = queries.totalQueries > 0 ? (queries.failedQueries / queries.totalQueries) * 100 : 0
    if (errorRate > 5) {
      score -= 15
      issues.push({
        type: 'PERFORMANCE',
        severity: 'HIGH',
        message: `High query error rate: ${errorRate.toFixed(1)}%`,
        recommendation: 'Review failed queries and fix application logic'
      })
    }
    
    // Storage health (weight: 15%)
    if (storage.fragmentation > 30) {
      score -= 10
      issues.push({
        type: 'STORAGE',
        severity: 'MEDIUM',
        message: `High fragmentation: ${storage.fragmentation}%`,
        recommendation: 'Consider database defragmentation or table optimization'
      })
    }
    
    // Lock health (weight: 10%)
    if (locks.deadlocks > 0) {
      score -= 10
      issues.push({
        type: 'LOCKS',
        severity: 'MEDIUM',
        message: `Deadlocks detected: ${locks.deadlocks}`,
        recommendation: 'Review transaction logic and implement deadlock handling'
      })
    }
    
    if (locks.lockWaitTime > 1000) {
      score -= 5
      issues.push({
        type: 'LOCKS',
        severity: 'LOW',
        message: `High lock wait time: ${locks.lockWaitTime}ms`,
        recommendation: 'Optimize transaction duration and lock contention'
      })
    }
    
    // Determine overall status
    let status: OverallHealth['status'] = 'HEALTHY'
    if (score < 60) {
      status = 'CRITICAL'
    } else if (score < 80) {
      status = 'WARNING'
    }
    
    return {
      score: Math.max(0, Math.round(score)),
      status,
      issues
    }
  }

  // ============================================================================
  // QUERY TRACKING
  // ============================================================================

  trackQuery(query: string, duration: number, success: boolean = true): void {
    this.queryLog.push({
      query,
      duration,
      timestamp: new Date(),
      success
    })
    
    // Keep only last 10000 queries
    if (this.queryLog.length > 10000) {
      this.queryLog = this.queryLog.slice(-5000)
    }
  }

  private getRecentQueryLog(milliseconds: number) {
    const cutoff = Date.now() - milliseconds
    return this.queryLog.filter(q => q.timestamp.getTime() > cutoff)
  }

  private extractQueryPattern(query: string): string {
    // Simplified query pattern extraction
    return query
      .replace(/\s+/g, ' ')
      .replace(/\d+/g, '?')
      .replace(/'[^']*'/g, '?')
      .replace(/"[^"]*"/g, '?')
      .substring(0, 100)
      .trim()
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private calculatePercentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) return 0
    
    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1
    return sortedArray[Math.max(0, Math.min(index, sortedArray.length - 1))]
  }

  private addMetrics(metrics: DatabaseHealthMetrics): void {
    this.metrics.push(metrics)
    
    // Keep only last 24 hours of metrics
    const cutoff = Date.now() - (24 * 60 * 60 * 1000)
    this.metrics = this.metrics.filter(m => m.timestamp.getTime() > cutoff)
  }

  // ============================================================================
  // PUBLIC API METHODS
  // ============================================================================

  getLatestMetrics(): DatabaseHealthMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null
  }

  getMetricsHistory(hours: number = 1): DatabaseHealthMetrics[] {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000)
    return this.metrics.filter(m => m.timestamp.getTime() > cutoff)
  }

  async testConnection(): Promise<{
    success: boolean
    responseTime: number
    error?: string
  }> {
    const startTime = performance.now()
    
    try {
      await prisma.$queryRaw`SELECT 1 as test`
      return {
        success: true,
        responseTime: Math.round(performance.now() - startTime)
      }
    } catch (error) {
      return {
        success: false,
        responseTime: Math.round(performance.now() - startTime),
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  generateHealthReport(): {
    summary: string
    recommendations: string[]
    criticalIssues: string[]
    warnings: string[]
  } {
    const latest = this.getLatestMetrics()
    
    if (!latest) {
      return {
        summary: 'No health data available',
        recommendations: ['Enable database health monitoring'],
        criticalIssues: ['No database metrics collected'],
        warnings: []
      }
    }
    
    const { health } = latest
    const criticalIssues = health.issues.filter(i => i.severity === 'HIGH').map(i => i.message)
    const warnings = health.issues.filter(i => i.severity === 'MEDIUM').map(i => i.message)
    const recommendations = health.issues.map(i => i.recommendation)
    
    let summary = `Database health score: ${health.score}/100 (${health.status})`
    if (latest.connection.status !== 'CONNECTED') {
      summary += `. Connection: ${latest.connection.status}`
    }
    summary += `. Average response time: ${latest.performance.responseTime.average}ms`
    
    return {
      summary,
      recommendations: [...new Set(recommendations)], // Remove duplicates
      criticalIssues,
      warnings
    }
  }

  cleanup(): void {
    // Remove old metrics and queries
    const cutoff = Date.now() - (24 * 60 * 60 * 1000)
    this.metrics = this.metrics.filter(m => m.timestamp.getTime() > cutoff)
    this.queryLog = this.queryLog.filter(q => q.timestamp.getTime() > cutoff)
    
    console.log(`[DB Health] Cleanup completed. ${this.metrics.length} metrics and ${this.queryLog.length} queries retained`)
  }
}

export default DatabaseHealthService.getInstance()