/**
 * Environment Variables Validation Script
 * Validates production environment configuration for DART batch processing system
 * 
 * NOTE: This validator has been cleaned up to only check environment variables
 * that are actually used in the codebase. Unused variables have been removed.
 * 
 * Used variables are:
 * - Database: DATABASE_URL, DB_CONNECTION_POOL_*, DB_QUERY_TIMEOUT
 * - DART: DART_API_KEY
 * - External APIs: KIS_API_KEY, KIS_API_SECRET, BOK_API_KEY
 * - Security: JWT_SECRET
 * - Application: NODE_ENV, PORT
 * - Logging: LOG_LEVEL
 */

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

// ANSI colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m',
  bright: '\x1b[1m'
}

// Required environment variables by category
const REQUIRED_VARS = {
  database: [
    'DATABASE_URL',
    'DB_CONNECTION_POOL_MIN',
    'DB_CONNECTION_POOL_MAX',
    'DB_CONNECTION_TIMEOUT',
    'DB_QUERY_TIMEOUT'
  ],
  dart: [
    'DART_API_KEY'
  ],
  external_apis: [
    'KIS_API_KEY',
    'KIS_API_SECRET',
    'BOK_API_KEY'
  ],
  security: [
    'JWT_SECRET'
  ],
  application: [
    'NODE_ENV',
    'PORT'
  ],
  logging: [
    'LOG_LEVEL'
  ]
}

// Validation rules
const VALIDATION_RULES = {
  DATABASE_URL: {
    type: 'connection_string',
    pattern: /^(mysql|postgresql):\/\/.+/,
    description: 'Must be a valid database connection string'
  },
  DART_API_KEY: {
    type: 'api_key',
    minLength: 32,
    description: 'DART API key must be at least 32 characters'
  },
  JWT_SECRET: {
    type: 'secret',
    minLength: 32,
    entropy: 4.0,
    description: 'JWT secret must be at least 32 characters with high entropy'
  },
  PORT: {
    type: 'port',
    min: 1000,
    max: 65535,
    description: 'Port must be between 1000 and 65535'
  },
  NODE_ENV: {
    type: 'enum',
    values: ['development', 'test', 'production'],
    description: 'NODE_ENV must be development, test, or production'
  },
  LOG_LEVEL: {
    type: 'enum',
    values: ['error', 'warn', 'info', 'debug', 'verbose'],
    description: 'LOG_LEVEL must be error, warn, info, debug, or verbose'
  }
}

class EnvironmentValidator {
  constructor(envFile = '.env.production') {
    this.envFile = envFile
    this.errors = []
    this.warnings = []
    this.info = []
    this.env = {}
  }

  log(color, prefix, message) {
    console.log(`${color}${prefix}${colors.reset} ${message}`)
  }

  error(message) {
    this.errors.push(message)
    this.log(colors.red, '❌ ERROR:', message)
  }

  warning(message) {
    this.warnings.push(message)
    this.log(colors.yellow, '⚠️  WARN:', message)
  }

  success(message) {
    this.log(colors.green, '✅ SUCCESS:', message)
  }

  info(message) {
    this.info.push(message)
    this.log(colors.blue, 'ℹ️  INFO:', message)
  }

  header(message) {
    console.log(`\n${colors.cyan}${colors.bright}=== ${message} ===${colors.reset}`)
  }

  /**
   * Load and parse environment file
   */
  loadEnvironment() {
    this.header('Loading Environment Configuration')
    
    const envPath = path.join(process.cwd(), this.envFile)
    
    if (!fs.existsSync(envPath)) {
      this.error(`Environment file not found: ${envPath}`)
      return false
    }

    try {
      const envContent = fs.readFileSync(envPath, 'utf8')
      const lines = envContent.split('\n')
      
      lines.forEach((line, index) => {
        line = line.trim()
        if (line && !line.startsWith('#') && line.includes('=')) {
          const [key, ...valueParts] = line.split('=')
          const value = valueParts.join('=').trim()
          this.env[key.trim()] = value
        }
      })

      this.success(`Loaded ${Object.keys(this.env).length} environment variables from ${this.envFile}`)
      return true
      
    } catch (error) {
      this.error(`Failed to read environment file: ${error.message}`)
      return false
    }
  }

  /**
   * Check for required environment variables
   */
  checkRequiredVariables() {
    this.header('Checking Required Variables')

    let allPresent = true

    Object.entries(REQUIRED_VARS).forEach(([category, vars]) => {
      this.info(`Checking ${category.toUpperCase()} variables...`)
      
      vars.forEach(varName => {
        if (!this.env[varName] || this.env[varName].trim() === '') {
          this.error(`Missing required variable: ${varName}`)
          allPresent = false
        } else {
          this.success(`Found: ${varName}`)
        }
      })
    })

    return allPresent
  }

  /**
   * Validate variable formats and values
   */
  validateFormats() {
    this.header('Validating Variable Formats')

    let allValid = true

    Object.entries(VALIDATION_RULES).forEach(([varName, rule]) => {
      const value = this.env[varName]
      
      if (!value) {
        return // Skip if not present (will be caught by required check)
      }

      const isValid = this.validateSingleVariable(varName, value, rule)
      if (!isValid) {
        allValid = false
      }
    })

    return allValid
  }

