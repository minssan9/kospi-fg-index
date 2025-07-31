import express from 'express'
import { Request, Response } from 'express'
import os from 'os'
import { performance } from 'perf_hooks'
import { DatabaseService } from '../services/databaseService'
import { FearGreedCalculator } from '../services/fearGreedCalculator'
import { KRXCollector } from '../collectors/krxCollector'
import { BOKCollector } from '../collectors/bokCollector'
import { formatDate } from '../utils/dateUtils'
import { 
  enhancedLogin,
  enhancedLogout,
  requireAdmin, 
  requirePermission,
  requireAdminRole,
  requireMfaVerification,
  securityHeaders,
  AuthenticatedRequest,
  LoginRequest 
} from '../middleware/adminAuth'
import TokenService from '../services/tokenService'
import SessionService from '../services/sessionService'
import RateLimitService from '../services/rateLimitService'
import PasswordPolicyService from '../services/passwordPolicyService'
import MfaService from '../services/mfaService'
import AuditService from '../services/auditService'
import { PrismaClient, AdminRole } from '@prisma/client'

// Enhanced monitoring services
import MonitoringService from '../services/monitoringService'
import AlertService from '../services/alertService'
import BusinessMetricsService from '../services/businessMetricsService'
import DatabaseHealthService from '../services/databaseHealthService'

const router = express.Router()
const prisma = new PrismaClient()

// Apply security headers to all admin routes
router.use(securityHeaders)

// ============================================================================
// AUTHENTICATION ROUTES
// ============================================================================

/**
 * Enhanced Admin Login
 * POST /api/admin/login
 * Body: { username: string, password: string, mfaToken?: string, rememberMe?: boolean }
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const loginData: LoginRequest = {
      username: req.body.username,
      password: req.body.password,
      mfaToken: req.body.mfaToken,
      rememberMe: req.body.rememberMe
    }

    // Validate input
    if (!loginData.username || !loginData.password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required.',
        code: 'MISSING_CREDENTIALS'
      })
    }

    // Use enhanced login
    const loginResult = await enhancedLogin(req, loginData)
    
    if (loginResult.success && loginResult.data) {
      // Set refresh token in httpOnly cookie
      res.cookie('refreshToken', loginResult.data.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      })
    }

    return res.status(loginResult.success ? 200 : 401).json(loginResult)
  } catch (error) {
    console.error('[Admin] Login error:', error)
    return res.status(500).json({
      success: false,
      message: 'Login processing error occurred.',
      code: 'LOGIN_ERROR'
    })
  }
})

/**
 * Enhanced Admin Logout
 * POST /api/admin/logout
 */
router.post('/logout', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const logoutResult = await enhancedLogout(req)
    
    // Clear refresh token cookie
    res.clearCookie('refreshToken')
    
    return res.json(logoutResult)
  } catch (error) {
    console.error('[Admin] Logout error:', error)
    return res.status(500).json({
      success: false,
      message: 'Logout error occurred.',
      code: 'LOGOUT_ERROR'
    })
  }
})

/**
 * Refresh Access Token
 * POST /api/admin/refresh
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies.refreshToken || req.headers['x-refresh-token'] as string
    
    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token required.',
        code: 'MISSING_REFRESH_TOKEN'
      })
    }

    const ipAddress = TokenService.extractIpAddress(req)
    const newTokenPair = await TokenService.refreshAccessToken(refreshToken, ipAddress)
    
    if (!newTokenPair) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token.',
        code: 'INVALID_REFRESH_TOKEN'
      })
    }

    // Update refresh token cookie
    res.cookie('refreshToken', newTokenPair.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    })

    return res.json({
      success: true,
      message: 'Token refreshed successfully.',
      data: {
        accessToken: newTokenPair.accessToken,
        expiresAt: newTokenPair.expiresAt
      }
    })
  } catch (error) {
    console.error('[Admin] Token refresh error:', error)
    return res.status(500).json({
      success: false,
      message: 'Token refresh error occurred.',
      code: 'REFRESH_ERROR'
    })
  }
})

/**
 * Get Current User Profile
 * GET /api/admin/me
 */
router.get('/me', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.admin!
    const sessions = await SessionService.getUserActiveSessions(user.id)
    const mfaStatus = await MfaService.getMfaStatus(user.id)
    const passwordStatus = await PasswordPolicyService.needsPasswordChange(user.id)

    return res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          permissions: user.permissions,
          lastLogin: user.lastLogin,
          mfaEnabled: user.mfaEnabled,
          isActive: user.isActive,
          mustChangePassword: user.mustChangePassword
        },
        sessions: {
          active: sessions.length,
          current: req.sessionId
        },
        mfa: mfaStatus,
        password: passwordStatus
      }
    })
  } catch (error) {
    console.error('[Admin] Get profile error:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to get user profile.',
      code: 'PROFILE_ERROR'
    })
  }
})

// ============================================================================
// USER MANAGEMENT ROUTES (Admin Only)
// ============================================================================

/**
 * Get All Admin Users
 * GET /api/admin/users?page=1&limit=20&search=username&role=ADMIN
 */
