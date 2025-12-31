import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";

import { Card, CardContent, CardHeader, CardTitle } from "../../../ui/card";
import { Button } from "../../../ui/button";

export default function DonorInbox() {
  const [interests, setInterests] = useState([]);
  const navigate = useNavigate();
  const { getAccessTokenSilently } = useAuth0();

  /* ================= FETCH DONOR INTERESTS ================= */
  useEffect(() => {
    const fetchInterests = async () => {
      try {
        const token = await getAccessTokenSilently();

        const res = await axios.get("/api/interests/donor", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        setInterests(res.data.data || []);
      } catch (err) {
        console.error(err.response?.data || err);
      }
    };

    fetchInterests();
  }, []);

  /* ================= ACCEPT INTEREST ================= */
  const acceptInterest = async (interestId) => {
    try {
      const token = await getAccessTokenSilently();

      const res = await axios.post(
        `/api/interests/${interestId}/accept`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      navigate(`/ngo/chat/${res.data.chatId}`);
    } catch (err) {
      console.error(err.response?.data || err);
      alert("Failed to accept interest");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Interest Requests</CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        {interests.map((i) => (
          <Card key={i.id}>
            <CardContent className="flex justify-between items-center">
              <div>
                <p>Donation: {i.donationId}</p>
                <p>Status: {i.status}</p>
              </div>

              {i.status === "pending" ? (
                <Button onClick={() => acceptInterest(i.id)}>
                  Accept
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() =>
                   navigate(`/ngo/chat/${i.chatId}`, {
  state: { role: "donor" },
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
