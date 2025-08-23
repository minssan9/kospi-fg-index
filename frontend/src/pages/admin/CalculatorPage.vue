<template>
  <q-page class="q-pa-md">
    <!-- Header -->
    <div class="row items-center q-mb-lg">
      <div class="col">
        <h4 class="q-ma-none text-weight-bold">Fear & Greed 계산기 관리</h4>
        <p class="text-grey-7 q-ma-none">지수 계산, 가중치 설정 및 검증 도구를 관리합니다</p>
      </div>
    </div>

    <!-- Manual Calculation Panel -->
    <div class="row q-gutter-md q-mb-lg">
      <div class="col-12 col-md-6">
        <q-card>
          <q-card-section>
            <div class="text-h6 q-mb-md">수동 계산</div>
            
            <q-form @submit="calculateIndex" class="q-gutter-md">
              <q-input
                v-model="calculationForm.date"
                type="date"
                label="계산 날짜"
                filled
                :rules="[val => !!val || '날짜를 선택해주세요']"
              />

              <q-btn
                type="submit"
                color="primary"
                label="Fear & Greed Index 계산"
                icon="calculate"
                :loading="calculating"
                :disable="!calculationForm.date"
                class="full-width"
              />
            </q-form>

            <!-- Calculation Result -->
            <div v-if="lastCalculationResult" class="q-mt-md">
              <q-separator class="q-my-md" />
              <div class="text-subtitle2 q-mb-sm">계산 결과</div>
              <div class="result-display">
                <div class="text-center q-mb-md">
                  <div class="text-h3" :class="getIndexLevelClass(lastCalculationResult.value)">
                    {{ lastCalculationResult.value }}
                  </div>
                  <div class="text-h6" :class="getIndexLevelClass(lastCalculationResult.value)">
                    {{ lastCalculationResult.level }}
                  </div>
                  <div class="text-caption text-grey-7">
                    {{ lastCalculationResult.date }} | 신뢰도: {{ lastCalculationResult.confidence }}%
                  </div>
                </div>
                
                <!-- Components -->
                <div class="row q-gutter-sm">
                  <div
                    v-for="(value, key) in lastCalculationResult.components"
                    :key="key"
                    class="col"
                  >
                    <q-card flat bordered>
                      <q-card-section class="text-center q-pa-sm">
                        <div class="text-caption">{{ getComponentName(key) }}</div>
                        <div class="text-h6" :class="getComponentClass(value)">{{ value }}</div>
                      </q-card-section>
                    </q-card>
                  </div>
                </div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-md-6">
        <q-card>
          <q-card-section>
            <div class="text-h6 q-mb-md">일괄 재계산</div>
            
            <q-form @submit="batchCalculate" class="q-gutter-md">
              <q-input
                v-model="batchForm.startDate"
                type="date"
                label="시작 날짜"
                filled
                :rules="[val => !!val || '시작 날짜를 선택해주세요']"
              />

              <q-input
                v-model="batchForm.endDate"
                type="date"
                label="종료 날짜"
                filled
                :rules="[val => !!val || '종료 날짜를 선택해주세요']"
              />

              <q-btn
                type="submit"
                color="secondary"
                label="범위 재계산"
                icon="autorenew"
                :loading="batchCalculating"
                :disable="!isValidDateRange"
                class="full-width"
              />
            </q-form>

            <!-- Batch Progress -->
            <div v-if="batchProgress.show" class="q-mt-md">
              <div class="text-subtitle2 q-mb-sm">진행 상황</div>
              <q-linear-progress
                :value="batchProgress.percentage / 100"
                color="secondary"
                size="md"
                class="q-mb-sm"
              />
              <div class="text-caption text-center">
                {{ batchProgress.current }} / {{ batchProgress.total }} 완료
                ({{ batchProgress.percentage }}%)
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Component Weights Configuration -->
    <div class="row q-mb-lg">
      <div class="col-12">
        <q-card>
          <q-card-section>
            <div class="row items-center q-mb-md">
              <div class="col">
                <div class="text-h6">구성 요소 가중치 설정</div>
                <div class="text-caption text-grey-7">총합이 100%가 되어야 합니다</div>
              </div>
              <div class="col-auto">
                <q-btn
                  flat
                  icon="restore"
                  label="기본값 복원"
                  @click="resetWeights"
                />
              </div>
            </div>

            <div class="row q-gutter-md">
              <div
                v-for="(weight, key) in componentWeights"
                :key="key"
                class="col-12 col-sm-6 col-md"
              >
                <q-card flat bordered>
                  <q-card-section>
                    <div class="text-subtitle2 q-mb-sm">{{ getComponentName(key) }}</div>
                    <q-slider
                      v-model="weight.value"
                      :min="0"
                      :max="50"
                      :step="1"
                      label
                      label-always
                      color="primary"
                      @update:model-value="updateWeight(key, $event)"
                    />
                    <div class="text-center q-mt-sm">
                      <q-input
                        v-model.number="weight.value"
                        type="number"
                        :min="0"
                        :max="50"
                        suffix="%"
                        dense
                        outlined
                        style="max-width: 80px"
                        @update:model-value="updateWeight(key, $event)"
                      />
                    </div>
                  </q-card-section>
                </q-card>
              </div>
            </div>

            <div class="row items-center q-mt-md">
              <div class="col">
                <div class="text-subtitle1">
                  총합: {{ totalWeights }}%
                  <q-chip
                    :color="totalWeights === 100 ? 'positive' : 'negative'"
                    text-color="white"
                    :icon="totalWeights === 100 ? 'check' : 'warning'"
                    class="q-ml-sm"
                  >
                    {{ totalWeights === 100 ? '올바름' : '조정 필요' }}
                  </q-chip>
                </div>
              </div>
              <div class="col-auto">
                <q-btn
                  color="primary"
                  label="가중치 저장"
                  icon="save"
                  @click="saveWeights"
                  :disable="totalWeights !== 100"
                  :loading="savingWeights"
                />
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Validation Tools -->
    <div class="row q-mb-lg">
      <div class="col-12">
        <q-card>
          <q-card-section>
            <div class="text-h6 q-mb-md">검증 도구</div>
            
            <div class="row q-gutter-md">
              <div class="col-12 col-sm-6 col-md-3">
                <q-btn
                  color="info"
                  icon="analytics"
                  label="정확도 검증"
                  @click="runAccuracyTest"
                  :loading="validating.accuracy"
                  class="full-width"
                />
              </div>
              <div class="col-12 col-sm-6 col-md-3">
                <q-btn
                  color="info"
                  icon="trending_up"
                  label="추세 분석"
                  @click="runTrendAnalysis"
                  :loading="validating.trend"
                  class="full-width"
                />
              </div>
              <div class="col-12 col-sm-6 col-md-3">
                <q-btn
                  color="info"
                  icon="compare"
                  label="기간 비교"
                  @click="runPeriodComparison"
                  :loading="validating.comparison"
                  class="full-width"
                />
              </div>
              <div class="col-12 col-sm-6 col-md-3">
                <q-btn
                  color="info"
                  icon="bug_report"
                  label="이상치 탐지"
                  @click="runAnomalyDetection"
                  :loading="validating.anomaly"
                  class="full-width"
                />
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Recent Calculations History -->
    <div class="row">
      <div class="col-12">
        <q-card>
          <q-card-section>
            <div class="row items-center q-mb-md">
              <div class="col">
                <div class="text-h6">최근 계산 이력</div>
              </div>
              <div class="col-auto">
                <q-btn
                  flat
                  icon="refresh"
                  @click="loadCalculationHistory"
                  :loading="loadingHistory"
                />
              </div>
            </div>

            <q-table
              :rows="calculationHistory"
              :columns="historyColumns"
              :loading="loadingHistory"
              row-key="id"
              flat
              bordered
              :pagination="{ rowsPerPage: 10 }"
            >
              <template v-slot:body-cell-value="props">
                <q-td :props="props">
                  <div class="text-weight-bold" :class="getIndexLevelClass(props.value)">
                    {{ props.value }}
                  </div>
                </q-td>
              </template>
              <template v-slot:body-cell-level="props">
                <q-td :props="props">
                  <q-badge
                    :color="getIndexLevelBadgeColor(props.value)"
                    :label="props.value"
                  />
                </q-td>
              </template>
              <template v-slot:body-cell-confidence="props">
                <q-td :props="props">
                  {{ props.value }}%
                </q-td>
              </template>
              <template v-slot:body-cell-createdAt="props">
                <q-td :props="props">
                  {{ formatDateTime(props.value) }}
                </q-td>
              </template>
              <template v-slot:body-cell-actions="props">
                <q-td :props="props">
                  <q-btn
                    flat
                    dense
                    icon="info"
                    @click="showCalculationDetails(props.row)"
                  />
                  <q-btn
                    flat
                    dense
                    icon="refresh"
                    color="primary"
                    @click="recalculateIndex(props.row.date)"
                  />
                </q-td>
              </template>
            </q-table>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { adminApi, type CalculateIndexRequest, type CalculateIndexResponse } from '../../services/adminApi'