router.get('/users', requireAdmin, requireAdminRole(), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100)
    const search = req.query.search as string
    const role = req.query.role as AdminRole
    const offset = (page - 1) * limit

    const whereClause: any = {}
    
    if (search) {
      whereClause.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } }
      ]
    }
    
    if (role) {
      whereClause.role = role
    }

    const [users, total] = await Promise.all([
      prisma.adminUser.findMany({
        where: whereClause,
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          permissions: true,
          isActive: true,
          isLocked: true,
          mfaEnabled: true,
          firstName: true,
          lastName: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              sessions: {
                where: {
                  isActive: true,
                  expiresAt: { gt: new Date() }
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit
      }),
      prisma.adminUser.count({ where: whereClause })
    ])

    await AuditService.logAdmin(
      'USERS_LISTED',
      req,
      req.admin!.id,
      undefined,
      true,
      { page, limit, search, role, total }
    )

    return res.json({
      success: true,
      data: {
        users: users.map(user => ({
          ...user,
          activeSessions: user._count.sessions
        })),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          hasNext: offset + limit < total,
          hasPrev: page > 1
        }
      }
    })
  } catch (error) {
    console.error('[Admin] Get users error:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve users.',
      code: 'USERS_GET_ERROR'
    })
  }
})

/**
 * Create New Admin User
 * POST /api/admin/users
 * Body: { username, email?, password, role, permissions?, firstName?, lastName? }
 */
router.post('/users', requireAdmin, requireAdminRole(), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      username,
      email,
      password,
      role,
      permissions = [],
      firstName,
      lastName
    } = req.body

    // Validate required fields
    if (!username || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Username, password, and role are required.',
        code: 'MISSING_REQUIRED_FIELDS'
      })
    }

    // Validate role
    if (!['SUPER_ADMIN', 'ADMIN', 'VIEWER', 'ANALYST'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role specified.',
        code: 'INVALID_ROLE'
      })
    }

    // Check if username already exists
    const existingUser = await prisma.adminUser.findUnique({
      where: { username }
    })

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Username already exists.',
        code: 'USERNAME_EXISTS'
      })
    }

    // Check if email already exists (if provided)
    if (email) {
      const existingEmail = await prisma.adminUser.findUnique({
        where: { email }
      })

      if (existingEmail) {
        return res.status(409).json({
          success: false,
          message: 'Email already exists.',
          code: 'EMAIL_EXISTS'
        })
      }
    }

    // Validate password
    const passwordValidation = await PasswordPolicyService.validatePassword(
      password,
      { username, email, firstName, lastName }
    )

    if (!passwordValidation.valid) {
      return res.status(400).json({
        success: false,
        message: 'Password does not meet policy requirements.',
        code: 'INVALID_PASSWORD',
        errors: passwordValidation.errors
      })
    }

    // Hash password
    const hashedPassword = await PasswordPolicyService.hashPassword(password)

    // Create user
    const newUser = await prisma.adminUser.create({
      data: {
        username,
        email: email || null,
        passwordHash: hashedPassword,
        role,
        permissions,
        firstName: firstName || null,
        lastName: lastName || null,
        isActive: true,
        mustChangePassword: true // Force password change on first login
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        permissions: true,
        isActive: true,
        firstName: true,
        lastName: true,
        createdAt: true
      }
    })

    await AuditService.logAdmin(
      'USER_CREATED',
      req,
      req.admin!.id,
      newUser.id,
      true,
      { username, role, permissions }
    )

    return res.status(201).json({
      success: true,
      message: 'User created successfully.',
      data: { user: newUser }
    })
  } catch (error) {
    console.error('[Admin] Create user error:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to create user.',
      code: 'USER_CREATE_ERROR'
    })
  }
})

/**
 * Get Specific Admin User
 * GET /api/admin/users/:id
 */
router.get('/users/:id', requireAdmin, requireAdminRole(), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params

    const user = await prisma.adminUser.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        permissions: true,
        isActive: true,
        isLocked: true,
        lockReason: true,
        lockedUntil: true,
        mfaEnabled: true,
        firstName: true,
        lastName: true,
        lastLoginAt: true,
        lastLoginIp: true,
        failedAttempts: true,
        passwordChangedAt: true,
        mustChangePassword: true,
        createdAt: true,
        updatedAt: true,
        sessions: {
          where: {
            isActive: true,
            expiresAt: { gt: new Date() }
          },
          select: {
            id: true,
            sessionId: true,
            ipAddress: true,
            userAgent: true,
            lastUsedAt: true,
            createdAt: true,
            expiresAt: true
          },
          orderBy: { lastUsedAt: 'desc' }
        },
        loginAttempts: {
          orderBy: { attemptedAt: 'desc' },
          take: 10,
          select: {
            id: true,
            ipAddress: true,
            userAgent: true,
            success: true,
            failReason: true,
            attemptedAt: true
          }
        }
      }
    })

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
        code: 'USER_NOT_FOUND'
      })
    }

    // Get MFA status
    const mfaStatus = await MfaService.getMfaStatus(user.id)
    const passwordStatus = await PasswordPolicyService.needsPasswordChange(user.id)

    await AuditService.logAdmin(
      'USER_VIEWED',
      req,
      req.admin!.id,
      user.id,
      true
    )

    return res.json({
      success: true,
      data: {
        user: {
          ...user,
          mfa: mfaStatus,
          password: passwordStatus
        }
      }
    })
  } catch (error) {
    console.error('[Admin] Get user error:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve user.',
      code: 'USER_GET_ERROR'
    })
  }
})

