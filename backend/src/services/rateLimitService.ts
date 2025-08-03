import { PrismaClient } from '@prisma/client'
import { Request } from 'express'
import { TokenService } from './tokenService'

const prisma = new PrismaClient()

export interface RateLimitConfig {
  windowMs?: number    // Time window in milliseconds
  maxAttempts?: number // Maximum attempts per window
  blockDurationMs?: number // How long to block after exceeding limit
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetTime: Date
  retryAfter?: number // Seconds until retry is allowed
  blocked: boolean
}

export interface LoginAttemptInfo {
  id: string
  username: string
  ipAddress: string
  userAgent: string | null
  success: boolean
  failReason?: string | null
  attemptedAt: Date
  riskScore: number
}

/**
 * Rate Limiting and Login Attempt Monitoring Service
 * Provides protection against brute force attacks and suspicious activity detection
 */
export class RateLimitService {
  // Default rate limit configurations
  private static readonly DEFAULT_CONFIGS: Record<string, Required<RateLimitConfig>> = {
    LOGIN: {
      windowMs: 15 * 60 * 1000,  // 15 minutes
      maxAttempts: 5,             // 5 attempts per 15 minutes
      blockDurationMs: 30 * 60 * 1000 // Block for 30 minutes
    },
    LOGIN_IP: {
      windowMs: 15 * 60 * 1000,  // 15 minutes
      maxAttempts: 10,            // 10 attempts per IP per 15 minutes
      blockDurationMs: 60 * 60 * 1000 // Block for 1 hour
    },
    PASSWORD_RESET: {
      windowMs: 60 * 60 * 1000,  // 1 hour
      maxAttempts: 3,             // 3 attempts per hour
      blockDurationMs: 24 * 60 * 60 * 1000 // Block for 24 hours
    },
    API_CALL: {
      windowMs: 60 * 1000,       // 1 minute
      maxAttempts: 100,           // 100 API calls per minute
      blockDurationMs: 5 * 60 * 1000 // Block for 5 minutes
    }
  }

  /**
   * Check rate limit for an action
   */
  static async checkRateLimit(
    identifier: string,
    action: string,
    customConfig?: Partial<RateLimitConfig>
  ): Promise<RateLimitResult> {
    try {
      const defaultConfig = this.DEFAULT_CONFIGS[action]
      if (!defaultConfig) {
        throw new Error(`Unknown action: ${action}`)
      }

      const config = { ...defaultConfig, ...customConfig }

      const now = new Date()
      const windowStart = new Date(now.getTime() - config.windowMs)

      // Find or create rate limit record
      let record = await prisma.rateLimitRecord.findFirst({
        where: {
          identifier,
          action,
          windowStart: {
            lte: now
          },
          windowEnd: {
            gt: now
          }
        }
      })

      // If no active window, create new record
      if (!record) {
        record = await prisma.rateLimitRecord.create({
          data: {
            identifier,
            action,
            attempts: 0,
            windowStart: now,
            windowEnd: new Date(now.getTime() + config.windowMs),
            isBlocked: false
          }
        })
      }

      // Check if currently blocked
      if (record.isBlocked) {
        const blockEndTime = new Date(record.windowEnd.getTime() + config.blockDurationMs)
        if (now < blockEndTime) {
          return {
            allowed: false,
            remaining: 0,
            resetTime: blockEndTime,
            retryAfter: Math.ceil((blockEndTime.getTime() - now.getTime()) / 1000),
            blocked: true
          }
        } else {
          // Block period expired, reset record
          record = await prisma.rateLimitRecord.update({
            where: { id: record.id },
            data: {
              attempts: 0,
              windowStart: now,
              windowEnd: new Date(now.getTime() + config.windowMs),
              isBlocked: false
            }
          })
        }
      }

      // Check if within limits
      if (record.attempts < config.maxAttempts) {
        return {
          allowed: true,
          remaining: config.maxAttempts - record.attempts,
          resetTime: record.windowEnd,
          blocked: false
        }
      }

      // Rate limit exceeded, block the identifier
      await prisma.rateLimitRecord.update({
        where: { id: record.id },
        data: { isBlocked: true }
      })

      const blockEndTime = new Date(record.windowEnd.getTime() + config.blockDurationMs)
      return {
        allowed: false,
        remaining: 0,
        resetTime: blockEndTime,
        retryAfter: Math.ceil((blockEndTime.getTime() - now.getTime()) / 1000),
        blocked: true
      }
    } catch (error) {
      console.error('[RateLimitService] Check rate limit error:', error)
      // On error, allow the request to prevent service disruption
      return {
        allowed: true,
        remaining: 1,
        resetTime: new Date(Date.now() + 15 * 60 * 1000),
        blocked: false
      }
    }
  }

