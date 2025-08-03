<template>
  <q-page class="q-pa-md">
    <div class="row q-col-gutter-lg">
      <!-- Header and Actions -->
      <div class="col-12">
        <div class="row items-center justify-between q-mb-lg">
          <div class="col-auto">
            <h4 class="q-my-none text-weight-bold">
              <q-icon name="memory" class="q-mr-sm" />
              배치 처리 관리
            </h4>
            <p class="text-grey-6 q-mb-none">대용량 데이터 처리 및 작업 관리</p>
          </div>
          <div class="col-auto">
            <q-btn
              color="primary"
              icon="add"
              label="새 작업 생성"
              @click="showCreateJobDialog = true"
              unelevated
            />
          </div>
        </div>
      </div>

      <!-- Metrics Cards -->
      <div class="col-12">
        <div class="row q-col-gutter-md">
          <div class="col-lg-3 col-md-6 col-12">
            <q-card class="metric-card">
              <q-card-section>
                <div class="row items-center">
                  <div class="col">
                    <div class="text-h6 text-weight-bold">{{ metrics.system.activeJobs }}</div>
                    <div class="text-grey-6">활성 작업</div>
                  </div>
                  <div class="col-auto">
                    <q-icon name="play_circle" size="md" class="text-green" />
                  </div>
                </div>
              </q-card-section>
            </q-card>
          </div>

          <div class="col-lg-3 col-md-6 col-12">
            <q-card class="metric-card">
              <q-card-section>
                <div class="row items-center">
                  <div class="col">
                    <div class="text-h6 text-weight-bold">{{ metrics.system.queuedJobs }}</div>
                    <div class="text-grey-6">대기중인 작업</div>
                  </div>
                  <div class="col-auto">
                    <q-icon name="schedule" size="md" class="text-orange" />
                  </div>
                </div>
              </q-card-section>
            </q-card>
          </div>

          <div class="col-lg-3 col-md-6 col-12">
            <q-card class="metric-card">
              <q-card-section>
                <div class="row items-center">
                  <div class="col">
                    <div class="text-h6 text-weight-bold">{{ metrics.system.completedToday }}</div>
                    <div class="text-grey-6">오늘 완료</div>
                  </div>
                  <div class="col-auto">
                    <q-icon name="check_circle" size="md" class="text-positive" />
                  </div>
                </div>
              </q-card-section>
            </q-card>
          </div>

          <div class="col-lg-3 col-md-6 col-12">
            <q-card class="metric-card">
              <q-card-section>
                <div class="row items-center">
                  <div class="col">
                    <div class="text-h6 text-weight-bold">{{ metrics.system.failedToday }}</div>
                    <div class="text-grey-6">오늘 실패</div>
                  </div>
                  <div class="col-auto">
                    <q-icon name="error" size="md" class="text-negative" />
                  </div>
                </div>
              </q-card-section>
            </q-card>
          </div>
        </div>
      </div>

      <!-- Job List -->
      <div class="col-12">
        <q-card>
          <q-card-section class="q-pb-none">
            <div class="row items-center justify-between">
              <div class="col-auto">
                <h6 class="q-my-none">작업 목록</h6>
              </div>
              <div class="col-auto">
                <div class="row q-col-gutter-sm items-center">
                  <div class="col-auto">
                    <q-select
                      v-model="statusFilter"
                      :options="statusOptions"
                      label="상태 필터"
                      dense
                      outlined
                      clearable
                      style="min-width: 150px"
                      @update:model-value="loadJobs"
                    />
                  </div>
                  <div class="col-auto">
                    <q-select
                      v-model="typeFilter"
                      :options="typeOptions"
                      label="작업 유형"
                      dense
                      outlined
                      clearable
                      style="min-width: 200px"
                      @update:model-value="loadJobs"
                    />
                  </div>
                  <div class="col-auto">
                    <q-btn
                      icon="refresh"
                      flat
                      round
                      @click="loadJobs"
                      :loading="loading"
                    />
                  </div>
                </div>
              </div>
            </div>
          </q-card-section>

          <q-card-section>
            <q-table
              :rows="jobs"
              :columns="jobColumns"
              :loading="loading"
              row-key="jobId"
              :pagination="pagination"
              @request="onRequest"
              class="batch-job-table"
            >
              <template #body-cell-status="props">
                <q-td :props="props">
                  <q-chip
                    :color="getStatusColor(props.value)"
                    text-color="white"
                    :icon="getStatusIcon(props.value)"
                    size="sm"
                  >
                    {{ getStatusLabel(props.value) }}
                  </q-chip>
                </q-td>
              </template>

              <template #body-cell-progress="props">
                <q-td :props="props">
                  <div class="row items-center">
                    <div class="col">
                      <q-linear-progress
                        :value="props.value / 100"
                        size="md"
                        :color="props.value === 100 ? 'positive' : 'primary'"
                        class="q-mr-sm"
                      />
                    </div>
                    <div class="col-auto text-body2">
                      {{ props.value.toFixed(1) }}%
                    </div>
                  </div>
                </q-td>
              </template>

              <template #body-cell-type="props">
                <q-td :props="props">
                  <q-chip
                    :color="getTypeColor(props.value)"
                    text-color="white"
                    size="sm"
                  >
                    {{ getTypeLabel(props.value) }}
                  </q-chip>
                </q-td>
              </template>

              <template #body-cell-actions="props">
                <q-td :props="props">
                  <div class="row q-gutter-xs">
                    <q-btn
                      v-if="props.row.status === 'PENDING'"
                      icon="play_arrow"
                      size="sm"
                      color="positive"
                      flat
                      round
                      @click="startJob(props.row.jobId)"
                    />
                    <q-btn
                      v-if="props.row.status === 'RUNNING'"
                      icon="pause"
                      size="sm"
                      color="warning"
                      flat
                      round
                      @click="pauseJob(props.row.jobId)"
                    />
                    <q-btn
                      v-if="['PENDING', 'RUNNING', 'PAUSED'].includes(props.row.status)"
                      icon="stop"
                      size="sm"
                      color="negative"
                      flat
                      round
                      @click="cancelJob(props.row.jobId)"
                    />
                    <q-btn
                      icon="visibility"
                      size="sm"
                      color="primary"
                      flat
                      round
                      @click="viewJobDetails(props.row)"
                    />
                  </div>
                </q-td>
              </template>
            </q-table>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Create Job Dialog -->
    <q-dialog v-model="showCreateJobDialog" persistent>
      <CreateBatchJobDialog
        @created="onJobCreated"
        @cancel="showCreateJobDialog = false"
      />
    </q-dialog>

    <!-- Job Details Dialog -->
    <q-dialog v-model="showJobDetailsDialog" maximized>
      <BatchJobDetailsDialog
        v-if="selectedJob"
        :job-id="selectedJob.jobId"
        @close="showJobDetailsDialog = false"
      />
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue'
import { batchApi, type BatchJob, type BatchMetrics } from '@/services/api'
import CreateBatchJobDialog from '@/components/batch/CreateBatchJobDialog.vue'
import BatchJobDetailsDialog from '@/components/batch/BatchJobDetailsDialog.vue'
import { useQuasar } from 'quasar'