/**
 * Update Admin User
 * PUT /api/admin/users/:id
 * Body: { email?, role?, permissions?, firstName?, lastName?, isActive? }
 */
router.put('/users/:id', requireAdmin, requireAdminRole(), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params
    const {
      email,
      role,
      permissions,
      firstName,
      lastName,
      isActive
    } = req.body

    // Check if user exists
    const existingUser = await prisma.adminUser.findUnique({
      where: { id },
      select: { id: true, username: true, role: true }
    })

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
        code: 'USER_NOT_FOUND'
      })
    }

    // Prevent self-modification of critical fields
    if (id === req.admin!.id) {
      if (role && role !== existingUser.role) {
        return res.status(403).json({
          success: false,
          message: 'Cannot modify your own role.',
          code: 'SELF_ROLE_MODIFICATION'
        })
      }
      if (isActive === false) {
        return res.status(403).json({
          success: false,
          message: 'Cannot deactivate your own account.',
          code: 'SELF_DEACTIVATION'
        })
      }
    }

    // Validate role if provided
    if (role && !['SUPER_ADMIN', 'ADMIN', 'VIEWER', 'ANALYST'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role specified.',
        code: 'INVALID_ROLE'
      })
    }

    // Check if email already exists (if provided and different)
    if (email) {
      const existingEmail = await prisma.adminUser.findFirst({
        where: {
          email,
          id: { not: id }
        }
      })

      if (existingEmail) {
        return res.status(409).json({
          success: false,
          message: 'Email already exists.',
          code: 'EMAIL_EXISTS'
        })
      }
    }

    // Update user
    const updatedUser = await prisma.adminUser.update({
      where: { id },
      data: {
        ...(email !== undefined && { email }),
        ...(role !== undefined && { role }),
        ...(permissions !== undefined && { permissions }),
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
        ...(isActive !== undefined && { isActive })
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        permissions: true,
        isActive: true,
        firstName: true,
        lastName: true,
        updatedAt: true
      }
    })

    // If user was deactivated, terminate all sessions
    if (isActive === false) {
      await TokenService.revokeAllUserTokens(id)
    }

    await AuditService.logAdmin(
      'USER_UPDATED',
      req,
      req.admin!.id,
      id,
      true,
      { changes: { email, role, permissions, firstName, lastName, isActive } }
    )

    return res.json({
      success: true,
      message: 'User updated successfully.',
      data: { user: updatedUser }
    })
  } catch (error) {
    console.error('[Admin] Update user error:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to update user.',
      code: 'USER_UPDATE_ERROR'
    })
  }
})

/**
 * Delete Admin User
 * DELETE /api/admin/users/:id
 */
router.delete('/users/:id', requireAdmin, requireAdminRole(), requireMfaVerification(), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params

    // Check if user exists
    const existingUser = await prisma.adminUser.findUnique({
      where: { id },
      select: { id: true, username: true, role: true }
    })

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
        code: 'USER_NOT_FOUND'
      })
    }

    // Prevent self-deletion
    if (id === req.admin!.id) {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete your own account.',
        code: 'SELF_DELETION'
      })
    }

    // Revoke all user sessions first
    await TokenService.revokeAllUserTokens(id)

    // Delete user (cascade will handle related records)
    await prisma.adminUser.delete({
      where: { id }
    })

    await AuditService.logAdmin(
      'USER_DELETED',
      req,
      req.admin!.id,
      id,
      true,
      { deletedUser: { username: existingUser.username, role: existingUser.role } }
    )

    return res.json({
      success: true,
      message: 'User deleted successfully.'
    })
  } catch (error) {
    console.error('[Admin] Delete user error:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to delete user.',
      code: 'USER_DELETE_ERROR'
    })
  }
})

/**
 * Lock/Unlock User Account
 * PATCH /api/admin/users/:id/lock
 * Body: { action: 'lock' | 'unlock', reason?: string, durationHours?: number }
 */
router.patch('/users/:id/lock', requireAdmin, requireAdminRole(), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params
    const { action, reason, durationHours } = req.body

    if (!['lock', 'unlock'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Must be "lock" or "unlock".',
        code: 'INVALID_ACTION'
      })
    }

    // Check if user exists
    const user = await prisma.adminUser.findUnique({
      where: { id },
      select: { id: true, username: true, isLocked: true }
    })

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
        code: 'USER_NOT_FOUND'
      })
    }

    // Prevent self-locking
    if (id === req.admin!.id && action === 'lock') {
      return res.status(403).json({
        success: false,
        message: 'Cannot lock your own account.',
        code: 'SELF_LOCK'
      })
    }

    if (action === 'lock') {
      await RateLimitService.lockUserAccount(id, reason || 'Admin action', durationHours)
    } else {
      await RateLimitService.unlockUserAccount(id, reason || 'Admin action')
    }

    await AuditService.logAdmin(
      action === 'lock' ? 'USER_LOCKED' : 'USER_UNLOCKED',
      req,
      req.admin!.id,
      id,
      true,
      { reason, durationHours }
    )

    return res.json({
      success: true,
      message: `User ${action}ed successfully.`,
      data: {
        userId: id,
        action,
        reason,
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error(`[Admin] ${req.body.action} user error:`, error)
    return res.status(500).json({
      success: false,
      message: `Failed to ${req.body.action} user.`,
      code: 'USER_LOCK_ERROR'
    })
  }
})

