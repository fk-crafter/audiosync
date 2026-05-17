import { useEffect, useRef, useState } from 'react'
import usePartySocket from 'partysocket/react'

export function AudioPlayer({ roomId }: { roomId: string }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [audioSrc, setAudioSrc] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null)

  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  const receivedChunksRef = useRef<{ index: number; data: string }[]>([])
  const totalChunksRef = useRef<number>(0)
  const receivingFileNameRef = useRef<string>('')

  const socket = usePartySocket({
    host: 'localhost:1999',
    room: roomId,
    onMessage(event) {
      const message = JSON.parse(event.data)

      if (message.type === 'chat') return

      if (message.type === 'audio-chunk-start') {
        receivedChunksRef.current = []
        totalChunksRef.current = message.totalChunks
        receivingFileNameRef.current = message.name
        setAudioSrc(null)
        setDownloadProgress(0)
        setCurrentTime(0)
        setDuration(0)
      }

      if (message.type === 'audio-chunk') {
        receivedChunksRef.current.push({
          index: message.index,
          data: message.data,
        })

        const currentProgress = Math.round(
          (receivedChunksRef.current.length / totalChunksRef.current) * 100,
        )
        setDownloadProgress(currentProgress)

        if (receivedChunksRef.current.length === totalChunksRef.current) {
          const sortedChunks = receivedChunksRef.current.sort(
            (a, b) => a.index - b.index,
          )
          const fullBase64 = sortedChunks.map((chunk) => chunk.data).join('')

          setAudioSrc(fullBase64)
          setFileName(receivingFileNameRef.current)
          setIsPlaying(false)
          setDownloadProgress(null)
        }
      }

      if (message.type === 'audio-action' && audioRef.current) {
        if (message.action === 'play') {
          audioRef.current.play().catch(() => {})
          setIsPlaying(true)
        } else if (message.action === 'pause') {
          audioRef.current.pause()
          setIsPlaying(false)
        }
      }

      if (message.type === 'audio-seek' && audioRef.current) {
        audioRef.current.currentTime = message.time
        setCurrentTime(message.time)
      }
    },
  })

  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: fileName || "Session d'écoute partagée",
        artist: 'En direct',
      })

      navigator.mediaSession.setActionHandler('play', () =>
        handlePlayPause(true),
      )
      navigator.mediaSession.setActionHandler('pause', () =>
        handlePlayPause(false),
      )
    }
  }, [fileName])

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const base64Src = event.target?.result as string

        setAudioSrc(base64Src)
        setFileName(file.name)
        setIsPlaying(false)
        setCurrentTime(0)
        setDuration(0)

        const chunkSize = 32 * 1024
        const totalChunks = Math.ceil(base64Src.length / chunkSize)

        socket.send(
          JSON.stringify({
            type: 'audio-chunk-start',
            name: file.name,
            totalChunks,
          }),
        )

        for (let i = 0; i < totalChunks; i++) {
          const start = i * chunkSize
          const end = start + chunkSize
          const chunkData = base64Src.substring(start, end)

          socket.send(
            JSON.stringify({
              type: 'audio-chunk',
              index: i,
              data: chunkData,
            }),
          )
        }
      }
      reader.readAsDataURL(file)
    }
  }

  const handlePlayPause = (shouldPlay: boolean) => {
    if (audioRef.current && audioSrc) {
      if (shouldPlay) {
        audioRef.current.play().catch(() => {})
      } else {
        audioRef.current.pause()
      }
      setIsPlaying(shouldPlay)

      socket.send(
        JSON.stringify({
          type: 'audio-action',
          action: shouldPlay ? 'play' : 'pause',
        }),
      )
    }
  }

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
    }
  }

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration)
    }
  }

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value)
    if (audioRef.current && audioSrc) {
      audioRef.current.currentTime = newTime
      setCurrentTime(newTime)

      socket.send(
        JSON.stringify({
          type: 'audio-seek',
          time: newTime,
        }),
      )
    }
  }

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00'
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#243143]/50 bg-[#17212b] p-5 shadow-xl flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-1 items-center gap-4 min-w-0">
          <button
            onClick={() => handlePlayPause(!isPlaying)}
            disabled={!audioSrc}
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white transition-all shadow-md ${
              audioSrc
                ? 'cursor-pointer bg-linear-to-tr from-purple-600 to-indigo-500 hover:brightness-110 active:scale-95'
                : 'bg-[#202b36] text-zinc-600'
            }`}
          >
            {isPlaying ? (
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path
                  fillRule="evenodd"
                  d="M6.75 5.25a.75.75 0 0 1 .75-.75H9a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H7.5a.75.75 0 0 1-.75-.75V5.25zm7.5 0A.75.75 0 0 1 15 4.5h1.5a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H15a.75.75 0 0 1-.75-.75V5.25z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg
                className="h-5 w-5 ml-0.5"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  fillRule="evenodd"
                  d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </button>

          <div className="flex flex-col min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-white truncate">
              {fileName || 'Aucun morceau chargé'}
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              {downloadProgress !== null
                ? `Synchronisation en cours...`
                : audioSrc
                  ? "Prêt pour l'écoute globale"
                  : "En attente d'un fichier audio"}
            </p>
          </div>
        </div>

        <label className="cursor-pointer shrink-0 rounded-xl bg-[#202b36] border border-[#243143] py-2.5 px-4 text-xs font-semibold text-purple-400 transition-all hover:bg-[#243143] hover:text-purple-300">
          Uploader
          <input
            type="file"
            accept="audio/mp3,audio/*"
            className="hidden"
            onChange={handleFileUpload}
          />
        </label>
      </div>

      {audioSrc && (
        <div className="flex flex-col gap-1 w-full mt-1">
          <div className="relative w-full flex items-center">
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={handleSeekChange}
              className="w-full h-1 bg-[#202b36] rounded-lg appearance-none cursor-pointer accent-purple-500 focus:outline-none"
              style={{
                background: `linear-gradient(to right, #a855f7 0%, #6366f1 ${
                  duration ? (currentTime / duration) * 100 : 0
                }%, #202b36 ${
                  duration ? (currentTime / duration) * 100 : 0
                }%, #202b36 100%)`,
              }}
            />
          </div>
          <div className="flex justify-between items-center text-[11px] font-medium text-zinc-400 px-0.5 mt-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      )}

      {downloadProgress !== null && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#202b36]">
          <div
            className="h-full bg-linear-to-r from-purple-500 to-indigo-500 transition-all duration-300"
            style={{ width: `${downloadProgress}%` }}
          ></div>
        </div>
      )}

      {audioSrc && (
        <audio
          ref={audioRef}
          src={audioSrc}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
        />
      )}
    </div>
  )
}
