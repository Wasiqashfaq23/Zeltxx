import { useState, useEffect, useRef } from 'react'
import { Send, MessageSquare } from 'lucide-react'
import { getChatMessages, sendChatMessage } from '../../api/chat'
import { useSocket } from '../../context/SocketContext'
import { useAuth } from '../../context/AuthContext'
import UserAvatar from '../ui/UserAvatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const LiveChat = ({ projectId }) => {
  const { user } = useAuth()
  const socket = useSocket()
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [typingUsers, setTypingUsers] = useState([])
  const scrollRef = useRef(null)
  const typingTimeoutRef = useRef(null)

  useEffect(() => {
    getChatMessages(projectId)
      .then((res) => setMessages(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false))
  }, [projectId])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  useEffect(() => {
    if (!socket || !projectId) return

    const handleNewMessage = (msg) => {
      setMessages((prev) => {
        if (prev.some((m) => m._id === msg._id)) return prev
        return [...prev, msg]
      })
    }

    const handleTypingStart = (typingUser) => {
      if (typingUser && typingUser._id !== user?._id) {
        setTypingUsers((prev) => {
          if (prev.some((u) => u._id === typingUser._id)) return prev
          return [...prev, typingUser]
        })
      }
    }

    const handleTypingStop = (typingUser) => {
      if (typingUser) {
        setTypingUsers((prev) => prev.filter((u) => u._id !== typingUser._id))
      }
    }

    socket.on('new_chat_message', handleNewMessage)
    socket.on('user_typing_start', handleTypingStart)
    socket.on('user_typing_stop', handleTypingStop)

    return () => {
      socket.off('new_chat_message', handleNewMessage)
      socket.off('user_typing_start', handleTypingStart)
      socket.off('user_typing_stop', handleTypingStop)
    }
  }, [socket, projectId, user])

  const handleInputChange = (e) => {
    setText(e.target.value)

    if (socket && projectId && user) {
      socket.emit('typing_start', { projectId, user })
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing_stop', { projectId, user })
      }, 2000)
    }
  }

  const handleSend = (e) => {
    e.preventDefault()
    if (!text.trim()) return

    if (socket && projectId && user) {
      socket.emit('typing_stop', { projectId, user })
    }

    sendChatMessage(projectId, { message: text })
      .then((res) => {
        setMessages((prev) => {
          if (prev.some((m) => m._id === res.data._id)) return prev
          return [...prev, res.data]
        })
        setText('')
      })
      .catch((err) => console.error(err))
  }

  return (
    <Card className="flex flex-col border-[#e8e8ef] bg-white shadow-sm h-[550px]">
      <CardHeader className="flex flex-row items-center justify-between border-b border-[#e8e8ef] px-5 py-3 shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-[#4f46e5]" />
          <CardTitle className="text-base font-semibold text-[#1a1a2e]">
            Project Live Chat
          </CardTitle>
        </div>
        {typingUsers.length > 0 && (
          <span className="text-xs text-[#4f46e5] animate-pulse">
            {typingUsers.map((u) => u.name).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
          </span>
        )}
      </CardHeader>

      <CardContent className="flex flex-1 flex-col p-0 overflow-hidden">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#fafafa]">
          {loading ? (
            <div className="py-12 text-center text-sm text-[#9ca3af]">Loading discussion...</div>
          ) : messages.length === 0 ? (
            <div className="py-12 text-center text-sm text-[#9ca3af]">
              No messages yet. Start the conversation with your team!
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = (msg.user?._id || msg.user) === user?._id
              return (
                <div
                  key={msg._id}
                  className={`flex items-start gap-2.5 ${isMe ? 'flex-row-reverse' : ''}`}
                >
                  <UserAvatar user={msg.user} size="xs" />
                  <div
                    className={`max-w-[75%] rounded-xl px-3.5 py-2.5 text-xs shadow-2xs ${
                      isMe
                        ? 'bg-[#4f46e5] text-white rounded-tr-none'
                        : 'bg-white text-[#1a1a2e] border border-[#e8e8ef] rounded-tl-none'
                    }`}
                  >
                    {!isMe && (
                      <p className="font-semibold mb-0.5 text-[11px] text-[#4f46e5]">
                        {msg.user?.name}
                      </p>
                    )}
                    <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                    <span
                      className={`block mt-1 text-[10px] text-right ${
                        isMe ? 'text-indigo-200' : 'text-[#9ca3af]'
                      }`}
                    >
                      {new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </div>

        <form onSubmit={handleSend} className="flex items-center gap-2 p-3 border-t border-[#e8e8ef] bg-white">
          <Input
            value={text}
            onChange={handleInputChange}
            placeholder="Type a message..."
            className="flex-1 text-xs border-[#e8e8ef]"
          />
          <Button type="submit" size="sm" className="bg-[#4f46e5] hover:bg-[#4338ca]">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

export default LiveChat
