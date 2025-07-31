import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import { PrismaClient, AdminRole } from '@prisma/client'
import TokenService, { TokenValidationResult } from '../services/tokenService'
import SessionService from '../services/sessionService'
import RateLimitService from '../services/rateLimitService'
import PasswordPolicyService from '../services/passwordPolicyService'
import MfaService from '../services/mfaService'
import AuditService from '../services/auditService'

const prisma = new PrismaClient()

// Enhanced Admin user interface
export interface AdminUser {
  id: string
  username: string
  email?: string
  role: AdminRole
  permissions: string[]
  lastLogin?: Date
  mfaEnabled: boolean
  isActive: boolean
  isLocked: boolean
  mustChangePassword: boolean
}

// Extended Request interface for authenticated routes
export interface AuthenticatedRequest extends Request {
  admin?: AdminUser
  sessionId?: string
  requiresMfa?: boolean
}

// Authentication configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m' // Shorter for access tokens
const MAX_LOGIN_ATTEMPTS = parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5')
const LOCKOUT_DURATION_MINUTES = parseInt(process.env.LOCKOUT_DURATION_MINUTES || '30')

/**
 * Enhanced authentication with comprehensive security features
 */
export interface LoginRequest {
  username: string
  password: string
  mfaToken?: string
  rememberMe?: boolean
}

export interface LoginResponse {
  success: boolean
  message: string
  data?: {
    user: AdminUser
    accessToken: string
    refreshToken: string
    expiresAt: Date
    requiresMfa?: boolean
    mfaSetupRequired?: boolean
  }
  errors?: string[]
}

/**
 * Enhanced login with security features
 */
