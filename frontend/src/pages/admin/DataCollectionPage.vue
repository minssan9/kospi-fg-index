<template>
  <q-page class="q-pa-md">
    <!-- Header -->
    <div class="row items-center q-mb-lg">
      <div class="col">
        <h4 class="q-ma-none text-weight-bold">데이터 수집 관리</h4>
        <p class="text-grey-7 q-ma-none">시장 데이터의 수동 수집 및 수집 이력을 관리합니다</p>
      </div>
    </div>

    <!-- Manual Collection Panel -->
    <div class="row q-gutter-md q-mb-lg">
      <div class="col-12 col-md-6">
        <q-card>
          <q-card-section>
            <div class="text-h6 q-mb-md">수동 데이터 수집</div>
            
            <q-form @submit="collectData" class="q-gutter-md">
              <q-input
                v-model="collectionForm.date"
                type="date"
                label="수집 날짜"
                filled
                :rules="[val => !!val || '날짜를 선택해주세요']"
              />

              <q-select
                v-model="collectionForm.sources"
                :options="sourceOptions"
                label="데이터 소스"
                filled
                multiple
                emit-value
                map-options
                use-chips
                :rules="[val => val.length > 0 || '최소 하나의 소스를 선택해주세요']"
              />

              <div class="row q-gutter-sm">
                <q-btn
                  type="submit"
                  color="primary"
                  label="데이터 수집 시작"
                  icon="cloud_download"
                  :loading="collecting"
                  :disable="!isFormValid"
                />
                <q-btn
                  color="secondary"
                  label="오늘 데이터 수집"
                  icon="today"
                  @click="collectTodayData"
                  :loading="collecting"
                />
              </div>
            </q-form>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-md-6">
        <q-card>
          <q-card-section>
            <div class="text-h6 q-mb-md">수집 상태</div>
            
            <div v-if="lastCollectionResult" class="q-mb-md">
              <div class="text-subtitle2 q-mb-sm">마지막 수집 결과</div>
              <div class="q-gutter-xs">
                <q-chip
                  v-for="result in lastCollectionResult.results"
                  :key="result.source"
                  :color="result.status === 'SUCCESS' ? 'positive' : 'negative'"
                  text-color="white"
                  :icon="result.status === 'SUCCESS' ? 'check' : 'error'"
                >
                  {{ result.source }}: {{ result.status }}
                </q-chip>
              </div>
              <div class="text-caption text-grey-7 q-mt-sm">
                수집 날짜: {{ lastCollectionResult.date }}
              </div>
            </div>

            <div class="row q-gutter-md">
              <div class="col">
                <q-circular-progress
                  :value="successRate"
                  size="80px"
                  :thickness="0.15"
                  color="positive"
                  track-color="grey-3"
                  show-value
                  class="q-ma-md"
                >
                  <span class="text-caption">성공률</span>
                </q-circular-progress>
              </div>
              <div class="col">
                <div class="text-h6">{{ successRate }}%</div>
                <div class="text-caption text-grey-7">지난 7일 평균</div>
                <div class="text-body2 q-mt-sm">
                  총 {{ totalCollections }}회 수집
                </div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Data Sources Status -->
    <div class="row q-mb-lg">
      <div class="col-12">
        <q-card>
          <q-card-section>
            <div class="text-h6 q-mb-md">데이터 소스 상태</div>
            <div class="row q-gutter-md">
              <div
                v-for="source in dataSourceStatus"
                :key="source.name"
                class="col-12 col-sm-6 col-md-4"
              >
                <q-card flat bordered class="source-status-card">
                  <q-card-section>
                    <div class="row items-center">
                      <div class="col">
                        <div class="text-subtitle1 text-weight-medium">
                          {{ source.name }}
                        </div>
                        <div class="text-caption text-grey-7">
                          {{ source.description }}
                        </div>
                      </div>
                      <div class="col-auto">
                        <q-icon
                          :name="source.status === 'HEALTHY' ? 'check_circle' : 'error'"
                          :color="source.status === 'HEALTHY' ? 'positive' : 'negative'"
                          size="md"
                        />
                      </div>
                    </div>
                    <div class="q-mt-sm">
                      <div class="text-caption">
                        마지막 수집: {{ formatLastCollection(source.lastCollection) }}
                      </div>
                      <div class="text-caption">
                        응답시간: {{ source.responseTime }}ms
                      </div>
                    </div>
                  </q-card-section>
                </q-card>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Collection History -->
    <div class="row">
      <div class="col-12">
        <q-card>
          <q-card-section>
            <div class="row items-center q-mb-md">
              <div class="col">
                <div class="text-h6">수집 이력</div>
              </div>
              <div class="col-auto q-gutter-sm">
                <q-select
                  v-model="historyDays"
                  :options="[7, 14, 30, 90]"
                  label="기간(일)"
                  dense
                  outlined
                  style="min-width: 100px"
                  @update:model-value="loadCollectionHistory"
                />
                <q-btn
                  flat
                  icon="refresh"
                  @click="loadCollectionHistory"
                  :loading="loadingHistory"
                />
              </div>
            </div>

            <q-table
              :rows="collectionHistory"
              :columns="historyColumns"
              :loading="loadingHistory"
              row-key="id"
              flat
              bordered
              :pagination="{ rowsPerPage: 15 }"
            >
              <template v-slot:body-cell-status="props">
                <q-td :props="props">
                  <q-badge
                    :color="getStatusColor(props.value)"
                    :label="props.value"
                  />
                </q-td>
              </template>
              <template v-slot:body-cell-duration="props">
                <q-td :props="props">
                  {{ props.value ? `${props.value}ms` : '-' }}
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
                    @click="showCollectionDetails(props.row)"
                  />
                  <q-btn
                    v-if="props.row.status === 'FAILED'"
                    flat
                    dense
                    icon="refresh"
                    color="primary"
                    @click="retryCollection(props.row)"
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
import { adminApi, type DataCollectionRequest, type DataCollectionResponse } from '../../services/adminApi'

