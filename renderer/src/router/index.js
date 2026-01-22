import { createRouter, createWebHashHistory } from 'vue-router'
import Welcome from '../views/Welcome.vue'
import PromptDetail from '../views/PromptDetail.vue'
import TemplateDetail from '../views/TemplateDetail.vue'

const routes = [
  {
    path: '/',
    name: 'Welcome',
    component: Welcome
  },
  {
    path: '/prompt/:id',
    name: 'PromptDetail',
    component: PromptDetail,
    props: true
  },
  {
    path: '/template/:id',
    name: 'TemplateDetail',
    component: TemplateDetail,
    props: true
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router