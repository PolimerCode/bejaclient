import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAccountStore } from './accountStore'

export interface PartyMember {
  uuid: string
  username: string
  skinUrl: string | null
  capeUrl: string | null
  skinModel: 'default' | 'slim'
  isLeader: boolean
  isReady: boolean
  isSpeaking: boolean
}

export interface Party {
  id: string
  members: PartyMember[]
  leaderId: string
}

export interface PartyInvite {
  partyId: string
  fromUuid: string
  fromUsername: string
}

export const useLobbyStore = defineStore('lobby', () => {
  const accountStore = useAccountStore()

  const party         = ref<Party | null>(null)
  const isCreating    = ref(false)
  const pendingInvite = ref<PartyInvite | null>(null)

  let _pendingJoin: ((r: { ok: boolean; error?: string }) => void) | null = null
  let _pendingJoinTimer: ReturnType<typeof setTimeout> | null = null

  const localUuid = computed(() => accountStore.selectedAccount?.uuid ?? null)

  const localMember = computed<PartyMember | null>(() => {
    if (!party.value || !localUuid.value) return null
    return party.value.members.find(m => m.uuid === localUuid.value) ?? null
  })

  const isLeader = computed(() =>
    !!party.value && !!localUuid.value && party.value.leaderId === localUuid.value,
  )

  const isReady = computed(() => localMember.value?.isReady ?? false)

  const allReady = computed(() => {
    if (!party.value) return false
    const nonLeader = party.value.members.filter(m => m.uuid !== party.value!.leaderId)
    return nonLeader.length === 0 || nonLeader.every(m => m.isReady)
  })

  const canLaunch = computed(() => isLeader.value && allReady.value)

  // Other party members — excludes the local player, who is always rendered
  // separately in the center "You" slot regardless of their position in the
  // raw members array (that array is ordered by join time, not by "who's local").
  const otherMembers = computed<PartyMember[]>(() => {
    if (!party.value) return []
    return party.value.members.filter(m => m.uuid !== localUuid.value)
  })

  // Two flanking slots for other members; null = empty invite slot
  const slots = computed<(PartyMember | null)[]>(() => {
    const MAX = 2
    const filled: (PartyMember | null)[] = [...otherMembers.value]
    while (filled.length < MAX) filled.push(null)
    return filled
  })

  // Filled slot count for layout hints
  const memberCount = computed(() => party.value?.members.length ?? 0)

  async function createParty(): Promise<void> {
    if (isCreating.value || party.value) return
    isCreating.value = true
    const account = accountStore.selectedAccount
    if (!account) { isCreating.value = false; return }

    const id = Math.random().toString(36).substring(2, 8).toUpperCase()
    party.value = {
      id,
      leaderId: account.uuid,
      members: [{
        uuid:      account.uuid,
        username:  account.username,
        skinUrl:   account.skinUrl,
        capeUrl:   account.capeUrl,
        skinModel: account.skinModel,
        isLeader:  true,
        isReady:   false,
        isSpeaking: false,
      }],
    }

    window.api.lobby.emit('party:create', {
      partyId: id,
      member: {
        uuid:      account.uuid,
        username:  account.username,
        skinUrl:   account.skinUrl,
        capeUrl:   account.capeUrl,
        skinModel: account.skinModel,
      },
    }).catch(() => {})
    isCreating.value = false
  }

  // Leaves the current party (if any) and creates a brand new one with a fresh code —
  // for a manual "regenerate code" action, unlike createParty()'s no-op-if-already-in-one guard.
  async function regenerateParty(): Promise<void> {
    if (isCreating.value) return
    if (party.value) await leaveParty()
    await createParty()
  }

  async function leaveParty(): Promise<void> {
    if (!party.value) return
    window.api.lobby.emit('party:leave', { partyId: party.value.id }).catch(() => {})
    party.value = null
  }

  async function joinParty(code: string): Promise<{ ok: boolean; error?: string }> {
    const account = accountStore.selectedAccount
    if (!account) return { ok: false, error: 'Not logged in' }
    const partyId = code.trim().toUpperCase()
    if (partyId.length < 6) return { ok: false, error: 'Enter a 6-character code' }
    if (party.value) await leaveParty()

    return new Promise<{ ok: boolean; error?: string }>((resolve) => {
      _pendingJoin = resolve
      _pendingJoinTimer = setTimeout(() => {
        if (_pendingJoin) {
          _pendingJoin = null
          resolve({ ok: false, error: 'Party not found — check the code and try again' })
        }
      }, 5000)

      window.api.lobby.emit('party:join', {
        partyId,
        member: {
          uuid:      account.uuid,
          username:  account.username,
          skinUrl:   account.skinUrl,
          capeUrl:   account.capeUrl,
          skinModel: account.skinModel,
        },
      }).catch(() => {
        if (_pendingJoinTimer) { clearTimeout(_pendingJoinTimer); _pendingJoinTimer = null }
        if (_pendingJoin) {
          _pendingJoin = null
          resolve({ ok: false, error: 'Failed to send join request' })
        }
      })
    })
  }

  async function inviteFriend(friendUuid: string): Promise<void> {
    if (!party.value) return
    window.api.lobby.emit('party:invite', { partyId: party.value.id, friendUuid }).catch(() => {})
  }

  async function toggleReady(): Promise<void> {
    if (!party.value || !localUuid.value) return
    const member = party.value.members.find(m => m.uuid === localUuid.value)
    if (!member) return
    member.isReady = !member.isReady
    window.api.lobby.emit('party:ready', { partyId: party.value.id, isReady: member.isReady }).catch(() => {})
  }

  async function launchParty(profileId: string): Promise<void> {
    if (!party.value || !isLeader.value) return
    window.api.lobby.emit('party:launch_initiate', { partyId: party.value.id, profileId }).catch(() => {})
  }

  // ── Socket event handlers ────────────────────────────────────────────────────

  function handleMemberJoined(data: PartyMember): void {
    if (!party.value) return
    if (!party.value.members.some(m => m.uuid === data.uuid)) {
      party.value.members.push(data)
    }
  }

  function handleMemberLeft(data: { uuid: string }): void {
    if (!party.value) return
    party.value.members = party.value.members.filter(m => m.uuid !== data.uuid)
    // Reassign leader if needed
    if (party.value.leaderId === data.uuid && party.value.members.length > 0) {
      party.value.leaderId = party.value.members[0].uuid
      party.value.members[0].isLeader = true
    }
  }

  function handleReadyUpdate(data: { uuid: string; isReady: boolean }): void {
    if (!party.value) return
    const member = party.value.members.find(m => m.uuid === data.uuid)
    if (member) member.isReady = data.isReady
  }

  function handleSkinUpdate(data: { uuid: string; skinUrl: string | null; capeUrl: string | null; skinModel: 'default' | 'slim' }): void {
    if (!party.value) return
    const member = party.value.members.find(m => m.uuid === data.uuid)
    if (member) {
      member.skinUrl   = data.skinUrl
      member.capeUrl   = data.capeUrl
      member.skinModel = data.skinModel
    }
  }

  function handleDisbanded(): void {
    party.value = null
  }

  function handleSpeaking(data: { uuid: string; isSpeaking: boolean }): void {
    if (!party.value) return
    const member = party.value.members.find(m => m.uuid === data.uuid)
    if (member) member.isSpeaking = data.isSpeaking
  }

  function handlePartyState(data: Party): void {
    party.value = data
    if (_pendingJoin) {
      if (_pendingJoinTimer) { clearTimeout(_pendingJoinTimer); _pendingJoinTimer = null }
      const r = _pendingJoin
      _pendingJoin = null
      r({ ok: true })
    }
  }

  function handlePartyError(data: { message?: string }): void {
    if (_pendingJoin) {
      if (_pendingJoinTimer) { clearTimeout(_pendingJoinTimer); _pendingJoinTimer = null }
      const r = _pendingJoin
      _pendingJoin = null
      r({ ok: false, error: data?.message ?? 'Party not found' })
    }
  }

  function handleInviteReceived(data: PartyInvite): void {
    pendingInvite.value = data
  }

  async function acceptInvite(): Promise<{ ok: boolean; error?: string }> {
    if (!pendingInvite.value) return { ok: false, error: 'No pending invite' }
    const code = pendingInvite.value.partyId
    pendingInvite.value = null
    return joinParty(code)
  }

  function declineInvite(): void {
    pendingInvite.value = null
  }

  return {
    party, isCreating, pendingInvite,
    localUuid, localMember, isLeader, isReady, allReady, canLaunch, slots, memberCount,
    createParty, regenerateParty, leaveParty, joinParty, inviteFriend, toggleReady, launchParty,
    handleMemberJoined, handleMemberLeft, handleReadyUpdate,
    handleSkinUpdate, handleDisbanded, handleSpeaking, handlePartyState, handlePartyError,
    handleInviteReceived, acceptInvite, declineInvite,
  }
})