/**
 * Reset User Password
 * PATCH /api/admin/users/:id/reset-password
 * Body: { newPassword: string, forceChange?: boolean }
 */
router.patch('/users/:id/reset-password', requireAdmin, requireAdminRole(), requireMfaVerification(), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params
    const { newPassword, forceChange = true } = req.body

    if (!newPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password is required.',
        code: 'MISSING_PASSWORD'
      })
    }

    // Check if user exists
    const user = await prisma.adminUser.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true
      }
    })

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
        code: 'USER_NOT_FOUND'
      })
    }

    // Update password using policy service
    const result = await PasswordPolicyService.updateUserPassword(id, newPassword, {
      username: user.username,
      email: user.email || undefined,
      firstName: user.firstName || undefined,
      lastName: user.lastName || undefined
    })

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: 'Password update failed.',
        code: 'PASSWORD_UPDATE_FAILED',
        errors: result.errors
      })
    }

    // Force password change on next login if requested
    if (forceChange) {
      await prisma.adminUser.update({
        where: { id },
        data: { mustChangePassword: true }
      })
    }

    // Revoke all user sessions to force re-login
    await TokenService.revokeAllUserTokens(id)

    await AuditService.logAdmin(
      'PASSWORD_RESET_ADMIN',
      req,
      req.admin!.id,
      id,
      true,
      { forceChange, resetBy: req.admin!.username }
    )

    return res.json({
      success: true,
      message: 'Password reset successfully.',
      data: {
        userId: id,
        forceChange,
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('[Admin] Reset password error:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to reset password.',
      code: 'PASSWORD_RESET_ERROR'
    })
  }
})

/**
 * Terminate User Sessions
 * POST /api/admin/users/:id/terminate-sessions
 * Body: { sessionId?: string, all?: boolean }
 */
router.post('/users/:id/terminate-sessions', requireAdmin, requireAdminRole(), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params
    const { sessionId, all = false } = req.body

    // Check if user exists
    const user = await prisma.adminUser.findUnique({
      where: { id },
      select: { id: true, username: true }
    })

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
        code: 'USER_NOT_FOUND'
      })
    }

    let terminatedCount = 0

    if (all) {
      // Terminate all sessions
      const success = await TokenService.revokeAllUserTokens(id)
      if (success) {
        const sessions = await SessionService.getUserActiveSessions(id)
        terminatedCount = sessions.length
      }
    } else if (sessionId) {
      // Terminate specific session
      const success = await SessionService.terminateSession(sessionId, id, 'ADMIN_TERMINATED')
      if (success) {
        terminatedCount = 1
      }
    } else {
      return res.status(400).json({
        success: false,
        message: 'Either sessionId or all=true must be specified.',
        code: 'INVALID_TERMINATION_REQUEST'
      })
    }

    await AuditService.logAdmin(
      'SESSIONS_TERMINATED',
      req,
      req.admin!.id,
      id,
      true,
      { sessionId, all, terminatedCount }
    )

    return res.json({
      success: true,
      message: `${terminatedCount} session(s) terminated successfully.`,
      data: {
        userId: id,
        terminatedCount,
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('[Admin] Terminate sessions error:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to terminate sessions.',
      code: 'SESSION_TERMINATION_ERROR'
    })
  }
})

// ============================================================================
// SESSION MANAGEMENT ROUTES
// ============================================================================

/**
 * Get User Sessions
 * GET /api/admin/sessions?userId=:id
 */
router.get('/sessions', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.query.userId as string || req.admin!.id
    
    // Only allow viewing own sessions unless admin role
    if (userId !== req.admin!.id && !['SUPER_ADMIN', 'ADMIN'].includes(req.admin!.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to view other user sessions.',
        code: 'INSUFFICIENT_PERMISSIONS'
      })
    }

    const sessions = await SessionService.getUserActiveSessions(userId)
    const stats = await SessionService.getSessionStats()

    return res.json({
      success: true,
      data: {
        sessions,
        stats,
        currentSession: req.sessionId
      }
    })
  } catch (error) {
    console.error('[Admin] Get sessions error:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve sessions.',
      code: 'SESSIONS_GET_ERROR'
    })
  }
})

// ============================================================================
// SECURITY & AUDIT ROUTES
// ============================================================================

/**
 * Get Audit Logs
 * GET /api/admin/audit-logs?page=1&limit=50&userId=&action=&riskLevel=&success=
 */
router.get('/audit-logs', requireAdmin, requireAdminRole(), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 1000)
    const userId = req.query.userId as string
    const action = req.query.action as string
    const riskLevel = req.query.riskLevel as any
    const success = req.query.success !== undefined ? req.query.success === 'true' : undefined
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined

    const filters = {
      userId,
      action,
      riskLevel,
      success,
      startDate,
      endDate,
      limit,
      offset: (page - 1) * limit
    }

    const result = await AuditService.searchLogs(filters)

    return res.json({
      success: true,
      data: {
        logs: result.logs,
        pagination: {
          page,
          limit,
          total: result.total,
          pages: Math.ceil(result.total / limit),
          hasMore: result.hasMore
        }
      }
    })
  } catch (error) {
    console.error('[Admin] Get audit logs error:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve audit logs.',
      code: 'AUDIT_LOGS_ERROR'
    })
  }
})

/**
 * Get Security Alerts
 * GET /api/admin/security-alerts?hours=24
 */
