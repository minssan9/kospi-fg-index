#!/usr/bin/env node

/**
 * Database Connection Test Script
 * Tests production database configuration with SSL and connection pooling
 */

require('dotenv').config({ path: '.env.production' })
const { DatabaseManager } = require('../config/database')

// ANSI colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bright: '\x1b[1m'
}

class DatabaseConnectionTester {
  constructor() {
    this.dbManager = new DatabaseManager()
    this.testResults = []
  }

  log(color, prefix, message) {
    console.log(`${color}${prefix}${colors.reset} ${message}`)
  }

  success(message) {
    this.log(colors.green, '✅ SUCCESS:', message)
    this.testResults.push({ type: 'success', message })
  }

  error(message) {
    this.log(colors.red, '❌ ERROR:', message)
    this.testResults.push({ type: 'error', message })
  }

  warning(message) {
    this.log(colors.yellow, '⚠️  WARNING:', message)
    this.testResults.push({ type: 'warning', message })
  }

  info(message) {
    this.log(colors.blue, 'ℹ️  INFO:', message)
    this.testResults.push({ type: 'info', message })
  }

  header(message) {
    console.log(`\n${colors.cyan}${colors.bright}=== ${message} ===${colors.reset}`)
  }

  /**
   * Test environment configuration
   */
  testEnvironmentConfig() {
    this.header('Environment Configuration Test')

    const requiredVars = [
      'DATABASE_URL',
      'DB_CONNECTION_POOL_MIN',
      'DB_CONNECTION_POOL_MAX',
      'DB_CONNECTION_TIMEOUT',
      'DB_QUERY_TIMEOUT'
    ]

    let allPresent = true

    requiredVars.forEach(varName => {
      if (process.env[varName]) {
        this.success(`${varName} is configured`)
      } else {
        this.error(`${varName} is missing`)
        allPresent = false
      }
    })

    // Test database URL format
    if (process.env.DATABASE_URL) {
      try {
        const dbUrl = new URL(process.env.DATABASE_URL)
        this.success(`Database protocol: ${dbUrl.protocol}`)
        this.success(`Database host: ${dbUrl.hostname}:${dbUrl.port || 'default'}`)
        this.success(`Database name: ${dbUrl.pathname.substring(1)}`)

        // Check SSL configuration
        if (dbUrl.searchParams.has('ssl') || dbUrl.search.includes('ssl=true')) {
          this.success('SSL configuration detected in connection string')
        } else if (process.env.NODE_ENV === 'production') {
          this.warning('No SSL configuration detected for production')
        }

      } catch (error) {
        this.error(`Invalid DATABASE_URL format: ${error.message}`)
        allPresent = false
      }
    }

    return allPresent
  }

  /**
   * Test SSL certificate files
   */
  testSSLCertificates() {
    this.header('SSL Certificate Test')

    const sslPaths = {
      'DB_SSL_CA_PATH': 'Certificate Authority',
      'DB_SSL_CERT_PATH': 'Client Certificate', 
      'DB_SSL_KEY_PATH': 'Private Key'
    }

    let sslConfigured = false

    Object.entries(sslPaths).forEach(([envVar, description]) => {
      const path = process.env[envVar]
      if (path) {
        const fs = require('fs')
        if (fs.existsSync(path)) {
          this.success(`${description} file found: ${path}`)
          sslConfigured = true
        } else {
          this.error(`${description} file not found: ${path}`)
        }
      } else if (process.env.NODE_ENV === 'production') {
        this.warning(`${envVar} not configured for production`)
      }
    })

    if (!sslConfigured && process.env.NODE_ENV === 'production') {
      this.warning('No SSL certificate files configured for production')
    }

    return true
  }

