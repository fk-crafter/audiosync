import type * as Party from 'partykit/server'

interface AudioState {
  name: string | null
  totalChunks: number
  chunks: { index: number; data: string }[]
  isPlaying: boolean
  currentTime: number
  lastUpdateTime: number
}

interface ChatMessage {
  user: string
  text: string
}

export default class AudioSyncServer implements Party.Server {
  audioState: AudioState = {
    name: null,
    totalChunks: 0,
    chunks: [],
    isPlaying: false,
    currentTime: 0,
    lastUpdateTime: 0,
  }

  users = new Map<string, string>()
  chatHistory: ChatMessage[] = []

  constructor(readonly room: Party.Room) {}

  onClose(connection: Party.Connection) {
    if (this.users.has(connection.id)) {
      this.users.delete(connection.id)
      this.broadcastUsers()
    }
  }

  broadcastUsers() {
    const uniqueUsers = Array.from(new Set(this.users.values()))
    this.room.broadcast(
      JSON.stringify({
        type: 'users-update',
        users: uniqueUsers,
      }),
    )
  }

  onMessage(message: string, sender: Party.Connection) {
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
    } else if (data.type === 'request-audio-state') {
      if (this.audioState.name) {
        sender.send(
          JSON.stringify({
            type: 'audio-chunk-start',
            name: this.audioState.name,
            totalChunks: this.audioState.totalChunks,
          }),
        )

        const sendChunksSlowly = async () => {
          for (let i = 0; i < this.audioState.chunks.length; i++) {
            const chunk = this.audioState.chunks[i]
            sender.send(
              JSON.stringify({
                type: 'audio-chunk',
                index: chunk.index,
                data: chunk.data,
              }),
            )

            if (i % 5 === 0) {
              await new Promise((resolve) => setTimeout(resolve, 5))
            }
          }

          sender.send(
            JSON.stringify({
              type: 'audio-transfer-complete',
            }),
          )

          let currentSyncTime = this.audioState.currentTime
          if (this.audioState.isPlaying) {
            currentSyncTime +=
              (Date.now() - this.audioState.lastUpdateTime) / 1000
          }

          sender.send(
            JSON.stringify({
              type: 'audio-action',
              action: this.audioState.isPlaying ? 'play' : 'pause',
              time: currentSyncTime,
            }),
          )
        }

        sendChunksSlowly()
      }
    } else if (data.type === 'chat') {
      const chatMsg = { user: data.user, text: data.text }
      this.chatHistory.push(chatMsg)
      if (this.chatHistory.length > 100) this.chatHistory.shift()
      this.room.broadcast(message, [sender.id])
    } else if (data.type === 'audio-chunk-start') {
      this.audioState.name = data.name
      this.audioState.totalChunks = data.totalChunks
      this.audioState.chunks = []
      this.audioState.isPlaying = false
      this.audioState.currentTime = 0
      this.audioState.lastUpdateTime = Date.now()
      this.room.broadcast(message, [sender.id])
    } else if (data.type === 'audio-chunk') {
      this.audioState.chunks.push({ index: data.index, data: data.data })
      this.room.broadcast(message, [sender.id])
    } else if (data.type === 'audio-upload-complete') {
      this.room.broadcast(
        JSON.stringify({
          type: 'audio-transfer-complete',
        }),
        [sender.id],
      )
    } else if (data.type === 'request-missing-chunks') {
      const missingIndexes: number[] = data.indexes

      const sendMissingSlowly = async () => {
        for (let i = 0; i < missingIndexes.length; i++) {
          const index = missingIndexes[i]
          const chunk = this.audioState.chunks.find((c) => c.index === index)
          if (chunk) {
            sender.send(
              JSON.stringify({
                type: 'audio-chunk',
                index: chunk.index,
                data: chunk.data,
              }),
            )
          }

          if (i % 5 === 0) {
            await new Promise((resolve) => setTimeout(resolve, 5))
          }
        }
        sender.send(
          JSON.stringify({
            type: 'audio-transfer-complete',
          }),
        )
      }

      sendMissingSlowly()
    } else if (data.type === 'audio-action') {
      this.audioState.isPlaying = data.action === 'play'
      if (data.time !== undefined) {
        this.audioState.currentTime = data.time
      }
      this.audioState.lastUpdateTime = Date.now()
      this.room.broadcast(message, [sender.id])
    } else if (data.type === 'audio-seek') {
      this.audioState.currentTime = data.time
      this.audioState.lastUpdateTime = Date.now()
      this.room.broadcast(message, [sender.id])
    } else if (data.type === 'audio-clear') {
      this.audioState = {
        name: null,
        totalChunks: 0,
        chunks: [],
        isPlaying: false,
        currentTime: 0,
        lastUpdateTime: 0,
      }
      this.room.broadcast(message, [sender.id])
    } else if (data.type === 'audio-request-sync') {
      let currentSyncTime = this.audioState.currentTime
      if (this.audioState.isPlaying) {
        currentSyncTime += (Date.now() - this.audioState.lastUpdateTime) / 1000
      }
      sender.send(
        JSON.stringify({
          type: 'audio-action',
          action: this.audioState.isPlaying ? 'play' : 'pause',
          time: currentSyncTime,
        }),
      )
    }
  }
}
