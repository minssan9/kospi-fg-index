# Testing Strategy Guide

## 📋 **Testing Philosophy**

Our testing approach follows the **Test Pyramid** with comprehensive coverage across all architectural layers.

```
    /\
   /  \    E2E Tests (Few)
  /____\   
 /      \   Integration Tests (Some)  
/________\  Unit Tests (Many)
```

## 🏗️ **Test Structure**

### **Backend Test Organization**

```
/tests/
├── unit/                   # Unit Tests (Fast, Isolated)
│   ├── collectors/         # Data collector unit tests
│   │   ├── financial/        # Financial collector tests
│   │   ├── news/            # News collector tests  
│   │   └── regulatory/       # Regulatory collector tests
│   ├── services/           # Service layer unit tests
│   │   ├── core/            # Core business logic tests
│   │   ├── auth/            # Authentication tests
│   │   ├── infrastructure/   # Infrastructure service tests
│   │   └── config/          # Configuration service tests
│   └── utils/              # Utility function tests
│       ├── common/          # Common utility tests
│       └── data/            # Data processing tests
├── integration/            # Integration Tests (Medium speed)
│   └── api/               # API endpoint integration tests
│       ├── fearGreed.test.ts   # F&G API integration
│       ├── dataCollection.test.ts # Data collection APIs
│       └── admin.test.ts       # Admin API integration
└── system/                 # System Tests (Slow, Complete)
    └── end-to-end/         # Full workflow tests
        ├── dailyCollection.test.ts # Daily data collection
        ├── indexCalculation.test.ts # Index calculation flow
        └── adminWorkflow.test.ts   # Admin system workflow
```

### **Frontend Test Organization**

```
/tests/
├── components/             # Vue Component Tests
│   ├── common/            # Common component tests
│   │   ├── BaseButton.test.ts   # Button component
│   │   ├── BaseCard.test.ts     # Card component  
│   │   └── LoadingSpinner.test.ts # Loading component
│   ├── charts/            # Chart component tests
│   │   ├── FearGreedChart.test.ts   # Main chart
│   │   └── HistoryChart.test.ts     # History chart
│   └── forms/             # Form component tests
├── composables/           # Composable Function Tests
│   ├── api/              # API composable tests
│   │   ├── useFearGreed.test.ts    # F&G data composable
│   │   └── useMarketData.test.ts   # Market data composable
│   ├── auth/             # Auth composable tests  
│   │   ├── useAuth.test.ts         # Authentication
│   │   └── usePermissions.test.ts  # Permission checks
│   └── ui/               # UI composable tests
├── stores/               # Pinia Store Tests
│   ├── auth.test.ts         # Auth store
│   ├── fearGreed.test.ts    # F&G store
│   └── app.test.ts          # App store
└── utils/                # Utility Tests
    ├── common/              # Common utilities
    └── charts/              # Chart utilities
```

## 🧪 **Test Types & Strategies**

### **Unit Tests**

**Purpose**: Test individual functions/classes in isolation
**Speed**: Very fast (< 50ms per test)
**Coverage**: 80%+ line coverage target

**Example Structure**:
```typescript
describe('FearGreedCalculator', () => {
  describe('calculateIndex', () => {
    it('should return valid index between 0-100', () => {
      // Arrange
      const testData = { /* mock data */ }
      
      // Act  
      const result = FearGreedCalculator.calculateIndex(testData)
      
      // Assert
      expect(result.value).toBeBetween(0, 100)
    })
    
    it('should handle missing data gracefully', () => {
      // Test edge cases
    })
  })
  
  describe('error handling', () => {
    it('should throw on invalid input', () => {
      // Test error conditions
    })
  })
})
```

### **Integration Tests**

**Purpose**: Test API endpoints and service interactions
**Speed**: Medium (100-500ms per test)
**Coverage**: Critical API paths

**Example Structure**:
```typescript
describe('Fear & Greed API', () => {
  beforeEach(async () => {
    await setupTestDatabase()
  })
  
  afterEach(async () => {
    await cleanupTestDatabase()
  })
  
  it('should return current index', async () => {
    const response = await request(app)
      .get('/api/fear-greed/current')
      .expect(200)
      
    expect(response.body).toMatchObject({
      success: true,
      data: expect.objectContaining({
        value: expect.any(Number),
        level: expect.any(String)
      })
    })
  })
})
```

### **System/E2E Tests**

**Purpose**: Test complete user workflows
**Speed**: Slow (1-10s per test)
**Coverage**: Critical business flows

**Example Structure**:
```typescript
describe('Daily Data Collection Workflow', () => {
  it('should collect and process daily market data', async () => {
    // 1. Trigger data collection
    await scheduler.triggerDailyCollection()
    
    // 2. Verify data was collected
    const kospiData = await database.getLatestKOSPIData()
    expect(kospiData).toBeDefined()
    
    // 3. Verify index was calculated
    const fearGreedIndex = await database.getLatestFearGreedIndex()
    expect(fearGreedIndex.value).toBeBetween(0, 100)
    
    // 4. Verify API returns updated data
    const apiResponse = await request(app)
      .get('/api/fear-greed/current')
      .expect(200)
    
    expect(apiResponse.body.data.date).toBe(today())
  })
})
```

