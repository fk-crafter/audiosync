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

  const copyInviteLink = () => {
    navigator.clipboard.writeText(window.location.href)
    alert('Lien copié !')
  }

  if (!username) {
    return <UsernameModal onJoin={setUsername} />
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 flex items-center justify-between rounded-xl bg-white p-4 shadow-sm ring-1 ring-zinc-200">
          <div>
            <h1 className="text-xl font-bold text-zinc-900">Room: {roomId}</h1>
            <p className="text-sm text-zinc-500">
              Connecté en tant que {username}
            </p>
          </div>
          <button
            onClick={copyInviteLink}
            className="cursor-pointer rounded-md bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-200"
          >
            Copier le lien d'invitation
          </button>
        </header>

        <div className="grid gap-8 md:grid-cols-2">
          <AudioPlayer roomId={roomId} />
          <Chat username={username} roomId={roomId} />
        </div>
      </div>
    </div>
  )
}
