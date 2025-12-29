import { useEffect, useState, useRef } from "react";
import { ref, onValue, off, push, set, serverTimestamp } from "firebase/database";
import { db } from "../../../firebase/firebase.js";
import { useAuthStore } from "../../store/useAuthStore";

export default function JobChat({ job }) {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!job?.id) return;

    const messagesRef = ref(db, `jobs/rooms/${job.id}/messages`);

    const unsubscribe = onValue(messagesRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const loaded = Object.entries(data).map(([id, val]) => ({
          id,
          ...val,
        }));
        loaded.sort((a, b) => a.timestamp - b.timestamp);
        setMessages(loaded);
      } else {
        setMessages([]);
      }
    });

    return () => off(messagesRef);
  }, [job?.id]);

  
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  
  const sendMessage = async () => {
    if (!text.trim() || !job?.id || !user) return;

    const messagesRef = ref(db, `jobs/rooms/${job.id}/messages`);
    const newMessageRef = push(messagesRef);

    await set(newMessageRef, {
      userId: user.sub,
      userName: user.name || "Anonymous",
      userImage: user.picture || "",
      text,
      timestamp: serverTimestamp(),
    });

    setText("");
  };

  return (
    <div className="h-full flex flex-col bg-zinc-900 rounded">
      {/* HEADER */}
      <div className="p-3 border-b border-zinc-800">
        <h3 className="font-semibold">{job.title}</h3>
        <p className="text-xs text-zinc-400">Job Room</p>
      </div>

      {/* MESSAGES */}
      <div className="flex-1 p-4 space-y-2 overflow-y-auto">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`max-w-[70%] p-2 rounded ${
              m.userId === user.sub
                ? "ml-auto bg-blue-600 text-white"
                : "bg-zinc-700 text-white"
            }`}
          >
            <p className="text-xs opacity-70">{m.userName}</p>
            {m.text}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* INPUT */}
      <div className="p-3 border-t border-zinc-800 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="flex-1 p-2 bg-zinc-800 rounded"
          placeholder="Type message..."
        />
        <button
          onClick={sendMessage}
          className="bg-blue-600 px-4 rounded"
        >
          Send
        </button>
      </div>
    </div>
  );
}