export async function enhancedLogin(req: Request, loginData: LoginRequest): Promise<LoginResponse> {
  const { username, password, mfaToken } = loginData
  const ipAddress = TokenService.extractIpAddress(req)
  const userAgent = TokenService.extractUserAgent(req)

  try {
    // Rate limiting check
    const rateLimitResult = await RateLimitService.checkRateLimit(`login_${username}`, 'LOGIN')
    if (!rateLimitResult.allowed) {
      await AuditService.logAuth('LOGIN_FAILED', req, undefined, undefined, {
        reason: 'RATE_LIMITED',
        retryAfter: rateLimitResult.retryAfter
      })
      
      return {
        success: false,
        message: `Too many login attempts. Try again in ${Math.ceil(rateLimitResult.retryAfter! / 60)} minutes.`,
        errors: ['RATE_LIMITED']
      }
    }

    // Find user in database
    const user = await prisma.adminUser.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        email: true,
        passwordHash: true,
        role: true,
        permissions: true,
        isActive: true,
        isLocked: true,
        lockReason: true,
        lockedUntil: true,
        mfaEnabled: true,
        mfaSecret: true,
        mustChangePassword: true,
        failedAttempts: true,
        lastLoginAt: true
      }
    })

    if (!user) {
      await RateLimitService.recordLoginAttempt(username, ipAddress, userAgent, false, 'USER_NOT_FOUND')
      await RateLimitService.recordAttempt(`login_${username}`, 'LOGIN')
      
      return {
        success: false,
        message: 'Invalid username or password.',
        errors: ['INVALID_CREDENTIALS']
      }
    }

    // Check if account is active
    if (!user.isActive) {
      await RateLimitService.recordLoginAttempt(username, ipAddress, userAgent, false, 'ACCOUNT_INACTIVE', user.id)
      await AuditService.logAuth('LOGIN_FAILED', req, user.id, undefined, { reason: 'ACCOUNT_INACTIVE' })
      
      return {
        success: false,
        message: 'Account is inactive. Please contact administrator.',
        errors: ['ACCOUNT_INACTIVE']
      }
    }

    // Check if account is locked
    const lockStatus = await RateLimitService.isUserLocked(user.id)
    if (lockStatus.locked) {
      await RateLimitService.recordLoginAttempt(username, ipAddress, userAgent, false, 'ACCOUNT_LOCKED', user.id)
      await AuditService.logAuth('LOGIN_FAILED', req, user.id, undefined, { reason: 'ACCOUNT_LOCKED', lockReason: lockStatus.reason })
      
      const message = lockStatus.lockedUntil 
        ? `Account is locked until ${lockStatus.lockedUntil.toLocaleString()}`
        : 'Account is locked. Please contact administrator.'
      
      return {
        success: false,
        message,
        errors: ['ACCOUNT_LOCKED']
      }
    }

    // Verify password
    const isValidPassword = await PasswordPolicyService.verifyPassword(password, user.passwordHash)
    if (!isValidPassword) {
      await RateLimitService.recordLoginAttempt(username, ipAddress, userAgent, false, 'INVALID_PASSWORD', user.id)
      await RateLimitService.recordAttempt(`login_${username}`, 'LOGIN')
      await AuditService.logAuth('LOGIN_FAILED', req, user.id, undefined, { reason: 'INVALID_PASSWORD' })
      
      return {
        success: false,
        message: 'Invalid username or password.',
        errors: ['INVALID_CREDENTIALS']
      }
    }

    // Check if password needs to be changed
    const passwordStatus = await PasswordPolicyService.needsPasswordChange(user.id)
    if (passwordStatus.needsChange || user.mustChangePassword) {
      await AuditService.logAuth('LOGIN_FAILED', req, user.id, undefined, { reason: 'PASSWORD_CHANGE_REQUIRED' })
      
      return {
        success: false,
        message: 'Password change required before login.',
        errors: ['PASSWORD_CHANGE_REQUIRED']
      }
    }

    // Handle MFA if enabled
    if (user.mfaEnabled) {
      if (!mfaToken) {
        await AuditService.logAuth('MFA_REQUIRED', req, user.id, undefined, { step: 'PASSWORD_VERIFIED' })
        
        return {
          success: false,
          message: 'MFA token required.',
          errors: ['MFA_REQUIRED'],
          data: {
            requiresMfa: true
          } as any
        }
      }

      // Verify MFA token
      const mfaResult = await MfaService.verifyMfaToken(user.id, mfaToken)
      if (!mfaResult.valid) {
        await RateLimitService.recordLoginAttempt(username, ipAddress, userAgent, false, 'INVALID_MFA_TOKEN', user.id)
        await AuditService.logAuth('MFA_FAILED', req, user.id, undefined, { reason: mfaResult.error })
        
        return {
          success: false,
          message: 'Invalid MFA token.',
          errors: ['INVALID_MFA_TOKEN']
        }
      }

      await AuditService.logAuth('MFA_SUCCESS', req, user.id, undefined, {
        backupCodeUsed: mfaResult.backupCodeUsed,
        remainingBackupCodes: mfaResult.remainingBackupCodes
      })
    }

    // Generate tokens
    const tokenPair = await TokenService.generateTokenPair(
      user.id,
      user.username,
      user.role,
      user.permissions,
      ipAddress,
      userAgent
    )

    // Record successful login
    await RateLimitService.recordLoginAttempt(username, ipAddress, userAgent, true, undefined, user.id)
    await AuditService.logAuth('LOGIN', req, user.id, tokenPair.sessionId, {
      mfaUsed: user.mfaEnabled,
      rememberMe: loginData.rememberMe
    })

    // Prepare user data for response
    const userData: AdminUser = {
      id: user.id,
      username: user.username,
      email: user.email || undefined,
      role: user.role,
      permissions: user.permissions,
      lastLogin: user.lastLoginAt || undefined,
      mfaEnabled: user.mfaEnabled,
      isActive: user.isActive,
      isLocked: user.isLocked,
      mustChangePassword: user.mustChangePassword
    }

    return {
      success: true,
      message: 'Login successful.',
      data: {
        user: userData,
        accessToken: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken,
        expiresAt: tokenPair.expiresAt
      }
    }
  } catch (error) {
    console.error('[Auth] Enhanced login error:', error)
    await AuditService.logAuth('LOGIN_FAILED', req, undefined, undefined, {
      reason: 'SYSTEM_ERROR',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    
    return {
      success: false,
      message: 'Login failed due to system error.',
      errors: ['SYSTEM_ERROR']
    }
  }
}

/**
 * Enhanced logout with comprehensive cleanup
 */
export async function enhancedLogout(req: AuthenticatedRequest): Promise<{ success: boolean; message: string }> {
  try {
    const refreshToken = req.headers['x-refresh-token'] as string
    const sessionId = req.sessionId
    const userId = req.admin?.id

    if (refreshToken) {
      await TokenService.revokeRefreshToken(refreshToken)
    }

    if (sessionId && userId) {
      await SessionService.terminateSession(sessionId, userId, 'USER_LOGOUT')
      await AuditService.logAuth('LOGOUT', req, userId, sessionId)
    }

    return {
      success: true,
      message: 'Logout successful.'
    }
  } catch (error) {
    console.error('[Auth] Enhanced logout error:', error)
    return {
      success: false,
      message: 'Logout failed.'
    }
  }
}

/**
 * Enhanced admin authentication middleware with comprehensive security
 */
export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  enhancedAuthMiddleware(req, res, next, false)
}

