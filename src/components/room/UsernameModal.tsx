import { useState, useEffect } from 'react'

export function UsernameModal({ onJoin }: { onJoin: (name: string) => void }) {
  const [name, setName] = useState('')

  useEffect(() => {
    const savedName = localStorage.getItem('audiosync_username')
    if (savedName) {
      onJoin(savedName)
    }
  }, [onJoin])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/70 px-4 backdrop-blur-md">
      <div className="relative w-full max-w-sm rounded-3xl border border-stone-700 bg-stone-800 p-8 shadow-2xl">
        <h2 className="relative mb-2 text-2xl font-semibold tracking-tight text-stone-100">
          Qui êtes-vous ?
        </h2>
        <p className="relative mb-6 text-sm text-stone-300">
          Entrez un pseudonyme pour rejoindre le salon et participer au chat.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (name.trim()) {
              localStorage.setItem('audiosync_username', name.trim())
              onJoin(name.trim())
            }
          }}
          className="relative flex flex-col gap-4"
        >
          <input
            type="text"
            placeholder="Votre pseudo"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-2xl border border-stone-700 bg-stone-900 px-5 py-3 text-stone-100 outline-none transition-all placeholder:text-stone-500 focus:border-stone-500 focus:ring-4 focus:ring-stone-700/50"
            required
            maxLength={20}
          />
          <button
            type="submit"
            className="w-full rounded-2xl bg-stone-200 px-5 py-3 font-semibold text-stone-900 shadow-md transition-all hover:bg-stone-100 active:scale-[0.98]"
          >
            Continuer
          </button>
        </form>
      </div>
    </div>
  )
}
