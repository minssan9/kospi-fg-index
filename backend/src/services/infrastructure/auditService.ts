import { PrismaClient, AuditRiskLevel } from '@prisma/client'
import { Request } from 'express'
import { TokenService } from './tokenService'

const prisma = new PrismaClient()

export interface AuditLogEntry {
  userId?: string
  sessionId?: string
  action: string
  resource?: string
  details?: Record<string, any>
  ipAddress: string
  userAgent?: string
  success: boolean
  riskLevel: AuditRiskLevel
  timestamp?: Date
}

export interface AuditSearchFilters {
  userId?: string
  action?: string
  riskLevel?: AuditRiskLevel
  success?: boolean
  startDate?: Date
  endDate?: Date
  ipAddress?: string
  limit?: number
  offset?: number
}

export interface AuditStats {
  totalEvents: number
  successfulEvents: number
  failedEvents: number
  highRiskEvents: number
  uniqueUsers: number
  topActions: Array<{ action: string; count: number }>
  topRisks: Array<{ riskLevel: string; count: number }>
  suspiciousIps: string[]
}

/**
 * Comprehensive Audit Logging Service
 * Tracks all security-relevant events with risk assessment
 */
export class AuditService {
  // Risk level weights for scoring
  private static readonly RISK_WEIGHTS: Record<AuditRiskLevel, number> = {
    LOW: 1,
    MEDIUM: 2,
    HIGH: 3,
    CRITICAL: 4
  }

  // High-risk actions that require immediate attention
  private static readonly HIGH_RISK_ACTIONS = new Set([
    'ACCOUNT_LOCKED',
    'MFA_DISABLED',
    'PASSWORD_RESET_ADMIN',
    'PERMISSION_ESCALATION',
    'BULK_DATA_EXPORT',
    'SYSTEM_CONFIG_CHANGE',
    'SECURITY_POLICY_CHANGE',
    'MULTIPLE_FAILED_LOGINS',
    'SUSPICIOUS_IP_ACCESS'
  ])

  /**
   * Log an audit event
   */
  static async logEvent(entry: AuditLogEntry): Promise<void> {
    try {
      // Auto-calculate risk level if not provided
      const riskLevel = this.calculateRiskLevel(entry.action, entry.success, entry.details)

      await prisma.adminAuditLog.create({
        data: {
          userId: entry.userId || null,
          sessionId: entry.sessionId || null,
          action: entry.action,
          resource: entry.resource || null,
          details: entry.details ? JSON.stringify(entry.details) : null,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent || null,
          success: entry.success,
          riskLevel: riskLevel,
          timestamp: entry.timestamp || new Date()
        }
      })

      // Trigger alerts for high-risk events
      if (riskLevel === 'HIGH' || riskLevel === 'CRITICAL') {
        await this.triggerSecurityAlert(entry, riskLevel)
      }
    } catch (error) {
      console.error('[AuditService] Log event error:', error)
      // Don't throw to prevent disrupting the main flow
    }
  }

  /**
   * Log authentication event
   */
  static async logAuth(
    action: 'LOGIN' | 'LOGOUT' | 'LOGIN_FAILED' | 'MFA_REQUIRED' | 'MFA_SUCCESS' | 'MFA_FAILED',
    req: Request,
    userId?: string,
    sessionId?: string,
    details?: Record<string, any>
  ): Promise<void> {
    const entry: AuditLogEntry = {
      action,
      resource: 'AUTH',
      ipAddress: TokenService.extractIpAddress(req),
      userAgent: TokenService.extractUserAgent(req),
      success: !action.includes('FAILED'),
      riskLevel: 'LOW'
    }

    if (userId) {
      entry.userId = userId
    }

    if (sessionId) {
      entry.sessionId = sessionId
    }

    if (details) {
      entry.details = details
    }

    await this.logEvent(entry)
  }

  /**
   * Log session event
   */
  static async logSession(
    action: 'SESSION_CREATED' | 'SESSION_REFRESHED' | 'SESSION_TERMINATED' | 'SESSION_EXPIRED',
    req: Request,
    userId: string,
    sessionId: string,
    details?: Record<string, any>
  ): Promise<void> {
    const entry: AuditLogEntry = {
      userId,
      sessionId,
      action,
      resource: 'SESSION',
      ipAddress: TokenService.extractIpAddress(req),
      userAgent: TokenService.extractUserAgent(req),
      success: true,
      riskLevel: 'LOW'
    }

    if (details) {
      entry.details = details
    }

    await this.logEvent(entry)
  }