/**
 * Enhanced authentication middleware
 */
async function enhancedAuthMiddleware(
  req: AuthenticatedRequest, 
  res: Response, 
  next: NextFunction,
  requireMfa: boolean = false
): Promise<void> {
  try {
    // Rate limiting for API calls
    const ipAddress = TokenService.extractIpAddress(req)
    const rateLimitResult = await RateLimitService.checkRateLimit(ipAddress, 'API_CALL')
    
    if (!rateLimitResult.allowed) {
      res.status(429).json({
        success: false,
        message: 'Too many requests. Please try again later.',
        code: 'RATE_LIMITED',
        retryAfter: rateLimitResult.retryAfter
      })
      return
    }

    // Extract token from Authorization header
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      await AuditService.logSecurity('UNAUTHORIZED_ACCESS_ATTEMPT', req, undefined, false, {
        reason: 'MISSING_TOKEN',
        endpoint: req.path
      })
      
      res.status(401).json({
        success: false,
        message: 'Authentication token required.',
        code: 'MISSING_TOKEN'
      })
      return
    }

    const token = authHeader.split(' ')[1]
    if (!token) {
      await AuditService.logSecurity('UNAUTHORIZED_ACCESS_ATTEMPT', req, undefined, false, {
        reason: 'EMPTY_TOKEN',
        endpoint: req.path
      })
      
      res.status(401).json({
        success: false,
        message: 'Token not provided.',
        code: 'MISSING_TOKEN'
      })
      return
    }

    // Validate access token
    const validationResult = await TokenService.validateAccessToken(token)
    
    if (!validationResult.valid) {
      await AuditService.logSecurity('UNAUTHORIZED_ACCESS_ATTEMPT', req, undefined, false, {
        reason: validationResult.error,
        endpoint: req.path,
        expired: validationResult.expired
      })
      
      const statusCode = validationResult.expired ? 401 : 401
      const code = validationResult.expired ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN'
      
      res.status(statusCode).json({
        success: false,
        message: validationResult.error || 'Invalid token.',
        code
      })
      return
    }

    // Get user from database to ensure current state
    const user = await prisma.adminUser.findUnique({
      where: { id: validationResult.payload!.userId },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        permissions: true,
        isActive: true,
        isLocked: true,
        mfaEnabled: true,
        lastLoginAt: true,
        mustChangePassword: true
      }
    })

    if (!user || !user.isActive || user.isLocked) {
      await AuditService.logSecurity('UNAUTHORIZED_ACCESS_ATTEMPT', req, user?.id, false, {
        reason: !user ? 'USER_NOT_FOUND' : (!user.isActive ? 'ACCOUNT_INACTIVE' : 'ACCOUNT_LOCKED'),
        endpoint: req.path
      })
      
      res.status(401).json({
        success: false,
        message: 'Account is not accessible.',
        code: 'ACCOUNT_INACCESSIBLE'
      })
      return
    }

    // Check session security
    const sessionSecurity = await SessionService.checkSessionSecurity(validationResult.payload!.sessionId, req)
    if (!sessionSecurity.secure) {
      await AuditService.logSecurity('SESSION_SECURITY_WARNING', req, user.id, true, {
        warnings: sessionSecurity.warnings,
        endpoint: req.path
      })
      
      // Don't block but log the warning
      console.warn('[Auth] Session security warning:', sessionSecurity.warnings)
    }

    // Update session activity
    await SessionService.updateSessionActivity(validationResult.payload!.sessionId, req)
    
    // Record API access
    await RateLimitService.recordAttempt(ipAddress, 'API_CALL')
    
    // Prepare user data for request
    const adminUser: AdminUser = {
      id: user.id,
      username: user.username,
      email: user.email || undefined,
      role: user.role,
      permissions: user.permissions,
      lastLogin: user.lastLoginAt || undefined,
      mfaEnabled: user.mfaEnabled,
      isActive: user.isActive,
      isLocked: user.isLocked,
      mustChangePassword: user.mustChangePassword
    }

    // Attach user and session info to request
    req.admin = adminUser
    req.sessionId = validationResult.payload!.sessionId
    req.requiresMfa = requireMfa && user.mfaEnabled

    // Check if MFA is required for this operation
    if (req.requiresMfa && !req.headers['x-mfa-verified']) {
      res.status(403).json({
        success: false,
        message: 'MFA verification required for this operation.',
        code: 'MFA_REQUIRED'
      })
      return
    }

    next()
  } catch (error) {
    console.error('[Auth] Enhanced authentication middleware error:', error)
    
    await AuditService.logSecurity('AUTH_MIDDLEWARE_ERROR', req, undefined, false, {
      error: error instanceof Error ? error.message : 'Unknown error',
      endpoint: req.path
    })
    
    res.status(500).json({
      success: false,
      message: 'Authentication processing error.',
      code: 'AUTH_ERROR'
    })
  }
}

