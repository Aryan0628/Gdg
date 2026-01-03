import { useState } from "react";
import axios from "axios";
import { Button } from "../../../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../ui/card";
import { Textarea } from "../../../ui/textarea";
import { Input } from "../../../ui/input";
import { useAuth0 } from "@auth0/auth0-react";

export default function ReportComplaintModal({
  open,
  onClose,
  chatId,
  donationId,
  againstUserId,
  role,
}) {
  const { getAccessTokenSilently } = useAuth0();

  const [donorName, setDonorName] = useState("");
  const [receiverName, setReceiverName] = useState("");
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const submitComplaint = async () => {
    if (!reason) {
      alert("Please select a reason");
      return;
    }

    try {
      setLoading(true);
      const token = await getAccessTokenSilently();

      await axios.post(
        "/api/complaints",
        {
          chatId,
          donationId,
          againstUserId,
          role,
          donorName,
          receiverName,
          reason,
          description,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      alert("Complaint submitted successfully");
      setDonorName("");
      setReceiverName("");
      setReason("");
      setDescription("");
      onClose();
    } catch (err) {
      alert(
        err.response?.data?.message ||
        "Failed to submit complaint"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-[420px]">
        <CardHeader>
          <CardTitle>Report Interaction</CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">
          <Input
            placeholder="Donor name"
            value={donorName}
            onChange={(e) => setDonorName(e.target.value)}
          />

          <Input
            placeholder="Receiver name"
            value={receiverName}
            onChange={(e) => setReceiverName(e.target.value)}
          />

          <select
            className="w-full border rounded p-2"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          >
            <option value="">Select reason</option>
            <option value="harassment">Harassment</option>
            <option value="spam">Spam</option>
            <option value="fraud">Fraud</option>
            <option value="misbehavior">Misbehavior</option>
            <option value="other">Other</option>
          </select>

          <Textarea
            placeholder="Describe the issue"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={submitComplaint} disabled={loading}>
              Submit
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
