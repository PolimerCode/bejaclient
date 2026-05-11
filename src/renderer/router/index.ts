import { createRouter, createWebHashHistory } from 'vue-router'
import HomePage from '../pages/HomePage.vue'

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/console',   component: () => import('../pages/ConsolePage.vue'),                    name: 'console'   },
    { path: '/',          component: HomePage,                                                    name: 'home'      },
    { path: '/cosmetics', component: HomePage,                                                    name: 'cosmetics' },
    { path: '/profiles',  component: () => import('../pages/settings/ProfilesSettings.vue'),      name: 'profiles'  },
    { path: '/versions',  component: () => import('../pages/VersionsPage.vue'),                   name: 'versions'  },
    { path: '/mods',      component: () => import('../pages/ModsPage.vue'),                       name: 'mods'      },
    { path: '/settings',  component: () => import('../pages/SettingsPage.vue'),                   name: 'settings'  },
    { path: '/friends',   component: () => import('../pages/FriendsPage.vue'),                    name: 'friends'   },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})
