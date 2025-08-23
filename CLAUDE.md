# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a KOSPI Fear & Greed Index web application that calculates and visualizes investor sentiment for the Korean stock market (KOSPI). The project consists of a Vue.js frontend with Quasar UI and a Node.js/Express backend with TypeScript, using PostgreSQL/MySQL for data storage.

## Development Commands

### Backend Commands
```bash
cd backend

# Development
npm run dev                    # Start development server with hot reload
npm run build                  # Build TypeScript to JavaScript
npm run start                  # Start production server
npm run start:prod            # Start with production environment

# Testing
npm test                      # Run Jest tests
npm run test:simple          # Run simple test script
npm run test:collectors      # Test data collectors
npm run test:system          # Run system tests

# Database
npm run db:generate          # Generate Prisma client
npm run db:push             # Push schema to database
npm run db:migrate          # Run database migrations

# Data Collection
npm run collect:data         # Collect daily market data
npm run collect:historical   # Collect historical data range

# DART Data Collection (with advanced pagination & filtering)
npm run collect:dart [date]  # Collect DART data for specific date
npm run collect:dart -- --help # Show usage help
npm run collect:dart-daily   # Collect for today
npm run collect:dart-yesterday # Collect for yesterday
npm run collect:dart-business # Collect for last business day

# Available date formats:
# - YYYY-MM-DD (e.g., 2024-01-15)
# - today, yesterday, last-business, last-week

# Basic options:
# - --dry-run: Preview without saving
# - --no-save: Fetch without database storage
# - --help: Show detailed usage

# Advanced pagination & filtering:
# - --max-pages=N: Limit collection to N pages (1-100, default: 50)
# - --page-size=N: Records per page (1-100, default: 100)
# - --report-code=X: Filter by disclosure type
#   A=정기공시, B=주요사항보고, C=발행공시, D=지분공시

# Examples:
# npm run collect:dart -- 2024-01-15 --max-pages=10 --dry-run
# npm run collect:dart -- yesterday --report-code=B --dry-run
# npm run collect:dart -- last-business --page-size=50

# Code Quality
npm run lint                 # Run ESLint
npm run lint:fix            # Fix ESLint issues automatically
```

### Frontend Commands
```bash
cd frontend

# Development
npm run dev                  # Start Vite development server
npm run build               # Build for production
npm run preview             # Preview production build

# Testing
npm test                    # Run Vitest tests
npm run test:coverage       # Run tests with coverage

# Code Quality
npm run lint                # Run ESLint
npm run format             # Format code with Prettier
```

### Docker Commands
```bash
# Backend
npm run docker:build       # Build Docker image
npm run docker:run         # Run container
npm run docker:up          # Start with docker-compose
npm run docker:down        # Stop docker-compose
```

## Architecture Overview

### Core Components

1. **Data Collectors** (`backend/src/collectors/`)
   - `krxCollector.ts`: Collects KOSPI/KOSDAQ data from Korea Investment & Securities API
   - `bokCollector.ts`: Collects economic data from Bank of Korea API
   - `upbitCollector.ts`: Collects cryptocurrency index data

2. **Fear & Greed Calculator** (`backend/src/services/fearGreedCalculator.ts`)
   - Implements 5-component weighted algorithm:
     - Price Momentum (25%)
     - Investor Sentiment (25%) 
     - Put/Call Ratio (15%)
     - Volatility Index (20%)
     - Safe Haven Demand (15%)
   - Returns 0-100 scale index with confidence score

3. **Scheduler** (`backend/src/services/scheduler.ts`)
   - Automated daily data collection
   - Historical data backfilling
   - Runs in production environment only

4. **Database Models** (`backend/prisma/schema.prisma`)
   - Fear & Greed Index daily records
   - Market data (KOSPI/KOSDAQ)
   - Investor trading patterns
   - Economic indicators and bond yields

### API Structure

- **Fear & Greed API**: `/api/fear-greed/`
  - Current index, historical data, chart data
- **Market Data API**: `/api/data/`
  - KOSPI/KOSDAQ indices, investor trading, economic indicators
- **Health Check**: `/health`

### Frontend Architecture

- **Vue 3** with Composition API and TypeScript
- **Quasar Framework** for UI components
- **Pinia** for state management
- **Chart.js** for data visualization
- **Axios** for API communication

## Key Patterns

### Data Collection Pattern
All collectors follow similar structure:
```typescript
export class DataCollector {
  static async fetchData(date: string): Promise<DataType>
  private static async getAccessToken(): Promise<string>
  private static async makeAPICall(): Promise<Response>
}
```

### Error Handling
- Collectors return neutral values (50) when data is unavailable
- All API errors are logged with context
- Database operations use transactions where appropriate

### Environment Configuration
- `.env` for development
- `.env.production` for production
- API keys required: `KIS_API_KEY`, `KIS_API_SECRET`, `BOK_API_KEY`

## Database Schema Notes

- Uses Prisma ORM with MySQL/PostgreSQL support
- All market data stored as strings to preserve original format
- Date fields use `@db.Date` for consistent date handling
- Comprehensive logging in `DataCollectionLog` model

## Development Workflow

1. **Adding New Data Sources**:
   - Create collector in `backend/src/collectors/`
   - Add database model in `schema.prisma`
   - Update Fear & Greed calculator weights if needed
   - Add API route in `backend/src/routes/`

2. **Modifying Fear & Greed Logic**:
   - Update `fearGreedCalculator.ts`
   - Adjust weights in `WEIGHTS` constant
   - Test with historical data using `npm run test:system`

3. **Frontend Changes**:
   - Follow Vue 3 Composition API patterns
   - Use Quasar components for consistency
   - Update API service in `frontend/src/services/api.ts`

## Testing Strategy

- **Unit Tests**: Focus on Fear & Greed calculation logic
- **Integration Tests**: Test data collectors with mock APIs
- **System Tests**: End-to-end data collection and calculation
- **Simple Tests**: Quick validation scripts in `backend/src/test/`

## External API Dependencies

- **Korea Investment & Securities (KIS) OpenAPI**: Stock market data
- **Bank of Korea (BOK) ECOS**: Economic indicators and interest rates
- APIs require authentication tokens and have rate limits

## Production Considerations

- Scheduler runs automatically in production environment
- Health check endpoint monitors system status
- Rate limiting and CORS configured for production
- Comprehensive logging with Winston
- Graceful shutdown handling for server termination

## Task Master AI Instructions
**Import Task Master's development workflow commands and guidelines, treat as if import is in the main CLAUDE.md file.**
@./.taskmaster/CLAUDE.md
