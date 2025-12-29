import { useState, useRef, useEffect } from "react"
import { Button } from "../../../ui/button"
import { Input } from "../../../ui/input"
 // If you don't have this, use a simple div with overflow-y-auto
import { Send, X, MapPin } from "lucide-react" // Assuming you have shadcn Avatar, else use img



export default function ChatSidePanel({ 
  messages = [], 
  currentUser, 
  onSendMessage, 
  onClose,
  routeId 
}) {
  const [newMessage, setNewMessage] = useState("")
  const messagesEndRef = useRef(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSend = (e) => {
    e.preventDefault()
    if (!newMessage.trim()) return
    
    onSendMessage(newMessage)
    setNewMessage("")
  }

  const formatTime = (timestamp) => {
    if (!timestamp) return ""
    // Handle Firebase serverTimestamp (which comes back as milliseconds)
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  return (
    <div className="flex flex-col h-full bg-zinc-900 border-r border-zinc-800 w-full">
      {/* HEADER */}
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50 backdrop-blur">
        <div>
          <h2 className="text-white font-semibold flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            Live Commute
          </h2>
          <p className="text-xs text-zinc-400">Route ID: #{routeId?.slice(-4) || "..."}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="text-zinc-400 hover:text-white">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* MESSAGES AREA */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-zinc-500 mt-10 text-sm">
            <p>👋 Start the conversation!</p>
            <p className="text-xs mt-1">Share updates about your safety status.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.userId === currentUser.sub
            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isMe ? "flex-row-reverse" : "flex-row"}`}
              >
                {/* PROFILE PICTURE */}
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 rounded-full overflow-hidden border border-zinc-700">
                     {/* Using the specific profileurl field as requested */}
                    <img 
                      src={isMe ? (currentUser.profileurl || currentUser.picture) : "https://github.com/shadcn.png"} 
                      alt="User" 
                      className="h-full w-full object-cover"
                    />
                  </div>
                </div>

                {/* MESSAGE BUBBLE */}
                <div className={`flex flex-col max-w-[75%] ${isMe ? "items-end" : "items-start"}`}>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-xs font-medium text-zinc-300">
                      {isMe ? "You" : msg.userName}
                    </span>
                    <span className="text-[10px] text-zinc-500">
                      {formatTime(msg.timestamp)}
                    </span>
                  </div>
                  <div
                    className={`rounded-2xl px-4 py-2 text-sm ${
                      isMe
                        ? "bg-blue-600 text-white rounded-tr-sm"
                        : "bg-zinc-800 text-zinc-100 rounded-tl-sm border border-zinc-700"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* INPUT AREA */}
      <div className="p-4 border-t border-zinc-800 bg-zinc-900">
        <form onSubmit={handleSend} className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="bg-zinc-950 border-zinc-800 text-white focus-visible:ring-blue-600"
          />
          <Button 
            type="submit" 
            size="icon" 
            className="bg-blue-600 hover:bg-blue-500 text-white shrink-0"
            disabled={!newMessage.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  )
}