router.get('/security-alerts', requireAdmin, requireAdminRole(), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const hours = Math.min(parseInt(req.query.hours as string) || 24, 168) // Max 7 days
    
    const alerts = await AuditService.getSecurityAlerts(hours)
    const suspiciousActivity = await RateLimitService.detectSuspiciousActivity()
    
    return res.json({
      success: true,
      data: {
        alerts,
        suspiciousActivity,
        timeRange: hours
      }
    })
  } catch (error) {
    console.error('[Admin] Get security alerts error:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve security alerts.',
      code: 'SECURITY_ALERTS_ERROR'
    })
  }
})

/**
 * Get Login Attempts
 * GET /api/admin/login-attempts?username=&ipAddress=&success=&hours=24&limit=100
 */
router.get('/login-attempts', requireAdmin, requireAdminRole(), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const username = req.query.username as string
    const ipAddress = req.query.ipAddress as string
    const success = req.query.success !== undefined ? req.query.success === 'true' : undefined
    const hours = Math.min(parseInt(req.query.hours as string) || 24, 168) // Max 7 days
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 1000)

    const filters = {
      username,
      ipAddress,
      success,
      timeRangeHours: hours,
      limit
    }

    const attempts = await RateLimitService.getLoginAttempts(filters)

    return res.json({
      success: true,
      data: {
        attempts,
        filters
      }
    })
  } catch (error) {
    console.error('[Admin] Get login attempts error:', error)
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve login attempts.',
      code: 'LOGIN_ATTEMPTS_ERROR'
    })
  }
})

// ============================================================================
// SYSTEM MONITORING ROUTES (Protected)
// ============================================================================

/**
 * System Health Check
 * GET /api/admin/system-health
 */
router.get('/system-health', requireAdmin, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const startTime = performance.now()
    
    // Check database connection
    let dbStatus = 'HEALTHY'
    let dbResponseTime = 0
    let dbConnections = 0
    
    try {
      const dbStart = performance.now()
      await DatabaseService.getLatestFearGreedIndex()
      dbResponseTime = Math.round(performance.now() - dbStart)
      dbConnections = 15 // Mock connection count
    } catch (error) {
      dbStatus = 'ERROR'
      dbResponseTime = -1
    }

    // API health check
    const apiResponseTime = Math.round(performance.now() - startTime)
    const uptime = process.uptime()
    const uptimeString = `${Math.floor(uptime / 86400)}d ${Math.floor((uptime % 86400) / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`

    // Data collection status
    let collectionStatus = 'IDLE'
    let collectionSuccessRate = 95.6
    let lastCollectionTime = new Date().toISOString()

    try {
      const recentLogs = await DatabaseService.getDataCollectionStatus(7)
      const successCount = recentLogs.filter(log => log.status === 'SUCCESS').length
      collectionSuccessRate = recentLogs.length > 0 ? (successCount / recentLogs.length) * 100 : 0
      if (recentLogs.length > 0 && recentLogs[0] && recentLogs[0].createdAt) {
        lastCollectionTime = recentLogs[0].createdAt.toISOString()
      }
    } catch (error) {
      console.warn('[Admin] Failed to get collection status:', error)
    }

    const healthData = {
      database: {
        status: dbStatus,
        responseTime: dbResponseTime,
        connections: dbConnections
      },
      api: {
        status: 'HEALTHY',
        responseTime: apiResponseTime,
        uptime: uptimeString
      },
      dataCollection: {
        lastRun: lastCollectionTime,
        status: collectionStatus,
        successRate: collectionSuccessRate
      }
    }

    return res.json({
      success: true,
      data: healthData
    })
  } catch (error) {
    console.error('[Admin] System health check failed:', error)
    return res.status(500).json({
      success: false,
      message: '시스템 상태 확인 중 오류가 발생했습니다.'
    })
  }
})

/**
 * Real-time System Performance Metrics
 * GET /api/admin/performance-metrics
 */
router.get('/performance-metrics', requireAdmin, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const systemMetrics = await MonitoringService.collectSystemMetrics()
    
    const metricsData = {
      timestamp: systemMetrics.timestamp,
      cpu: {
        usage: systemMetrics.cpu.usage,
        loadAverage: systemMetrics.cpu.loadAverage,
        cores: systemMetrics.cpu.cores,
        status: systemMetrics.cpu.usage > 80 ? 'HIGH' : systemMetrics.cpu.usage > 60 ? 'MEDIUM' : 'LOW'
      },
      memory: {
        heapUsed: Math.round(systemMetrics.memory.heapUsed / 1024 / 1024), // MB
        heapTotal: Math.round(systemMetrics.memory.heapTotal / 1024 / 1024), // MB
        heapUtilization: systemMetrics.memory.heapUtilization,
        systemMemory: {
          total: Math.round(systemMetrics.memory.systemMemory.total / 1024 / 1024 / 1024), // GB
          used: Math.round(systemMetrics.memory.systemMemory.used / 1024 / 1024 / 1024), // GB
          utilization: systemMetrics.memory.systemMemory.utilization
        },
        status: systemMetrics.memory.systemMemory.utilization > 85 ? 'HIGH' : 
                systemMetrics.memory.systemMemory.utilization > 70 ? 'MEDIUM' : 'LOW'
      },
      database: {
        health: systemMetrics.database.health,
        responseTime: systemMetrics.database.responseTime,
        connectionPool: systemMetrics.database.connectionPool,
        queryPerformance: systemMetrics.database.queryPerformance
      },
      api: {
        requestCount: systemMetrics.api.requestCount,
        averageResponseTime: systemMetrics.api.averageResponseTime,
        errorRate: systemMetrics.api.errorRate,
        throughput: systemMetrics.api.throughput,
        slowEndpoints: systemMetrics.api.slowEndpoints
      },
      gc: {
        collections: systemMetrics.gc.collections,
        gcTime: systemMetrics.gc.gcTime,
        heapGrowthRate: systemMetrics.gc.heapGrowthRate,
        memoryLeakIndicator: systemMetrics.gc.memoryLeakIndicator
      },
      processInfo: {
        pid: process.pid,
        uptime: process.uptime(),
        nodeVersion: process.version,
        platform: os.platform(),
        arch: os.arch()
      }
    }

    return res.json({
      success: true,
      data: metricsData,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('[Admin] Performance metrics failed:', error)
    return res.status(500).json({
      success: false,
      message: '성능 지표 조회 중 오류가 발생했습니다.',
      code: 'PERFORMANCE_METRICS_ERROR'
    })
  }
})

