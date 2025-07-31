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
      }
    ],
  },

  // Admin Login
  {
    path: '/admin/login',
    name: 'admin-login',
    component: () => import('pages/admin/LoginPage.vue'),
    meta: { title: 'Admin Login', requiresGuest: true }
  },
  // Admin Routes
  {
    path: '/admin',
    component: () => import('layouts/AdminLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'admin-dashboard',
        component: () => import('pages/admin/DashboardPage.vue'),
        meta: { title: 'Admin Dashboard' }
      },
      {
        path: 'data-collection',
        name: 'admin-data-collection',
        component: () => import('pages/admin/DataCollectionPage.vue'),
        meta: { title: 'Data Collection Management' }
      },
      {
        path: 'system-monitoring',
        name: 'admin-system-monitoring',
        component: () => import('pages/admin/SystemMonitoringPage.vue'),
        meta: { title: 'System Monitoring' }
      },
      {
        path: 'calculator',
        name: 'admin-calculator',
        component: () => import('pages/admin/CalculatorPage.vue'),
        meta: { title: 'Calculator Management' }
      }
    ]
  },

  // Admin Login
  {
    path: '/admin/login',
    name: 'admin-login',
    component: () => import('pages/admin/LoginPage.vue'),
    meta: { title: 'Admin Login', requiresGuest: true }
  },

  // 항상 마지막에 위치
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
]

export default routes 