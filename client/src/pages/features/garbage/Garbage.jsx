import { useEffect, useState } from "react";
import { Button } from "../../../ui/button";
import { MapPin, Loader2 } from "lucide-react";
import GarbageMap from "./GarbageMap";
import GarbageUpload from "./GarbageUpload";
import axios from "axios";
import MyComplaints from "./MyComplaints";

import { useAuth0 } from "@auth0/auth0-react";
import { useAuthStore } from "../../../store/useAuthStore";

export default function GarbageFeature() {
  const { getAccessTokenSilently } = useAuth0();
  const [userLocation, setUserLocation] = useState(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const user = useAuthStore((state) => state.user);

const myReports = reports.filter(
  (r) => r.userId === user?.sub
);
const handleDeleteReport = async (reportId) => {
  const token = await getAccessTokenSilently({
    audience: import.meta.env.VITE_AUTH0_AUDIENCE,
  });

  try {
    await axios.delete(`/api/garbage/${reportId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    // remove from state
    setReports((prev) =>
      prev.filter((r) => r.id !== reportId)
    );

    // close info window if needed
    setSelectedReport((prev) =>
      prev?.id === reportId ? null : prev
    );
  } catch (err) {
    console.error("Delete failed", err);
    alert("Failed to delete report");
  }
};


  const requestLocation = async () => {
    setIsLoadingLocation(true);
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });

      setUserLocation({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });
    } catch (err) {
      console.error("Location denied", err);
      alert("Location access is required to report garbage.");
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const addReport = (report) => {
    setReports((prev) => [...prev, report]);
  };
  const handleVote = async (reportId, type) => {
  const token = await getAccessTokenSilently({
    audience: import.meta.env.VITE_AUTH0_AUDIENCE,
  });

  try {
    const res = await axios.patch(
      "/api/garbage/vote",
      { reportId, type },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const { upvotes, downvotes, userVote } = res.data;

    // ✅ Update reports list
    setReports((prev) =>
      prev.map((r) =>
        r.id === reportId
          ? { ...r, upvotes, downvotes, userVote }
          : r
      )
    );

    // ✅ Update selected report
    setSelectedReport((prev) =>
      prev && prev.id === reportId
        ? { ...prev, upvotes, downvotes, userVote }
        : prev
    );
  } catch (err) {
    console.error("Vote failed", err);
    alert("Failed to register vote");
  }
  };
  const handleToggleType = async (reportId, newType) => {
  const token = await getAccessTokenSilently({
    audience: import.meta.env.VITE_AUTH0_AUDIENCE,
  });

  const res = await axios.patch(
    "/api/garbage/toggle-type",
    { reportId, type: newType },
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  const { type } = res.data;

  // update reports
  setReports((prev) =>
    prev.map((r) =>
      r.id === reportId ? { ...r, type } : r
    )
  );

  // update selected
  setSelectedReport((prev) =>
    prev && prev.id === reportId ? { ...prev, type } : prev
  );
  };
  const fetchReports = async () => {
    const token = await getAccessTokenSilently({
      audience: import.meta.env.VITE_AUTH0_AUDIENCE,
    });

    const res = await axios.get("/api/garbage/nearby", {
      params: {
        lat: userLocation.lat,
        lng: userLocation.lng,
      },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    console.log(res.data);
    setReports(res.data.reports);
  };
  useEffect(() => {
    if (!userLocation) return;
    fetchReports();
  }, [userLocation]);

  if (!userLocation) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-zinc-950">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 w-80 text-center space-y-4">
          <MapPin className="h-10 w-10 text-green-500 mx-auto" />
          <h3 className="text-white font-semibold text-lg">Enable Location</h3>
          <p className="text-sm text-zinc-400">
            We need your location to show nearby garbage reports.
          </p>

          <Button
            className="w-full"
            onClick={requestLocation}
            disabled={isLoadingLocation}
          >
            {isLoadingLocation ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Fetching location…
              </>
            ) : (
              "Enable Location"
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen bg-zinc-950">
      <div className="w-96 border-r border-zinc-800 bg-zinc-900 p-4 space-y-6">
  <GarbageUpload
    userLocation={userLocation}
    onSubmit={addReport}
  />

  <MyComplaints
    reports={myReports}
    onDelete={handleDeleteReport}
    onSelect={setSelectedReport}
  />
</div>

      <div className="flex-1">
        <GarbageMap
          userLocation={userLocation}
          reports={reports}
          selectedReport={selectedReport}
          onSelect={setSelectedReport}
          onVote={handleVote}
          onToggleType={handleToggleType}
        />
      </div>
    </div>
  );
}
