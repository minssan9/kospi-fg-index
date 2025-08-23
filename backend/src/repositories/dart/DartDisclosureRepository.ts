import { BaseRepository } from '../core/BaseRepository'
import type { DartDisclosureData } from '@/types/collectors/dartTypes'

/**
 * DART 공시정보 리포지토리
 * 공시 데이터 CRUD 작업 전담
 */
export class DartDisclosureRepository extends BaseRepository {

  // ================================
  // CREATE OPERATIONS
  // ================================

  /**
   * 공시정보 저장 (단일)
   */
  static async saveDisclosure(data: {
    receiptNumber: string
    corpCode: string
    corpName: string
    stockCode?: string
    reportName: string
    reportCode: string
    flrName: string
    receiptDate: string
    disclosureDate: string
    remarks?: string
  }): Promise<void> {
    this.validateRequired(data, ['receiptNumber', 'corpCode', 'corpName', 'reportName'])

    try {
      await this.prisma.dartDisclosure.upsert({
        where: { receiptNumber: data.receiptNumber },
        update: {
          corpName: data.corpName,
          stockCode: data.stockCode || '',
          reportName: data.reportName,
          reportCode: data.reportCode,
          flrName: data.flrName,
          receiptDate: this.validateAndFormatDate(data.receiptDate),
          disclosureDate: this.validateAndFormatDate(data.disclosureDate),
          remarks: data.remarks || '',
          updatedAt: new Date()
        },
        create: {
          receiptNumber: data.receiptNumber,
          corpCode: data.corpCode,
          corpName: data.corpName,
          stockCode: data.stockCode || '',
          reportName: data.reportName,
          reportCode: data.reportCode,
          flrName: data.flrName,
          receiptDate: this.validateAndFormatDate(data.receiptDate),
          disclosureDate: this.validateAndFormatDate(data.disclosureDate),
          remarks: data.remarks || ''
        }
      })

      this.logSuccess('DART 공시정보 저장', data.receiptNumber)
    } catch (error) {
      this.logError('DART 공시정보 저장', data.receiptNumber, error)
      throw error
    }
  }

  /**
   * 공시정보 배치 저장
   */
  static async saveDisclosuresBatch(disclosures: DartDisclosureData[]): Promise<{
    success: number
    failed: number
    errors: string[]
  }> {
    const results = { success: 0, failed: 0, errors: [] as string[] }

    return this.measureTime(async () => {
      return this.executeTransaction(async (prisma) => {
        for (const disclosure of disclosures) {
          try {
            await prisma.dartDisclosure.upsert({
              where: { receiptNumber: disclosure.receiptNumber },
              update: {
                corpName: disclosure.corpName,
                stockCode: disclosure.stockCode || '',
                reportName: disclosure.reportName,
                reportCode: disclosure.reportCode,
                flrName: disclosure.flrName,
                receiptDate: this.validateAndFormatDate(disclosure.receiptDate),
                disclosureDate: this.validateAndFormatDate(disclosure.disclosureDate),
                remarks: disclosure.remarks || '',
                updatedAt: new Date()
              },
              create: {
                receiptNumber: disclosure.receiptNumber,
                corpCode: disclosure.corpCode,
                corpName: disclosure.corpName,
                stockCode: disclosure.stockCode || '',
                reportName: disclosure.reportName,
                reportCode: disclosure.reportCode,
                flrName: disclosure.flrName,
                receiptDate: this.validateAndFormatDate(disclosure.receiptDate),
                disclosureDate: this.validateAndFormatDate(disclosure.disclosureDate),
                remarks: disclosure.remarks || ''
              }
            })
            results.success++
          } catch (error) {
            results.failed++
            results.errors.push(`${disclosure.receiptNumber}: ${error}`)
          }
        }

        this.logBatchResult('DART 공시정보 저장', results.success, disclosures.length)
        return results
      })
    }, `DART 공시정보 배치 저장 (${disclosures.length}건)`)
  }

  // ================================
  // READ OPERATIONS
  // ================================

  /**
   * 접수번호로 공시정보 조회
   */
  static async findByReceiptNumber(receiptNumber: string) {
    try {
      return await this.prisma.dartDisclosure.findUnique({
        where: { receiptNumber }
      })
    } catch (error) {
      this.logError('DART 공시정보 조회', receiptNumber, error)
      throw error
    }
  }

