import { useEffect, useRef, useState, useCallback } from 'react'
import usePartySocket from 'partysocket/react'
import { createClient } from '@supabase/supabase-js'
import {
  Play,
  Pause,
  Upload,
  Trash2,
  Volume2,
  Volume1,
  VolumeX,
  RefreshCw,
  AlertCircle,
  Link as LinkIcon,
  Radio,
} from 'lucide-react'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

// Standard MIME type mapping for audio files
function getAudioMimeType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || ''
  switch (ext) {
    case 'mp3':
      return 'audio/mpeg'
    case 'wav':
      return 'audio/wav'
    case 'ogg':
      return 'audio/ogg'
    case 'm4a':
      return 'audio/mp4'
    case 'aac':
      return 'audio/aac'
    case 'flac':
      return 'audio/flac'
    case 'webm':
      return 'audio/webm'
    case 'opus':
      return 'audio/opus'
    default:
      return 'audio/mpeg'
  }
}

// Clean and safe file name generator
function sanitizeFileName(original: string): string {
  const ext = original.includes('.')
    ? original.split('.').pop()?.toLowerCase() || 'mp3'
    : 'mp3'
  const base = original.includes('.')
    ? original.substring(0, original.lastIndexOf('.'))
    : original
  const cleanBase = base
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .substring(0, 45)
  return `${Date.now()}-${cleanBase || 'audio'}.${ext}`
}