const $q = useQuasar()

// Data
const loading = ref(false)
const jobs = ref<BatchJob[]>([])
const metrics = ref<BatchMetrics>({
  system: {
    activeJobs: 0,
    queuedJobs: 0,
    completedToday: 0,
    failedToday: 0,
    avgProcessingTime: 0
  },
  performance: {
    itemsPerSecond: 0,
    memoryUsage: '0MB',
    cpuUsage: 0
  },
  health: {
    status: 'UNKNOWN',
    errorRate: 0
  }
})

const statusFilter = ref('')
const typeFilter = ref('')
const showCreateJobDialog = ref(false)
const showJobDetailsDialog = ref(false)
const selectedJob = ref<BatchJob | null>(null)

const pagination = reactive({
  sortBy: 'createdAt',
  descending: true,
  page: 1,
  rowsPerPage: 20,
  rowsNumber: 0
})

// Options
const statusOptions = [
  { label: '대기중', value: 'PENDING' },
  { label: '실행중', value: 'RUNNING' },
  { label: '완료', value: 'COMPLETED' },
  { label: '실패', value: 'FAILED' },
  { label: '일시정지', value: 'PAUSED' }
]

const typeOptions = [
  { label: '히스토리 백필', value: 'HISTORICAL_BACKFILL' },
  { label: '지수 재계산', value: 'INDEX_RECALCULATION' },
  { label: '데이터 검증', value: 'DATA_VALIDATION' },
  { label: '대량 리포트', value: 'BULK_REPORT_GENERATION' },
  { label: '데이터 마이그레이션', value: 'DATA_MIGRATION' }
]