  /**
   * 기업코드별 공시정보 조회
   */
  static async findByCorpCode(corpCode: string, limit: number = 50) {
    try {
      return await this.prisma.dartDisclosure.findMany({
        where: { corpCode },
        orderBy: { disclosureDate: 'desc' },
        take: limit
      })
    } catch (error) {
      this.logError('기업별 공시정보 조회', corpCode, error)
      throw error
    }
  }

  /**
   * 날짜 범위별 공시정보 조회
   */
  static async findByDateRange(startDate: string, endDate: string) {
    try {
      return await this.prisma.dartDisclosure.findMany({
        where: {
          disclosureDate: {
            gte: this.validateAndFormatDate(startDate),
            lte: this.validateAndFormatDate(endDate)
          }
        },
        orderBy: { disclosureDate: 'desc' }
      })
    } catch (error) {
      this.logError('날짜별 공시정보 조회', `${startDate}~${endDate}`, error)
      throw error
    }
  }

  /**
   * 보고서 타입별 공시정보 조회
   */
  static async findByReportType(reportCode: string, limit: number = 100) {
    try {
      return await this.prisma.dartDisclosure.findMany({
        where: { reportCode },
        orderBy: { disclosureDate: 'desc' },
        take: limit
      })
    } catch (error) {
      this.logError('보고서타입별 공시정보 조회', reportCode, error)
      throw error
    }
  }

  // ================================
  // UPDATE OPERATIONS
  // ================================

  /**
   * 공시정보 업데이트
   */
  static async updateDisclosure(receiptNumber: string, updateData: Partial<{
    corpName: string
    stockCode: string
    reportName: string
    flrName: string
    remarks: string
  }>) {
    try {
      const result = await this.prisma.dartDisclosure.update({
        where: { receiptNumber },
        data: {
          ...updateData,
          updatedAt: new Date()
        }
      })

      this.logSuccess('DART 공시정보 업데이트', receiptNumber)
      return result
    } catch (error) {
      this.logError('DART 공시정보 업데이트', receiptNumber, error)
      throw error
    }
  }

  // ================================
  // DELETE OPERATIONS
  // ================================

  /**
   * 공시정보 삭제 (단일)
   */
  static async deleteDisclosure(receiptNumber: string): Promise<void> {
    try {
      await this.prisma.dartDisclosure.delete({
        where: { receiptNumber }
      })

      this.logSuccess('DART 공시정보 삭제', receiptNumber)
    } catch (error) {
      this.logError('DART 공시정보 삭제', receiptNumber, error)
      throw error
    }
  }

  /**
   * 오래된 공시정보 정리 (90일 이전)
   */
  static async cleanupOldDisclosures(retentionDays: number = 90): Promise<number> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