// ============================================================================
// DATA COLLECTION ROUTES (Protected)
// ============================================================================

/**
 * Enhanced Data Collection (existing endpoint with auth)
 * POST /api/admin/collect-data
 * Body: { date?: string, sources?: string[] }
 */
router.post('/collect-data', requireAdmin, requirePermission('write'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { date, sources } = req.body
    const targetDate = date || formatDate(new Date())
    const targetSources = sources || ['KRX', 'BOK']
    const results: any[] = []

    console.log(`[Admin] Data collection started by ${req.admin?.username}: ${targetDate}`)

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
      return res.status(400).json({
        success: false,
        message: '올바른 날짜 형식이 아닙니다. (YYYY-MM-DD)',
        code: 'INVALID_DATE_FORMAT'
      })
    }

    // Validate sources
    const validSources = ['KRX', 'BOK', 'UPBIT']
    const invalidSources = targetSources.filter((source: string) => !validSources.includes(source))
    if (invalidSources.length > 0) {
      return res.status(400).json({
        success: false,
        message: `지원하지 않는 데이터 소스: ${invalidSources.join(', ')}`,
        code: 'INVALID_DATA_SOURCE'
      })
    }

    // KRX 데이터 수집
    if (targetSources.includes('KRX')) {
      try {
        console.log(`[Admin] KRX 데이터 수집 시작: ${targetDate}`)
        const startTime = performance.now()
        const krxData = await KRXCollector.collectDailyData(targetDate)
        
        // Transform data to match DatabaseService format
        const transformedKrxData = {
          kospi: krxData.kospiData,
          trading: krxData.kospiInvestorTrading, // Use KOSPI trading data as primary
          options: null // Options not supported yet
        }
        
        await DatabaseService.saveKRXData(targetDate, transformedKrxData)
        const duration = Math.round(performance.now() - startTime)
        
        // Count non-null entries
        const recordCount = Object.values(krxData).filter(data => data !== null).length
        
        results.push({
          source: 'KRX',
          status: 'SUCCESS',
          message: 'KRX 데이터 수집 완료',
          duration: duration,
          recordCount: recordCount
        })
      } catch (error) {
        results.push({
          source: 'KRX',
          status: 'FAILED',
          message: error instanceof Error ? error.message : 'KRX 데이터 수집 실패',
          duration: null,
          recordCount: 0
        })
      }
    }

    // BOK 데이터 수집
    if (targetSources.includes('BOK')) {
      try {
        console.log(`[Admin] BOK 데이터 수집 시작: ${targetDate}`)
        const startTime = performance.now()
        const bokData = await BOKCollector.collectDailyData(targetDate)
        await DatabaseService.saveBOKData(targetDate, bokData)
        const duration = Math.round(performance.now() - startTime)
        
        results.push({
          source: 'BOK',
          status: 'SUCCESS',
          message: 'BOK 데이터 수집 완료',
          duration: duration,
          recordCount: Object.keys(bokData).length
        })
      } catch (error) {
        results.push({
          source: 'BOK',
          status: 'FAILED',
          message: error instanceof Error ? error.message : 'BOK 데이터 수집 실패',
          duration: null,
          recordCount: 0
        })
      }
    }

    return res.json({
      success: true,
      message: '데이터 수집 완료',
      data: {
        date: targetDate,
        results,
        summary: {
          total: results.length,
          successful: results.filter(r => r.status === 'SUCCESS').length,
          failed: results.filter(r => r.status === 'FAILED').length
        }
      }
    })

  } catch (error) {
    console.error('[Admin] 수동 데이터 수집 실패:', error)
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      code: 'COLLECTION_ERROR'
    })
  }
})

/**
 * Batch Recalculate Fear & Greed Index
 * POST /api/admin/recalculate-range
 * Body: { startDate: string, endDate: string }
 */
