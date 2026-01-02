import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../../../ui/card";
import { Button } from "../../../ui/button";
import { useAuth0 } from "@auth0/auth0-react";

export default function DonorInbox() {
  const { user, getAccessTokenSilently } = useAuth0();
  const [interests, setInterests] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetch = async () => {
      const token = await getAccessTokenSilently();
      const res = await axios.get(
        `/api/interests/donor`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setInterests(res.data.data || []);
    };
    fetch();
  }, []);

  const acceptInterest = async (id) => {
    const token = await getAccessTokenSilently();
    const res = await axios.post(
      `/api/interests/${id}/accept`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    navigate(`/ngo/chat/${res.data.chatId}`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Interest Requests</CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        {interests.map(i => (
          <Card key={i.id}>
            <CardContent className="flex justify-between items-center">
              <div>
                <p className="font-semibold">{i.donationTitle}</p>
                <p className="text-sm text-gray-500">
                  Category: {i.donationCategory}
                </p>
              </div>

              {i.status === "pending" ? (
                <Button onClick={() => acceptInterest(i.id)}>Accept</Button>
              ) : (
                <Button onClick={() => navigate(`/ngo/chat/${i.chatId}`)}>
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

