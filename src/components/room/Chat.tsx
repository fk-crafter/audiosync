import { useState, useEffect, useRef } from 'react'
import usePartySocket from 'partysocket/react'

interface ChatMessage {
  id: string
  user: string
  text: string
  timestamp: number
}

export function Chat({
  username,
  roomId,
}: {
  username: string
  roomId: string
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [users, setUsers] = useState<string[]>([])
  const [input, setInput] = useState('')
  const listEndRef = useRef<HTMLDivElement>(null)

  const PARTY_HOST = import.meta.env.VITE_PARTYKIT_HOST || 'localhost:1999'
  const isProd = import.meta.env.PROD

  const socket = usePartySocket({
    host: PARTY_HOST,
    room: roomId,
    protocol: isProd ? 'wss' : 'ws',
    onMessage(event) {
      const data = JSON.parse(event.data)

      if (data.type === 'users-update') {
        setUsers(data.users)
      } else if (data.type === 'chat-history') {
        setMessages(data.messages)
      } else if (data.type === 'chat') {
        setMessages((prev) => [...prev, data.message])
      }
    },
  })

  useEffect(() => {
    const handleOpen = () => {
      socket.send(JSON.stringify({ type: 'user-join', username }))
    }
    if (socket.readyState === 1) {
      handleOpen()
    } else {
      socket.addEventListener('open', handleOpen)
      return () => socket.removeEventListener('open', handleOpen)
    }
  }, [socket, username])

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    socket.send(JSON.stringify({ type: 'chat', user: username, text: input }))
    setInput('')
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm md:rounded-3xl">
      <div className="flex shrink-0 items-center gap-2 border-b border-zinc-100 px-4 py-3">
        <div className="flex h-2 w-2 shrink-0 rounded-full bg-green-500"></div>
        <span className="shrink-0 text-xs font-medium text-zinc-900 md:text-sm">
          {users.length} en ligne
        </span>
        <span className="ml-auto truncate text-[11px] text-zinc-400 md:text-xs">
          {users.join(', ')}
        </span>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-3 md:p-4">
        {messages.map((msg) => {
          const isMe = msg.user === username
          return (
            <div
              key={msg.id}
              className={`flex w-full flex-col ${isMe ? 'items-end' : 'items-start'}`}
            >
              {!isMe && (
                <span className="mb-0.5 ml-1 text-[11px] font-medium text-zinc-500">
                  {msg.user}
                </span>
              )}
              <div
                className={`relative max-w-[85%] wrap-break-words px-3.5 py-2 text-[14px] md:text-[15px] ${
                  isMe
                    ? 'rounded-2xl rounded-tr-sm bg-zinc-900 text-white'
                    : 'rounded-2xl rounded-tl-sm bg-zinc-100 text-zinc-900'
                }`}
              >
                {msg.text}
              </div>
            </div>
          )
        })}
        <div ref={listEndRef} />
      </div>

      <form
        onSubmit={sendMessage}
        className="shrink-0 border-t border-zinc-100 p-2 md:p-3"
      >
        <div className="flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 p-1 pl-3 transition-all focus-within:border-zinc-400 focus-within:ring-4 focus-within:ring-zinc-100 md:p-1.5 md:pl-4">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Message..."
            className="flex-1 bg-transparent text-[16px] text-zinc-900 outline-none placeholder:text-zinc-400"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-white transition-all hover:bg-zinc-800 disabled:opacity-0 active:scale-95 md:h-9 md:w-9"
          >
            <svg
              className="mr-0.5 mt-0.5 h-3.5 w-3.5 rotate-45 md:h-4 md:w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
              />
            </svg>
          </button>
        </div>
      </form>
    </div>
  )
}
