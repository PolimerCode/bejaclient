import { ref, onUnmounted } from 'vue'
import { useLobbyStore } from '../store/lobbyStore'
import { useAccountStore } from '../store/accountStore'

const STUN: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
]

const VAD_THRESHOLD = 14 // 0–255 average frequency power

export function useLobbyVoice() {
  const isMuted      = ref(false)
  const isDeafened   = ref(false)
  const isSpeaking   = ref(false)
  const hasPermission = ref(false)

  let localStream: MediaStream | null = null
  let audioCtx: AudioContext | null = null
  let analyser: AnalyserNode | null = null
  let vadFrame: number | null = null

  const peers  = new Map<string, RTCPeerConnection>()
  const audios = new Map<string, HTMLAudioElement>()

  const lobbyStore   = useLobbyStore()
  const accountStore = useAccountStore()

  async function init(): Promise<boolean> {
    try {
      localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      hasPermission.value = true
      setupVAD()
      return true
    } catch {
      hasPermission.value = false
      return false
    }
  }

  function setupVAD(): void {
    if (!localStream) return
    audioCtx = new AudioContext()
    analyser = audioCtx.createAnalyser()
    analyser.fftSize = 512
    analyser.smoothingTimeConstant = 0.3

    const source = audioCtx.createMediaStreamSource(localStream)
    source.connect(analyser)

    const buf = new Uint8Array(analyser.frequencyBinCount)

    function tick(): void {
      vadFrame = requestAnimationFrame(tick)
      if (!analyser || isMuted.value) {
        if (isSpeaking.value) setSpeaking(false)
        return
      }
      analyser.getByteFrequencyData(buf)
      const avg = buf.reduce((s, v) => s + v, 0) / buf.length
      const now = avg > VAD_THRESHOLD
      if (now !== isSpeaking.value) setSpeaking(now)
    }

    tick()
  }

  function setSpeaking(speaking: boolean): void {
    isSpeaking.value = speaking
    const uuid = accountStore.selectedAccount?.uuid
    if (!uuid || !lobbyStore.party) return
    lobbyStore.handleSpeaking({ uuid, isSpeaking: speaking })
    window.api.lobby.emit('voice:speaking', {
      partyId: lobbyStore.party.id,
      uuid,
      isSpeaking: speaking,
    }).catch(() => {})
  }

  function createPC(peerUuid: string): RTCPeerConnection {
    const existing = peers.get(peerUuid)
    if (existing) existing.close()

    const pc = new RTCPeerConnection({ iceServers: STUN })
    peers.set(peerUuid, pc)

    if (localStream) {
      for (const track of localStream.getTracks()) pc.addTrack(track, localStream)
    }

    pc.onicecandidate = e => {
      if (!e.candidate) return
      window.api.lobby.emit('voice:ice', {
        to:        peerUuid,
        from:      accountStore.selectedAccount?.uuid,
        candidate: e.candidate.toJSON(),
      }).catch(() => {})
    }

    pc.ontrack = e => {
      let el = audios.get(peerUuid)
      if (!el) {
        el = new Audio()
        el.autoplay = true
        audios.set(peerUuid, el)
      }
      el.srcObject = e.streams[0]
      el.muted = isDeafened.value
      el.play().catch(() => {})
    }

    pc.onconnectionstatechange = () => {
      if (['failed', 'closed', 'disconnected'].includes(pc.connectionState)) {
        peers.delete(peerUuid)
      }
    }

    return pc
  }

  async function initiateCall(peerUuid: string): Promise<void> {
    if (!hasPermission.value) return
    const pc    = createPC(peerUuid)
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    await window.api.lobby.emit('voice:offer', {
      to:   peerUuid,
      from: accountStore.selectedAccount?.uuid,
      sdp:  offer.sdp,
    })
  }

  async function handleOffer(data: { from: string; sdp: string }): Promise<void> {
    if (!hasPermission.value) return
    const pc = createPC(data.from)
    await pc.setRemoteDescription({ type: 'offer', sdp: data.sdp })
    const answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)
    await window.api.lobby.emit('voice:answer', {
      to:   data.from,
      from: accountStore.selectedAccount?.uuid,
      sdp:  answer.sdp,
    })
  }

  async function handleAnswer(data: { from: string; sdp: string }): Promise<void> {
    const pc = peers.get(data.from)
    if (pc) await pc.setRemoteDescription({ type: 'answer', sdp: data.sdp })
  }

  async function handleIce(data: { from: string; candidate: RTCIceCandidateInit }): Promise<void> {
    const pc = peers.get(data.from)
    if (pc) await pc.addIceCandidate(new RTCIceCandidate(data.candidate)).catch(() => {})
  }

  function toggleMic(): void {
    isMuted.value = !isMuted.value
    localStream?.getAudioTracks().forEach(t => { t.enabled = !isMuted.value })
  }

  function toggleDeafen(): void {
    isDeafened.value = !isDeafened.value
    audios.forEach(el => { el.muted = isDeafened.value })
  }

  function dispose(): void {
    if (vadFrame !== null) cancelAnimationFrame(vadFrame)
    audioCtx?.close().catch(() => {})
    peers.forEach(pc => pc.close())
    peers.clear()
    audios.forEach(el => { el.srcObject = null })
    audios.clear()
    localStream?.getTracks().forEach(t => t.stop())
    localStream = null
  }

  onUnmounted(dispose)

  return {
    isMuted, isDeafened, isSpeaking, hasPermission,
    init, dispose,
    initiateCall, handleOffer, handleAnswer, handleIce,
    toggleMic, toggleDeafen,
  }
}
