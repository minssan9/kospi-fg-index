<template>
  <q-card class="full-width full-height">
    <q-card-section class="row items-center q-pb-none">
      <div class="text-h6">
        <q-icon name="memory" class="q-mr-sm" />
        배치 작업 상세정보
      </div>
      <q-space />
      <q-btn icon="close" flat round dense @click="$emit('close')" />
    </q-card-section>

    <q-card-section v-if="loading" class="flex flex-center" style="height: 200px">
      <q-spinner-hourglass size="50px" color="primary" />
    </q-card-section>

    <q-card-section v-else-if="error" class="text-center">
      <q-icon name="error" size="xl" color="negative" class="q-mb-md" />
      <div class="text-h6 q-mb-sm">오류가 발생했습니다</div>
      <div class="text-body1 text-grey-6">{{ error }}</div>
      <q-btn 
        color="primary" 
        label="다시 시도" 
        @click="loadJobDetails" 
        class="q-mt-md"
      />
    </q-card-section>

    <q-card-section v-else class="q-pa-none full-height">
      <q-splitter v-model="splitterModel" style="height: calc(100vh - 120px)">
        <!-- Left Panel: Job Details -->
        <template #before>
          <div class="q-pa-md">
            <!-- Job Header -->
            <div class="row items-center q-mb-lg">
              <div class="col">
                <div class="text-h6 q-mb-xs">
                  {{ getJobTypeLabel(jobDetails.type) }}
                </div>
                <div class="text-caption text-grey-6">
                  작업 ID: {{ jobDetails.jobId }}
                </div>
              </div>
              <div class="col-auto">
                <q-chip
                  :color="getStatusColor(jobDetails.status)"
                  text-color="white"
                  :icon="getStatusIcon(jobDetails.status)"
                  size="md"
                >
                  {{ getStatusLabel(jobDetails.status) }}
                </q-chip>
              </div>
            </div>

            <!-- Progress -->
            <div v-if="jobDetails.status === 'RUNNING'" class="q-mb-lg">
              <div class="text-subtitle1 q-mb-sm">진행률</div>
              <q-linear-progress
                :value="jobDetails.progress.progressPercentage / 100"
                size="xl"
                color="primary"
                class="q-mb-sm"
              />
              <div class="row text-body2 text-grey-6">
                <div class="col">
                  {{ jobDetails.progress.processedItems }} / {{ jobDetails.progress.totalItems }} 완료
                </div>
                <div class="col-auto">
                  {{ jobDetails.progress.progressPercentage.toFixed(1) }}%
                </div>
              </div>
              
              <!-- Performance Metrics -->
              <div v-if="jobDetails.progress.itemsPerSecond" class="row q-col-gutter-md q-mt-md">
                <div class="col-6">
                  <q-card flat bordered>
                    <q-card-section class="text-center">
                      <div class="text-h6 text-primary">{{ jobDetails.progress.itemsPerSecond?.toFixed(1) }}</div>
                      <div class="text-caption">항목/초</div>
                    </q-card-section>
                  </q-card>
                </div>
                <div class="col-6">
                  <q-card flat bordered>
                    <q-card-section class="text-center">
                      <div class="text-h6 text-primary">
                        {{ formatDuration(jobDetails.progress.estimatedTimeRemaining) }}
                      </div>
                      <div class="text-caption">예상 남은 시간</div>
                    </q-card-section>
                  </q-card>
                </div>
              </div>
            </div>

            <!-- Job Information -->
            <div class="q-mb-lg">
              <div class="text-subtitle1 q-mb-sm">작업 정보</div>
              <q-list dense>
                <q-item>
                  <q-item-section>
                    <q-item-label caption>우선순위</q-item-label>
                    <q-item-label>{{ getPriorityLabel(jobDetails.priority) }}</q-item-label>
                  </q-item-section>
                </q-item>
                <q-item>
                  <q-item-section>
                    <q-item-label caption>생성일시</q-item-label>
                    <q-item-label>{{ formatDateTime(jobDetails.execution.startedAt) }}</q-item-label>
                  </q-item-section>
                </q-item>
                <q-item v-if="jobDetails.execution.startedAt">
                  <q-item-section>
                    <q-item-label caption>시작일시</q-item-label>
                    <q-item-label>{{ formatDateTime(jobDetails.execution.startedAt) }}</q-item-label>
                  </q-item-section>
                </q-item>
                <q-item v-if="jobDetails.execution.completedAt">
                  <q-item-section>
                    <q-item-label caption>완료일시</q-item-label>
                    <q-item-label>{{ formatDateTime(jobDetails.execution.completedAt) }}</q-item-label>
                  </q-item-section>
                </q-item>
                <q-item v-if="jobDetails.execution.duration">
                  <q-item-section>
                    <q-item-label caption>실행 시간</q-item-label>
                    <q-item-label>{{ formatDuration(jobDetails.execution.duration) }}</q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>
            </div>

            <!-- Job Actions -->
            <div v-if="['PENDING', 'RUNNING', 'PAUSED'].includes(jobDetails.status)" class="q-mb-lg">
              <div class="text-subtitle1 q-mb-sm">작업 제어</div>
              <div class="row q-col-gutter-sm">
                <div class="col-auto">
                  <q-btn
                    v-if="jobDetails.status === 'PENDING'"
                    color="positive"
                    icon="play_arrow"
                    label="시작"
                    @click="startJob"
                    :loading="actionLoading"
                  />
                  <q-btn
                    v-else-if="jobDetails.status === 'RUNNING'"
                    color="warning"
                    icon="pause"
                    label="일시정지"
                    @click="pauseJob"
                    :loading="actionLoading"
                  />
                  <q-btn
                    v-else-if="jobDetails.status === 'PAUSED'"
                    color="positive"
                    icon="play_arrow"
                    label="재개"
                    @click="startJob"
                    :loading="actionLoading"
                  />
                </div>
                <div class="col-auto">
                  <q-btn
                    color="negative"
                    icon="stop"
                    label="취소"
                    @click="cancelJob"
                    :loading="actionLoading"
                  />
                </div>
              </div>
            </div>

            <!-- Result Summary -->
            <div v-if="jobDetails.result" class="q-mb-lg">
              <div class="text-subtitle1 q-mb-sm">결과 요약</div>
              <q-card flat bordered>
                <q-card-section>
                  <div v-if="jobDetails.result.resultType === 'BACKFILL_SUMMARY'">
                    <div class="row q-col-gutter-md text-center">
                      <div class="col-3">
                        <div class="text-h6 text-positive">{{ jobDetails.result.resultData.processedDays }}</div>
                        <div class="text-caption">처리된 일수</div>
                      </div>
                      <div class="col-3">
                        <div class="text-h6 text-negative">{{ jobDetails.result.resultData.failedDays }}</div>
                        <div class="text-caption">실패한 일수</div>
                      </div>
                      <div class="col-3">
                        <div class="text-h6 text-warning">{{ jobDetails.result.resultData.duplicateSkipped }}</div>
                        <div class="text-caption">중복 건너뜀</div>
                      </div>
                      <div class="col-3">
                        <div class="text-h6 text-primary">{{ jobDetails.result.resultData.summary.avgProcessingTime }}ms</div>
                        <div class="text-caption">평균 처리시간</div>
                      </div>
                    </div>
                  </div>
                  <div v-else>
                    <pre class="text-body2">{{ JSON.stringify(jobDetails.result.resultData, null, 2) }}</pre>
                  </div>
                </q-card-section>
              </q-card>
            </div>

            <!-- Errors -->
            <div v-if="jobDetails.errors && jobDetails.errors.length > 0" class="q-mb-lg">
              <div class="text-subtitle1 q-mb-sm text-negative">
                <q-icon name="error" class="q-mr-xs" />
                오류 ({{ jobDetails.errors.length }}개)
              </div>
              <q-list bordered>
                <q-item 
                  v-for="error in jobDetails.errors.slice(0, 5)" 
                  :key="error.id"
                  dense
                >
                  <q-item-section>
                    <q-item-label class="text-negative">{{ error.message }}</q-item-label>
                    <q-item-label caption>{{ formatDateTime(error.timestamp) }}</q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>
              <div v-if="jobDetails.errors.length > 5" class="text-center q-mt-sm">
                <q-btn 
                  flat 
                  size="sm" 
                  color="primary" 
                  label="모든 오류 보기"
                  @click="showAllErrors = true"
                />
              </div>
            </div>
          </div>
        </template>

        <!-- Right Panel: Logs -->
        <template #after>
          <div class="q-pa-md full-height">
            <div class="text-subtitle1 q-mb-sm">
              <q-icon name="list_alt" class="q-mr-xs" />
              실행 로그
              <q-btn 
                icon="refresh" 
                size="sm" 
                flat 
                round 
                @click="loadLogs"
                :loading="logsLoading"
                class="q-ml-sm"
              />
            </div>

            <div class="logs-container">
              <div v-if="logsLoading" class="text-center q-pa-md">
                <q-spinner size="md" />
              </div>
              <div v-else-if="logs.length === 0" class="text-center q-pa-md text-grey-6">
                로그가 없습니다
              </div>
              <div v-else class="logs-list">
                <div 
                  v-for="log in logs" 
                  :key="log.timestamp"
                  :class="['log-entry', `log-${log.level.toLowerCase()}`]"
                >
                  <div class="log-timestamp">
                    {{ formatTime(log.timestamp) }}
                  </div>
                  <div class="log-level">
                    <q-chip 
                      :color="getLogLevelColor(log.level)"
                      text-color="white"
                      size="xs"
                    >
                      {{ log.level }}
                    </q-chip>
                  </div>
                  <div class="log-message">
                    {{ log.message }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>
      </q-splitter>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { batchApi, type BatchJobStatus } from '@/services/api'
import { useQuasar } from 'quasar'

const $q = useQuasar()
const emit = defineEmits(['close'])
const props = defineProps<{
  jobId: string
}>()

// Data
const loading = ref(true)
const error = ref('')
const actionLoading = ref(false)
const logsLoading = ref(false)
const splitterModel = ref(70)
const showAllErrors = ref(false)

const jobDetails = ref<BatchJobStatus | null>(null)
const logs = ref<any[]>([])

let refreshInterval: number | null = null

// Methods
const loadJobDetails = async () => {
  loading.value = true
  error.value = ''
  
  try {
    jobDetails.value = await batchApi.getBatchJobStatus(props.jobId)
  } catch (err) {
    error.value = err.message || '작업 정보를 불러오는데 실패했습니다.'
  }
  
  loading.value = false
}

const loadLogs = async () => {
  logsLoading.value = true
  
  try {
    const response = await batchApi.getJobLogs(props.jobId, 1, 100)
    logs.value = response.logs
  } catch (err) {
    console.error('Failed to load logs:', err)
  }
  
  logsLoading.value = false
}

const startJob = async () => {
  actionLoading.value = true
  
  try {
    await batchApi.startBatchJob(props.jobId)
    $q.notify({
      type: 'positive',
      message: '작업이 시작되었습니다.'
    })
    await loadJobDetails()
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: '작업 시작에 실패했습니다.',
      caption: err.message
    })
  }
  
  actionLoading.value = false
}

