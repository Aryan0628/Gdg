import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../../../ui/card";
import { Button } from "../../../ui/button";
import { useAuth0 } from "@auth0/auth0-react";
import ReportComplaintModal from "./ReportComplaintModal";

export default function DonorInbox() {
  const { getAccessTokenSilently } = useAuth0();
  const [interests, setInterests] = useState([]);
  const [reportOpen, setReportOpen] = useState(false);
  const [selectedInterest, setSelectedInterest] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    const fetch = async () => {
      const token = await getAccessTokenSilently();
      const res = await axios.get("/api/interests/donor", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setInterests(res.data.data || []);
    };
    fetch();
  }, []);
const viewHistory = async (userId) => {
  const token = await getAccessTokenSilently();

  const res = await axios.get(
    `/api/complaint-stats/${userId}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  alert(`Total complaints: ${res.data.total}`);
};


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
        {interests.map((i) => (
          <Card key={i.id}>
            <CardContent className="flex justify-between items-center">
              <div>
                <p className="font-semibold">{i.donationTitle}</p>
                <p className="text-sm text-gray-500">
                  Category: {i.donationCategory}
                </p>
              </div>

              {i.status === "pending" ? (
                <Button onClick={() => acceptInterest(i.id)}>
                  Accept
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    onClick={() => navigate(`/ngo/chat/${i.chatId}`)}
                  >
                    Open Chat
                  </Button>

                  <Button
                    variant="destructive"
                    onClick={() => {
                      setSelectedInterest(i);
                      setReportOpen(true);
                    }}
                  >
                    Report
                  </Button>
                  <Button
  variant="outline"
  onClick={() => viewHistory(i.recipientId)}
>
  View Receiver History
</Button>

                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </CardContent>

      {/* ✅ MODAL MUST BE INSIDE RETURN */}
      {selectedInterest && (
        <ReportComplaintModal
          open={reportOpen}
          onClose={() => setReportOpen(false)}
          chatId={selectedInterest.chatId}
          donationId={selectedInterest.donationId}
          againstUserId={selectedInterest.recipientId}
          role="donor"
        />
      )}
    </Card>
  );
}
