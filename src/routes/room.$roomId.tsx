import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { UsernameModal } from '../components/room/UsernameModal'
import { AudioPlayer } from '../components/room/AudioPlayer'
import { Chat } from '../components/room/Chat'
import { Check, Copy, User, ArrowLeft } from 'lucide-react'

export const Route = createFileRoute('/room/$roomId')({
  component: RoomComponent,
})

function RoomComponent() {
  const { roomId } = Route.useParams()
  const [username, setUsername] = useState<string | null>(null)
  const [isEditingUsername, setIsEditingUsername] = useState(false)
  const [isCopied, setIsCopied] = useState(false)

  const copyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy invite link:', err)
    }
  }

  if (!username) {
    return <UsernameModal onJoin={setUsername} />
  }

  return (
    <div className="mx-auto flex h-dvh max-w-6xl flex-col bg-stone-900 p-2 md:p-6 lg:p-8">
      {isEditingUsername && (
        <UsernameModal
          initialName={username}
          onJoin={(newName) => {
            setUsername(newName)
            setIsEditingUsername(false)
          }}
        />
      )}

      <header className="mb-2 flex shrink-0 items-center justify-between gap-2 rounded-2xl border border-stone-700 bg-stone-800 p-3 shadow-lg md:mb-5 md:rounded-3xl md:p-5">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            to="/"
            title="Retour à l'accueil"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-stone-700/60 text-stone-300 transition-colors hover:bg-stone-700 hover:text-stone-100"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex min-w-0 flex-col">
            <h1 className="truncate text-sm font-semibold tracking-tight text-stone-100 md:text-lg">
              Salon : <span className="text-stone-300">{roomId}</span>
            </h1>
            <div className="flex items-center gap-1.5 text-xs text-stone-400">
              <User className="h-3 w-3" />
              <span>Connecté :</span>
              <button
                type="button"
                onClick={() => setIsEditingUsername(true)}
                title="Cliquez pour changer de pseudonyme"
                className="truncate font-medium text-stone-200 underline decoration-stone-500 underline-offset-2 transition-colors hover:text-stone-100 hover:decoration-stone-300"
              >
                {username}
              </button>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={copyInviteLink}
          className={`flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full px-3 py-2 text-xs font-medium transition-all md:px-5 md:py-2.5 md:text-sm ${
            isCopied
              ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40'
              : 'bg-stone-700 text-stone-200 hover:bg-stone-600'
          }`}
        >
          {isCopied ? (
            <Check className="h-4 w-4" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">
            {isCopied ? 'Lien copié !' : 'Inviter un ami'}
          </span>
          <span className="sm:hidden">{isCopied ? 'Copié' : 'Inviter'}</span>
        </button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-2 md:gap-4 lg:flex-row lg:gap-6">
        <div className="flex shrink-0 flex-col lg:flex-1">
          <AudioPlayer roomId={roomId} />
        </div>
        <div className="flex min-h-0 flex-1 flex-col lg:w-96 lg:shrink-0">
          <Chat username={username} roomId={roomId} />
        </div>
      </div>
    </div>
  )
}
