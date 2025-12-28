import { useEffect, useState } from "react";
import { Button } from "../../ui/button";
import { MapPin, Loader2 } from "lucide-react";
import GarbageMap from "./GarbageMap";
import GarbageUpload from "./GarbageUpload";
import axios from "axios";

import { useAuth0 } from "@auth0/auth0-react";


export default function GarbageFeature() {
  const { getAccessTokenSilently } = useAuth0();
  const [userLocation, setUserLocation] = useState(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);

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

  const vote = (id, type) => {
    setReports((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              upvotes: type === "UP" ? r.upvotes + 1 : r.upvotes,
              downvotes: type === "DOWN" ? r.downvotes + 1 : r.downvotes,
            }
          : r
      )
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
      <div className="w-96 border-r border-zinc-800 bg-zinc-900 p-4">
        <GarbageUpload userLocation={userLocation} onSubmit={addReport} />
      </div>

      <div className="flex-1">
        <GarbageMap
          userLocation={userLocation}
          reports={reports}
          selectedReport={selectedReport}
          onSelect={setSelectedReport}
          onVote={vote}
        />
      </div>
    </div>
  );
}