// Table columns
const jobColumns = [
  {
    name: 'type',
    label: '유형',
    field: 'type',
    align: 'left',
    sortable: true
  },
  {
    name: 'status',
    label: '상태',
    field: 'status',
    align: 'center',
    sortable: true
  },
  {
    name: 'progress',
    label: '진행률',
    field: 'progressPercentage',
    align: 'center',
    sortable: true
  },
  {
    name: 'createdAt',
    label: '생성일시',
    field: 'createdAt',
    align: 'center',
    sortable: true,
    format: (val: string) => new Date(val).toLocaleString('ko-KR')
  },
  {
    name: 'startedAt',
    label: '시작일시',
    field: 'startedAt',
    align: 'center',
    sortable: true,
    format: (val: string) => val ? new Date(val).toLocaleString('ko-KR') : '-'
  },
  {
    name: 'completedAt',
    label: '완료일시',
    field: 'completedAt',
    align: 'center',
    sortable: true,
    format: (val: string) => val ? new Date(val).toLocaleString('ko-KR') : '-'
  },
  {
    name: 'actions',
    label: '작업',
    field: '',
    align: 'center'
  }
]

// Methods
const loadJobs = async () => {
  loading.value = true
  try {
    const response = await batchApi.listBatchJobs(
      pagination.page,
      pagination.rowsPerPage,
      statusFilter.value || undefined,
      typeFilter.value || undefined
    )
    jobs.value = response.jobs
    pagination.rowsNumber = response.pagination.total
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: '작업 목록을 불러오는데 실패했습니다.',
      caption: error.message
    })
  }
  loading.value = false
}

const loadMetrics = async () => {
  try {
    metrics.value = await batchApi.getBatchMetrics()
  } catch (error) {
    console.error('Failed to load metrics:', error)
  }
}

const onRequest = async (props: any) => {
  const { page, rowsPerPage } = props.pagination
  pagination.page = page
  pagination.rowsPerPage = rowsPerPage
  await loadJobs()
}

const startJob = async (jobId: string) => {
  try {
    await batchApi.startBatchJob(jobId)
    $q.notify({
      type: 'positive',
      message: '작업이 시작되었습니다.'
    })
    await loadJobs()
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: '작업 시작에 실패했습니다.',
      caption: error.message
    })
  }
}

const pauseJob = async (jobId: string) => {
  try {
    await batchApi.pauseBatchJob(jobId)
    $q.notify({
      type: 'positive',
      message: '작업이 일시정지되었습니다.'
    })
    await loadJobs()
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: '작업 일시정지에 실패했습니다.',
      caption: error.message
    })
  }
}

const cancelJob = async (jobId: string) => {
  try {
    await batchApi.cancelBatchJob(jobId)
    $q.notify({
      type: 'positive',
      message: '작업이 취소되었습니다.'
    })
    await loadJobs()
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: '작업 취소에 실패했습니다.',
      caption: error.message
    })
  }
}

const viewJobDetails = (job: BatchJob) => {
  selectedJob.value = job
  showJobDetailsDialog.value = true
}

const onJobCreated = () => {
  showCreateJobDialog.value = false
  loadJobs()
  loadMetrics()
  $q.notify({
    type: 'positive',
    message: '새 작업이 생성되었습니다.'
  })
}

// Utility functions
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

const getTypeColor = (type: string) => {
  const colors = {
    HISTORICAL_BACKFILL: 'deep-purple',
    INDEX_RECALCULATION: 'indigo',
    DATA_VALIDATION: 'teal',
    BULK_REPORT_GENERATION: 'amber',
    DATA_MIGRATION: 'pink'
  }
  return colors[type] || 'grey'
}

const getTypeLabel = (type: string) => {
  const labels = {
    HISTORICAL_BACKFILL: '히스토리 백필',
    INDEX_RECALCULATION: '지수 재계산',
    DATA_VALIDATION: '데이터 검증',
    BULK_REPORT_GENERATION: '대량 리포트',
    DATA_MIGRATION: '데이터 마이그레이션'
  }
  return labels[type] || type
}

// Lifecycle
onMounted(() => {
  loadJobs()
  loadMetrics()
  
  // Set up auto-refresh for active jobs
  const refreshInterval = setInterval(() => {
    loadJobs()
    loadMetrics()
  }, 30000) // Refresh every 30 seconds

  // Cleanup on unmount
  // (Vue 3 automatically handles this in setup script)
})
</script>

<style lang="scss" scoped>
.metric-card {
  border-left: 4px solid $primary;
  
  &:hover {
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.12);
    transition: box-shadow 0.3s ease;
  }
}

.batch-job-table {
  .q-table__top {
    padding: 0;
  }
  
  .q-table thead th {
    font-weight: 600;
    background-color: $grey-2;
  }
  
  .q-table tbody tr:hover {
    background-color: $grey-1;
  }
}

@media (max-width: 768px) {
  .metric-card {
    margin-bottom: 1rem;
  }
}
</style>