export function AudioPlayer({ roomId }: { roomId: string }) {
  const audioRef = useRef<HTMLAudioElement>(null)

  // Player state
  const [audioSrc, setAudioSrc] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  // Status and UX
  const [isUploading, setIsUploading] = useState(false)
  const [uploadingUser, setUploadingUser] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isAutoplayBlocked, setIsAutoplayBlocked] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isBuffering, setIsBuffering] = useState(false)

  // Volume
  const [volume, setVolume] = useState<number>(() => {
    const saved = localStorage.getItem('audiosync_volume')
    return saved !== null ? parseFloat(saved) : 1
  })
  const [isMuted, setIsMuted] = useState(false)
  const [prevVolume, setPrevVolume] = useState(1)

  // Direct URL modal/input
  const [showUrlInput, setShowUrlInput] = useState(false)
  const [urlInput, setUrlInput] = useState('')

  // Control refs
  const isDraggingRef = useRef(false)
  const dragTimeRef = useRef(0)
  const pendingSyncRef = useRef<{ time: number; play: boolean } | null>(null)

  const PARTY_HOST = import.meta.env.VITE_PARTYKIT_HOST || 'localhost:1999'
  const isProd = import.meta.env.PROD

  // Safe play helper handling autoplay restrictions
  const safePlay = useCallback(async (targetTime?: number) => {
    const el = audioRef.current
    if (!el || !el.src) return

    if (typeof targetTime === 'number' && !isNaN(targetTime)) {
      if (Math.abs(el.currentTime - targetTime) > 0.15) {
        el.currentTime = Math.max(0, targetTime)
      }
    }

    try {
      await el.play()
      setIsPlaying(true)
      setIsAutoplayBlocked(false)
    } catch (err: unknown) {
      console.warn('Autoplay restricted by browser:', err)
      if (
        err instanceof Error &&
        (err.name === 'NotAllowedError' ||
          err.message.includes('interact') ||
          err.message.includes('user'))
      ) {
        setIsAutoplayBlocked(true)
        setIsPlaying(true) // Room is playing, but audio element is waiting for user gesture
      }
    }
  }, [])

  // Socket communication
  const socket = usePartySocket({
    host: PARTY_HOST,
    room: roomId,
    protocol: isProd ? 'wss' : 'ws',
    onMessage(event) {
      try {
        const data = JSON.parse(event.data)

        if (data.type === 'audio-upload-start') {
          setFileName(data.name)
          setUploadingUser(data.user || null)
          setIsUploading(true)
          setErrorMessage(null)
        }

        if (data.type === 'audio-upload-cancel') {
          setIsUploading(false)
          setUploadingUser(null)
          if (data.error) {
            setErrorMessage(`Upload annulé: ${data.error}`)
            setTimeout(() => setErrorMessage(null), 5000)
          }
        }

        if (data.type === 'audio-loaded') {
          setAudioSrc(data.url)
          setFileName(data.name)
          setIsUploading(false)
          setUploadingUser(null)
          setErrorMessage(null)
          setIsAutoplayBlocked(false)

          if (audioRef.current) {
            audioRef.current.pause()
            audioRef.current.currentTime = 0
          }
          setCurrentTime(0)
          setDuration(data.duration || 0)
          setIsPlaying(false)
        }

        if (data.type === 'audio-state-sync') {
          if (!data.url) return

          setAudioSrc(data.url)
          setFileName(data.name)
          setIsUploading(false)
          setUploadingUser(null)
          if (data.duration) setDuration(data.duration)

          const latency = Math.max(0, (Date.now() - (data.serverTime || Date.now())) / 1000)
          const targetTime = data.isPlaying
            ? (data.currentTime || 0) + latency
            : data.currentTime || 0

          setCurrentTime(targetTime)

          // If audio element is already loaded, apply sync directly
          const el = audioRef.current
          if (el && el.readyState >= 1) {
            el.currentTime = targetTime
            if (data.isPlaying) {
              safePlay(targetTime)
            } else {
              el.pause()
              setIsPlaying(false)
            }
          } else {
            // Queue sync for when metadata loads
            pendingSyncRef.current = {
              time: targetTime,
              play: !!data.isPlaying,
            }
          }
        }

        if (data.type === 'audio-action') {
          const el = audioRef.current
          if (!el) return

          const latency = Math.max(0, (Date.now() - (data.serverTime || Date.now())) / 1000)
          const targetTime = (data.time || 0) + (data.action === 'play' ? latency : 0)

          if (data.action === 'play') {
            if (Math.abs(el.currentTime - targetTime) > 0.2) {
              el.currentTime = Math.max(0, targetTime)
              if (!isDraggingRef.current) setCurrentTime(targetTime)
            }
            safePlay(targetTime)
          } else if (data.action === 'pause') {
            el.pause()
            el.currentTime = Math.max(0, data.time || 0)
            if (!isDraggingRef.current) setCurrentTime(data.time || 0)
            setIsPlaying(false)
            setIsAutoplayBlocked(false)
          }
        }

        if (data.type === 'audio-seek') {
          const el = audioRef.current
          if (!el) return

          const newTime = data.time || 0
          el.currentTime = newTime
          if (!isDraggingRef.current) {
            setCurrentTime(newTime)
          }
        }

        if (data.type === 'audio-sync-pulse') {
          const el = audioRef.current
          if (!el || !isPlaying || isDraggingRef.current) return

          const latency = Math.max(0, (Date.now() - (data.serverTime || Date.now())) / 1000)
          const expectedTime = (data.currentTime || 0) + latency
          const drift = el.currentTime - expectedTime

          // Correct large drift with a direct seek
          if (Math.abs(drift) > 0.8) {
            el.currentTime = Math.max(0, expectedTime)
            setCurrentTime(expectedTime)
          }
          // Smooth micro-drift by adjusting playback rate slightly
          else if (Math.abs(drift) > 0.2) {
            el.playbackRate = drift < 0 ? 1.04 : 0.96
            setTimeout(() => {
              if (audioRef.current) audioRef.current.playbackRate = 1.0
            }, 1200)
          }
        }

        if (data.type === 'audio-ended') {
          const el = audioRef.current
          if (el) {
            el.pause()
            el.currentTime = 0
          }
          setIsPlaying(false)
          setCurrentTime(0)
          setIsAutoplayBlocked(false)
        }

        if (data.type === 'audio-clear') {
          const el = audioRef.current
          if (el) {
            el.pause()
            el.src = ''
          }
          setAudioSrc(null)
          setFileName(null)
          setIsPlaying(false)
          setCurrentTime(0)
          setDuration(0)
          setIsUploading(false)
          setUploadingUser(null)
          setIsAutoplayBlocked(false)
          setErrorMessage(null)
        }
      } catch (err) {
        console.error('Error processing socket message:', err)
      }
    },
  })

  // Volume synchronization with audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume
    }
    localStorage.setItem('audiosync_volume', volume.toString())
  }, [volume, isMuted])

  // Request audio state on connect
  useEffect(() => {
    const handleOpen = () => {
      socket.send(JSON.stringify({ type: 'request-audio-state' }))
    }
    if (socket.readyState === 1) {
      handleOpen()
    } else {
      socket.addEventListener('open', handleOpen)
      return () => socket.removeEventListener('open', handleOpen)
    }
  }, [socket])

  // Global unlock listener: any user interaction anywhere on the window unlocks blocked autoplay
  useEffect(() => {
    if (!isAutoplayBlocked) return

    const unlockOnGesture = () => {
      if (audioRef.current) {
        audioRef.current
          .play()
          .then(() => {
            setIsAutoplayBlocked(false)
            setIsPlaying(true)
          })
          .catch(() => {})
      }
    }

    window.addEventListener('pointerdown', unlockOnGesture, { once: true })
    window.addEventListener('keydown', unlockOnGesture, { once: true })

    return () => {
      window.removeEventListener('pointerdown', unlockOnGesture)
      window.removeEventListener('keydown', unlockOnGesture)
    }
  }, [isAutoplayBlocked])

  // User requests manual unlock
  const handleManualUnlock = async () => {
    setIsAutoplayBlocked(false)
    if (audioRef.current) {
      try {
        await audioRef.current.play()
        setIsPlaying(true)
      } catch (e) {
        console.warn('Manual play failed:', e)
      }
    }
  }

  // Force manual sync button
  const handleForceSync = () => {
    setIsSyncing(true)
    socket.send(JSON.stringify({ type: 'audio-request-sync' }))
    setTimeout(() => setIsSyncing(false), 800)
  }

  // File upload handler (Supabase cloud storage)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file size (Supabase Free tier limit: 50MB)
    const MAX_SIZE = 50 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      setErrorMessage(
        `Fichier trop volumineux (${(file.size / 1024 / 1024).toFixed(1)} Mo). La limite est de 50 Mo pour le partage en ligne. Compressez-le en MP3 (ex: via FreeConvert ou CloudConvert) pour l'importer.`,
      )
      e.target.value = ''
      return
    }

    setErrorMessage(null)
    setIsUploading(true)
    setFileName(file.name)

    // Notify room participants that an upload has begun
    socket.send(
      JSON.stringify({
        type: 'audio-upload-start',
        name: file.name,
      }),
    )

    try {
      const mimeType = file.type || getAudioMimeType(file.name)
      const uniqueName = sanitizeFileName(file.name)

      const { error: supabaseError } = await supabase.storage
        .from('audios')
        .upload(uniqueName, file, {
          contentType: mimeType,
          upsert: true,
        })

      if (supabaseError) {
        throw supabaseError
      }

      const { data: publicUrlData } = supabase.storage
        .from('audios')
        .getPublicUrl(uniqueName)

      const url = publicUrlData.publicUrl

      setAudioSrc(url)
      setIsUploading(false)

      socket.send(
        JSON.stringify({
          type: 'audio-loaded',
          name: file.name,
          url: url,
        }),
      )
    } catch (error: unknown) {
      console.error('Erreur upload audio Supabase:', error)
      const msg =
        error instanceof Error ? error.message : "Échec de l'envoi vers Supabase"
      setErrorMessage(`Erreur d'upload : ${msg}`)
      setIsUploading(false)
      setFileName(null)

      // Inform room participants that upload failed so they don't remain stuck
      socket.send(
        JSON.stringify({
          type: 'audio-upload-cancel',
          name: file.name,
          error: msg,
        }),
      )
    } finally {
      e.target.value = ''
    }
  }

  // Direct URL loader
  const handleLoadUrl = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = urlInput.trim()
    if (!trimmed) return

    const parsedName = trimmed.split('/').pop()?.split('?')[0] || 'audio_en_ligne.mp3'

    setAudioSrc(trimmed)
    setFileName(parsedName)
    setShowUrlInput(false)
    setUrlInput('')
    setErrorMessage(null)

    socket.send(
      JSON.stringify({
        type: 'audio-loaded',
        name: parsedName,
        url: trimmed,
      }),
    )
  }

  // Play / Pause toggle
  const handlePlayPause = async (shouldPlay: boolean) => {
    const el = audioRef.current
    if (!el || !audioSrc || isUploading) return

    if (shouldPlay) {
      await safePlay(el.currentTime)
      socket.send(
        JSON.stringify({
          type: 'audio-action',
          action: 'play',
          time: el.currentTime,
          duration: el.duration || duration || 0,
        }),
      )
    } else {
      el.pause()
      setIsPlaying(false)
      socket.send(
        JSON.stringify({
          type: 'audio-action',
          action: 'pause',
          time: el.currentTime,
        }),
      )
    }
  }

  // Clear loaded audio
  const handleClearAudio = () => {
    const el = audioRef.current
    if (el) {
      el.pause()
      el.src = ''
    }
    setAudioSrc(null)
    setFileName(null)
    setIsPlaying(false)
    setCurrentTime(0)
    setDuration(0)
    setErrorMessage(null)
    setIsAutoplayBlocked(false)
    socket.send(JSON.stringify({ type: 'audio-clear' }))
  }

  // Timeline events
  const handleTimeUpdate = () => {
    if (audioRef.current && !isDraggingRef.current) {
      setCurrentTime(audioRef.current.currentTime)
    }
  }

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration || 0)
    }
  }

  const handleCanPlay = () => {
    setIsBuffering(false)
    if (pendingSyncRef.current) {
      const { time, play } = pendingSyncRef.current
      pendingSyncRef.current = null
      if (audioRef.current) {
        audioRef.current.currentTime = time
        setCurrentTime(time)
        if (play) {
          safePlay(time)
        }
      }
    }
  }

  const handleEnded = () => {
    setIsPlaying(false)
    setCurrentTime(0)
    socket.send(JSON.stringify({ type: 'audio-ended' }))
  }

  // Seeking handlers with window release listeners to prevent slider freezes
  const handleSeekStart = () => {
    isDraggingRef.current = true
    window.addEventListener('pointerup', handleSeekEndGlobal)
    window.addEventListener('touchend', handleSeekEndGlobal)
  }

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value)
    dragTimeRef.current = newTime
    setCurrentTime(newTime)
  }

  const handleSeekEndGlobal = () => {
    window.removeEventListener('pointerup', handleSeekEndGlobal)
    window.removeEventListener('touchend', handleSeekEndGlobal)

    if (!isDraggingRef.current) return
    isDraggingRef.current = false

    const newTime = dragTimeRef.current
    if (audioRef.current && audioSrc) {
      audioRef.current.currentTime = newTime
      socket.send(
        JSON.stringify({
          type: 'audio-seek',
          time: newTime,
        }),
      )
    }
  }

  // Volume toggle
  const toggleMute = () => {
    if (isMuted) {
      setIsMuted(false)
      setVolume(prevVolume || 1)
    } else {
      setPrevVolume(volume)
      setIsMuted(true)
    }
  }

  const formatTime = (time: number) => {
    if (isNaN(time) || !isFinite(time)) return '0:00'
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`
  }

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="relative flex flex-col gap-3 rounded-2xl border border-stone-700 bg-stone-800 p-3 shadow-lg md:gap-4 md:rounded-3xl md:p-6">
      {/* Autoplay blocked banner */}
      {isAutoplayBlocked && (
        <button
          type="button"
          onClick={handleManualUnlock}
          className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-amber-500/40 bg-amber-500/20 p-2.5 text-amber-200 transition-all hover:bg-amber-500/30 md:p-3"
        >
          <div className="flex items-center gap-2 text-xs md:text-sm font-medium">
            <Volume2 className="h-4 w-4 shrink-0 animate-bounce text-amber-400 md:h-5 md:w-5" />
            <span className="text-left">
              Lecture synchronisée en cours ! Cliquez ici pour activer le son.
            </span>
          </div>
          <span className="shrink-0 rounded-lg bg-amber-500 px-3 py-1 text-xs font-bold text-stone-900 shadow">
            Écouter
          </span>
        </button>
      )}

      {/* Error alert banner */}
      {errorMessage && (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs text-rose-300 md:text-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-stone-400 hover:text-stone-200"
          >
            ✕
          </button>
        </div>
      )}

      {/* Direct URL input popover */}
      {showUrlInput && (
        <form
          onSubmit={handleLoadUrl}
          className="flex items-center gap-2 rounded-xl border border-stone-600 bg-stone-900 p-2"
        >
          <LinkIcon className="ml-1 h-4 w-4 text-stone-400" />
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="Collez une URL audio (mp3, wav, etc.)..."
            className="flex-1 bg-transparent text-xs text-stone-100 outline-none placeholder:text-stone-500 md:text-sm"
            autoFocus
            required
          />
          <button
            type="submit"
            className="rounded-lg bg-stone-200 px-3 py-1 text-xs font-medium text-stone-900 hover:bg-stone-100"
          >
            Charger
          </button>
          <button
            type="button"
            onClick={() => setShowUrlInput(false)}
            className="px-1 text-xs text-stone-400 hover:text-stone-200"
          >
            Annuler
          </button>
        </form>
      )}

      {/* Main player controls row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <button
            type="button"
            onClick={() => handlePlayPause(!isPlaying)}
            disabled={!audioSrc || isUploading}
            aria-label={isPlaying ? 'Mettre en pause' : 'Lancer la lecture'}
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-all md:h-14 md:w-14 ${
              audioSrc && !isUploading
                ? 'cursor-pointer bg-stone-100 text-stone-900 shadow-md hover:bg-white active:scale-95'
                : 'bg-stone-700 text-stone-500 cursor-not-allowed'
            }`}
          >
            {isPlaying ? (
              <Pause className="h-5 w-5 fill-current md:h-6 md:w-6" />
            ) : (
              <Play className="ml-0.5 h-5 w-5 fill-current md:h-6 md:w-6" />
            )}
          </button>

          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-sm font-semibold text-stone-100 md:text-base">
                {fileName || 'Aucun audio sélectionné'}
              </h3>
              {audioSrc && !isUploading && (
                <button
                  type="button"
                  onClick={handleClearAudio}
                  title="Retirer cet audio pour tout le monde"
                  className="shrink-0 rounded-full p-1 text-stone-400 transition-colors hover:bg-stone-700 hover:text-rose-400"
                >
                  <Trash2 className="h-3.5 w-3.5 md:h-4 md:w-4" />
                </button>
              )}
            </div>

            <div className="mt-0.5 flex items-center gap-2 text-xs text-stone-400">
              {isUploading ? (
                <span className="flex items-center gap-1.5 text-amber-300">
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  {uploadingUser
                    ? `${uploadingUser} importe un audio...`
                    : "Envoi de l'audio vers le Cloud en cours..."}
                </span>
              ) : isBuffering ? (
                <span className="flex items-center gap-1 text-stone-300">
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  Chargement du flux...
                </span>
              ) : audioSrc ? (
                <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                  <Radio className="h-3 w-3 animate-pulse" />
                  Synchronisé en direct
                </span>
              ) : (
                <span>Sélectionnez ou collez un fichier audio pour commencer</span>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons (Upload, URL, Resync) */}
        <div className="flex shrink-0 items-center gap-1.5 md:gap-2">
          {audioSrc && !isUploading && (
            <button
              type="button"
              onClick={handleForceSync}
              title="Forcer la resynchronisation avec le salon"
              className={`rounded-full p-2 text-stone-400 transition-all hover:bg-stone-700 hover:text-stone-200 md:p-2.5 ${
                isSyncing ? 'text-emerald-400' : ''
              }`}
            >
              <RefreshCw
                className={`h-4 w-4 md:h-4.5 md:w-4.5 ${isSyncing ? 'animate-spin text-emerald-400' : ''}`}
              />
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowUrlInput(!showUrlInput)}
            title="Charger via lien direct (URL)"
            disabled={isUploading}
            className="flex items-center gap-1.5 rounded-full border border-stone-700 bg-stone-800/80 px-2.5 py-2 text-xs font-medium text-stone-300 transition-colors hover:bg-stone-700 hover:text-stone-100 md:px-3 md:py-2.5 md:text-sm"
          >
            <LinkIcon className="h-3.5 w-3.5 md:h-4 md:w-4" />
            <span className="hidden sm:inline">Lien</span>
          </button>

          <label
            className={`flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium transition-colors md:px-4 md:py-2.5 md:text-sm ${
              isUploading
                ? 'cursor-not-allowed bg-stone-700 text-stone-500'
                : 'bg-stone-100 text-stone-900 shadow hover:bg-white active:scale-95'
            }`}
          >
            <Upload className="h-3.5 w-3.5 md:h-4 md:w-4" />
            <span className="hidden sm:inline">Importer un fichier</span>
            <span className="sm:hidden">Importer</span>
            <input
              type="file"
              accept="audio/*,.mp3,.wav,.m4a,.aac,.flac,.ogg,.opus,.webm"
              className="hidden"
              onChange={handleFileUpload}
              disabled={isUploading}
            />
          </label>
        </div>
      </div>

      {/* Timeline slider and times */}
      {audioSrc && !isUploading && (
        <div className="flex w-full flex-col gap-1.5 md:gap-2">
          <div className="relative flex w-full items-center">
            <input
              type="range"
              min="0"
              max={duration || 0}
              step="0.01"
              value={currentTime}
              onPointerDown={handleSeekStart}
              onChange={handleSeekChange}
              onPointerUp={handleSeekEndGlobal}
              aria-label="Position de lecture"
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-stone-700 accent-stone-200 transition-all focus:outline-none"
              style={{
                background: `linear-gradient(to right, #f5f5f4 0%, #f5f5f4 ${progressPercent}%, #44403c ${progressPercent}%, #44403c 100%)`,
              }}
            />
          </div>
          <div className="flex items-center justify-between px-1 text-[11px] font-medium text-stone-400 md:text-xs">
            <span>{formatTime(currentTime)}</span>

            {/* Local volume control */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleMute}
                className="text-stone-400 transition-colors hover:text-stone-200"
                title={isMuted ? 'Activer le son' : 'Couper le son'}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="h-3.5 w-3.5 md:h-4 md:w-4" />
                ) : volume < 0.5 ? (
                  <Volume1 className="h-3.5 w-3.5 md:h-4 md:w-4" />
                ) : (
                  <Volume2 className="h-3.5 w-3.5 md:h-4 md:w-4" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  const val = parseFloat(e.target.value)
                  setVolume(val)
                  if (isMuted && val > 0) setIsMuted(false)
                }}
                className="h-1.5 w-16 cursor-pointer appearance-none rounded-full bg-stone-700 accent-stone-300 md:w-20"
                style={{
                  background: `linear-gradient(to right, #d6d3d1 0%, #d6d3d1 ${
                    (isMuted ? 0 : volume) * 100
                  }%, #57534e ${(isMuted ? 0 : volume) * 100}%, #57534e 100%)`,
                }}
              />
            </div>

            <span>{formatTime(duration)}</span>
          </div>
        </div>
      )}

      {/* Permanent, resilient HTML5 audio element */}
      <audio
        ref={audioRef}
        src={audioSrc || undefined}
        preload="auto"
        playsInline
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onCanPlay={handleCanPlay}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => {
          setIsBuffering(false)
          setIsPlaying(true)
          setIsAutoplayBlocked(false)
        }}
        onPause={() => {
          if (!isBuffering) setIsPlaying(false)
        }}
        onEnded={handleEnded}
        onError={(e) => {
          console.warn('Audio element error:', e)
          setIsBuffering(false)
        }}
      />
    </div>
  )
}
