import { createRouter, createWebHashHistory } from 'vue-router'
import HomePage      from '../pages/HomePage.vue'
import ModsPage      from '../pages/ModsPage.vue'
import FriendsPage   from '../pages/FriendsPage.vue'
import QuestsPage    from '../pages/QuestsPage.vue'
import LockerPage    from '../pages/LockerPage.vue'

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/console',   component: () => import('../pages/ConsolePage.vue'),                    name: 'console'   },
    { path: '/',          component: HomePage,                                                    name: 'home'      },
    { path: '/cosmetics', component: LockerPage,                                                  name: 'cosmetics' },
    { path: '/pass',      component: () => import('../pages/PassPage.vue'),                       name: 'pass'      },
    { path: '/quests',    component: QuestsPage,                                                  name: 'quests'    },
    { path: '/capes',     component: () => import('../pages/CapesPage.vue'),                       name: 'capes'     },
    { path: '/profiles',  component: () => import('../pages/settings/ProfilesSettings.vue'),      name: 'profiles'  },
    { path: '/versions',  component: () => import('../pages/VersionsPage.vue'),                   name: 'versions'  },
    { path: '/mods',      component: ModsPage,                                                    name: 'mods'      },
    { path: '/settings',  component: () => import('../pages/SettingsPage.vue'),                   name: 'settings'  },
    { path: '/friends',   component: FriendsPage,                                                 name: 'friends'   },
    { path: '/lobby',     component: () => import('../pages/LobbyPage.vue'),                      name: 'lobby'     },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})