  /**
   * Log security event
   */
  static async logSecurity(
    action: string,
    req: Request,
    userId?: string,
    success: boolean = true,
    details?: Record<string, any>
  ): Promise<void> {
    const entry: AuditLogEntry = {
      action,
      resource: 'SECURITY',
      ipAddress: TokenService.extractIpAddress(req),
      userAgent: TokenService.extractUserAgent(req),
      success,
      riskLevel: 'MEDIUM'
    }

    if (userId) {
      entry.userId = userId
    }

    if (details) {
      entry.details = details
    }

    await this.logEvent(entry)
  }

  /**
   * Log data access event
   */
  static async logDataAccess(
    action: 'READ' | 'create' | 'update' | 'delete' | 'export',
    resource: string,
    req: Request,
    userId: string,
    success: boolean = true,
    details?: Record<string, any>
  ): Promise<void> {
    const actionName = `DATA_${action.toUpperCase()}`
    
    const entry: AuditLogEntry = {
      userId,
      action: actionName,
      resource,
      ipAddress: TokenService.extractIpAddress(req),
      userAgent: TokenService.extractUserAgent(req),
      success,
      riskLevel: action === 'export' ? 'HIGH' : 'LOW'
    }

    if (details) {
      entry.details = details
    }

    await this.logEvent(entry)
  }

  /**
   * Log admin action
   */
  static async logAdmin(
    action: string,
    req: Request,
    adminUserId: string,
    targetUserId?: string,
    success: boolean = true,
    details?: Record<string, any>
  ): Promise<void> {
    const entry: AuditLogEntry = {
      userId: adminUserId,
      action,
      resource: 'ADMIN',
      details: {
        ...details,
        targetUserId
      },
      ipAddress: TokenService.extractIpAddress(req),
      userAgent: TokenService.extractUserAgent(req),
      success,
      riskLevel: 'MEDIUM'
    }

    await this.logEvent(entry)
  }

  /**
   * Search audit logs
   */
  static async searchLogs(filters: AuditSearchFilters): Promise<{
    logs: any[]
    total: number
    hasMore: boolean
  }> {
    try {
      const whereClause: any = {}

      if (filters.userId) {
        whereClause.userId = filters.userId
      }

      if (filters.action) {
        whereClause.action = {
          contains: filters.action,
          mode: 'insensitive'
        }
      }

      if (filters.riskLevel) {
        whereClause.riskLevel = filters.riskLevel
      }

      if (filters.success !== undefined) {
        whereClause.success = filters.success
      }

      if (filters.ipAddress) {
        whereClause.ipAddress = filters.ipAddress
      }

      if (filters.startDate || filters.endDate) {
        whereClause.timestamp = {}
        if (filters.startDate) {
          whereClause.timestamp.gte = filters.startDate
        }
        if (filters.endDate) {
          whereClause.timestamp.lte = filters.endDate
        }
      }

      const limit = Math.min(filters.limit || 50, 1000) // Cap at 1000
      const offset = filters.offset || 0

      const [logs, total] = await Promise.all([
        prisma.adminAuditLog.findMany({
          where: whereClause,
          include: {
            user: {
              select: {
                username: true,
                role: true
              }
            }
          },
          orderBy: {
            timestamp: 'desc'
          },
          take: limit,
          skip: offset
        }),
        prisma.adminAuditLog.count({
          where: whereClause
        })
      ])

      return {
        logs: logs.map(log => ({
          ...log,
          details: log.details ? JSON.parse(log.details) : null
        })),
        total,
        hasMore: offset + limit < total
      }
    } catch (error) {
      console.error('[AuditService] Search logs error:', error)
      return { logs: [], total: 0, hasMore: false }
    }
  }