/**
 * Enhanced permission checking with audit logging
 */
export function requirePermission(permission: string, requireMfa: boolean = false) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.admin) {
        await AuditService.logSecurity('PERMISSION_CHECK_FAILED', req, undefined, false, {
          reason: 'NOT_AUTHENTICATED',
          requiredPermission: permission,
          endpoint: req.path
        })
        
        res.status(401).json({
          success: false,
          message: 'Authentication required.',
          code: 'AUTHENTICATION_REQUIRED'
        })
        return
      }

      // Check permission
      const hasPermission = req.admin.role === 'SUPER_ADMIN' || 
                           req.admin.role === 'ADMIN' || 
                           req.admin.permissions.includes(permission)

      if (!hasPermission) {
        await AuditService.logSecurity('PERMISSION_DENIED', req, req.admin.id, false, {
          requiredPermission: permission,
          userRole: req.admin.role,
          userPermissions: req.admin.permissions,
          endpoint: req.path
        })
        
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions.',
          code: 'INSUFFICIENT_PERMISSIONS',
          required: permission
        })
        return
      }

      // Check MFA if required for this permission
      if (requireMfa && req.admin.mfaEnabled && !req.headers['x-mfa-verified']) {
        await AuditService.logSecurity('MFA_REQUIRED_FOR_PERMISSION', req, req.admin.id, false, {
          requiredPermission: permission,
          endpoint: req.path
        })
        
        res.status(403).json({
          success: false,
          message: 'MFA verification required for this operation.',
          code: 'MFA_REQUIRED'
        })
        return
      }

      // Log successful permission check for sensitive operations
      if (permission.includes('admin') || permission.includes('delete') || permission.includes('export')) {
        await AuditService.logSecurity('PERMISSION_GRANTED', req, req.admin.id, true, {
          grantedPermission: permission,
          endpoint: req.path
        })
      }

      next()
    } catch (error) {
      console.error('[Auth] Permission check error:', error)
      
      await AuditService.logSecurity('PERMISSION_CHECK_ERROR', req, req.admin?.id, false, {
        error: error instanceof Error ? error.message : 'Unknown error',
        requiredPermission: permission,
        endpoint: req.path
      })
      
      res.status(500).json({
        success: false,
        message: 'Permission check error.',
        code: 'PERMISSION_ERROR'
      })
    }
  }
}

/**
 * Enhanced admin role requirement with MFA option
 */
export function requireAdminRole(requireMfa: boolean = false) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.admin) {
        await AuditService.logSecurity('ADMIN_ACCESS_DENIED', req, undefined, false, {
          reason: 'NOT_AUTHENTICATED',
          endpoint: req.path
        })
        
        res.status(401).json({
          success: false,
          message: 'Authentication required.',
          code: 'AUTHENTICATION_REQUIRED'
        })
        return
      }

      if (req.admin.role !== 'SUPER_ADMIN' && req.admin.role !== 'ADMIN') {
        await AuditService.logSecurity('ADMIN_ACCESS_DENIED', req, req.admin.id, false, {
          reason: 'INSUFFICIENT_ROLE',
          userRole: req.admin.role,
          endpoint: req.path
        })
        
        res.status(403).json({
          success: false,
          message: 'Admin role required.',
          code: 'ADMIN_ROLE_REQUIRED'
        })
        return
      }

      // Check MFA for admin operations if required
      if (requireMfa && req.admin.mfaEnabled && !req.headers['x-mfa-verified']) {
        await AuditService.logSecurity('ADMIN_MFA_REQUIRED', req, req.admin.id, false, {
          endpoint: req.path
        })
        
        res.status(403).json({
          success: false,
          message: 'MFA verification required for admin operations.',
          code: 'ADMIN_MFA_REQUIRED'
        })
        return
      }

      // Log admin access
      await AuditService.logSecurity('ADMIN_ACCESS_GRANTED', req, req.admin.id, true, {
        userRole: req.admin.role,
        endpoint: req.path,
        mfaVerified: !!req.headers['x-mfa-verified']
      })

      next()
    } catch (error) {
      console.error('[Auth] Admin role check error:', error)
      
      res.status(500).json({
        success: false,
        message: 'Admin role check error.',
        code: 'ROLE_CHECK_ERROR'
      })
    }
  }
}