const pauseJob = async () => {
  actionLoading.value = true
  
  try {
    await batchApi.pauseBatchJob(props.jobId)
    $q.notify({
      type: 'positive',
      message: '작업이 일시정지되었습니다.'
    })
    await loadJobDetails()
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: '작업 일시정지에 실패했습니다.',
      caption: err.message
    })
  }
  
  actionLoading.value = false
}

const cancelJob = async () => {
  actionLoading.value = true
  
  try {
    await batchApi.cancelBatchJob(props.jobId)
    $q.notify({
      type: 'positive',
      message: '작업이 취소되었습니다.'
    })
    await loadJobDetails()
  } catch (err) {
    $q.notify({
      type: 'negative',
      message: '작업 취소에 실패했습니다.',
      caption: err.message
    })
  }
  
  actionLoading.value = false
}

// Utility functions
const getJobTypeLabel = (type: string) => {
  const labels = {
    HISTORICAL_BACKFILL: '히스토리 백필',
    INDEX_RECALCULATION: '지수 재계산',
    DATA_VALIDATION: '데이터 검증',
    BULK_REPORT_GENERATION: '대량 리포트',
    DATA_MIGRATION: '데이터 마이그레이션'
  }
  return labels[type] || type
}

const getStatusColor = (status: string) => {
  const colors = {
    PENDING: 'orange',
    RUNNING: 'blue',
    COMPLETED: 'positive',
    FAILED: 'negative',
    PAUSED: 'warning'
  }
  return colors[status] || 'grey'
}