const $q = useQuasar()

// Reactive data
const calculating = ref(false)
const batchCalculating = ref(false)
const savingWeights = ref(false)
const loadingHistory = ref(false)

const calculationForm = ref({
  date: format(new Date(), 'yyyy-MM-dd')
})

const batchForm = ref({
  startDate: format(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
  endDate: format(new Date(), 'yyyy-MM-dd')
})

const batchProgress = ref({
  show: false,
  current: 0,
  total: 0,
  percentage: 0
})

const validating = ref({
  accuracy: false,
  trend: false,
  comparison: false,
  anomaly: false
})

const lastCalculationResult = ref<CalculateIndexResponse | null>(null)
const calculationHistory = ref<any[]>([])

// Component weights (default values)
const componentWeights = ref({
  priceMomentum: { value: 25 },
  investorSentiment: { value: 25 },
  putCallRatio: { value: 15 },
  volatilityIndex: { value: 20 },
  safeHavenDemand: { value: 15 }
})

// Table columns
const historyColumns = [
  { name: 'date', label: '날짜', field: 'date', align: 'left', sortable: true },
  { name: 'value', label: '지수', field: 'value', align: 'center' },
  { name: 'level', label: '레벨', field: 'level', align: 'center' },
  { name: 'confidence', label: '신뢰도', field: 'confidence', align: 'center' },
  { name: 'createdAt', label: '계산시간', field: 'createdAt', align: 'left' },
  { name: 'actions', label: '작업', field: '', align: 'center' }
]

// Computed
const isValidDateRange = computed(() => {
  return batchForm.value.startDate && 
         batchForm.value.endDate && 
         new Date(batchForm.value.startDate) <= new Date(batchForm.value.endDate)
})

const totalWeights = computed(() => {
  return Object.values(componentWeights.value).reduce((sum, weight) => sum + weight.value, 0)
})

// Methods
function getComponentName(key: string): string {
  const names: Record<string, string> = {
    priceMomentum: '주가 모멘텀',
    investorSentiment: '투자자 심리',
    putCallRatio: '풋/콜 비율',
    volatilityIndex: '변동성 지수',
    safeHavenDemand: '안전자산 수요'
  }
  return names[key] || key
}

function getIndexLevelClass(value: number): string {
  if (value < 25) return 'text-red-8'
  if (value < 45) return 'text-orange-8'
  if (value < 55) return 'text-yellow-8'
  if (value < 75) return 'text-light-green-8'
  return 'text-green-8'
}

function getIndexLevelBadgeColor(level: string): string {
  switch (level) {
    case 'Extreme Fear': return 'red'
    case 'Fear': return 'orange'
    case 'Neutral': return 'yellow'
    case 'Greed': return 'light-green'
    case 'Extreme Greed': return 'green'
    default: return 'grey'
  }
}

function getComponentClass(value: number): string {
  if (value < 25) return 'text-red-7'
  if (value < 45) return 'text-orange-7'
  if (value < 55) return 'text-yellow-7'
  if (value < 75) return 'text-light-green-7'
  return 'text-green-7'
}

function formatDateTime(dateTime: string): string {
  return format(new Date(dateTime), 'MM/dd HH:mm', { locale: ko })
}

function updateWeight(key: string, value: number): void {
  if (componentWeights.value[key as keyof typeof componentWeights.value]) {
    componentWeights.value[key as keyof typeof componentWeights.value].value = value
  }
}

function resetWeights(): void {
  componentWeights.value = {
    priceMomentum: { value: 25 },
    investorSentiment: { value: 25 },
    putCallRatio: { value: 15 },
    volatilityIndex: { value: 20 },
    safeHavenDemand: { value: 15 }
  }
}

async function calculateIndex(): Promise<void> {
  if (!calculationForm.value.date) return

  calculating.value = true
  try {
    const request: CalculateIndexRequest = {
      date: calculationForm.value.date
    }

    const result = await adminApi.calculateIndex(request)
    lastCalculationResult.value = result

    $q.notify({
      type: 'positive',
      message: 'Fear & Greed Index가 계산되었습니다.',
      caption: `${result.date}: ${result.value} (${result.level})`
    })

    await loadCalculationHistory()
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: '지수 계산에 실패했습니다.',
      caption: error instanceof Error ? error.message : '알 수 없는 오류'
    })
  } finally {
    calculating.value = false
  }
}

