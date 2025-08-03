<template>
  <q-card style="width: 600px; max-width: 90vw">
    <q-card-section class="row items-center q-pb-none">
      <div class="text-h6">새 배치 작업 생성</div>
      <q-space />
      <q-btn icon="close" flat round dense @click="$emit('cancel')" />
    </q-card-section>

    <q-card-section>
      <q-stepper v-model="step" vertical color="primary" animated>
        <!-- Step 1: Job Type Selection -->
        <q-step
          :name="1"
          title="작업 유형 선택"
          icon="category"
          :done="step > 1"
        >
          <div class="q-mb-md">
            <p class="text-body2 text-grey-7">수행할 배치 작업의 유형을 선택하세요.</p>
          </div>

          <div class="row q-col-gutter-md">
            <div 
              v-for="jobType in jobTypes" 
              :key="jobType.value"
              class="col-12"
            >
              <q-card
                :class="['job-type-card', { 'selected': form.type === jobType.value }]"
                @click="form.type = jobType.value"
                clickable
              >
                <q-card-section class="row items-center">
                  <q-icon 
                    :name="jobType.icon" 
                    size="md" 
                    :color="form.type === jobType.value ? 'primary' : 'grey-6'"
                    class="q-mr-md"
                  />
                  <div class="col">
                    <div class="text-subtitle1 text-weight-medium">{{ jobType.label }}</div>
                    <div class="text-body2 text-grey-6">{{ jobType.description }}</div>
                  </div>
                  <q-radio 
                    v-model="form.type" 
                    :val="jobType.value"
                    color="primary"
                  />
                </q-card-section>
              </q-card>
            </div>
          </div>

          <q-stepper-navigation class="q-mt-lg">
            <q-btn 
              @click="step = 2" 
              color="primary" 
              label="다음"
              :disable="!form.type"
            />
          </q-stepper-navigation>
        </q-step>

        <!-- Step 2: Parameters -->
        <q-step
          :name="2"
          title="작업 설정"
          icon="settings"
          :done="step > 2"
        >
          <div class="q-mb-md">
            <p class="text-body2 text-grey-7">작업 실행에 필요한 설정을 입력하세요.</p>
          </div>

          <!-- Date Range (Common for most job types) -->
          <div v-if="requiresDateRange" class="q-mb-lg">
            <h6 class="q-my-sm">날짜 범위</h6>
            <div class="row q-col-gutter-md">
              <div class="col-6">
                <q-input
                  v-model="form.parameters.dateRange.startDate"
                  label="시작일"
                  type="date"
                  outlined
                  :rules="[val => !!val || '시작일을 선택하세요']"
                />
              </div>
              <div class="col-6">
                <q-input
                  v-model="form.parameters.dateRange.endDate"
                  label="종료일"
                  type="date"
                  outlined
                  :rules="[val => !!val || '종료일을 선택하세요']"
                />
              </div>
            </div>
          </div>

          <!-- Historical Backfill Specific -->
          <div v-if="form.type === 'HISTORICAL_BACKFILL'" class="q-mb-lg">
            <h6 class="q-my-sm">백필 설정</h6>
            <div class="q-mb-md">
              <q-select
                v-model="form.parameters.components"
                :options="componentOptions"
                label="계산 요소 (선택사항)"
                outlined
                multiple
                use-chips
                hint="비어두면 모든 요소를 백필합니다"
              />
            </div>
            <div class="row q-col-gutter-md">
              <div class="col-6">
                <q-select
                  v-model="form.parameters.validationLevel"
                  :options="validationLevelOptions"
                  label="검증 수준"
                  outlined
                  :rules="[val => !!val || '검증 수준을 선택하세요']"
                />
              </div>
              <div class="col-6">
                <q-toggle
                  v-model="form.parameters.overwriteExisting"
                  label="기존 데이터 덮어쓰기"
                  class="q-mt-md"
                />
              </div>
            </div>
          </div>

          <!-- Index Recalculation Specific -->
          <div v-if="form.type === 'INDEX_RECALCULATION'" class="q-mb-lg">
            <h6 class="q-my-sm">재계산 설정</h6>
            <q-input
              v-model="form.recalculationReason"
              label="재계산 사유"
              outlined
              type="textarea"
              rows="2"
              :rules="[val => !!val || '재계산 사유를 입력하세요']"
              class="q-mb-md"
            />
            
            <q-expansion-item
              icon="tune"
              label="가중치 조정 (선택사항)"
              class="q-mb-md"
            >
              <div class="q-pa-md">
                <p class="text-body2 text-grey-6 q-mb-md">
                  Fear & Greed Index 계산에 사용되는 각 요소의 가중치를 조정할 수 있습니다.
                </p>
                <div class="row q-col-gutter-md">
                  <div class="col-6">
                    <q-input
                      v-model.number="form.parameters.newWeights.priceMomentum"
                      label="주가 모멘텀"
                      type="number"
                      outlined
                      min="0"
                      max="1"
                      step="0.01"
                      suffix="(0-1)"
                    />
                  </div>
                  <div class="col-6">
                    <q-input
                      v-model.number="form.parameters.newWeights.investorSentiment"
                      label="투자자 심리"
                      type="number"
                      outlined
                      min="0"
                      max="1"
                      step="0.01"
                      suffix="(0-1)"
                    />
                  </div>
                  <div class="col-6">
                    <q-input
                      v-model.number="form.parameters.newWeights.putCallRatio"
                      label="풋/콜 비율"
                      type="number"
                      outlined
                      min="0"
                      max="1"
                      step="0.01"
                      suffix="(0-1)"
                    />
                  </div>
                  <div class="col-6">
                    <q-input
                      v-model.number="form.parameters.newWeights.volatility"
                      label="변동성"
                      type="number"
                      outlined
                      min="0"
                      max="1"
                      step="0.01"
                      suffix="(0-1)"
                    />
                  </div>
                  <div class="col-6">
                    <q-input
                      v-model.number="form.parameters.newWeights.safeHaven"
                      label="안전자산 수요"
                      type="number"
                      outlined
                      min="0"
                      max="1"
                      step="0.01"
                      suffix="(0-1)"
                    />
                  </div>
                </div>
              </div>
            </q-expansion-item>
          </div>

          <!-- Common Settings -->
          <div class="q-mb-lg">
            <h6 class="q-my-sm">일반 설정</h6>
            <div class="row q-col-gutter-md">
              <div class="col-6">
                <q-select
                  v-model="form.parameters.priority"
                  :options="priorityOptions"
                  label="우선순위"
                  outlined
                />
              </div>
              <div class="col-6">
                <q-select
                  v-model="form.parameters.processingStrategy"
                  :options="strategyOptions"
                  label="처리 전략"
                  outlined
                />
              </div>
            </div>
          </div>

          <!-- Description -->
          <div class="q-mb-lg">
            <q-input
              v-model="form.metadata.description"
              label="작업 설명 (선택사항)"
              outlined
              type="textarea"
              rows="2"
              hint="이 작업에 대한 간단한 설명을 입력하세요"
            />
          </div>

          <q-stepper-navigation class="q-mt-lg">
            <q-btn 
              flat 
              color="primary" 
              @click="step = 1" 
              label="이전"
              class="q-mr-sm"
            />
            <q-btn 
              @click="step = 3" 
              color="primary" 
              label="다음"
              :disable="!isStep2Valid"
            />
          </q-stepper-navigation>
        </q-step>

        <!-- Step 3: Review -->
        <q-step
          :name="3"
          title="검토 및 생성"
          icon="check"
        >
          <div class="q-mb-md">
            <p class="text-body2 text-grey-7">설정을 검토하고 작업을 생성하세요.</p>
          </div>

          <q-card class="q-mb-lg" flat bordered>
            <q-card-section>
              <div class="text-subtitle1 text-weight-medium q-mb-md">작업 요약</div>
              
              <div class="row q-col-gutter-md">
                <div class="col-6">
                  <div class="text-caption text-grey-6">작업 유형</div>
                  <div class="text-body1">{{ getJobTypeLabel(form.type) }}</div>
                </div>
                <div class="col-6">
                  <div class="text-caption text-grey-6">우선순위</div>
                  <div class="text-body1">{{ getPriorityLabel(form.parameters.priority) }}</div>
                </div>
                <div v-if="requiresDateRange" class="col-6">
                  <div class="text-caption text-grey-6">날짜 범위</div>
                  <div class="text-body1">
                    {{ form.parameters.dateRange.startDate }} ~ {{ form.parameters.dateRange.endDate }}
                  </div>
                </div>
                <div class="col-6">
                  <div class="text-caption text-grey-6">처리 전략</div>
                  <div class="text-body1">{{ getStrategyLabel(form.parameters.processingStrategy) }}</div>
                </div>
              </div>

              <div v-if="form.metadata.description" class="q-mt-md">
                <div class="text-caption text-grey-6">설명</div>
                <div class="text-body1">{{ form.metadata.description }}</div>
              </div>
            </q-card-section>
          </q-card>

          <q-stepper-navigation>
            <q-btn 
              flat 
              color="primary" 
              @click="step = 2" 
              label="이전"
              class="q-mr-sm"
            />
            <q-btn 
              @click="createJob" 
              color="primary" 
              label="작업 생성"
              :loading="creating"
            />
          </q-stepper-navigation>
        </q-step>
      </q-stepper>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { batchApi, type CreateBatchJobRequest } from '@/services/api'