const getStatusIcon = (status: string) => {
  const icons = {
    PENDING: 'schedule',
    RUNNING: 'play_circle',
    COMPLETED: 'check_circle',
    FAILED: 'error',
    PAUSED: 'pause_circle'
  }
  return icons[status] || 'help'
}

const getStatusLabel = (status: string) => {
  const labels = {
    PENDING: '대기중',
    RUNNING: '실행중',
    COMPLETED: '완료',
    FAILED: '실패',
    PAUSED: '일시정지'
  }
  return labels[status] || status
}

const getPriorityLabel = (priority: string) => {
  const labels = {
    LOW: '낮음',
    NORMAL: '보통',
    HIGH: '높음'
  }
  return labels[priority] || priority
}

const getLogLevelColor = (level: string) => {
  const colors = {
    INFO: 'blue',
    WARN: 'orange',
    ERROR: 'red'
  }
  return colors[level] || 'grey'
}

const formatDateTime = (dateString?: string) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleString('ko-KR')
}

const formatTime = (dateString: string) => {
  return new Date(dateString).toLocaleTimeString('ko-KR')
}

const formatDuration = (milliseconds?: number) => {
  if (!milliseconds) return '-'
  
  const seconds = Math.floor(milliseconds / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  
  if (hours > 0) {
    return `${hours}시간 ${minutes % 60}분`
  } else if (minutes > 0) {
    return `${minutes}분 ${seconds % 60}초`
  } else {
    return `${seconds}초`
  }
}

// Lifecycle
onMounted(async () => {
  await loadJobDetails()
  await loadLogs()
  
  // Set up auto-refresh for running jobs
  if (jobDetails.value?.status === 'RUNNING') {
    refreshInterval = setInterval(() => {
      loadJobDetails()
      loadLogs()
    }, 10000) // Refresh every 10 seconds
  }
})

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
})
</script>

<style lang="scss" scoped>
.logs-container {
  height: calc(100vh - 220px);
  border: 1px solid $grey-4;
  border-radius: 4px;
  overflow: hidden;
}

.logs-list {
  height: 100%;
  overflow-y: auto;
  font-family: 'Courier New', monospace;
  font-size: 12px;
}

.log-entry {
  display: flex;
  padding: 4px 8px;
  border-bottom: 1px solid $grey-3;
  
  &:nth-child(even) {
    background-color: $grey-1;
  }
  
  &.log-error {
    background-color: rgba($negative, 0.1);
  }
  
  &.log-warn {
    background-color: rgba($warning, 0.1);
  }
}

.log-timestamp {
  width: 80px;
  color: $grey-6;
  font-size: 11px;
  flex-shrink: 0;
}

.log-level {
  width: 60px;
  flex-shrink: 0;
  
  .q-chip {
    height: 16px;
    font-size: 9px;
  }
}

.log-message {
  flex: 1;
  word-break: break-word;
}

@media (max-width: 768px) {
  .logs-container {
    height: 300px;
  }
  
  .log-entry {
    flex-direction: column;
    
    .log-timestamp,
    .log-level {
      width: auto;
    }
  }
}
</style>