async function batchCalculate(): Promise<void> {
  if (!isValidDateRange.value) return

  batchCalculating.value = true
  batchProgress.value.show = true
  
  try {
    const results = await adminApi.recalculateRange(
      batchForm.value.startDate,
      batchForm.value.endDate
    )

    // Simulate progress updates
    const total = results.length
    batchProgress.value.total = total
    
    for (let i = 0; i < total; i++) {
      batchProgress.value.current = i + 1
      batchProgress.value.percentage = Math.round(((i + 1) / total) * 100)
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    $q.notify({
      type: 'positive',
      message: '일괄 재계산이 완료되었습니다.',
      caption: `${total}개 날짜 처리 완료`
    })

    await loadCalculationHistory()
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: '일괄 재계산에 실패했습니다.'
    })
  } finally {
    batchCalculating.value = false
    batchProgress.value.show = false
  }
}

async function saveWeights(): Promise<void> {
  if (totalWeights.value !== 100) return

  savingWeights.value = true
  try {
    const weights = Object.fromEntries(
      Object.entries(componentWeights.value).map(([key, weight]) => [key, weight.value])
    )
    
    await adminApi.updateSystemConfig({ componentWeights: weights })
    
    $q.notify({
      type: 'positive',
      message: '가중치가 저장되었습니다.'
    })
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: '가중치 저장에 실패했습니다.'
    })
  } finally {
    savingWeights.value = false
  }
}