  /**
   * Record rate limit attempt
   */
  static async recordAttempt(identifier: string, action: string): Promise<void> {
    try {
      const now = new Date()

      await prisma.rateLimitRecord.updateMany({
        where: {
          identifier,
          action,
          windowStart: {
            lte: now
          },
          windowEnd: {
            gt: now
          }
        },
        data: {
          attempts: {
            increment: 1
          }
        }
      })
    } catch (error) {
      console.error('[RateLimitService] Record attempt error:', error)
    }
  }

  /**
   * Record login attempt with detailed tracking
   */
  static async recordLoginAttempt(
    username: string,
    ipAddress: string,
    userAgent: string,
    success: boolean,
    failReason?: string,
    userId?: string
  ): Promise<void> {
    try {
      // Calculate risk score
      const riskScore = await this.calculateRiskScore(username, ipAddress, success)

      // Record the attempt
      await prisma.adminLoginAttempt.create({
        data: {
          userId: userId || null,
          username,
          ipAddress,
          userAgent,
          success,
          failReason: failReason || null,
          attemptedAt: new Date()
        }
      })

      // If failed attempt, update user's failed attempts counter
      if (!success && userId) {
        await prisma.adminUser.update({
          where: { id: userId },
          data: {
            failedAttempts: {
              increment: 1
            },
            lastFailedAt: new Date()
          }
        })

        // Auto-lock account after too many failed attempts
        const user = await prisma.adminUser.findUnique({
          where: { id: userId },
          select: { failedAttempts: true }
        })

        if (user && user.failedAttempts >= 10) {
          await this.lockUserAccount(userId, 'TOO_MANY_FAILED_ATTEMPTS')
        }
      }

      // If successful, reset failed attempts counter
      if (success && userId) {
        await prisma.adminUser.update({
          where: { id: userId },
          data: {
            failedAttempts: 0,
            lastFailedAt: null,
            lastLoginAt: new Date(),
            lastLoginIp: ipAddress
          }
        })
      }
    } catch (error) {
      console.error('[RateLimitService] Record login attempt error:', error)
    }
  }

  /**
   * Get login attempts for analysis
   */
  static async getLoginAttempts(
    filters?: {
      username?: string
      ipAddress?: string
      success?: boolean
      timeRangeHours?: number
      limit?: number
    }
  ): Promise<LoginAttemptInfo[]> {
    try {
      const whereClause: any = {}

      if (filters?.username) {
        whereClause.username = filters.username
      }

      if (filters?.ipAddress) {
        whereClause.ipAddress = filters.ipAddress
      }

      if (filters?.success !== undefined) {
        whereClause.success = filters.success
      }

      if (filters?.timeRangeHours) {
        whereClause.attemptedAt = {
          gte: new Date(Date.now() - filters.timeRangeHours * 60 * 60 * 1000)
        }
      }

      const attempts = await prisma.adminLoginAttempt.findMany({
        where: whereClause,
        orderBy: {
          attemptedAt: 'desc'
        },
        take: filters?.limit || 100,
        select: {
          id: true,
          username: true,
          ipAddress: true,
          userAgent: true,
          success: true,
          failReason: true,
          attemptedAt: true
        }
      })

      return attempts.map(attempt => ({
        ...attempt,
        riskScore: 0 // Calculate on demand if needed
      }))
    } catch (error) {
      console.error('[RateLimitService] Get login attempts error:', error)
      return []
    }
  }