  /**
   * Validate a single variable against its rule
   */
  validateSingleVariable(varName, value, rule) {
    switch (rule.type) {
      case 'connection_string':
        if (!rule.pattern.test(value)) {
          this.error(`${varName}: ${rule.description}`)
          return false
        }
        break

      case 'api_key':
        if (value.length < rule.minLength) {
          this.error(`${varName}: ${rule.description}`)
          return false
        }
        if (value.includes('YOUR_') || value.includes('_HERE')) {
          this.error(`${varName}: Contains placeholder text, please set actual API key`)
          return false
        }
        break

      case 'secret':
        if (value.length < rule.minLength) {
          this.error(`${varName}: ${rule.description}`)
          return false
        }
        if (this.calculateEntropy(value) < rule.entropy) {
          this.warning(`${varName}: Low entropy secret detected. Consider using a stronger secret`)
        }
        if (value.includes('CHANGE_THIS') || value.includes('YOUR_')) {
          this.error(`${varName}: Contains placeholder text, please set actual secret`)
          return false
        }
        break

      case 'port':
        const port = parseInt(value)
        if (isNaN(port) || port < rule.min || port > rule.max) {
          this.error(`${varName}: ${rule.description}`)
          return false
        }
        break

      case 'enum':
        if (!rule.values.includes(value)) {
          this.error(`${varName}: ${rule.description}`)
          return false
        }
        break
    }

    this.success(`${varName}: Valid`)
    return true
  }

  /**
   * Calculate entropy of a string (bits per character)
   */
  calculateEntropy(str) {
    const freq = {}
    str.split('').forEach(char => {
      freq[char] = (freq[char] || 0) + 1
    })

    let entropy = 0
    const len = str.length
    
    Object.values(freq).forEach(count => {
      const p = count / len
      entropy -= p * Math.log2(p)
    })

    return entropy
  }

  /**
   * Test database connection format
   */
  validateDatabaseConnection() {
    this.header('Database Connection Validation')

    const dbUrl = this.env.DATABASE_URL
    if (!dbUrl) {
      return false
    }

    try {
      const url = new URL(dbUrl)
      
      this.success(`Database protocol: ${url.protocol}`)
      this.success(`Database host: ${url.hostname}`)
      this.success(`Database port: ${url.port || 'default'}`)
      this.success(`Database name: ${url.pathname.substring(1)}`)
      
      if (url.searchParams.has('ssl')) {
        this.success('SSL configuration detected')
      } else if (this.env.NODE_ENV === 'production') {
        this.warning('No SSL configuration detected for production database')
      }

      return true
      
    } catch (error) {
      this.error(`Invalid database URL format: ${error.message}`)
      return false
    }
  }

  /**
   * Check security best practices
   */
  checkSecurityPractices() {
    this.header('Security Best Practices Check')

    let secure = true

    // Check for development/default values in production
    if (this.env.NODE_ENV === 'production') {
      const sensitiveVars = ['JWT_SECRET', 'DART_API_KEY']
      
      sensitiveVars.forEach(varName => {
        const value = this.env[varName]
        if (value && (value.includes('dev') || value.includes('test') || value.length < 32)) {
          this.warning(`${varName}: May be using development/weak value in production`)
          secure = false
        }
      })
    }

    return secure
  }

  /**
   * Generate summary report
   */
  generateReport() {
    this.header('Validation Summary')

    console.log(`${colors.cyan}Environment File:${colors.reset} ${this.envFile}`)
    console.log(`${colors.cyan}Variables Loaded:${colors.reset} ${Object.keys(this.env).length}`)
    console.log(`${colors.green}✅ Passed:${colors.reset} ${this.info.length}`)
    console.log(`${colors.yellow}⚠️  Warnings:${colors.reset} ${this.warnings.length}`)
    console.log(`${colors.red}❌ Errors:${colors.reset} ${this.errors.length}`)

    if (this.errors.length > 0) {
      console.log(`\n${colors.red}${colors.bright}❌ VALIDATION FAILED${colors.reset}`)
      console.log('Please fix the errors above before proceeding to production.')
      return false
    } else if (this.warnings.length > 0) {
      console.log(`\n${colors.yellow}${colors.bright}⚠️  VALIDATION PASSED WITH WARNINGS${colors.reset}`)
      console.log('Consider addressing warnings for better security and reliability.')
      return true
    } else {
      console.log(`\n${colors.green}${colors.bright}✅ VALIDATION PASSED${colors.reset}`)
      console.log('Environment configuration is ready for production.')
      return true
    }
  }

  /**
   * Run full validation
   */
  validate() {
    console.log(`${colors.cyan}${colors.bright}`)
    console.log('╔════════════════════════════════════════════════════════════╗')
    console.log('║                 DART Environment Validator                ║')
    console.log('║              Production Configuration Check               ║')
    console.log('╚════════════════════════════════════════════════════════════╝')
    console.log(colors.reset)

    const loaded = this.loadEnvironment()
    if (!loaded) {
      return false
    }

    const requiredPresent = this.checkRequiredVariables()
    const formatsValid = this.validateFormats()
    const dbValid = this.validateDatabaseConnection()
    const securityChecked = this.checkSecurityPractices()

    return this.generateReport()
  }
}

// CLI execution
if (require.main === module) {
  const envFile = process.argv[2] || '.env.production'
  const validator = new EnvironmentValidator(envFile)
  
  const isValid = validator.validate()
  process.exit(isValid ? 0 : 1)
}

module.exports = EnvironmentValidator