import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ref, push, onValue } from "firebase/database";
import { db } from "../../../firebase/firebase";
import { Button } from "../../../ui/button";
import { Input } from "../../../ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../../../ui/card";
import { useAuth0 } from "@auth0/auth0-react";

export default function Chat() {
  const { chatId } = useParams();
  const { user, isLoading, isAuthenticated } = useAuth0();

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");

  // 🔐 WAIT FOR AUTH
  if (isLoading) return <p>Loading chat...</p>;
  if (!isAuthenticated || !user || !chatId)
    return <p>Invalid chat access</p>;

  // ✅ PRODUCTION USER ID
  const currentUserId = user.sub;

 // 🔁 REALTIME LISTENER (CORRECT)
useEffect(() => {
  if (!chatId) return;

  const messagesRef = ref(db, `ngo/chats/${chatId}/messages`);

  onValue(messagesRef, (snapshot) => {
    const data = snapshot.val();

    if (!data) {
      setMessages([]);
      return;
    }

    const list = Object.entries(data).map(([id, msg]) => ({
      id,
      ...msg,
    }));

    list.sort((a, b) => a.createdAt - b.createdAt);
    setMessages(list);
  });
}, [chatId]);

// ✉ SEND MESSAGE (CORRECT)
const sendMessage = async () => {
  if (!text.trim() || !currentUserId) return;

  await push(ref(db, `ngo/chats/${chatId}/messages`), {
    text,
    senderId: currentUserId,
    createdAt: Date.now(),
  });

  setText("");
};


  return (
    <Card>
      <CardHeader>
        <CardTitle>Chat</CardTitle>
      </CardHeader>

      <CardContent>
        <div className="h-64 overflow-y-auto mb-3 space-y-2">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`p-2 rounded max-w-[70%] ${
                m.senderId === currentUserId
                  ? "ml-auto bg-blue-500 text-white"
                  : "mr-auto bg-gray-200"
              }`}
            >
              {m.text}
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message"
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          />
          <Button onClick={sendMessage}>Send</Button>
        </div>
      </CardContent>
    </Card>
  );
}
