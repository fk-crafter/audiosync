import type * as Party from 'partykit/server'

interface AudioState {
  url: string | null
  name: string | null
  isPlaying: boolean
  currentTime: number
  lastUpdateTime: number
  duration: number
}

interface ChatMessage {
  id: string
  user: string
  text: string
  timestamp: number
}

export default class AudioSyncServer implements Party.Server {
  audioState: AudioState = {
    url: null,
    name: null,
    isPlaying: false,
    currentTime: 0,
    lastUpdateTime: 0,
    duration: 0,
  }

  users = new Map<string, string>()
  chatHistory: ChatMessage[] = []
  heartbeatTimer: ReturnType<typeof setInterval> | null = null

  constructor(readonly room: Party.Room) {}

  getCurrentAudioTime(): number {
    if (!this.audioState.url) return 0
    if (!this.audioState.isPlaying) return this.audioState.currentTime
    const elapsed = (Date.now() - this.audioState.lastUpdateTime) / 1000
    const estimated = this.audioState.currentTime + elapsed
    if (this.audioState.duration > 0 && estimated >= this.audioState.duration) {
      this.audioState.isPlaying = false
      this.audioState.currentTime = this.audioState.duration
      this.stopHeartbeat()
      return this.audioState.duration
    }
    return Math.max(0, estimated)
  }

