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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0e1621]/80 backdrop-blur-md">
      <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-[#243143]/50 bg-[#17212b] p-6 shadow-2xl shadow-purple-950/20">
        <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-purple-600/10 blur-3xl"></div>

        <div className="relative">
          <h2 className="mb-2 text-xl font-bold tracking-tight text-white">
            Choisissez un pseudonyme
          </h2>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (name.trim()) {
                localStorage.setItem('audiosync_username', name.trim())
                onJoin(name.trim())
              }
            }}
            className="flex flex-col gap-4"
          >
            <input
              type="text"
              placeholder="Votre pseudonyme..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-[#243143] bg-[#202b36] p-3 text-[16px] font-medium text-white placeholder-zinc-500 transition-all outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10"
              required
              maxLength={20}
            />

            <button
              type="submit"
              className="cursor-pointer flex w-full items-center justify-center rounded-xl bg-linear-to-r from-purple-600 to-indigo-500 py-3 px-4 text-sm font-semibold text-white shadow-lg shadow-indigo-600/10 transition-all hover:brightness-110 active:scale-[0.99]"
            >
              Rejoindre le salon
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
