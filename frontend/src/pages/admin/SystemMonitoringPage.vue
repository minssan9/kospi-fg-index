<template>
  <q-page class="q-pa-md">
    <!-- Header -->
    <div class="row items-center q-mb-lg">
      <div class="col">
        <h4 class="q-ma-none text-weight-bold">시스템 모니터링</h4>
        <p class="text-grey-7 q-ma-none">실시간 시스템 상태 및 성능 지표를 모니터링합니다</p>
      </div>
      <div class="col-auto">
        <q-btn
          color="primary"
          icon="refresh"
          label="새로고침"
          @click="refreshAllData"
          :loading="loading"
        />
      </div>
    </div>

    <!-- Real-time Status Cards -->
    <div class="row q-gutter-md q-mb-lg">
      <div class="col-12 col-sm-6 col-lg-3">
        <q-card class="status-card">
          <q-card-section>
            <div class="row items-center">
              <div class="col">
                <div class="text-h6">시스템 가동률</div>
                <div class="text-h4 text-positive">99.9%</div>
                <div class="text-caption text-grey-7">지난 30일</div>
              </div>
              <div class="col-auto">
                <q-circular-progress
                  :value="99.9"
                  size="60px"
                  :thickness="0.15"
                  color="positive"
                  show-value
                  font-size="10px"
                />
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-lg-3">
        <q-card class="status-card">
          <q-card-section>
            <div class="row items-center">
              <div class="col">
                <div class="text-h6">평균 응답시간</div>
                <div class="text-h4 text-blue">{{ avgResponseTime }}ms</div>
                <div class="text-caption text-grey-7">API 서버</div>
              </div>
              <div class="col-auto">
                <q-icon name="speed" size="3rem" color="blue" />
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-lg-3">
        <q-card class="status-card">
          <q-card-section>
            <div class="row items-center">
              <div class="col">
                <div class="text-h6">활성 연결</div>
                <div class="text-h4 text-orange">{{ activeConnections }}</div>
                <div class="text-caption text-grey-7">데이터베이스</div>
              </div>
              <div class="col-auto">
                <q-icon name="link" size="3rem" color="orange" />
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-sm-6 col-lg-3">
        <q-card class="status-card">
          <q-card-section>
            <div class="row items-center">
              <div class="col">
                <div class="text-h6">일일 요청</div>
                <div class="text-h4 text-purple">{{ dailyRequests }}</div>
                <div class="text-caption text-grey-7">API 호출</div>
              </div>
              <div class="col-auto">
                <q-icon name="analytics" size="3rem" color="purple" />
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Performance Charts -->
    <div class="row q-gutter-md q-mb-lg">
      <div class="col-12 col-md-8">
        <q-card>
          <q-card-section>
            <div class="text-h6 q-mb-md">실시간 성능 지표</div>
            <div class="chart-container">
              <!-- Real chart implementation would go here -->
              <div class="chart-placeholder">
                📊 실시간 성능 차트 영역
                <div class="text-caption text-grey-6 q-mt-sm">
                  CPU, Memory, Network I/O 그래프
                </div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-md-4">
        <q-card>
          <q-card-section>
            <div class="text-h6 q-mb-md">시스템 리소스</div>
            <div class="q-gutter-md">
              <!-- CPU Usage -->
              <div>
                <div class="row items-center q-mb-xs">
                  <div class="col">CPU 사용률</div>
                  <div class="col-auto text-weight-bold">{{ performanceMetrics.cpu }}%</div>
                </div>
                <q-linear-progress
                  :value="performanceMetrics.cpu / 100"
                  :color="getCpuColor(performanceMetrics.cpu)"
                  size="md"
                />
              </div>

              <!-- Memory Usage -->
              <div>
                <div class="row items-center q-mb-xs">
                  <div class="col">메모리 사용률</div>
                  <div class="col-auto text-weight-bold">{{ performanceMetrics.memory }}%</div>
                </div>
                <q-linear-progress
                  :value="performanceMetrics.memory / 100"
                  :color="getMemoryColor(performanceMetrics.memory)"
                  size="md"
                />
              </div>

              <!-- Disk Usage -->
              <div>
                <div class="row items-center q-mb-xs">
                  <div class="col">디스크 사용률</div>
                  <div class="col-auto text-weight-bold">{{ performanceMetrics.diskUsage }}%</div>
                </div>
                <q-linear-progress
                  :value="performanceMetrics.diskUsage / 100"
                  :color="getDiskColor(performanceMetrics.diskUsage)"
                  size="md"
                />
              </div>

              <!-- Network I/O -->
              <div>
                <div class="text-subtitle2 q-mb-sm">네트워크 I/O</div>
                <div class="row q-gutter-sm">
                  <div class="col">
                    <div class="text-caption text-grey-7">인바운드</div>
                    <div class="text-body1">{{ formatBytes(performanceMetrics.networkIO.inbound) }}/s</div>
                  </div>
                  <div class="col">
                    <div class="text-caption text-grey-7">아웃바운드</div>
                    <div class="text-body1">{{ formatBytes(performanceMetrics.networkIO.outbound) }}/s</div>
                  </div>
                </div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Service Status -->
    <div class="row q-gutter-md q-mb-lg">
      <div class="col-12">
        <q-card>
          <q-card-section>
            <div class="text-h6 q-mb-md">서비스 상태</div>
            <div class="row q-gutter-md">
              <div
                v-for="service in services"
                :key="service.name"
                class="col-12 col-sm-6 col-md-4"
              >
                <q-card flat bordered class="service-card">
                  <q-card-section>
                    <div class="row items-center">
                      <div class="col">
                        <div class="text-subtitle1 text-weight-medium">{{ service.name }}</div>
                        <div class="text-caption text-grey-7">{{ service.description }}</div>
                      </div>
                      <div class="col-auto">
                        <q-icon
                          :name="getServiceIcon(service.status)"
                          :color="getServiceColor(service.status)"
                          size="lg"
                        />
                      </div>
                    </div>
                    <div class="q-mt-sm">
                      <q-badge
                        :color="getServiceColor(service.status)"
                        :label="service.status"
                      />
                      <div class="text-caption q-mt-xs">
                        업타임: {{ service.uptime }}
                      </div>
                    </div>
                    <div class="q-mt-sm">
                      <q-btn
                        flat
                        dense
                        size="sm"
                        icon="refresh"
                        label="재시작"
                        @click="restartService(service.name)"
                        :disable="service.status === 'RESTARTING'"
                      />
                    </div>
                  </q-card-section>
                </q-card>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- System Logs -->
    <div class="row">
      <div class="col-12">
        <q-card>
          <q-card-section>
            <div class="row items-center q-mb-md">
              <div class="col">
                <div class="text-h6">시스템 로그</div>
              </div>
              <div class="col-auto q-gutter-sm">
                <q-select
                  v-model="logLevel"
                  :options="logLevelOptions"
                  label="레벨"
                  dense
                  outlined
                  style="min-width: 100px"
                  @update:model-value="filterLogs"
                />
                <q-btn
                  flat
                  icon="refresh"
                  @click="loadSystemLogs"
                  :loading="loadingLogs"
                />
              </div>
            </div>

            <q-table
              :rows="filteredLogs"
              :columns="logColumns"
              :loading="loadingLogs"
              row-key="id"
              flat
              bordered
              :pagination="{ rowsPerPage: 10 }"
              virtual-scroll
            >
              <template v-slot:body-cell-level="props">
                <q-td :props="props">
                  <q-badge
                    :color="getLogLevelColor(props.value)"
                    :label="props.value"
                  />
                </q-td>
              </template>
              <template v-slot:body-cell-timestamp="props">
                <q-td :props="props">
                  {{ formatDateTime(props.value) }}
                </q-td>
              </template>
              <template v-slot:body-cell-message="props">
                <q-td :props="props" style="max-width: 300px;">
                  <div class="ellipsis">{{ props.value }}</div>
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
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useQuasar } from 'quasar'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { adminApi, type PerformanceMetrics } from '../../services/adminApi'