  /**
   * Get audit statistics
   */
  static async getAuditStats(
    startDate?: Date,
    endDate?: Date
  ): Promise<AuditStats> {
    try {
      const whereClause: any = {}

      if (startDate || endDate) {
        whereClause.timestamp = {}
        if (startDate) {
          whereClause.timestamp.gte = startDate
        }
        if (endDate) {
          whereClause.timestamp.lte = endDate
        }
      }

      // Basic counts
      const [totalEvents, successfulEvents, failedEvents, highRiskEvents] = await Promise.all([
        prisma.adminAuditLog.count({ where: whereClause }),
        prisma.adminAuditLog.count({ where: { ...whereClause, success: true } }),
        prisma.adminAuditLog.count({ where: { ...whereClause, success: false } }),
        prisma.adminAuditLog.count({
          where: {
            ...whereClause,
            riskLevel: { in: ['HIGH', 'CRITICAL'] }
          }
        })
      ])

      // Unique users
      const uniqueUserLogs = await prisma.adminAuditLog.findMany({
        where: {
          ...whereClause,
          userId: { not: null }
        },
        select: { userId: true },
        distinct: ['userId']
      })

      // Top actions
      const topActions = await prisma.adminAuditLog.groupBy({
        by: ['action'],
        where: whereClause,
        _count: { action: true },
        orderBy: { _count: { action: 'desc' } },
        take: 10
      })

      // Top risk levels
      const topRisks = await prisma.adminAuditLog.groupBy({
        by: ['riskLevel'],
        where: whereClause,
        _count: { riskLevel: true },
        orderBy: { _count: { riskLevel: 'desc' } }
      })

      // Suspicious IPs (many failed attempts)
      const suspiciousIpLogs = await prisma.adminAuditLog.groupBy({
        by: ['ipAddress'],
        where: {
          ...whereClause,
          success: false
        },
        _count: { ipAddress: true },
        having: {
          ipAddress: {
            _count: { gt: 5 }
          }
        },
        orderBy: { _count: { ipAddress: 'desc' } },
        take: 10
      })

      return {
        totalEvents,
        successfulEvents,
        failedEvents,
        highRiskEvents,
        uniqueUsers: uniqueUserLogs.length,
        topActions: topActions.map(item => ({
          action: item.action,
          count: item._count.action
        })),
        topRisks: topRisks.map(item => ({
          riskLevel: item.riskLevel,
          count: item._count.riskLevel
        })),
        suspiciousIps: suspiciousIpLogs.map(item => item.ipAddress)
      }
    } catch (error) {
      console.error('[AuditService] Get audit stats error:', error)
      return {
        totalEvents: 0,
        successfulEvents: 0,
        failedEvents: 0,
        highRiskEvents: 0,
        uniqueUsers: 0,
        topActions: [],
        topRisks: [],
        suspiciousIps: []
      }
    }
  }

  /**
   * Get security alerts (high-risk events)
   */
  static async getSecurityAlerts(hours: number = 24): Promise<any[]> {
    try {
      const startTime = new Date(Date.now() - hours * 60 * 60 * 1000)

      const alerts = await prisma.adminAuditLog.findMany({
        where: {
          timestamp: { gte: startTime },
          riskLevel: { in: ['HIGH', 'CRITICAL'] }
        },
        include: {
          user: {
            select: {
              username: true,
              role: true
            }
          }
        },
        orderBy: {
          timestamp: 'desc'
        },
        take: 100
      })

      return alerts.map(alert => ({
        ...alert,
        details: alert.details ? JSON.parse(alert.details) : null
      }))
    } catch (error) {
      console.error('[AuditService] Get security alerts error:', error)
      return []
    }
  }

  /**
   * Generate compliance report
   */
  static async generateComplianceReport(
    startDate: Date,
    endDate: Date
  ): Promise<{
    summary: AuditStats
    securityEvents: any[]
    adminActions: any[]
    dataAccess: any[]
    failedAttempts: any[]
  }> {
    try {
      const summary = await this.getAuditStats(startDate, endDate)

      const [securityEvents, adminActions, dataAccess, failedAttempts] = await Promise.all([
        this.searchLogs({
          startDate,
          endDate,
          action: 'SECURITY',
          limit: 1000
        }),
        this.searchLogs({
          startDate,
          endDate,
          action: 'ADMIN',
          limit: 1000
        }),
        this.searchLogs({
          startDate,
          endDate,
          action: 'DATA_',
          limit: 1000
        }),
        this.searchLogs({
          startDate,
          endDate,
          success: false,
          limit: 1000
        })
      ])

      return {
        summary,
        securityEvents: securityEvents.logs,
        adminActions: adminActions.logs,
        dataAccess: dataAccess.logs,
        failedAttempts: failedAttempts.logs
      }
    } catch (error) {
      console.error('[AuditService] Generate compliance report error:', error)
      throw new Error('Failed to generate compliance report')
    }
  }