  /**
   * Test basic database connectivity
   */
  async testBasicConnectivity() {
    this.header('Basic Connectivity Test')

    try {
      this.info('Initializing database connection...')
      await this.dbManager.initialize()
      this.success('Database connection established successfully')

      this.info('Testing basic query...')
      const result = await this.dbManager.queryRaw`SELECT 1 as test, NOW() as timestamp, VERSION() as version`
      
      if (result && result.length > 0) {
        this.success('Basic query executed successfully')
        this.info(`Database version: ${result[0].version}`)
        this.info(`Server time: ${result[0].timestamp}`)
      }

      return true

    } catch (error) {
      this.error(`Connectivity test failed: ${error.message}`)
      return false
    }
  }

  /**
   * Test connection pooling
   */
  async testConnectionPooling() {
    this.header('Connection Pooling Test')

    try {
      this.info('Testing concurrent connections...')
      
      // Create multiple concurrent connections
      const concurrentQueries = []
      const poolSize = parseInt(process.env.DB_CONNECTION_POOL_MAX) || 10
      const testConnections = Math.min(poolSize, 5) // Test with 5 connections max

      for (let i = 0; i < testConnections; i++) {
        concurrentQueries.push(
          this.dbManager.queryRaw`SELECT CONNECTION_ID() as conn_id, ${i} as query_num, SLEEP(0.1)`
        )
      }

      const startTime = Date.now()
      const results = await Promise.all(concurrentQueries)
      const duration = Date.now() - startTime

      this.success(`${testConnections} concurrent queries completed in ${duration}ms`)
      
      // Verify different connection IDs
      const connectionIds = results.map(r => r[0].conn_id)
      const uniqueConnections = new Set(connectionIds)
      
      if (uniqueConnections.size > 1) {
        this.success(`Connection pooling working: ${uniqueConnections.size} unique connections used`)
      } else {
        this.warning('All queries used the same connection - pooling may not be working')
      }

      return true

    } catch (error) {
      this.error(`Connection pooling test failed: ${error.message}`)
      return false
    }
  }

  /**
   * Test database schema access
   */
  async testSchemaAccess() {
    this.header('Schema Access Test')

    try {
      this.info('Testing table access...')
      
      // Test accessing main tables
      const tables = ['FearGreedIndex', 'MarketData', 'InvestorTrading']
      
      for (const table of tables) {
        try {
          await this.dbManager.queryRaw`SELECT COUNT(*) as count FROM ${table} LIMIT 1`
          this.success(`Table ${table} accessible`)
        } catch (error) {
          if (error.message.includes("doesn't exist")) {
            this.warning(`Table ${table} does not exist (may need migration)`)
          } else {
            this.error(`Table ${table} access failed: ${error.message}`)
          }
        }
      }

      return true

    } catch (error) {
      this.error(`Schema access test failed: ${error.message}`)
      return false
    }
  }

  /**
   * Test transaction handling
   */
  async testTransactions() {
    this.header('Transaction Test')

    try {
      this.info('Testing database transactions...')

      await this.dbManager.transaction(async (tx) => {
        // Test transaction with a simple query
        const result = await tx.$queryRaw`SELECT 'transaction_test' as test`
        
        if (result && result.length > 0) {
          this.success('Transaction executed successfully')
        }
      })

      return true

    } catch (error) {
      this.error(`Transaction test failed: ${error.message}`)
      return false
    }
  }

