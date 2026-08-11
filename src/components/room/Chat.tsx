import { useState, useEffect, useRef } from 'react'
import usePartySocket from 'partysocket/react'

export function Chat({
  username,
  roomId,
}: {
  username: string
  roomId: string
}) {
  const [messages, setMessages] = useState<{ user: string; text: string }[]>([])
  const [users, setUsers] = useState<string[]>([])
  const [input, setInput] = useState('')
  const listEndRef = useRef<HTMLDivElement>(null)

  const socket = usePartySocket({
    host: 'audio-sync-server.fk-crafter.partykit.dev',
    room: roomId,
    onMessage(event) {
      const message = JSON.parse(event.data)

      if (message.type === 'users-update') {
        setUsers(message.users)
      } else if (message.type === 'chat-history') {
        setMessages(message.messages)
      } else if (message.type === 'chat') {
        setMessages((prev) => [...prev, message])
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

    const newMessage = { type: 'chat', user: username, text: input }
    setMessages((prev) => [...prev, newMessage])
    socket.send(JSON.stringify(newMessage))
    setInput('')
  }

  return (
    <div className="flex h-125 flex-col rounded-2xl border border-[#243143]/50 bg-[#17212b] overflow-hidden shadow-xl">
      <div className="flex items-center gap-2 border-b border-[#243143]/50 bg-[#17212b] px-4 py-2.5 text-xs text-zinc-400">
        <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
        <span className="font-medium">{users.length} personne(s) en ligne</span>
        <span className="ml-auto text-zinc-500 truncate max-w-37.5">
          {users.join(', ')}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0e1621]/30">
        {messages.map((msg, i) => {
          const isMe = msg.user === username
          return (
            <div
              key={i}
              className={`flex w-full flex-col ${isMe ? 'items-end' : 'items-start'}`}
            >
              {!isMe && (
                <span className="text-[11px] font-semibold text-purple-400 mb-1 ml-2">
                  {msg.user}
                </span>
              )}
              <div
                className={`max-w-[75%] px-3.5 py-2 text-[16px] shadow-sm wrap-break-words relative ${
                  isMe
                    ? 'bg-linear-to-br from-purple-600 to-indigo-600 text-white rounded-2xl rounded-tr-sm'
                    : 'bg-[#202b36] border border-[#243143]/40 text-zinc-100 rounded-2xl rounded-tl-sm'
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
        className="flex items-center gap-2 border-t border-[#243143]/50 bg-[#17212b] p-3"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Écrire un message..."
          className="flex-1 rounded-xl border border-[#243143] bg-[#202b36] py-3 px-4 text-[16px] font-medium text-white placeholder-zinc-500 transition-all outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl bg-linear-to-r from-purple-600 to-indigo-500 text-white shadow-lg transition-all hover:brightness-110 active:scale-95 disabled:opacity-0 disabled:pointer-events-none"
        >
          <svg
            className="h-5 w-5 rotate-45 mr-0.5 mb-0.5"
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
      </form>
    </div>
  )
}
