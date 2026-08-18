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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/20 px-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-2xl">
        <h2 className="mb-2 text-2xl font-semibold tracking-tight text-zinc-900">
          Qui êtes-vous ?
        </h2>
        <p className="mb-6 text-sm text-zinc-500">
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
          className="flex flex-col gap-3"
        >
          <input
            type="text"
            placeholder="Votre pseudo"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-5 py-3 text-zinc-900 outline-none transition-all placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100"
            required
            maxLength={20}
          />
          <button
            type="submit"
            className="w-full rounded-2xl bg-zinc-900 px-5 py-3 font-medium text-white transition-all hover:bg-zinc-800 active:scale-[0.98]"
          >
            Continuer
          </button>
        </form>
      </div>
    </div>
  )
}
