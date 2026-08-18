import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  const navigate = useNavigate()
  const [inputValue, setInputValue] = useState('')

  const handleJoin = () => {
    const roomId =
      inputValue.trim() || Math.random().toString(36).substring(2, 9)
    navigate({
      to: '/room/$roomId',
      params: { roomId },
    })
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <img
          src="/logo.png"
          alt="AudioSync"
          className="mx-auto mb-8 h-20 w-20 rounded-[1.25rem] object-cover shadow-sm ring-1 ring-zinc-200"
        />
        <h1 className="mb-3 text-4xl font-semibold tracking-tight text-zinc-900">
          Écoutez ensemble.
        </h1>
        <p className="mb-8 text-zinc-500">
          Créez un salon, partagez le lien, et synchronisez vos audios
          instantanément avec vos proches.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleJoin()
          }}
          className="flex flex-col gap-3"
        >
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Nom du salon (optionnel)"
            className="w-full rounded-2xl border border-zinc-200 bg-white px-6 py-4 text-center text-lg text-zinc-900 outline-none transition-all placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100"
          />
          <button
            type="submit"
            className="w-full rounded-2xl bg-zinc-900 px-6 py-4 text-lg font-medium text-white transition-all hover:bg-zinc-800 active:scale-[0.98]"
          >
            {inputValue.trim() ? 'Rejoindre le salon' : 'Créer un salon rapide'}
          </button>
        </form>
      </div>
    </div>
  )
}
