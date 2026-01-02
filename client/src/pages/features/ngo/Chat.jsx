import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ref, push, onValue } from "firebase/database";
import { db } from "../../../firebase/firebase";
import { Button } from "../../../ui/button";
import { Input } from "../../../ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../../../ui/card";
import axios from "axios";
import { useAuth0 } from "@auth0/auth0-react";

export default function Chat() {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const { user, getAccessTokenSilently } = useAuth0();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");

  const currentUserId = user?.sub;

  useEffect(() => {
    if (!chatId || !user) return;

    const verify = async () => {
      try {
        const token = await getAccessTokenSilently();
        await axios.get(`/api/chats/${chatId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        navigate("/ngo");
      }
    };
    verify();
  }, [chatId, user]);

  useEffect(() => {
    if (!chatId) return;

    const messagesRef = ref(db, `ngo/chats/${chatId}/messages`);

    onValue(messagesRef, snapshot => {
      const data = snapshot.val();
      if (!data) return setMessages([]);

      const list = Object.entries(data).map(([id, msg]) => ({
        id,
        ...msg,
      }));
      list.sort((a, b) => a.createdAt - b.createdAt);
      setMessages(list);
    });
  }, [chatId]);

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
          {messages.map(m => (
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
            onChange={e => setText(e.target.value)}
            placeholder="Type a message"
          />
          <Button onClick={sendMessage}>Send</Button>
        </div>
      </CardContent>
    </Card>
  );
}
