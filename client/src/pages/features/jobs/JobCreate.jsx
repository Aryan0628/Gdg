import { useState } from "react";
import axios from "axios";
import { useAuth0 } from "@auth0/auth0-react";

export default function JobCreate({ onCreated, location }) {
  const { getAccessTokenSilently } = useAuth0();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [time, setTime] = useState("");

  const submit = async () => {
    const token = await getAccessTokenSilently({
      audience: import.meta.env.VITE_AUTH0_AUDIENCE,
    });
    console.log("Location", location);

    await axios.post(
      "/api/jobs",
      {
        title,
        description,
        amount,
        time,
        location: {
          lat: Number(location.lat),
          lng: Number(location.lng),
        },
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    setTitle("");
    setDescription("");
    setAmount("");
    setTime("");
    onCreated();
  };

  return (
    <div className="space-y-3">
      <input
        className="input"
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <textarea
        className="input"
        placeholder="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <input
        className="input"
        placeholder="Amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <input
        className="input"
        placeholder="Time"
        value={time}
        onChange={(e) => setTime(e.target.value)}
      />

      <button onClick={submit} className="bg-green-600 w-full py-2 rounded">
        Post Job
      </button>
    </div>
  );
}