router.post('/recalculate-range', requireAdmin, requirePermission('write'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.body

    // Validate input
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: '시작 날짜와 종료 날짜를 입력해주세요.',
        code: 'MISSING_DATE_RANGE'
      })
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      return res.status(400).json({
        success: false,
        message: '올바른 날짜 형식이 아닙니다. (YYYY-MM-DD)',
        code: 'INVALID_DATE_FORMAT'
      })
    }

    // Validate date range
    if (new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({
        success: false,
        message: '시작 날짜는 종료 날짜보다 이전이어야 합니다.',
        code: 'INVALID_DATE_RANGE'
      })
    }

    console.log(`[Admin] Batch recalculation started by ${req.admin?.username}: ${startDate} to ${endDate}`)

    const results: any[] = []
    const currentDate = new Date(startDate)
    const endDateObj = new Date(endDate)

    while (currentDate <= endDateObj) {
      const dateStr = formatDate(currentDate)
      
      try {
        const result = await FearGreedCalculator.calculateIndex(dateStr)
        if (result) {
          await DatabaseService.saveFearGreedIndex(result)
          results.push({
            date: dateStr,
            status: 'SUCCESS',
            value: result.value,
            level: result.level,
            confidence: result.confidence
          })
        } else {
          results.push({
            date: dateStr,
            status: 'FAILED',
            message: '데이터 부족으로 인한 계산 실패'
          })
        }
      } catch (error) {
        results.push({
          date: dateStr,
          status: 'FAILED',
          message: error instanceof Error ? error.message : '계산 실패'
        })
      }

      currentDate.setDate(currentDate.getDate() + 1)
    }

    return res.json({
      success: true,
      message: '일괄 재계산 완료',
      data: {
        startDate,
        endDate,
        results,
        summary: {
          total: results.length,
          successful: results.filter(r => r.status === 'SUCCESS').length,
          failed: results.filter(r => r.status === 'FAILED').length
        }
      }
    })

  } catch (error) {
    console.error('[Admin] Batch recalculation failed:', error)
    return res.status(500).json({
      success: false,
      message: '일괄 재계산 중 오류가 발생했습니다.',
      code: 'RECALCULATION_ERROR'
    })
  }
})

// ============================================================================
// SYSTEM MANAGEMENT ROUTES (Admin Only)
// ============================================================================

/**
 * Restart Service
 * POST /api/admin/restart-service
 * Body: { service: string }
 */
router.post('/restart-service', requireAdmin, requireAdminRole, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { service } = req.body

    if (!service) {
      return res.status(400).json({
        success: false,
        message: '재시작할 서비스를 지정해주세요.',
        code: 'MISSING_SERVICE'
      })
    }

    console.log(`[Admin] Service restart requested by ${req.admin?.username}: ${service}`)

    // Mock service restart (in production, implement actual restart logic)
    const validServices = ['api', 'collector', 'database', 'cache', 'all']
    if (!validServices.includes(service)) {
      return res.status(400).json({
        success: false,
        message: `지원하지 않는 서비스: ${service}`,
        code: 'INVALID_SERVICE'
      })
    }

    // Simulate restart delay
    await new Promise(resolve => setTimeout(resolve, 1000))

    return res.json({
      success: true,
      message: `${service} 서비스가 재시작되었습니다.`,
      data: {
        service,
        status: 'RESTARTED',
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('[Admin] Service restart failed:', error)
    return res.status(500).json({
      success: false,
      message: '서비스 재시작 중 오류가 발생했습니다.',
      code: 'RESTART_ERROR'
    })
  }
})

/**
 * Clear Cache
 * POST /api/admin/clear-cache
 */
router.post('/clear-cache', requireAdmin, requirePermission('write'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log(`[Admin] Cache clear requested by ${req.admin?.username}`)

    // Mock cache clearing (implement actual cache clearing logic)
    await new Promise(resolve => setTimeout(resolve, 500))

    return res.json({
      success: true,
      message: '캐시가 삭제되었습니다.',
      data: {
        timestamp: new Date().toISOString(),
        clearedItems: 147 // Mock count
      }
    })

  } catch (error) {
    console.error('[Admin] Cache clear failed:', error)
    return res.status(500).json({
      success: false,
      message: '캐시 삭제 중 오류가 발생했습니다.',
      code: 'CACHE_CLEAR_ERROR'
    })
  }
})

// ============================================================================
// CONFIGURATION MANAGEMENT ROUTES (Admin Only)
// ============================================================================

/**
 * Get System Configuration
 * GET /api/admin/system-config
 */
router.get('/system-config', requireAdmin, requireAdminRole, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    // Mock system configuration (in production, fetch from database)
    const config = {
      fearGreedCalculator: {
        componentWeights: {
          priceMomentum: 25,
          investorSentiment: 25,
          putCallRatio: 15,
          volatilityIndex: 20,
          safeHavenDemand: 15
        },
        confidenceThreshold: 70,
        dataRequiredDays: 30
      },
      dataCollection: {
        scheduleEnabled: true,
        collectionTime: '09:00',
        retryAttempts: 3,
        timeoutMs: 30000,
        enabledSources: ['KRX', 'BOK', 'UPBIT']
      },
      api: {
        rateLimitEnabled: true,
        maxRequestsPerMinute: 100,
        cacheEnabled: true,
        cacheTtlSeconds: 300
      },
      notifications: {
        emailEnabled: false,
        slackEnabled: false,
        webhookUrl: null
      },
      system: {
        logLevel: 'info',
        enableMetrics: true,
        backupEnabled: true,
        backupRetentionDays: 30
      }
    }

    return res.json({
      success: true,
      data: config
    })

  } catch (error) {
    console.error('[Admin] Get system config failed:', error)
    return res.status(500).json({
      success: false,
      message: '시스템 설정 조회 중 오류가 발생했습니다.',
      code: 'CONFIG_GET_ERROR'
    })
  }
})