  /**
   * Calculate risk level for an action
   */
  private static calculateRiskLevel(
    action: string,
    success: boolean,
    details?: Record<string, any>
  ): AuditRiskLevel {
    // Failed actions are generally higher risk
    if (!success) {
      if (action.includes('LOGIN') || action.includes('AUTH')) {
        return 'MEDIUM'
      }
      if (action.includes('ADMIN') || action.includes('SECURITY')) {
        return 'HIGH'
      }
      return 'LOW'
    }

    // High-risk actions
    if (this.HIGH_RISK_ACTIONS.has(action)) {
      return 'HIGH'
    }

    // Critical actions
    if (action.includes('CRITICAL') || action.includes('EMERGENCY')) {
      return 'CRITICAL'
    }

    // Admin actions are medium risk
    if (action.includes('ADMIN') || action.includes('PERMISSION')) {
      return 'MEDIUM'
    }

    // Security actions are medium risk
    if (action.includes('SECURITY') || action.includes('MFA')) {
      return 'MEDIUM'
    }

    // Data export is high risk
    if (action.includes('EXPORT') || action.includes('BULK')) {
      return 'HIGH'
    }

    // Default to low risk
    return 'LOW'
  }

  /**
   * Trigger security alert for high-risk events
   */
  private static async triggerSecurityAlert(
    entry: AuditLogEntry,
    riskLevel: AuditRiskLevel
  ): Promise<void> {
    try {
      // In production, integrate with alerting systems (email, Slack, PagerDuty, etc.)
      console.warn(`[SECURITY ALERT] ${riskLevel} risk event:`, {
        action: entry.action,
        userId: entry.userId,
        ipAddress: entry.ipAddress,
        success: entry.success,
        details: entry.details
      })

      // Store alert in database for dashboard
      await prisma.securityConfig.create({
        data: {
          key: `alert_${Date.now()}`,
          value: JSON.stringify({
            type: 'SECURITY_ALERT',
            riskLevel,
            entry,
            timestamp: new Date()
          }),
          description: `${riskLevel} risk security alert`
        }
      })
    } catch (error) {
      console.error('[AuditService] Trigger security alert error:', error)
    }
  }

  /**
   * Clean up old audit logs
   */
  static async cleanupOldLogs(retentionDays: number = 365): Promise<void> {
    try {
      const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000)

      // Keep critical events longer
      const deletedCount = await prisma.adminAuditLog.deleteMany({
        where: {
          timestamp: { lt: cutoffDate },
          riskLevel: { notIn: ['CRITICAL'] }
        }
      })

      console.log(`[AuditService] Cleaned up ${deletedCount.count} old audit logs`)
    } catch (error) {
      console.error('[AuditService] Cleanup old logs error:', error)
    }
  }

  /**
   * Archive old logs to external storage
   */
  static async archiveLogs(archiveDays: number = 90): Promise<void> {
    try {
      const cutoffDate = new Date(Date.now() - archiveDays * 24 * 60 * 60 * 1000)

      const logsToArchive = await prisma.adminAuditLog.findMany({
        where: {
          timestamp: { lt: cutoffDate }
        },
        orderBy: {
          timestamp: 'asc'
        }
      })

      if (logsToArchive.length > 0) {
        // In production, export to external storage (S3, etc.)
        console.log(`[AuditService] Would archive ${logsToArchive.length} audit logs`)
        
        // After successful archive, delete from main table
        // await prisma.adminAuditLog.deleteMany({
        //   where: {
        //     id: { in: logsToArchive.map(log => log.id) }
        //   }
        // })
      }
    } catch (error) {
      console.error('[AuditService] Archive logs error:', error)
    }
  }
}

export default AuditService
