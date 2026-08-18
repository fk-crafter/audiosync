import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { UsernameModal } from '../components/room/UsernameModal'
import { AudioPlayer } from '../components/room/AudioPlayer'
import { Chat } from '../components/room/Chat'

export const Route = createFileRoute('/room/$roomId')({
  component: RoomComponent,
})

function RoomComponent() {
  const { roomId } = Route.useParams()
  const [username, setUsername] = useState<string | null>(null)
  const [isCopied, setIsCopied] = useState(false)

  const copyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    } catch (err) {
      console.error(err)
    }
  }

  if (!username) {
    return <UsernameModal onJoin={setUsername} />
  }

  return (
    <div className="mx-auto flex h-dvh max-w-6xl flex-col bg-zinc-50 p-2 md:p-6 lg:p-8">
      <header className="mb-2 flex shrink-0 items-center justify-between gap-2 rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm md:mb-6 md:rounded-3xl md:p-5">
        <div className="flex min-w-0 flex-col">
          <h1 className="truncate text-base font-semibold tracking-tight text-zinc-900 md:text-xl">
            Salon : {roomId}
          </h1>
          <p className="truncate text-xs text-zinc-500 md:text-sm">
            Connecté :{' '}
            <span className="font-medium text-zinc-900">{username}</span>
          </p>
        </div>
        <button
          onClick={copyInviteLink}
          className={`flex shrink-0 items-center justify-center gap-2 rounded-full p-2.5 text-sm font-medium transition-colors md:px-5 ${
            isCopied
              ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
              : 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200'
          }`}
        >
          {isCopied ? (
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          ) : (
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
              />
            </svg>
          )}
          <span className="hidden sm:inline">
            {isCopied ? 'Copié !' : 'Inviter'}
          </span>
        </button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-2 md:gap-4 lg:flex-row lg:gap-6">
        <div className="flex shrink-0 flex-col lg:flex-1">
          <AudioPlayer roomId={roomId} />
        </div>
        <div className="flex min-h-0 flex-1 flex-col lg:w-95 lg:shrink-0">
          <Chat username={username} roomId={roomId} />
        </div>
      </div>
    </div>
  )
}