/**
 * Update System Configuration
 * PUT /api/admin/system-config
 * Body: { config: object }
 */
router.put('/system-config', requireAdmin, requireAdminRole, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { config } = req.body

    if (!config || typeof config !== 'object') {
      return res.status(400).json({
        success: false,
        message: '올바른 설정 데이터를 제공해주세요.',
        code: 'INVALID_CONFIG'
      })
    }

    console.log(`[Admin] System config update by ${req.admin?.username}:`, JSON.stringify(config, null, 2))

    // Validate Fear & Greed weights if provided
    if (config.fearGreedCalculator?.componentWeights) {
      const weights = config.fearGreedCalculator.componentWeights
      const totalWeight = Object.values(weights).reduce((sum: number, weight: any) => sum + (Number(weight) || 0), 0)
      
      if (Math.abs(totalWeight - 100) > 0.1) {
        return res.status(400).json({
          success: false,
          message: '가중치의 합이 100%가 되어야 합니다.',
          code: 'INVALID_WEIGHTS',
          currentTotal: totalWeight
        })
      }
    }

    // Mock configuration update (in production, save to database)
    await new Promise(resolve => setTimeout(resolve, 200))

    return res.json({
      success: true,
      message: '시스템 설정이 업데이트되었습니다.',
      data: {
        updatedAt: new Date().toISOString(),
        updatedBy: req.admin?.username
      }
    })

  } catch (error) {
    console.error('[Admin] Update system config failed:', error)
    return res.status(500).json({
      success: false,
      message: '시스템 설정 업데이트 중 오류가 발생했습니다.',
      code: 'CONFIG_UPDATE_ERROR'
    })
  }
})

// ============================================================================
// SYSTEM INFORMATION ROUTES
// ============================================================================

/**
 * Get System Information
 * GET /api/admin/system-info
 */
router.get('/system-info', requireAdmin, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const systemInfo = {
      application: {
        name: 'KOSPI Fear & Greed Index API',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version,
        uptime: process.uptime()
      },
      server: {
        platform: os.platform(),
        architecture: os.arch(),
        hostname: os.hostname(),
        cpus: os.cpus().length,
        totalMemory: Math.round(os.totalmem() / 1024 / 1024 / 1024 * 100) / 100, // GB
        freeMemory: Math.round(os.freemem() / 1024 / 1024 / 1024 * 100) / 100, // GB
        loadAverage: os.loadavg()
      },
      database: {
        type: 'MySQL',
        host: process.env.DATABASE_HOST || 'localhost',
        status: 'Connected' // Mock status
      },
      features: {
        authenticationEnabled: true,
        rateLimitingEnabled: true,
        corsEnabled: process.env.CORS_ENABLED === 'true',
        helmetEnabled: process.env.HELMET_ENABLED === 'true',
        schedulerEnabled: process.env.NODE_ENV === 'production'
      }
    }

    return res.json({
      success: true,
      data: systemInfo
    })

  } catch (error) {
    console.error('[Admin] Get system info failed:', error)
    return res.status(500).json({
      success: false,
      message: '시스템 정보 조회 중 오류가 발생했습니다.',
      code: 'SYSTEM_INFO_ERROR'
    })
  }
})

/**
 * Get API Logs (Last N entries)
 * GET /api/admin/logs?limit=100&level=error
 */
router.get('/logs', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 1000)
    const level = (req.query.level as string) || 'all'

    // Mock log entries (in production, fetch from logging system)
    const mockLogs = [
      {
        id: 1,
        timestamp: new Date().toISOString(),
        level: 'INFO',
        service: 'API',
        message: 'Server started successfully',
        details: null
      },
      {
        id: 2,
        timestamp: new Date(Date.now() - 60000).toISOString(),
        level: 'WARN',
        service: 'Database',
        message: 'Connection pool almost full',
        details: { connections: 19, maxConnections: 20 }
      },
      {
        id: 3,
        timestamp: new Date(Date.now() - 120000).toISOString(),
        level: 'ERROR',
        service: 'KRX Collector',
        message: 'Failed to fetch data from KRX API',
        details: { statusCode: 503, retryAttempt: 2 }
      },
      {
        id: 4,
        timestamp: new Date(Date.now() - 180000).toISOString(),
        level: 'INFO',
        service: 'Fear & Greed Calculator',
        message: 'Index calculated successfully',
        details: { date: '2024-01-15', value: 42, level: 'Fear' }
      }
    ]

    // Filter by level if specified
    let filteredLogs = mockLogs
    if (level !== 'all') {
      filteredLogs = mockLogs.filter(log => log.level.toLowerCase() === level.toLowerCase())
    }

    // Apply limit
    const logs = filteredLogs.slice(0, limit)

    return res.json({
      success: true,
      data: {
        logs,
        pagination: {
          total: filteredLogs.length,
          limit,
          level
        }
      }
    })

  } catch (error) {
    console.error('[Admin] Get logs failed:', error)
    return res.status(500).json({
      success: false,
      message: '로그 조회 중 오류가 발생했습니다.',
      code: 'LOGS_ERROR'
    })
  }
})

export default router