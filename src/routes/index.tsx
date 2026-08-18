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
    <div className="flex min-h-screen flex-col items-center justify-center bg-stone-900 px-4">
      <div className="w-full max-w-md text-center">
        <div className="relative mx-auto mb-8 h-20 w-20">
          <div className="absolute inset-0 rounded-[1.25rem] bg-stone-700 blur-md opacity-40"></div>
          <img
            src="/logo.png"
            alt="AudioSync"
            className="relative h-full w-full rounded-[1.25rem] object-cover shadow-xl ring-1 ring-stone-700"
          />
        </div>
        <h1 className="mb-3 text-4xl font-semibold tracking-tight text-stone-100">
          Écoutez ensemble.
        </h1>
        <p className="mb-8 text-stone-300">
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
            className="w-full rounded-2xl border border-stone-700 bg-stone-800 px-6 py-4 text-center text-lg text-stone-100 outline-none transition-all placeholder:text-stone-400 focus:border-stone-500 focus:ring-4 focus:ring-stone-700/50"
          />
          <button
            type="submit"
            className="w-full rounded-2xl bg-stone-200 px-6 py-4 text-lg font-semibold text-stone-900 shadow-md transition-all hover:bg-stone-100 active:scale-[0.98]"
          >
            {inputValue.trim() ? 'Rejoindre le salon' : 'Créer un salon rapide'}
          </button>
        </form>
      </div>
    </div>
  )
}