import { useQuasar } from 'quasar'

const $q = useQuasar()
const emit = defineEmits(['created', 'cancel'])

// Data
const step = ref(1)
const creating = ref(false)

const form = reactive({
  type: '',
  parameters: {
    dateRange: {
      startDate: '',
      endDate: ''
    },
    priority: 'NORMAL',
    processingStrategy: 'CHUNKED',
    overwriteExisting: false,
    validationLevel: 'COMPREHENSIVE',
    components: [],
    newWeights: {
      priceMomentum: 0.25,
      investorSentiment: 0.25,
      putCallRatio: 0.20,
      volatility: 0.15,
      safeHaven: 0.15
    }
  },
  metadata: {
    description: ''
  },
  recalculationReason: ''
})

// Options
const jobTypes = [
  {
    value: 'HISTORICAL_BACKFILL',
    label: '히스토리 데이터 백필',
    description: '과거 기간의 Fear & Greed Index 데이터를 소급 계산합니다',
    icon: 'history'
  },
  {
    value: 'INDEX_RECALCULATION',
    label: '지수 재계산',
    description: '기존 데이터를 새로운 알고리즘이나 가중치로 재계산합니다',
    icon: 'refresh'
  },
  {
    value: 'DATA_VALIDATION',
    label: '데이터 검증',
    description: '저장된 데이터의 무결성과 정확성을 검증합니다',
    icon: 'verified'
  },
  {
    value: 'BULK_REPORT_GENERATION',
    label: '대량 리포트 생성',
    description: '특정 기간의 상세 분석 리포트를 일괄 생성합니다',
    icon: 'assessment'
  }
]