const $q = useQuasar()

// Reactive data
const loading = ref(false)
const loadingLogs = ref(false)
const logLevel = ref('ALL')

const performanceMetrics = ref<PerformanceMetrics>({
  cpu: 0,
  memory: 0,
  diskUsage: 0,
  networkIO: { inbound: 0, outbound: 0 }
})

const avgResponseTime = ref(120)
const activeConnections = ref(15)
const dailyRequests = ref(12450)

const services = ref([
  { name: 'API Server', description: 'REST API 서비스', status: 'RUNNING', uptime: '7d 12h 30m' },
  { name: 'Database', description: 'MySQL 데이터베이스', status: 'RUNNING', uptime: '15d 8h 45m' },
  { name: 'Data Collector', description: '데이터 수집 서비스', status: 'RUNNING', uptime: '3d 22h 15m' },
  { name: 'Cache Server', description: 'Redis 캐시', status: 'RUNNING', uptime: '7d 12h 30m' }
])

const systemLogs = ref([
  { id: 1, timestamp: new Date().toISOString(), level: 'INFO', service: 'API', message: 'Server started successfully' },
  { id: 2, timestamp: new Date().toISOString(), level: 'WARN', service: 'DB', message: 'Connection pool almost full' },
  { id: 3, timestamp: new Date().toISOString(), level: 'ERROR', service: 'Collector', message: 'Failed to fetch data from KRX' },
  { id: 4, timestamp: new Date().toISOString(), level: 'INFO', service: 'API', message: 'Fear & Greed index calculated' }
])

let metricsInterval: NodeJS.Timeout

// Options
const logLevelOptions = ['ALL', 'ERROR', 'WARN', 'INFO', 'DEBUG']