  /**
   * Test performance metrics
   */
  async testPerformance() {
    this.header('Performance Test')

    try {
      this.info('Running performance benchmark...')

      const iterations = 10
      const queries = []
      
      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now()
        await this.dbManager.queryRaw`SELECT 1 as test`
        const duration = Date.now() - startTime
        queries.push(duration)
      }

      const avgTime = queries.reduce((a, b) => a + b, 0) / queries.length
      const maxTime = Math.max(...queries)
      const minTime = Math.min(...queries)

      this.success(`Average query time: ${avgTime.toFixed(2)}ms`)
      this.info(`Min: ${minTime}ms, Max: ${maxTime}ms`)

      if (avgTime < 100) {
        this.success('Query performance is excellent')
      } else if (avgTime < 500) {
        this.success('Query performance is good')
      } else {
        this.warning(`Query performance is slow: ${avgTime.toFixed(2)}ms average`)
      }

      return true

    } catch (error) {
      this.error(`Performance test failed: ${error.message}`)
      return false
    }
  }

  /**
   * Test health monitoring
   */
  async testHealthMonitoring() {
    this.header('Health Monitoring Test')

    try {
      this.info('Testing database status monitoring...')

      const status = this.dbManager.getStatus()
      
      this.info(`Connection status: ${status.isConnected ? 'Connected' : 'Disconnected'}`)
      this.info(`Pool configuration: ${status.config.poolMin}-${status.config.poolMax} connections`)
      this.info(`SSL enabled: ${status.config.sslEnabled}`)
      this.info(`Health check enabled: ${status.config.healthCheckEnabled}`)

      if (status.isConnected) {
        this.success('Health monitoring is working')
      } else {
        this.warning('Database appears disconnected')
      }

      return true

    } catch (error) {
      this.error(`Health monitoring test failed: ${error.message}`)
      return false
    }
  }

  /**
   * Generate test report
   */
  generateReport() {
    this.header('Test Summary Report')

    const summary = this.testResults.reduce((acc, result) => {
      acc[result.type] = (acc[result.type] || 0) + 1
      return acc
    }, {})

    console.log(`${colors.cyan}Total Tests:${colors.reset} ${this.testResults.length}`)
    console.log(`${colors.green}✅ Passed:${colors.reset} ${summary.success || 0}`)
    console.log(`${colors.yellow}⚠️  Warnings:${colors.reset} ${summary.warning || 0}`)
    console.log(`${colors.red}❌ Failed:${colors.reset} ${summary.error || 0}`)

    const hasErrors = (summary.error || 0) > 0
    const hasWarnings = (summary.warning || 0) > 0

    if (hasErrors) {
      console.log(`\n${colors.red}${colors.bright}❌ DATABASE CONNECTION TEST FAILED${colors.reset}`)
      console.log('Please fix the errors above before proceeding to production.')
      return false
    } else if (hasWarnings) {
      console.log(`\n${colors.yellow}${colors.bright}⚠️  DATABASE CONNECTION TEST PASSED WITH WARNINGS${colors.reset}`)
      console.log('Consider addressing warnings for better reliability.')
      return true
    } else {
      console.log(`\n${colors.green}${colors.bright}✅ DATABASE CONNECTION TEST PASSED${colors.reset}`)
      console.log('Database configuration is ready for production.')
      return true
    }
  }

  /**
   * Run all database tests
   */
  async runAllTests() {
    console.log(`${colors.cyan}${colors.bright}`)
    console.log('╔════════════════════════════════════════════════════════════╗')
    console.log('║              Database Connection Test Suite               ║')
    console.log('║            DART Batch Processing System                   ║')
    console.log('╚════════════════════════════════════════════════════════════╝')
    console.log(colors.reset)

    try {
      // Run tests in sequence
      const tests = [
        () => this.testEnvironmentConfig(),
        () => this.testSSLCertificates(),
        () => this.testBasicConnectivity(),
        () => this.testConnectionPooling(),
        () => this.testSchemaAccess(),
        () => this.testTransactions(),
        () => this.testPerformance(),
        () => this.testHealthMonitoring()
      ]

      for (const test of tests) {
        await test()
      }

      return this.generateReport()

    } catch (error) {
      this.error(`Test suite failed: ${error.message}`)
      return false
    } finally {
      // Clean up
      try {
        await this.dbManager.gracefulShutdown()
      } catch (cleanupError) {
        console.error('Cleanup error:', cleanupError.message)
      }
    }
  }
}

// CLI execution
if (require.main === module) {
  const tester = new DatabaseConnectionTester()
  
  tester.runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1)
    })
    .catch(error => {
      console.error('Test suite error:', error)
      process.exit(1)
    })
}

module.exports = DatabaseConnectionTester