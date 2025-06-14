import {
  createRouter,
  createWebHistory,
} from 'vue-router'

import routes from './routes'

const Router = createRouter({
  scrollBehavior: () => ({ left: 0, top: 0 }),
  routes,
  history: createWebHistory()
})

export default Router 