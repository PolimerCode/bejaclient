import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface Friend {
  uuid: string
  username: string
  online: boolean
}

export interface FriendRequest {
  uuid: string
  username: string
  direction: 'incoming' | 'outgoing'
}

export const useFriendsStore = defineStore('friends', () => {
  const friends        = ref<Friend[]>([])
  const requests       = ref<FriendRequest[]>([])
  const panelHidden    = ref(false)
  const socketStatus   = ref<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting')

  const incomingRequests = computed(() => requests.value.filter(r => r.direction === 'incoming'))
  const outgoingRequests = computed(() => requests.value.filter(r => r.direction === 'outgoing'))
  const pendingCount     = computed(() => incomingRequests.value.length)

  async function refresh() {
    try {
      const rows = await window.api.friends.list()
      friends.value  = rows.filter(r => r.status === 'accepted').map(r => ({ uuid: r.uuid, username: r.username, online: r.online }))
      requests.value = rows.filter(r => r.status === 'pending').map(r => ({ uuid: r.uuid, username: r.username, direction: r.direction as 'incoming' | 'outgoing' }))
    } catch { /* non-fatal */ }
  }

  async function connect() {
    socketStatus.value = 'connecting'
    window.api.friends.onSocketStatus(s => { socketStatus.value = s })
    await window.api.friends.connect()
    await refresh()
  }

  async function sendRequest(username: string): Promise<'sent' | 'already_friends' | 'already_pending' | 'not_found' | 'error'> {
    const lower = username.trim().toLowerCase()
    if (friends.value.some(f => f.username.toLowerCase() === lower))  return 'already_friends'
    if (requests.value.some(r => r.username.toLowerCase() === lower)) return 'already_pending'
    try {
      const result = await window.api.friends.sendRequest(username.trim())
      if (result.error === 'not_found')    return 'not_found'
      if (result.error)                    return 'error'
      await refresh()
      return 'sent'
    } catch { return 'error' }
  }

  async function acceptRequest(uuid: string) {
    await window.api.friends.acceptRequest(uuid)
    await refresh()
  }

  async function declineRequest(uuid: string) {
    await window.api.friends.removeOrDecline(uuid)
    await refresh()
  }

  async function cancelRequest(uuid: string) {
    await window.api.friends.removeOrDecline(uuid)
    await refresh()
  }

  async function removeFriend(uuid: string) {
    await window.api.friends.removeOrDecline(uuid)
    await refresh()
  }

  function togglePanel() {
    panelHidden.value = !panelHidden.value
  }

  // Socket event handlers — called from root component after connect()
  function handleOnline(data: { uuid: string; username: string }) {
    const f = friends.value.find(f => f.uuid === data.uuid)
    if (f) f.online = true
  }

  function handleOffline(data: { uuid: string }) {
    const f = friends.value.find(f => f.uuid === data.uuid)
    if (f) f.online = false
  }

  function handleRequest(data: { uuid: string; username: string }) {
    if (!requests.value.some(r => r.uuid === data.uuid)) {
      requests.value.push({ uuid: data.uuid, username: data.username, direction: 'incoming' })
    }
  }

  // The other party accepted/removed us — refetch rather than patch local state,
  // since the diff (pending -> friend, or friend -> gone) is cheap to just reload.
  async function handleAccepted() {
    await refresh()
  }

  async function handleRemoved() {
    await refresh()
  }

  return {
    friends, requests, panelHidden, socketStatus,
    incomingRequests, outgoingRequests, pendingCount,
    connect, refresh,
    sendRequest, acceptRequest, declineRequest, cancelRequest, removeFriend, togglePanel,
    handleOnline, handleOffline, handleRequest, handleAccepted, handleRemoved,
  }
})