const $q = useQuasar()

// Reactive data
const collecting = ref(false)
const loadingHistory = ref(false)
const historyDays = ref(7)

const collectionForm = ref({
  date: format(new Date(), 'yyyy-MM-dd'),
  sources: ['KRX', 'BOK']
})

const lastCollectionResult = ref<DataCollectionResponse | null>(null)
const collectionHistory = ref<any[]>([])
const dataSourceStatus = ref([
  {
    name: 'KRX',
    description: 'Korea Exchange - 주식 시장 데이터',
    status: 'HEALTHY',
    lastCollection: new Date().toISOString(),
    responseTime: 450
  },
  {
    name: 'BOK',
    description: 'Bank of Korea - 경제 지표',
    status: 'HEALTHY',
    lastCollection: new Date().toISOString(),
    responseTime: 680
  },
  {
    name: 'UPBIT',
    description: 'Upbit - 암호화폐 지수',
    status: 'HEALTHY',
    lastCollection: new Date().toISOString(),
    responseTime: 320
  }
])

// Options
const sourceOptions = [
  { label: 'KRX (Korea Exchange)', value: 'KRX' },
  { label: 'BOK (Bank of Korea)', value: 'BOK' },
  { label: 'UPBIT (Cryptocurrency)', value: 'UPBIT' }
]

// Table columns
const historyColumns = [
  { name: 'date', label: '날짜', field: 'date', align: 'left', sortable: true },
  { name: 'source', label: '소스', field: 'source', align: 'left' },
  { name: 'dataType', label: '데이터 타입', field: 'dataType', align: 'left' },
  { name: 'status', label: '상태', field: 'status', align: 'center' },
  { name: 'recordCount', label: '레코드 수', field: 'recordCount', align: 'right' },
  { name: 'duration', label: '소요시간', field: 'duration', align: 'right' },
  { name: 'createdAt', label: '수집시간', field: 'createdAt', align: 'left', sortable: true },
  { name: 'actions', label: '작업', field: '', align: 'center' }
]

