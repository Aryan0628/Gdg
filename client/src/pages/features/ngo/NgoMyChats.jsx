import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../../../ui/card";
import { Button } from "../../../ui/button";
import { useAuth0 } from "@auth0/auth0-react";
import ReportComplaintModal from "./ReportComplaintModal";

export default function NgoMyChats() {
  const { getAccessTokenSilently } = useAuth0();
  const [chats, setChats] = useState([]);
  const [reportOpen, setReportOpen] = useState(false);
  const [selectedChat, setSelectedChat] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();

  const selectedCategory = location.state?.category;
  const viewHistory = async (userId) => {
  try {
    const token = await getAccessTokenSilently();

    const res = await axios.get(
      `/api/complaint-stats/${userId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    alert(
      `Total complaints: ${res.data.total}\n` 
    );
  } catch (err) {
    alert(
      err.response?.data?.message ||
      "Failed to load complaint history"
    );
  }
};


  useEffect(() => {
    const fetchChats = async () => {
      try {
        const token = await getAccessTokenSilently();

        const res = await axios.get("/api/chats/recipient", {
          headers: { Authorization: `Bearer ${token}` },
        });

        let allChats = res.data.data || [];

        if (selectedCategory) {
          allChats = allChats.filter(
            (chat) => chat.donationCategory === selectedCategory
          );
        }

        setChats(allChats);
      } catch (err) {
        console.error(err.response?.data || err);
      }
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

              <div className="flex gap-2">
                <Button
                  onClick={() => navigate(`/ngo/chat/${chat.id}`)}
                >
                  Open Chat
                </Button>

                <Button
                  variant="destructive"
                  onClick={() => {
                    setSelectedChat(chat);
                    setReportOpen(true);
                  }}
                >
                  Report
                </Button>
                <Button
  variant="outline"
  onClick={() => viewHistory(chat.donorId)}
>
  View Donor History
</Button>

              </div>
            </CardContent>
          </Card>
        ))}
      </CardContent>

      {/* ✅ MODAL MUST BE INSIDE RETURN */}
      {selectedChat && (
        <ReportComplaintModal
          open={reportOpen}
          onClose={() => setReportOpen(false)}
          chatId={selectedChat.id}
          donationId={selectedChat.donationId}
          againstUserId={selectedChat.donorId}
          role="recipient"
        />
      )}
    </Card>
  );
}

