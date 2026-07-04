import { io, Socket } from 'socket.io-client'
import { BrowserWindow } from 'electron'

const BEJA_API = 'http://206.217.141.184:3093'

let socket: Socket | null = null

export function connectBejaSocket(token: string, getWindow: () => BrowserWindow | null): void {
  if (socket) {
    socket.disconnect()
    socket = null
  }

  socket = io(BEJA_API, {
    auth: { token },
    reconnection: true,
    // Allow polling fallback so WebSocket issues don't silently break friends
    transports: ['polling', 'websocket'],
  })

  socket.on('connect', () => {
    console.log('[Socket] connected')
    getWindow()?.webContents.send('socket:status', 'connected')
  })

  socket.on('disconnect', reason => {
    console.log('[Socket] disconnected:', reason)
    getWindow()?.webContents.send('socket:status', 'disconnected')
  })

  socket.on('connect_error', err => {
    console.error('[Socket] connect_error:', err.message)
    getWindow()?.webContents.send('socket:status', 'error')
  })

  socket.on('friend:online',   data => getWindow()?.webContents.send('friend:online',   data))
  socket.on('friend:offline',  data => getWindow()?.webContents.send('friend:offline',  data))
  socket.on('friend:request',  data => getWindow()?.webContents.send('friend:request',  data))
  socket.on('friend:accepted', data => getWindow()?.webContents.send('friend:accepted', data))
  socket.on('friend:removed',  data => getWindow()?.webContents.send('friend:removed',  data))
  socket.on('chat:message',    data => getWindow()?.webContents.send('chat:message',    data))
  socket.on('chat:typing',     data => getWindow()?.webContents.send('chat:typing',     data))
  socket.on('stats:online',    data => getWindow()?.webContents.send('stats:online',    data))

  // ── Party / lobby events ─────────────────────────────────────────────────
  const lobbyEvents = [
    'party:state',
    'party:member_joined',
    'party:member_left',
    'party:ready_update',
    'party:skin_update',
    'party:launched',
    'party:disbanded',
    'party:invite_received',
    'party:error',
    'voice:speaking',
    'voice:offer',
    'voice:answer',
    'voice:ice',
  ] as const

  for (const evt of lobbyEvents) {
    socket.on(evt, data => getWindow()?.webContents.send(evt, data))
  }
}

export function disconnectBejaSocket(): void {
  socket?.disconnect()
  socket = null
}

export function emitLobbyEvent(event: string, data: unknown): void {
  if (socket?.connected) {
    socket.emit(event, data)
  }
}
