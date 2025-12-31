import { useState, useEffect, useRef } from "react"
import { Send, AlertOctagon, ShieldAlert, Users } from "lucide-react"
import { Button } from "../../../ui/button" // Keeping this for the normal Send button
import { Input } from "../../../ui/input"
import { ScrollArea } from "../../../ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "../../../ui/avatar"

export default function ChatSidePanel({ 
  messages, 
  currentUser, 
  onSendMessage, 
  onClose, 
  routeId, 
  onThrottle,
  isSosDisabled, 
  finalScore,
  otherUsers,
  sosTriggerCount 
}) {
  const [newMessage, setNewMessage] = useState("")
  const scrollRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages])

  const handleSend = () => {
    if (!newMessage.trim()) return
    onSendMessage(newMessage)
    setNewMessage("")
  }

  // --- 1. THEME LOGIC ---
  const getPanelTheme = () => {
    if (finalScore === null) return "border-zinc-800 bg-zinc-900";
    const s = Number(finalScore);

    // Red Theme if Critical
    if (isSosDisabled || sosTriggerCount > 0 || s < 4) {
      return "border-red-600 shadow-[inset_0_0_30px_rgba(220,38,38,0.15)] bg-zinc-950";
    }
    // Amber Theme if Warning
    if (s < 7) {
      return "border-amber-500 shadow-[inset_0_0_30px_rgba(245,158,11,0.1)] bg-zinc-950";
    }
    // Green/Default Theme
    return "border-emerald-500/30 bg-zinc-950";
  }

  // --- 2. WATERMARK LOGIC ---
  const getWatermark = () => {
    if (sosTriggerCount > 0 || isSosDisabled) {
      return {
        text: "ROUTE ON HIGH ALERT\nAUTHORITIES INFORMED",
        color: "text-red-600/20",
        icon: <AlertOctagon className="w-24 h-24 text-red-600/20 mb-4 animate-pulse" />
      };
    }
    if (finalScore !== null && Number(finalScore) < 4) {
      return {
        text: "CRITICAL DANGER DETECTED\nSTAY ALERT",
        color: "text-red-600/20",
        icon: <ShieldAlert className="w-24 h-24 text-red-600/20 mb-4 animate-pulse" />
      };
    }
    if (finalScore !== null && Number(finalScore) < 7) {
      return {
        text: "ROUTE UNDER SURVEILLANCE\nPRESS THROTTLE IF THREATENED",
        color: "text-amber-500/10",
        icon: <ShieldAlert className="w-24 h-24 text-amber-500/10 mb-4" />
      };
    }
    return null;
  }

  const themeClasses = getPanelTheme();
  const watermark = getWatermark();
  const activeCount = otherUsers ? otherUsers.length : 0;

  return (
    <div className={`flex flex-col h-full border-r transition-all duration-500 relative overflow-hidden ${themeClasses}`}>
      
      {/* BACKGROUND WATERMARK */}
      {watermark && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-0 select-none p-6 text-center">
          {watermark.icon}
          <h2 className={`text-2xl font-black uppercase tracking-widest leading-relaxed ${watermark.color}`}>
            {watermark.text}
          </h2>
        </div>
      )}

      {/* --- HEADER --- */}
      <div className="p-4 border-b border-zinc-800 bg-zinc-900/90 backdrop-blur-md z-20 shrink-0 flex items-center justify-between shadow-sm">
        <div>
          <h2 className="font-bold text-white tracking-tight text-sm uppercase">Live Route Chat</h2>
          <div className="flex items-center gap-2 mt-1 bg-zinc-900/50 w-fit px-2 py-0.5 rounded border border-zinc-800">
             <div className="relative flex h-2 w-2">
               <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
               <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
             </div>
             <span className="text-[10px] font-medium text-zinc-400 flex items-center gap-1">
               {activeCount} Active
             </span>
          </div>
        </div>

        {/* --- GLOWING SOS BUTTON (FIXED: Using raw HTML button to avoid style conflicts) --- */}
        <button
          onClick={onThrottle}
          disabled={isSosDisabled}
          className={`h-9 px-6 rounded-md font-black tracking-widest text-sm transition-all duration-300 border ${
            isSosDisabled 
              ? "bg-zinc-800 text-red-900 border-red-900/30 cursor-not-allowed shadow-none" 
              : "bg-red-600 text-white border-transparent shadow-[0_0_20px_rgba(220,38,38,0.8)] hover:bg-red-500 hover:shadow-[0_0_35px_rgba(220,38,38,1)] active:scale-95"
          }`}
        >
          {isSosDisabled ? "SENT" : "SOS"}
        </button>

      </div>

      {/* MESSAGES AREA */}
      <ScrollArea className="flex-1 p-4 z-10">
        <div className="space-y-4">
          {messages.map((msg) => {
            const isMe = msg.userId === currentUser.sub
            return (
              <div key={msg.id} className={`flex gap-3 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                <Avatar className="h-8 w-8 border border-zinc-700/50 shadow-sm">
                  <AvatarImage src={msg.userImage} />
                  <AvatarFallback className="bg-zinc-800 text-[10px] text-zinc-400 font-bold">
                    {msg.userName?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className={`flex flex-col max-w-[80%] ${isMe ? "items-end" : "items-start"}`}>
                  <span className="text-[10px] text-zinc-500 mb-1 px-1">{msg.userName}</span>
                  <div className={`rounded-2xl px-4 py-2 text-sm shadow-md backdrop-blur-sm ${
                    isMe 
                    ? "bg-blue-600 text-white rounded-tr-none" 
                    : "bg-zinc-800/80 text-zinc-200 rounded-tl-none border border-zinc-700/50"
                  }`}>
                    {msg.text}
                  </div>
                  <span className="text-[10px] text-zinc-600 mt-1 px-1">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            )
          })}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* FOOTER (INPUT ONLY) */}
      <div className="p-3 bg-zinc-900/90 border-t border-zinc-800 z-20 shrink-0">
        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="bg-zinc-950/50 border-zinc-800 text-white focus-visible:ring-blue-600/50 h-10 shadow-inner"
          />
          {/* Keeping standard Button here is fine as blue is desired for send */}
          <Button type="submit" className="h-10 w-10 bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-900/20 shrink-0 p-0 flex items-center justify-center">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  )
}