  startHeartbeat() {
    this.stopHeartbeat()
    this.heartbeatTimer = setInterval(() => {
      if (!this.audioState.isPlaying || !this.audioState.url) {
        this.stopHeartbeat()
        return
      }
      const time = this.getCurrentAudioTime()
      if (this.audioState.duration > 0 && time >= this.audioState.duration) {
        this.audioState.isPlaying = false
        this.audioState.currentTime = 0
        this.stopHeartbeat()
        this.room.broadcast(
          JSON.stringify({
            type: 'audio-ended',
            serverTime: Date.now(),
          }),
        )
        return
      }
      this.room.broadcast(
        JSON.stringify({
          type: 'audio-sync-pulse',
          currentTime: time,
          isPlaying: this.audioState.isPlaying,
          serverTime: Date.now(),
        }),
      )
    }, 2500)
  }

  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  async onRequest(req: Party.Request) {
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': '*',
        },
      })
    }

    return new Response(
      JSON.stringify({
        status: 'ok',
        roomId: this.room.id,
        connectedUsers: this.users.size,
        audioState: {
          ...this.audioState,
          currentTime: this.getCurrentAudioTime(),
        },
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      },
    )
  }

  onConnect(connection: Party.Connection) {
    // Send immediate sync state to newly connected client
    connection.send(
      JSON.stringify({
        type: 'audio-state-sync',
        url: this.audioState.url,
        name: this.audioState.name,
        isPlaying: this.audioState.isPlaying,
        currentTime: this.getCurrentAudioTime(),
        duration: this.audioState.duration,
        serverTime: Date.now(),
      }),
    )
  }

  onClose(connection: Party.Connection) {
    if (this.users.has(connection.id)) {
      this.users.delete(connection.id)
      this.broadcastUsers()
    }
    if (this.users.size === 0) {
      this.stopHeartbeat()
    }
  }

  broadcastUsers() {
    const uniqueUsers = Array.from(new Set(this.users.values()))
    this.room.broadcast(
      JSON.stringify({
        type: 'users-update',
        users: uniqueUsers,
        totalConnections: this.users.size,
      }),
    )
  }

  onMessage(message: string, sender: Party.Connection) {
    try {
      const data = JSON.parse(message)

      if (data.type === 'user-join') {
        this.users.set(sender.id, data.username)
        this.broadcastUsers()

        sender.send(
          JSON.stringify({
            type: 'chat-history',
            messages: this.chatHistory,
          }),
        )

        // Send full audio state
        sender.send(
          JSON.stringify({
            type: 'audio-state-sync',
            url: this.audioState.url,
            name: this.audioState.name,
            isPlaying: this.audioState.isPlaying,
            currentTime: this.getCurrentAudioTime(),
            duration: this.audioState.duration,
            serverTime: Date.now(),
          }),
        )
      } else if (data.type === 'chat') {
        const chatMsg: ChatMessage = {
          id: crypto.randomUUID(),
          user: data.user,
          text: data.text,
          timestamp: Date.now(),
        }
        this.chatHistory.push(chatMsg)
        if (this.chatHistory.length > 100) this.chatHistory.shift()
        this.room.broadcast(JSON.stringify({ type: 'chat', message: chatMsg }))
      } else if (data.type === 'audio-upload-start') {
        this.room.broadcast(
          JSON.stringify({
            type: 'audio-upload-start',
            name: data.name,
            user: data.user,
          }),
          [sender.id],
        )
      } else if (data.type === 'audio-upload-cancel') {
        this.room.broadcast(
          JSON.stringify({
            type: 'audio-upload-cancel',
            name: data.name,
            error: data.error,
          }),
          [sender.id],
        )
      } else if (data.type === 'audio-loaded') {
        this.audioState.url = data.url
        this.audioState.name = data.name
        this.audioState.isPlaying = false
        this.audioState.currentTime = 0
        this.audioState.duration = data.duration || 0
        this.audioState.lastUpdateTime = Date.now()
        this.stopHeartbeat()

        this.room.broadcast(
          JSON.stringify({
            type: 'audio-loaded',
            url: this.audioState.url,
            name: this.audioState.name,
            duration: this.audioState.duration,
            isPlaying: false,
            currentTime: 0,
            serverTime: Date.now(),
          }),
        )
      } else if (data.type === 'audio-action') {
        const isPlay = data.action === 'play'
        this.audioState.isPlaying = isPlay
        if (data.time !== undefined && !isNaN(data.time)) {
          this.audioState.currentTime = data.time
        } else {
          this.audioState.currentTime = this.getCurrentAudioTime()
        }
        this.audioState.lastUpdateTime = Date.now()
        if (data.duration && data.duration > 0) {
          this.audioState.duration = data.duration
        }

        if (isPlay) {
          this.startHeartbeat()
        } else {
          this.stopHeartbeat()
        }

        this.room.broadcast(
          JSON.stringify({
            type: 'audio-action',
            action: data.action,
            time: this.audioState.currentTime,
            serverTime: Date.now(),
          }),
          [sender.id],
        )
      } else if (data.type === 'audio-seek') {
        if (data.time !== undefined && !isNaN(data.time)) {
          this.audioState.currentTime = data.time
          this.audioState.lastUpdateTime = Date.now()
        }
        this.room.broadcast(
          JSON.stringify({
            type: 'audio-seek',
            time: this.audioState.currentTime,
            isPlaying: this.audioState.isPlaying,
            serverTime: Date.now(),
          }),
          [sender.id],
        )
      } else if (data.type === 'audio-ended') {
        this.audioState.isPlaying = false
        this.audioState.currentTime = 0
        this.audioState.lastUpdateTime = Date.now()
        this.stopHeartbeat()
        this.room.broadcast(
          JSON.stringify({
            type: 'audio-ended',
            serverTime: Date.now(),
          }),
        )
      } else if (data.type === 'audio-clear') {
        this.stopHeartbeat()
        this.audioState = {
          url: null,
          name: null,
          isPlaying: false,
          currentTime: 0,
          lastUpdateTime: 0,
          duration: 0,
        }
        this.room.broadcast(
          JSON.stringify({
            type: 'audio-clear',
            serverTime: Date.now(),
          }),
        )
      } else if (data.type === 'audio-request-sync') {
        if (!this.audioState.url) return
        sender.send(
          JSON.stringify({
            type: 'audio-action',
            action: this.audioState.isPlaying ? 'play' : 'pause',
            time: this.getCurrentAudioTime(),
            serverTime: Date.now(),
          }),
        )
      } else if (data.type === 'request-audio-state') {
        sender.send(
          JSON.stringify({
            type: 'audio-state-sync',
            url: this.audioState.url,
            name: this.audioState.name,
            isPlaying: this.audioState.isPlaying,
            currentTime: this.getCurrentAudioTime(),
            duration: this.audioState.duration,
            serverTime: Date.now(),
          }),
        )
      }
    } catch (err) {
      console.error('Error handling WebSocket message:', err)
    }
  }
}