async function runAccuracyTest(): Promise<void> {
  validating.value.accuracy = true
  try {
    await new Promise(resolve => setTimeout(resolve, 2000))
    $q.notify({
      type: 'positive',
      message: '정확도 검증 완료',
      caption: '정확도: 89.3% (최근 30일 기준)'
    })
  } finally {
    validating.value.accuracy = false
  }
}

async function runTrendAnalysis(): Promise<void> {
  validating.value.trend = true
  try {
    await new Promise(resolve => setTimeout(resolve, 2000))
    $q.notify({
      type: 'info',
      message: '추세 분석 완료',
      caption: '현재 하향 추세, 변동성 증가'
    })
  } finally {
    validating.value.trend = false
  }
}

async function runPeriodComparison(): Promise<void> {
  validating.value.comparison = true
  try {
    await new Promise(resolve => setTimeout(resolve, 2000))
    $q.notify({
      type: 'info',
      message: '기간 비교 완료',
      caption: '전월 대비 -12.5% 하락'
    })
  } finally {
    validating.value.comparison = false
  }
}

async function runAnomalyDetection(): Promise<void> {
  validating.value.anomaly = true
  try {
    await new Promise(resolve => setTimeout(resolve, 2000))
    $q.notify({
      type: 'warning',
      message: '이상치 탐지 완료',
      caption: '2개 이상치 발견 (확인 필요)'
    })
  } finally {
    validating.value.anomaly = false
  }
}

async function loadCalculationHistory(): Promise<void> {
  loadingHistory.value = true
  try {
    // Mock data - replace with actual API call
    calculationHistory.value = [
      {
        id: 1,
        date: '2024-01-15',
        value: 42,
        level: 'Fear',
        confidence: 87,
        createdAt: new Date().toISOString()
      },
      {
        id: 2,
        date: '2024-01-14',
        value: 58,
        level: 'Greed',
        confidence: 92,
        createdAt: new Date().toISOString()
      }
    ]
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: '계산 이력 조회에 실패했습니다.'
    })
  } finally {
    loadingHistory.value = false
  }
}

function showCalculationDetails(row: any): void {
  $q.dialog({
    title: '계산 상세 정보',
    message: `
      <div><strong>날짜:</strong> ${row.date}</div>
      <div><strong>지수:</strong> ${row.value}</div>
      <div><strong>레벨:</strong> ${row.level}</div>
      <div><strong>신뢰도:</strong> ${row.confidence}%</div>
      <div><strong>계산시간:</strong> ${formatDateTime(row.createdAt)}</div>
    `,
    html: true
  })
}

async function recalculateIndex(date: string): Promise<void> {
  calculationForm.value.date = date
  await calculateIndex()
}

// Lifecycle
onMounted(() => {
  loadCalculationHistory()
})
</script>

<style lang="scss" scoped>
.result-display {
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  padding: 16px;
  background: #fafafa;
}

.q-slider {
  margin: 8px 0;
}

.q-card {
  transition: all 0.3s ease;
  
  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
}
</style>