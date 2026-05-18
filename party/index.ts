import type * as Party from 'partykit/server'

interface AudioState {
  name: string | null
  totalChunks: number
  chunks: { index: number; data: string }[]
  isPlaying: boolean
  currentTime: number
}

export default class AudioSyncServer implements Party.Server {
  audioState: AudioState = {
    name: null,
    totalChunks: 0,
    chunks: [],
    isPlaying: false,
    currentTime: 0,
  }

  constructor(readonly room: Party.Room) {}

  onConnect(connection: Party.Connection) {
    if (this.audioState.name) {
      connection.send(
        JSON.stringify({
          type: 'audio-chunk-start',
          name: this.audioState.name,
          totalChunks: this.audioState.totalChunks,
        }),
      )

      for (const chunk of this.audioState.chunks) {
        connection.send(
          JSON.stringify({
            type: 'audio-chunk',
            index: chunk.index,
            data: chunk.data,
          }),
        )
      }

      connection.send(
        JSON.stringify({
          type: 'audio-action',
          action: this.audioState.isPlaying ? 'play' : 'pause',
          time: this.audioState.currentTime,
        }),
      )
    }
  }

  onMessage(message: string, sender: Party.Connection) {
    const data = JSON.parse(message)

    if (data.type === 'audio-chunk-start') {
      this.audioState.name = data.name
      this.audioState.totalChunks = data.totalChunks
      this.audioState.chunks = []
      this.audioState.isPlaying = false
      this.audioState.currentTime = 0
    } else if (data.type === 'audio-chunk') {
      this.audioState.chunks.push({ index: data.index, data: data.data })
    } else if (data.type === 'audio-action') {
      this.audioState.isPlaying = data.action === 'play'
      if (data.time !== undefined) {
        this.audioState.currentTime = data.time
      }
    } else if (data.type === 'audio-seek') {
      this.audioState.currentTime = data.time
    } else if (data.type === 'audio-clear') {
      this.audioState = {
        name: null,
        totalChunks: 0,
        chunks: [],
        isPlaying: false,
        currentTime: 0,
      }
    }

    this.room.broadcast(message, [sender.id])
  }
}