/**
 * MFA verification middleware for sensitive operations
 */
export function requireMfaVerification() {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.admin) {
        res.status(401).json({
          success: false,
          message: 'Authentication required.',
          code: 'AUTHENTICATION_REQUIRED'
        })
        return
      }

      if (!req.admin.mfaEnabled) {
        // MFA not enabled, proceed (but log the event)
        await AuditService.logSecurity('MFA_NOT_ENABLED_WARNING', req, req.admin.id, true, {
          endpoint: req.path,
          recommendation: 'Enable MFA for enhanced security'
        })
        next()
        return
      }

      const mfaToken = req.headers['x-mfa-token'] as string
      if (!mfaToken) {
        res.status(403).json({
          success: false,
          message: 'MFA token required for this operation.',
          code: 'MFA_TOKEN_REQUIRED'
        })
        return
      }

      // Verify MFA token
      const mfaResult = await MfaService.verifyMfaToken(req.admin.id, mfaToken)
      if (!mfaResult.valid) {
        await AuditService.logSecurity('MFA_VERIFICATION_FAILED', req, req.admin.id, false, {
          endpoint: req.path,
          reason: mfaResult.error
        })
        
        res.status(403).json({
          success: false,
          message: 'Invalid MFA token.',
          code: 'INVALID_MFA_TOKEN'
        })
        return
      }

      // Set MFA verified flag
      req.headers['x-mfa-verified'] = 'true'
      
      await AuditService.logSecurity('MFA_VERIFICATION_SUCCESS', req, req.admin.id, true, {
        endpoint: req.path,
        backupCodeUsed: mfaResult.backupCodeUsed
      })

      next()
    } catch (error) {
      console.error('[Auth] MFA verification error:', error)
      
      res.status(500).json({
        success: false,
        message: 'MFA verification error.',
        code: 'MFA_ERROR'
      })
    }
  }
}

/**
 * Enhanced security headers middleware
 */
export function securityHeaders(req: Request, res: Response, next: NextFunction): void {
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('X-XSS-Protection', '1; mode=block')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')
  
  // Remove server information
  res.removeHeader('X-Powered-By')
  
  next()
}

/**
 * Legacy compatibility functions (deprecated)
 */
// @deprecated Use TokenService.generateTokenPair instead
export function generateToken(user: AdminUser): string {
  console.warn('[Auth] generateToken is deprecated. Use TokenService.generateTokenPair instead.')
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role, permissions: user.permissions },
    JWT_SECRET,
    { expiresIn: '15m' }
  )
}

// @deprecated Use TokenService.validateAccessToken instead
export function verifyToken(token: string): AdminUser | null {
  console.warn('[Auth] verifyToken is deprecated. Use TokenService.validateAccessToken instead.')
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any
    return {
      id: decoded.id,
      username: decoded.username,
      role: decoded.role,
      permissions: decoded.permissions || [],
      mfaEnabled: false,
      isActive: true,
      isLocked: false,
      mustChangePassword: false
    }
  } catch (error) {
    return null
  }
}

// @deprecated Use enhancedLogin instead
export async function authenticateAdmin(username: string, password: string): Promise<AdminUser | null> {
  console.warn('[Auth] authenticateAdmin is deprecated. Use enhancedLogin instead.')
  return null
}

// @deprecated Use PasswordPolicyService.hashPassword instead
export async function hashPassword(password: string): Promise<string> {
  console.warn('[Auth] hashPassword is deprecated. Use PasswordPolicyService.hashPassword instead.')
  return await PasswordPolicyService.hashPassword(password)
}

export default {
  // New enhanced functions
  enhancedLogin,
  enhancedLogout,
  requireAdmin,
  requirePermission,
  requireAdminRole,
  requireMfaVerification,
  securityHeaders,
  
  // Legacy functions (deprecated)
  generateToken,
  verifyToken,
  authenticateAdmin,
  hashPassword
}