    try {
      const result = await this.prisma.dartDisclosure.deleteMany({
        where: {
          disclosureDate: {
            lt: cutoffDate
          }
        }
      })

      this.logSuccess('오래된 공시정보 정리', `${result.count}건 삭제`)
      return result.count
    } catch (error) {
      this.logError('오래된 공시정보 정리', `${retentionDays}일 이전`, error)
      throw error
    }
  }

  // ================================
  // ANALYTICS OPERATIONS
  // ================================

  /**
   * 공시정보 통계 조회
   */
  static async getDisclosureStats(startDate: string, endDate: string) {
    try {
      const [total, byReportType] = await Promise.all([
        // 전체 건수
        this.prisma.dartDisclosure.count({
          where: {
            disclosureDate: {
              gte: this.validateAndFormatDate(startDate),
              lte: this.validateAndFormatDate(endDate)
            }
          }
        }),
        // 보고서 타입별 통계
        this.prisma.dartDisclosure.groupBy({
          by: ['reportCode'],
          where: {
            disclosureDate: {
              gte: this.validateAndFormatDate(startDate),
              lte: this.validateAndFormatDate(endDate)
            }
          },
          _count: true
        })
      ])

      return {
        total,
        byReportType: byReportType.reduce((acc, item) => {
          acc[item.reportCode] = item._count
          return acc
        }, {} as Record<string, number>)
      }
    } catch (error) {
      this.logError('공시정보 통계 조회', `${startDate}~${endDate}`, error)
      throw error
    }
  }

  // ================================
  // ADVANCED STOCK DISCLOSURE OPERATIONS
  // ================================

  /**
   * 상세 지분공시 데이터 저장 (개선된 버전)
   */
  static async saveStockDisclosureDetail(data: {
    receiptNumber: string
    disclosureType: string
    beforeHolding?: number
    afterHolding?: number
    changeAmount?: number
    changeReason?: string
    reporterName?: string
    isSignificant: boolean
    marketImpact?: string
    impactScore?: number
  }): Promise<void> {
    try {
      // receiptNumber에서 날짜 추출 (YYYYMMDD 형식)
      const dateStr = data.receiptNumber.substring(0, 8)
      const reportDate = new Date(`${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`)
      
      const corpCode = data.receiptNumber.substring(8, 16) || data.receiptNumber.substring(0, 8)
      const reporterName = data.reporterName || 'Unknown'
      
      // 중복 검증: receiptNumber 기준으로 확인 (더 정확한 방식)
      const existingByReceiptNumber = await this.prisma.dartStockHolding.findFirst({
        where: {
          AND: [
            { corpCode },
            { reportDate },
            { reporterName },
            {
              OR: [
                { changeShares: BigInt(data.changeAmount || 0) },
                { holdingRatio: data.afterHolding || 0 }
              ]
            }
          ]
        }
      })
      
      if (existingByReceiptNumber) {
        // 기존 레코드 업데이트 (변경된 정보만)
        const updateData: any = {}
        
        if (data.afterHolding !== undefined) {
          updateData.holdingRatio = data.afterHolding
        }
        
        if (data.beforeHolding && data.afterHolding) {
          updateData.changeRatio = data.afterHolding - data.beforeHolding
        }
        
        if (data.changeAmount !== undefined) {
          updateData.changeShares = BigInt(data.changeAmount)
        }
        
        if (data.changeReason) {
          updateData.changeReason = data.changeReason
        }
        
        if (Object.keys(updateData).length > 0) {
          await this.prisma.dartStockHolding.update({
            where: { id: existingByReceiptNumber.id },
            data: updateData
          })
        }
        
        this.logSuccess('상세 지분공시 업데이트', data.receiptNumber)
      } else {
        // 새 레코드 생성
        await this.prisma.dartStockHolding.create({
          data: {
            corpCode,
            corpName: await this.getCorpNameFromCode(corpCode), // Helper 함수로 기업명 조회
            stockCode: null,
            reportDate,
            reporterName,
            holdingRatio: data.afterHolding || 0,
            holdingShares: BigInt(Math.floor((data.afterHolding || 0) * 1000000)), // 추정 계산
            changeRatio: data.beforeHolding && data.afterHolding ? 
              data.afterHolding - data.beforeHolding : 0,
            changeShares: BigInt(data.changeAmount || 0),
            changeReason: data.changeReason || 'Unknown'
          }
        })
        
        this.logSuccess('상세 지분공시 생성', data.receiptNumber)
      }
      
    } catch (error) {
      this.logError('상세 지분공시 저장', data.receiptNumber, error)
      throw error
    }
  }

  /**
   * 배치 지분공시 데이터 저장 (성능 최적화)
   */
  static async saveBatchStockDisclosureDetails(dataList: Array<{
    receiptNumber: string
    disclosureType: string
    beforeHolding?: number
    afterHolding?: number
    changeAmount?: number
    changeReason?: string
    reporterName?: string
    isSignificant: boolean
    marketImpact?: string
    impactScore?: number
    // 추가 소유현황 관련 필드
    majorHoldingsCount?: number
    executiveHoldingsCount?: number
    totalAnalysisScore?: number
    topMajorHolder?: string
    maxMajorHoldingRate?: number
    topExecutiveHolder?: string
    maxExecutiveHoldingRate?: number
  }>): Promise<{ saved: number, updated: number, failed: number }> {
    let saved = 0, updated = 0, failed = 0
    
    try {
      // 기업명 캐시 구축
      const corpCodes = [...new Set(dataList.map(d => 
        d.receiptNumber.substring(8, 16) || d.receiptNumber.substring(0, 8)
      ))]
      
      const companies = await this.prisma.dartCompany.findMany({
        where: { corpCode: { in: corpCodes } },
        select: { corpCode: true, corpName: true }
      })
      
      const corpNameCache = companies.reduce((acc, c) => {
        acc[c.corpCode] = c.corpName
        return acc
      }, {} as Record<string, string>)
      
      // 기존 데이터 조회 (중복 방지)
      const existingRecords = await this.prisma.dartStockHolding.findMany({
        where: {
          corpCode: { in: corpCodes }
        }
      })
      
      const existingMap = existingRecords.reduce((acc, record) => {
        const key = `${record.corpCode}-${record.reportDate.toISOString().split('T')[0]}-${record.reporterName}`
        acc[key] = record
        return acc
      }, {} as Record<string, any>)
      
      // 배치 처리
      for (const data of dataList) {
        try {
          const dateStr = data.receiptNumber.substring(0, 8)
          const reportDate = new Date(`${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`)
          const corpCode = data.receiptNumber.substring(8, 16) || data.receiptNumber.substring(0, 8)
          const reporterName = data.reporterName || 'Unknown'
          const key = `${corpCode}-${reportDate.toISOString().split('T')[0]}-${reporterName}`
          
          if (existingMap[key]) {
            // 업데이트
            await this.prisma.dartStockHolding.update({
              where: { id: existingMap[key].id },
              data: {
                holdingRatio: data.afterHolding || 0,
                changeRatio: data.beforeHolding && data.afterHolding ? 
                  data.afterHolding - data.beforeHolding : 0,
                changeShares: BigInt(data.changeAmount || 0),
                changeReason: data.changeReason || 'Unknown'
              }
            })
            updated++
          } else {
            // 생성
            await this.prisma.dartStockHolding.create({
              data: {
                corpCode,
                corpName: corpNameCache[corpCode] || 'Unknown Company',
                stockCode: null,
                reportDate,
                reporterName,
                holdingRatio: data.afterHolding || 0,
                holdingShares: BigInt(Math.floor((data.afterHolding || 0) * 1000000)),
                changeRatio: data.beforeHolding && data.afterHolding ? 
                  data.afterHolding - data.beforeHolding : 0,
                changeShares: BigInt(data.changeAmount || 0),
                changeReason: data.changeReason || 'Unknown'
              }
            })
            saved++
          }
        } catch (itemError) {
          this.logError('배치 지분공시 항목 저장', data.receiptNumber, itemError)
          failed++
        }
      }
      
      this.logBatchResult('배치 지분공시 저장', saved + updated, dataList.length)
      
    } catch (error) {
      this.logError('배치 지분공시 저장', `${dataList.length}건`, error)
      throw error
    }
    
    return { saved, updated, failed }
  }

  /**
   * 기업코드에서 기업명 조회 헬퍼 함수
   */
  private static async getCorpNameFromCode(corpCode: string): Promise<string> {
    try {
      const company = await this.prisma.dartCompany.findUnique({
        where: { corpCode },
        select: { corpName: true }
      })
      
      return company?.corpName || 'Unknown Company'
    } catch (error) {
      this.logError('기업명 조회', corpCode, error)
      return 'Unknown Company'
    }
  }

  /**
   * 중요한 소유권 변동 조회
   */
  static async getSignificantOwnershipChanges(days: number = 7): Promise<any[]> {
    try {
      return await this.prisma.dartStockHolding.findMany({
        where: {
          reportDate: {
            gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000)
          },
          OR: [
            { changeRatio: { gte: 5.0 } }, // 5% 이상 증가
            { changeRatio: { lte: -5.0 } }, // 5% 이상 감소
            { holdingRatio: { gte: 5.0 } } // 5% 이상 보유
          ]
        },
        orderBy: {
          reportDate: 'desc'
        }
      })
    } catch (error) {
      this.logError('중요 소유권 변동 조회', `${days}일`, error)
      throw error
    }
  }

  /**
   * 소유권 변동 트렌드 분석
   */
  static async analyzeOwnershipTrends(corpCode: string, days: number = 30): Promise<{
    trends: any[];
    summary: {
      totalChanges: number;
      significantChanges: number;
      averageChangeRatio: number;
      dominantTrend: 'accumulation' | 'disposal' | 'stable';
    };
  }> {
    try {
      const trends = await this.prisma.dartStockHolding.findMany({
        where: {
          corpCode,
          reportDate: {
            gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000)
          }
        },
        orderBy: {
          reportDate: 'desc'
        }
      })

      const totalChanges = trends.length
      const significantChanges = trends.filter(t => Math.abs(Number(t.changeRatio)) >= 5).length
      const avgChange = trends.length > 0 ? 
        trends.reduce((sum, t) => sum + Number(t.changeRatio), 0) / trends.length : 0
      
      const dominantTrend = avgChange > 1 ? 'accumulation' : 
                           avgChange < -1 ? 'disposal' : 'stable'

      return {
        trends,
        summary: {
          totalChanges,
          significantChanges,
          averageChangeRatio: avgChange,
          dominantTrend
        }
      }
    } catch (error) {
      this.logError('소유권 트렌드 분석', corpCode, error)
      throw error
    }
  }
}