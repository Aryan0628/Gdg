import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../../../ui/card";
import { Button } from "../../../ui/button";
import { useAuth0 } from "@auth0/auth0-react";

export default function NgoMyChats() {
  const { getAccessTokenSilently } = useAuth0();
  const [chats, setChats] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();

  // 👇 category passed while navigating
  const selectedCategory = location.state?.category;

  useEffect(() => {
    const fetchChats = async () => {
      const token = await getAccessTokenSilently();

      const res = await axios.get("/api/chats/recipient", {
        headers: { Authorization: `Bearer ${token}` },
      });

      let allChats = res.data.data || [];

      // ✅ FILTER BY CATEGORY
      if (selectedCategory) {
        allChats = allChats.filter(
          (chat) => chat.donationCategory === selectedCategory
        );
      }

      setChats(allChats);
    };

    fetchChats();
  }, [selectedCategory]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          My Chats {selectedCategory && `(${selectedCategory})`}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        {chats.length === 0 && (
          <p className="text-sm text-gray-500">No chats found</p>
        )}

        {chats.map((chat) => (
          <Card key={chat.id}>
            <CardContent className="flex justify-between items-center">
              <div>
                <p className="font-semibold">{chat.donationTitle}</p>
                <p className="text-sm text-gray-500">
                  Category: {chat.donationCategory}
                </p>
              </div>

              <Button
                onClick={() => navigate(`/ngo/chat/${chat.id}`)}
              >
                Open Chat
              </Button>
            </CardContent>
          </Card>
        ))}
      </CardContent>
    </Card>
  );
}