// Table columns
const logColumns = [
  { name: 'timestamp', label: '시간', field: 'timestamp', align: 'left', sortable: true },
  { name: 'level', label: '레벨', field: 'level', align: 'center' },
  { name: 'service', label: '서비스', field: 'service', align: 'left' },
  { name: 'message', label: '메시지', field: 'message', align: 'left' }
]

// Computed
const filteredLogs = computed(() => {
  if (logLevel.value === 'ALL') return systemLogs.value
  return systemLogs.value.filter(log => log.level === logLevel.value)
})

// Methods
function getCpuColor(value: number): string {
  if (value > 80) return 'negative'
  if (value > 60) return 'warning'
  return 'positive'
}

function getMemoryColor(value: number): string {
  if (value > 85) return 'negative'
  if (value > 70) return 'warning'
  return 'positive'
}

function getDiskColor(value: number): string {
  if (value > 90) return 'negative'
  if (value > 75) return 'warning'
  return 'positive'
}

function getServiceIcon(status: string): string {
  switch (status) {
    case 'RUNNING': return 'check_circle'
    case 'STOPPED': return 'stop_circle'
    case 'RESTARTING': return 'refresh'
    case 'ERROR': return 'error'
    default: return 'help'
  }
}

function getServiceColor(status: string): string {
  switch (status) {
    case 'RUNNING': return 'positive'
    case 'STOPPED': return 'grey'
    case 'RESTARTING': return 'warning'
    case 'ERROR': return 'negative'
    default: return 'grey'
  }
}

function getLogLevelColor(level: string): string {
  switch (level) {
    case 'ERROR': return 'negative'
    case 'WARN': return 'warning'
    case 'INFO': return 'info'
    case 'DEBUG': return 'grey'
    default: return 'grey'
  }
}

function formatBytes(bytes: number): string {
  const sizes = ['B', 'KB', 'MB', 'GB']
  let i = 0
  while (bytes >= 1024 && i < sizes.length - 1) {
    bytes /= 1024
    i++
  }
  return `${bytes.toFixed(1)} ${sizes[i]}`
}

function formatDateTime(dateTime: string): string {
  return format(new Date(dateTime), 'MM/dd HH:mm:ss', { locale: ko })
}

async function loadPerformanceMetrics(): Promise<void> {
  try {
    const metrics = await adminApi.getPerformanceMetrics()
    performanceMetrics.value = metrics
  } catch (error) {
    console.error('Failed to load performance metrics:', error)
  }
}

async function loadSystemLogs(): Promise<void> {
  loadingLogs.value = true
  try {
    // Mock system logs - replace with actual API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    $q.notify({ type: 'positive', message: '로그가 업데이트되었습니다.' })
  } catch (error) {
    $q.notify({ type: 'negative', message: '로그 조회에 실패했습니다.' })
  } finally {
    loadingLogs.value = false
  }
}

async function refreshAllData(): Promise<void> {
  loading.value = true
  try {
    await Promise.all([
      loadPerformanceMetrics(),
      loadSystemLogs()
    ])
    $q.notify({ type: 'positive', message: '모든 데이터가 업데이트되었습니다.' })
  } catch (error) {
    $q.notify({ type: 'negative', message: '데이터 새로고침에 실패했습니다.' })
  } finally {
    loading.value = false
  }
}

async function restartService(serviceName: string): Promise<void> {
  $q.dialog({
    title: '서비스 재시작',
    message: `${serviceName} 서비스를 재시작하시겠습니까?`,
    cancel: true,
    persistent: true
  }).onOk(async () => {
    try {
      const service = services.value.find(s => s.name === serviceName)
      if (service) {
        service.status = 'RESTARTING'
      }

      await adminApi.restartService(serviceName)
      
      // Simulate restart completion
      setTimeout(() => {
        if (service) {
          service.status = 'RUNNING'
          service.uptime = '0m'
        }
      }, 3000)

      $q.notify({
        type: 'positive',
        message: `${serviceName} 서비스가 재시작되었습니다.`
      })
    } catch (error) {
      $q.notify({
        type: 'negative',
        message: '서비스 재시작에 실패했습니다.'
      })
    }
  })
}

function filterLogs(): void {
  // Filtering is handled by computed property
}

// Lifecycle
onMounted(() => {
  refreshAllData()
  
  // 실시간 메트릭 업데이트
  metricsInterval = setInterval(() => {
    loadPerformanceMetrics()
  }, 10000) // 10초마다 업데이트
})

onUnmounted(() => {
  if (metricsInterval) {
    clearInterval(metricsInterval)
  }
})
</script>

<style lang="scss" scoped>
.status-card {
  border-left: 4px solid transparent;
  transition: all 0.3s ease;
  
  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    transform: translateY(-2px);
  }
}

.service-card {
  transition: all 0.3s ease;
  
  &:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    transform: translateY(-1px);
  }
}

.chart-container {
  height: 300px;
}

.chart-placeholder {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  border-radius: 8px;
  font-size: 1.2rem;
  color: #666;
}

.q-linear-progress {
  border-radius: 4px;
}

.ellipsis {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>