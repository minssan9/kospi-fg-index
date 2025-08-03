import { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { 
        path: '', 
        component: () => import('pages/IndexPage.vue'),
        meta: { title: 'KOSPI Fear & Greed Index' }
      },
      { 
        path: 'history', 
        component: () => import('pages/HistoryPage.vue'),
        meta: { title: 'Fear & Greed Index 히스토리' }
      },
      { 
        path: 'statistics', 
        component: () => import('pages/StatisticsPage.vue'),
        meta: { title: 'Fear & Greed Index 통계' }
      },
      { 
        path: 'about', 
        component: () => import('pages/AboutPage.vue'),
        meta: { title: 'About - Fear & Greed Index' }
      },
      { 
        path: 'batch', 
        component: () => import('pages/BatchManagementPage.vue'),
        meta: { title: '배치 처리 관리' }
      }
    ],
  },

  // 항상 마지막에 위치
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
]

export default routes 