## ⚡ **Test Configuration**

### **Backend Test Setup (Jest)**

```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/tests/**/*',
  ],
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup.ts']
}
```

### **Frontend Test Setup (Vitest)**

```typescript
// vite.config.ts
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.ts'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      threshold: {
        global: {
          branches: 75,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    }
  }
})
```

## 🛠️ **Testing Tools & Libraries**

### **Backend Stack**
- **Jest**: Test runner and assertion library
- **Supertest**: HTTP endpoint testing
- **ts-jest**: TypeScript support for Jest
- **@types/jest**: TypeScript definitions

### **Frontend Stack**
- **Vitest**: Fast test runner (Vite-powered)
- **@vue/test-utils**: Vue component testing utilities
- **jsdom**: Browser environment simulation
- **@pinia/testing**: Pinia store testing utilities

## 🎯 **Test Patterns**

### **Mocking Strategies**

**External APIs**:
```typescript
jest.mock('axios', () => ({
  get: jest.fn(),
  post: jest.fn(),
  defaults: { headers: { common: {} } }
}))
```

**Database Operations**:
```typescript
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    kospi: {
      findMany: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn()
    }
  }))
}))
```

**Vue Components**:
```typescript
const wrapper = mount(Component, {
  global: {
    plugins: [createTestingPinia()],
    stubs: ['router-link', 'router-view']
  },
  props: {
    // Component props
  }
})
```

### **Test Data Factories**

```typescript
// Backend factory
export const createMockKOSPIData = (overrides = {}) => ({
  date: '2024-01-01',
  close: '2500.00',
  volume: '1000000',
  change: '10.50',
  changePercent: '0.42',
  ...overrides
})

// Frontend factory  
export const createMockFearGreedIndex = (overrides = {}) => ({
  date: '2024-01-01',
  value: 75,
  level: 'Greed',
  confidence: 0.85,
  ...overrides
})
```

## 📊 **Coverage Targets**

### **Coverage Goals**

| Layer | Line Coverage | Branch Coverage | Function Coverage |
|-------|---------------|-----------------|-------------------|
| Utils | 95% | 90% | 95% |
| Services | 85% | 80% | 90% |
| Collectors | 80% | 75% | 85% |
| Routes | 75% | 70% | 80% |
| Components | 80% | 75% | 85% |
| Composables | 90% | 85% | 95% |

### **Quality Gates**

- All tests must pass before deployment
- Coverage thresholds must be met
- No critical security vulnerabilities
- Performance benchmarks within limits

## 🚀 **Running Tests**

### **Backend Commands**
```bash
# Run all tests
npm test

# Run specific test types
npm run test:unit
npm run test:integration  
npm run test:system

# Run with coverage
npm run test:coverage

# Run specific test categories
npm run test:collectors
npm run test:services
npm run test:utils

# Watch mode for development
npm run test:watch
```

### **Frontend Commands**
```bash
# Run all tests
npm run test

# Run with coverage
npm run test:coverage

# Run specific test types
npm run test:unit
npm run test:components
npm run test:composables

# Watch mode
npm run test:watch

# UI mode (interactive)
npm run test:ui
```

## 🔍 **Test-Driven Development Workflow**

1. **Write failing test** (Red)
2. **Write minimal code to pass** (Green)  
3. **Refactor code while keeping tests passing** (Refactor)
4. **Repeat cycle**

### **TDD Example**

```typescript
// Step 1: Write failing test
describe('calculateFearGreedIndex', () => {
  it('should return 50 for neutral sentiment', () => {
    const neutralData = createNeutralMarketData()
    const result = calculateFearGreedIndex(neutralData)
    expect(result.value).toBe(50)
  })
})

// Step 2: Write minimal implementation
export function calculateFearGreedIndex(data) {
  return { value: 50, level: 'Neutral' }
}

// Step 3: Refactor with real logic
export function calculateFearGreedIndex(data) {
  const weighted = applyWeights(data)
  return {
    value: Math.round(weighted),
    level: getLevelFromValue(weighted)
  }
}
```

## 🎯 **Best Practices**

### **Test Writing**
- Use descriptive test names
- Follow Arrange-Act-Assert pattern
- Test one thing per test case
- Use factories for test data
- Mock external dependencies
- Test edge cases and error conditions

### **Test Organization**
- Mirror source code structure
- Group related tests in describe blocks
- Use consistent naming conventions
- Keep tests independent
- Use setup/teardown appropriately

### **Performance**
- Keep unit tests fast (< 50ms)
- Use parallel test execution
- Mock expensive operations
- Use test databases for integration tests
- Clean up after tests