  /**
   * Detect suspicious login patterns
   */
  static async detectSuspiciousActivity(): Promise<{
    suspiciousIps: string[]
    bruteForceAttempts: string[]
    multipleFailedUsers: string[]
  }> {
    try {
      const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000)

      // Suspicious IPs (many failed attempts from same IP)
      const suspiciousIps = await prisma.adminLoginAttempt.groupBy({
        by: ['ipAddress'],
        where: {
          success: false,
          attemptedAt: {
            gte: last24Hours
          }
        },
        having: {
          ipAddress: {
            _count: {
              gt: 5
            }
          }
        },
        _count: {
          ipAddress: true
        }
      })

      // Brute force attempts (rapid attempts from same IP)
      const last1Hour = new Date(Date.now() - 60 * 60 * 1000)
      const bruteForceAttempts = await prisma.adminLoginAttempt.groupBy({
        by: ['ipAddress'],
        where: {
          attemptedAt: {
            gte: last1Hour
          }
        },
        having: {
          ipAddress: {
            _count: {
              gt: 10
            }
          }
        },
        _count: {
          ipAddress: true
        }
      })

      // Multiple failed users (trying many different usernames)
      const multipleFailedUsers = await prisma.adminLoginAttempt.groupBy({
        by: ['ipAddress'],
        where: {
          success: false,
          attemptedAt: {
            gte: last24Hours
          }
        },
        having: {
          username: {
            _count: {
              gt: 3
            }
          }
        }
      })

      return {
        suspiciousIps: suspiciousIps.map(item => item.ipAddress),
        bruteForceAttempts: bruteForceAttempts.map(item => item.ipAddress),
        multipleFailedUsers: multipleFailedUsers.map(item => item.ipAddress)
      }
    } catch (error) {
      console.error('[RateLimitService] Detect suspicious activity error:', error)
      return {
        suspiciousIps: [],
        bruteForceAttempts: [],
        multipleFailedUsers: []
      }
    }
  }

  /**
   * Lock user account
   */
  static async lockUserAccount(userId: string, reason: string, durationHours?: number): Promise<void> {
    try {
      const lockUntil = durationHours 
        ? new Date(Date.now() + durationHours * 60 * 60 * 1000)
        : null

      await prisma.adminUser.update({
        where: { id: userId },
        data: {
          isLocked: true,
          lockReason: reason,
          lockedAt: new Date(),
          lockedUntil: lockUntil
        }
      })

      // Log the lock action
      await prisma.adminAuditLog.create({
        data: {
          userId,
          action: 'ACCOUNT_LOCKED',
          details: JSON.stringify({ reason, lockUntil }),
          ipAddress: '127.0.0.1', // System action
          success: true,
          riskLevel: 'HIGH'
        }
      })
    } catch (error) {
      console.error('[RateLimitService] Lock user account error:', error)
    }
  }

  /**
   * Unlock user account
   */
  static async unlockUserAccount(userId: string, reason: string): Promise<void> {
    try {
      await prisma.adminUser.update({
        where: { id: userId },
        data: {
          isLocked: false,
          lockReason: null,
          lockedAt: null,
          lockedUntil: null,
          failedAttempts: 0
        }
      })

      // Log the unlock action
      await prisma.adminAuditLog.create({
        data: {
          userId,
          action: 'ACCOUNT_UNLOCKED',
          details: JSON.stringify({ reason }),
          ipAddress: '127.0.0.1', // System action
          success: true,
          riskLevel: 'MEDIUM'
        }
      })
    } catch (error) {
      console.error('[RateLimitService] Unlock user account error:', error)
    }
  }

  /**
   * Check if user account is locked
   */
  static async isUserLocked(userId: string): Promise<{
    locked: boolean
    reason?: string
    lockedUntil?: Date
  }> {
    try {
      const user = await prisma.adminUser.findUnique({
        where: { id: userId },
        select: {
          isLocked: true,
          lockReason: true,
          lockedUntil: true
        }
      })

      if (!user || !user.isLocked) {
        return { locked: false }
      }

      // Check if temporary lock has expired
      if (user.lockedUntil && new Date() > user.lockedUntil) {
        await this.unlockUserAccount(userId, 'LOCK_EXPIRED')
        return { locked: false }
      }

      const result: { locked: boolean; reason?: string; lockedUntil?: Date } = {
        locked: true
      }

      if (user.lockReason) {
        result.reason = user.lockReason
      }

      if (user.lockedUntil) {
        result.lockedUntil = user.lockedUntil
      }

      return result
    } catch (error) {
      console.error('[RateLimitService] Check user locked error:', error)
      return { locked: false }
    }
  }

  /**
   * Calculate risk score for login attempt
   */
  private static async calculateRiskScore(
    username: string,
    ipAddress: string,
    success: boolean
  ): Promise<number> {
    try {
      let riskScore = 0

      const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000)

      // Previous failed attempts from this IP
      const ipFailures = await prisma.adminLoginAttempt.count({
        where: {
          ipAddress,
          success: false,
          attemptedAt: {
            gte: last24Hours
          }
        }
      })

      riskScore += Math.min(ipFailures * 10, 50) // Max 50 points for IP history

      // Previous failed attempts for this username
      const usernameFailures = await prisma.adminLoginAttempt.count({
        where: {
          username,
          success: false,
          attemptedAt: {
            gte: last24Hours
          }
        }
      })

      riskScore += Math.min(usernameFailures * 15, 30) // Max 30 points for username history

      // Time-based risk (late night attempts are more suspicious)
      const hour = new Date().getHours()
      if (hour >= 22 || hour <= 6) {
        riskScore += 10
      }

      // Failed attempt adds risk
      if (!success) {
        riskScore += 10
      }

      return Math.min(riskScore, 100) // Cap at 100
    } catch (error) {
      console.error('[RateLimitService] Calculate risk score error:', error)
      return 0
    }
  }

  /**
   * Clean up old rate limit records
   */
  static async cleanupOldRecords(): Promise<void> {
    try {
      const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days old

      // Clean up expired rate limit records
      await prisma.rateLimitRecord.deleteMany({
        where: {
          windowEnd: {
            lt: cutoffDate
          }
        }
      })

      // Clean up old login attempts (keep for 30 days)
      const loginCutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      await prisma.adminLoginAttempt.deleteMany({
        where: {
          attemptedAt: {
            lt: loginCutoffDate
          }
        }
      })

      console.log('[RateLimitService] Old records cleanup completed')
    } catch (error) {
      console.error('[RateLimitService] Cleanup old records error:', error)
    }
  }
}

export default RateLimitService