const componentOptions = [
  { label: '주가 모멘텀', value: 'PRICE_MOMENTUM' },
  { label: '투자자 심리', value: 'INVESTOR_SENTIMENT' },
  { label: '풋/콜 비율', value: 'PUT_CALL_RATIO' },
  { label: '변동성 지수', value: 'VOLATILITY' },
  { label: '안전자산 수요', value: 'SAFE_HAVEN' }
]

const validationLevelOptions = [
  { label: '기본 검증', value: 'BASIC' },
  { label: '포괄적 검증', value: 'COMPREHENSIVE' }
]

const priorityOptions = [
  { label: '낮음', value: 'LOW' },
  { label: '보통', value: 'NORMAL' },
  { label: '높음', value: 'HIGH' }
]

const strategyOptions = [
  { label: '청크 처리', value: 'CHUNKED' },
  { label: '스트림 처리', value: 'STREAM' },
  { label: '병렬 처리', value: 'PARALLEL' }
]

// Computed
const requiresDateRange = computed(() => {
  return ['HISTORICAL_BACKFILL', 'INDEX_RECALCULATION', 'DATA_VALIDATION', 'BULK_REPORT_GENERATION'].includes(form.type)
})

const isStep2Valid = computed(() => {
  if (requiresDateRange.value) {
    if (!form.parameters.dateRange.startDate || !form.parameters.dateRange.endDate) {
      return false
    }
  }

  if (form.type === 'HISTORICAL_BACKFILL') {
    return !!form.parameters.validationLevel
  }

  if (form.type === 'INDEX_RECALCULATION') {
    return !!form.recalculationReason
  }

  return true
})

// Methods
const createJob = async () => {
  creating.value = true
  
  try {
    const request: CreateBatchJobRequest = {
      type: form.type,
      parameters: {
        ...form.parameters,
        dateRange: requiresDateRange.value ? form.parameters.dateRange : undefined
      },
      metadata: {
        description: form.metadata.description || undefined
      }
    }

    // Add specific parameters for index recalculation
    if (form.type === 'INDEX_RECALCULATION') {
      request.metadata = {
        ...request.metadata,
        description: `${form.recalculationReason}${request.metadata?.description ? ` - ${request.metadata.description}` : ''}`
      }
    }

    await batchApi.createBatchJob(request)
    emit('created')
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: '작업 생성에 실패했습니다.',
      caption: error.message
    })
  }
  
  creating.value = false
}

// Utility functions
const getJobTypeLabel = (type: string) => {
  const jobType = jobTypes.find(jt => jt.value === type)
  return jobType?.label || type
}

const getPriorityLabel = (priority: string) => {
  const priorityOption = priorityOptions.find(p => p.value === priority)
  return priorityOption?.label || priority
}

const getStrategyLabel = (strategy: string) => {
  const strategyOption = strategyOptions.find(s => s.value === strategy)
  return strategyOption?.label || strategy
}
</script>

<style lang="scss" scoped>
.job-type-card {
  border: 2px solid transparent;
  transition: all 0.2s ease;
  
  &:hover {
    border-color: $grey-4;
  }
  
  &.selected {
    border-color: $primary;
    background-color: rgba($primary, 0.05);
  }
}

.q-stepper--vertical .q-stepper__step-inner {
  padding-left: 0;
}
</style>