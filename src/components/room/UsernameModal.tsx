import { useState, useEffect } from 'react'

export function UsernameModal({
  initialName,
  onJoin,
}: {
  initialName?: string
  onJoin: (name: string) => void
}) {
  const [name, setName] = useState(initialName || '')

  useEffect(() => {
    if (!initialName) {
      const savedName = localStorage.getItem('audiosync_username')
      if (savedName) {
        onJoin(savedName)
      }
    }
  }, [initialName, onJoin])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/75 px-4 backdrop-blur-md">
      <div className="relative w-full max-w-sm rounded-3xl border border-stone-700 bg-stone-800 p-7 shadow-2xl md:p-8">
        <h2 className="relative mb-2 text-2xl font-semibold tracking-tight text-stone-100">
          {initialName ? 'Changer de pseudo' : 'Qui êtes-vous ?'}
        </h2>
        <p className="relative mb-6 text-sm text-stone-300">
          Entrez un pseudonyme pour rejoindre le salon et synchroniser votre musique.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const clean = name.trim()
            if (clean) {
              localStorage.setItem('audiosync_username', clean)
              onJoin(clean)
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
            maxLength={25}
            autoFocus
          />
          <button
            type="submit"
            className="w-full cursor-pointer rounded-2xl bg-stone-200 px-5 py-3 font-semibold text-stone-900 shadow-md transition-all hover:bg-stone-100 active:scale-[0.98]"
          >
            Continuer
          </button>
        </form>
      </div>
    </div>
  )
}
