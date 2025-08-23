# Migration Guide - Code Reorganization

## 📋 **Overview**

This guide covers the migration from the old folder structure to the new organized architecture for both backend and frontend codebases.

## 🔄 **File Movements Summary**

### **Backend Changes**

| Old Path | New Path | Reason |
|----------|----------|---------|
| `/services/fearGreedCalculator.ts` | `/services/core/fearGreedCalculator.ts` | Core business logic |
| `/services/databaseService.ts` | `/services/core/databaseService.ts` | Core data access |
| `/services/dartBatchService.ts` | `/services/core/dartBatchService.ts` | Core processing |
| `/services/mfaService.ts` | `/services/auth/mfaService.ts` | Authentication domain |
| `/services/passwordPolicyService.ts` | `/services/auth/passwordPolicyService.ts` | Authentication domain |
| `/services/sessionService.ts` | `/services/auth/sessionService.ts` | Authentication domain |
| `/services/tokenService.ts` | `/services/auth/tokenService.ts` | Authentication domain |
| `/services/alertService.ts` | `/services/infrastructure/alertService.ts` | Infrastructure concern |
| `/services/auditService.ts` | `/services/infrastructure/auditService.ts` | Infrastructure concern |
| `/services/monitoringService.ts` | `/services/infrastructure/monitoringService.ts` | Infrastructure concern |
| `/services/scheduler.ts` | `/services/infrastructure/scheduler.ts` | Infrastructure concern |
| `/services/databaseHealthService.ts` | `/services/infrastructure/databaseHealthService.ts` | Infrastructure concern |
| `/services/configurationService.ts` | `/services/config/configurationService.ts` | Configuration management |
| `/services/rateLimitService.ts` | `/services/config/rateLimitService.ts` | Configuration management |
| `/services/businessMetricsService.ts` | `/services/config/businessMetricsService.ts` | Configuration management |
| `/collectors/krxCollector.ts` | `/collectors/financial/krxCollector.ts` | Financial data domain |
| `/collectors/upbitCollector.ts` | `/collectors/financial/upbitCollector.ts` | Financial data domain |
| `/collectors/bokCollector.ts` | `/collectors/financial/bokCollector.ts` | Financial data domain |
| `/collectors/cnnCollector.ts` | `/collectors/news/cnnCollector.ts` | News/sentiment domain |
| `/collectors/koreaFGCollector.ts` | `/collectors/news/koreaFGCollector.ts` | News/sentiment domain |
| `/collectors/dartCollector.ts` | `/collectors/regulatory/dartCollector.ts` | Regulatory domain |
| `/types/krxTypes.ts` | `/types/collectors/krxTypes.ts` | Collector-specific types |
| `/types/dartTypes.ts` | `/types/collectors/dartTypes.ts` | Collector-specific types |
| `/utils/dateUtils.ts` | `/utils/common/dateUtils.ts` | Common utilities |
| `/utils/logger.ts` | `/utils/common/logger.ts` | Common utilities |
| `/utils/retryUtils.ts` | `/utils/common/retryUtils.ts` | Common utilities |
| `/utils/cacheManager.ts` | `/utils/data/cacheManager.ts` | Data processing utilities |
| `/utils/dataQueryErrorHandler.ts` | `/utils/data/dataQueryErrorHandler.ts` | Data processing utilities |
| `/test/` | `/tests/` | Renamed for clarity |

### **Frontend Changes**

| Old Path | New Path | Reason |
|----------|----------|---------|
| `/src/logger.ts` | `/src/utils/common/logger.ts` | Utility organization |
| `/src/composables/useAuth.ts` | `/src/composables/auth/useAuth.ts` | Auth domain grouping |

### **New Directories Created**

**Backend:**
- `/services/core/` - Core business services
- `/services/auth/` - Authentication services
- `/services/infrastructure/` - Infrastructure services
- `/services/config/` - Configuration services
- `/collectors/financial/` - Financial data collectors
- `/collectors/news/` - News/sentiment collectors
- `/collectors/regulatory/` - Regulatory collectors
- `/types/collectors/` - Collector-specific types
- `/types/api/` - API types
- `/types/database/` - Database types
- `/utils/common/` - Common utilities
- `/utils/data/` - Data processing utilities
- `/tests/unit/` - Unit tests
- `/tests/integration/` - Integration tests
- `/tests/system/` - System tests

**Frontend:**
- `/components/common/` - Shared components
- `/components/charts/` - Chart components
- `/components/forms/` - Form components
- `/composables/api/` - API composables
- `/composables/auth/` - Auth composables
- `/composables/ui/` - UI composables
- `/stores/` - Pinia stores
- `/services/utils/` - Service utilities
- `/utils/common/` - Common utilities
- `/utils/charts/` - Chart utilities
- `/types/` - Type definitions
- `/tests/` - Complete test structure

## ⚠️ **Breaking Changes**

### **Import Path Updates Required**

**Backend files that need import updates:**

1. **Routes files** (`/routes/*.ts`)
   ```typescript
   // Old
   import { FearGreedCalculator } from '../services/fearGreedCalculator'
   import { DatabaseService } from '../services/databaseService'
   
   // New
   import { FearGreedCalculator } from '../services/core/fearGreedCalculator'
   import { DatabaseService } from '../services/core/databaseService'
   ```