// Computed
const isFormValid = computed(() => {
  return collectionForm.value.date && collectionForm.value.sources.length > 0
})

const successRate = computed(() => {
  if (collectionHistory.value.length === 0) return 0
  const successCount = collectionHistory.value.filter(log => log.status === 'SUCCESS').length
  return Math.round((successCount / collectionHistory.value.length) * 100)
})

const totalCollections = computed(() => collectionHistory.value.length)

// Methods
function getStatusColor(status: string): string {
  switch (status) {
    case 'SUCCESS': return 'positive'
    case 'FAILED': return 'negative'
    case 'PARTIAL': return 'warning'
    default: return 'grey'
  }
}

function formatDateTime(dateTime: string): string {
  return format(new Date(dateTime), 'MM/dd HH:mm', { locale: ko })
}

function formatLastCollection(lastCollection: string): string {
  if (!lastCollection) return 'N/A'
  return format(new Date(lastCollection), 'MM/dd HH:mm', { locale: ko })
}

async function collectData(): Promise<void> {
  if (!isFormValid.value) return

  collecting.value = true
  try {
    const request: DataCollectionRequest = {
      date: collectionForm.value.date,
      sources: collectionForm.value.sources
    }

    const result = await adminApi.collectData(request)
    lastCollectionResult.value = result

    $q.notify({
      type: 'positive',
      message: '데이터 수집이 완료되었습니다.',
      caption: `${result.results.filter(r => r.status === 'SUCCESS').length}/${result.results.length} 성공`
    })

    // 수집 이력 새로고침
    await loadCollectionHistory()
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: '데이터 수집에 실패했습니다.',
      caption: error instanceof Error ? error.message : '알 수 없는 오류'
    })
  } finally {
    collecting.value = false
  }
}

async function collectTodayData(): Promise<void> {
  collectionForm.value.date = format(new Date(), 'yyyy-MM-dd')
  collectionForm.value.sources = ['KRX', 'BOK']
  await collectData()
}

async function loadCollectionHistory(): Promise<void> {
  loadingHistory.value = true
  try {
    const history = await adminApi.getCollectionStatus(historyDays.value)
    collectionHistory.value = history
  } catch (error) {
    console.error('Failed to load collection history:', error)
    $q.notify({
      type: 'negative',
      message: '수집 이력 조회에 실패했습니다.'
    })
  } finally {
    loadingHistory.value = false
  }
}

function showCollectionDetails(row: any): void {
  $q.dialog({
    title: '수집 상세 정보',
    message: `
      <div><strong>날짜:</strong> ${row.date}</div>
      <div><strong>소스:</strong> ${row.source}</div>
      <div><strong>데이터 타입:</strong> ${row.dataType}</div>
      <div><strong>상태:</strong> ${row.status}</div>
      <div><strong>레코드 수:</strong> ${row.recordCount || 'N/A'}</div>
      <div><strong>소요시간:</strong> ${row.duration ? `${row.duration}ms` : 'N/A'}</div>
      ${row.errorMessage ? `<div><strong>오류 메시지:</strong> ${row.errorMessage}</div>` : ''}
    `,
    html: true
  })
}

async function retryCollection(row: any): Promise<void> {
  try {
    collecting.value = true
    const request: DataCollectionRequest = {
      date: row.date,
      sources: [row.source]
    }

    const result = await adminApi.collectData(request)
    
    $q.notify({
      type: 'positive',
      message: '재수집이 완료되었습니다.',
      caption: `${row.source}: ${result.results[0]?.status || 'SUCCESS'}`
    })

    await loadCollectionHistory()
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: '재수집에 실패했습니다.'
    })
  } finally {
    collecting.value = false
  }
}

// Lifecycle
onMounted(() => {
  loadCollectionHistory()
})
</script>

<style lang="scss" scoped>
.source-status-card {
  transition: all 0.3s ease;
  
  &:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    transform: translateY(-1px);
  }
}

.q-form {
  .q-field {
    margin-bottom: 16px;
  }
}

.q-table {
  .q-td {
    border-bottom: 1px solid #e0e0e0;
  }
}
</style>