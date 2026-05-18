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
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[#0e1621] p-6 antialiased selection:bg-purple-500/30">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-[#243143]/50 bg-[#17212b] p-8 shadow-2xl shadow-purple-950/10">
        <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-purple-600/10 blur-3xl"></div>
        <div className="absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-blue-600/10 blur-3xl"></div>

        <div className="relative flex flex-col items-center text-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-linear-to-tr from-purple-600 to-indigo-500 shadow-lg shadow-indigo-500/20 ring-1 ring-white/10">
            <svg
              className="h-8 w-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
              />
            </svg>
          </div>

          <h1 className="mb-2 text-3xl font-extrabold tracking-tight text-white">
            AudioSync
          </h1>

          <div className="w-full space-y-4">
            <div className="relative w-full">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Nom du salon"
                className="w-full rounded-xl border border-[#243143] bg-[#202b36] py-4 px-5 text-center text-[16px] font-medium text-white placeholder-zinc-500 transition-all outline-none focus:border-purple-500 focus:bg-[#202b36] focus:ring-4 focus:ring-purple-500/10"
              />
            </div>

            <button
              type="button"
              onClick={handleJoin}
              className="group relative flex w-full cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-xl bg-linear-to-r from-purple-600 to-indigo-500 py-4 px-6 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition-all hover:brightness-110 active:scale-[0.99]"
            >
              <span>
                {inputValue.trim()
                  ? 'Rejoindre le salon'
                  : 'Créer un salon rapide'}
              </span>
              <svg
                className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M14 5l7 7m0 0l-7 7m7-7H3"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
