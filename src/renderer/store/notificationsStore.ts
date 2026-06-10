import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export type NotificationType = 'friend_request' | 'system'

export interface BejaNotification {
  id: string
  type: NotificationType
  title: string
  body: string
  timestamp: number
  read: boolean
  data?: Record<string, string>
}

export const useNotificationsStore = defineStore('notifications', () => {
  const notifications = ref<BejaNotification[]>([])
  const drawerOpen    = ref(false)

  const unreadCount = computed(() => notifications.value.filter(n => !n.read).length)

  function addFriendRequest(uuid: string, username: string) {
    if (notifications.value.some(n => n.type === 'friend_request' && n.data?.uuid === uuid)) return
    notifications.value.unshift({
      id: crypto.randomUUID(),
      type: 'friend_request',
      title: 'Friend Request',
      body: `${username} wants to be your friend`,
      timestamp: Date.now(),
      read: false,
      data: { uuid, username },
    })
  }

  function addSystem(title: string, body: string) {
    notifications.value.unshift({
      id: crypto.randomUUID(),
      type: 'system',
      title,
      body,
      timestamp: Date.now(),
      read: false,
    })
  }

  function remove(id: string) {
    notifications.value = notifications.value.filter(n => n.id !== id)
  }

  function markAllRead() {
    notifications.value.forEach(n => { n.read = true })
  }

  function openDrawer() {
    drawerOpen.value = true
    markAllRead()
  }

  function closeDrawer() { drawerOpen.value = false }

  function toggleDrawer() {
    if (drawerOpen.value) closeDrawer()
    else openDrawer()
  }

  return {
    notifications, drawerOpen, unreadCount,
    addFriendRequest, addSystem, remove, markAllRead,
    openDrawer, closeDrawer, toggleDrawer,
  }
})
