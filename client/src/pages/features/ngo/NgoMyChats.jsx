import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";

import { Card, CardContent, CardHeader, CardTitle } from "../../../ui/card";
import { Button } from "../../../ui/button";

export default function NgoMyChats() {
  const [interests, setInterests] = useState([]);
  const navigate = useNavigate();
  const { getAccessTokenSilently } = useAuth0();

  useEffect(() => {
    const fetchChats = async () => {
      try {
        const token = await getAccessTokenSilently();

        const res = await axios.get("/api/interests/recipient", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        setInterests(res.data.data || []);
      } catch (err) {
        console.error("Failed to fetch chats", err);
      }
    };

    fetchChats();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Requests</CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        {interests.length === 0 && (
          <p className="text-sm text-gray-500">No requests yet</p>
        )}

        {interests.map((i) => (
          <Card key={i.id}>
            <CardContent className="flex justify-between items-center">
              <div>
                <p className="font-semibold">Donation: {i.donationId}</p>
                <p className="text-sm">Status: {i.status}</p>
              </div>

              {i.status === "accepted" && i.chatId && (
                <Button
                  onClick={() =>
                   navigate(`/ngo/chat/${i.chatId}`, {
  state: { role: "recipient" },
})

                  }
                >
                  Open Chat
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </CardContent>
    </Card>
  );
}