2. **Service interdependencies**
   ```typescript
   // Old
   import { AlertService } from './alertService'
   import { MonitoringService } from './monitoringService'
   
   // New
   import { AlertService } from '../infrastructure/alertService'
   import { MonitoringService } from '../infrastructure/monitoringService'
   ```

3. **Type imports**
   ```typescript
   // Old
   import type { krxStockData } from '../types/krxTypes'
   
   // New
   import type { krxStockData } from '../types/collectors/krxTypes'
   ```

4. **Utility imports**
   ```typescript
   // Old
   import { formatDate } from '../utils/dateUtils'
   import { logger } from '../utils/logger'
   
   // New
   import { formatDate } from '../utils/common/dateUtils'
   import { logger } from '../utils/common/logger'
   ```

**Frontend files that need import updates:**

1. **Component files**
   ```typescript
   // Old
   import { useAuth } from '@/composables/useAuth'
   import logger from '@/logger'
   
   // New
   import { useAuth } from '@/composables/auth/useAuth'
   import { logger } from '@/utils/common/logger'
   ```

## 🔧 **Required Code Changes**

### **Backend Path Alias Updates**

Update `tsconfig.json` to include new path mappings:
```json
{
  "compilerOptions": {
    "baseUrl": "./src",
    "paths": {
      "@/*": ["*"],
      "@/services/core/*": ["services/core/*"],
      "@/services/auth/*": ["services/auth/*"],
      "@/services/infrastructure/*": ["services/infrastructure/*"],
      "@/services/config/*": ["services/config/*"],
      "@/collectors/financial/*": ["collectors/financial/*"],
      "@/collectors/news/*": ["collectors/news/*"],
      "@/collectors/regulatory/*": ["collectors/regulatory/*"],
      "@/types/collectors/*": ["types/collectors/*"],
      "@/utils/common/*": ["utils/common/*"],
      "@/utils/data/*": ["utils/data/*"]
    }
  }
}
```

### **Frontend Pinia Store Setup**

1. **Install Pinia** (if not already installed):
   ```bash
   npm install pinia @pinia/testing
   ```

2. **Update `main.ts`**:
   ```typescript
   import { createPinia } from 'pinia'
   
   const app = createApp(App)
   app.use(createPinia())
   ```

3. **Create base store files**:
   ```typescript
   // stores/auth.ts
   export const useAuthStore = defineStore('auth', () => {
     // Store logic
   })
   
   // stores/fearGreed.ts
   export const useFearGreedStore = defineStore('fearGreed', () => {
     // Store logic
   })
   ```

## 🧪 **Test Configuration Updates**

### **Backend Test Scripts**

Update `package.json` scripts:
```json
{
  "scripts": {
    "test": "jest",
    "test:unit": "jest tests/unit",
    "test:integration": "jest tests/integration", 
    "test:system": "jest tests/system",
    "test:collectors": "jest tests/unit/collectors",
    "test:services": "jest tests/unit/services",
    "test:coverage": "jest --coverage"
  }
}
```

### **Frontend Test Setup**

Update `vite.config.ts`:
```typescript
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.ts']
  }
})
```

## 📝 **Step-by-Step Migration Process**

### **Phase 1: Backend Structure (✅ Completed)**
1. ✅ Create new service subdirectories
2. ✅ Move service files to appropriate categories
3. ✅ Reorganize collectors by domain
4. ✅ Create organized test structure
5. ✅ Reorganize types and utils

### **Phase 2: Frontend Structure (✅ Completed)**
1. ✅ Create component directory structure
2. ✅ Create composables organization
3. ✅ Create stores directory
4. ✅ Create utils organization
5. ✅ Create types directory
6. ✅ Create test structure

### **Phase 3: Import Updates (⚠️ Manual Required)**
1. Update route files imports
2. Update service interdependency imports  
3. Update type imports across codebase
4. Update utility imports
5. Update test imports

### **Phase 4: Functionality Migration (⚠️ Manual Required)**
1. Create Pinia stores
2. Create new composables
3. Create common components
4. Migrate existing logic to new structure
5. Write comprehensive tests

## 🔍 **Validation Checklist**

### **Backend Validation**
- [ ] All services compile without import errors
- [ ] Routes can import reorganized services
- [ ] Tests run successfully with new structure  
- [ ] Database connections work with moved services
- [ ] API endpoints respond correctly

### **Frontend Validation**
- [ ] Application builds successfully
- [ ] All components render correctly
- [ ] Composables work with new imports
- [ ] Store state management functions
- [ ] Router navigation works
- [ ] API calls succeed with reorganized services

## 🚨 **Rollback Plan**

If issues arise, rollback is possible by:
1. Moving files back to original locations
2. Reverting import path changes
3. Removing new directory structure
4. Restoring original `tsconfig.json` paths

## 📞 **Support**

For migration issues:
1. Check import paths first
2. Verify tsconfig.json path mappings
3. Ensure all dependencies are installed
4. Review error logs for specific missing imports
5. Test individual modules before full integration