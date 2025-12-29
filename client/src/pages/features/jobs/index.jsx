import { useEffect, useState } from "react";
import { ref, set, serverTimestamp } from "firebase/database";
import axios from "axios";

import { db } from "../../../firebase/firebase.js";
import { useAuthStore } from "../../../store/useAuthStore.js";
import { useAuth0 } from "@auth0/auth0-react";

import JobCreate from "./JobCreate";
import JobList from "./JobList";
import MyJobs from "./MyJobs";
import JobChat from "./JobChat";
import JobsMap from "./JobsMap";

import { Button } from "../../../ui/button";
import { MapPin, Loader2 } from "lucide-react";

export default function JobsPage() {
  const { user } = useAuthStore();
  const { getAccessTokenSilently } = useAuth0();

  const [activeTab, setActiveTab] = useState("ALL");
  const [jobs, setJobs] = useState([]);
  const [myJobs, setMyJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);

  const [userLocation, setUserLocation] = useState(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  /* ---------------- LOCATION ---------------- */

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
      alert("Location access is required to view nearby jobs.");
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const fetchJobs = async () => {

  if (!userLocation) return;
    console.log(userLocation)
  const res = await axios.get("/api/jobs/nearby", {
    params: {
      lat: userLocation.lat,
      lng: userLocation.lng,
    },
  });
  console.log(res.data);
  setJobs(res.data.jobs || []);
};
  const fetchMyJobs = async () => {
    if (!user) return;

    const token = await getAccessTokenSilently({
      audience: import.meta.env.VITE_AUTH0_AUDIENCE,
    });

    const res = await axios.get("/api/jobs/my", {
      headers: { Authorization: `Bearer ${token}` },
    });

    setMyJobs(res.data.jobs || []);
  };

  useEffect(() => {
  if (!userLocation) return;
  fetchJobs();
}, [userLocation]);

  useEffect(() => {
    fetchMyJobs();
  }, [user]);

  /* ---------------- JOIN JOB ROOM ---------------- */

  const selectJobAndJoin = async (job) => {
    setSelectedJob(job);
    if (!user) return;

    try {
      await set(
        ref(db, `jobs/rooms/${job.id}/members/${user.sub}`),
        {
          joinedAt: serverTimestamp(),
          userName: user.name || "Anonymous",
          userImage: user.picture || "",
        }
      );
    } catch (err) {
      console.error("Failed to join job room:", err);
    }
  };

  /* ---------------- LOCATION GATE ---------------- */

  if (!userLocation) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-zinc-950">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 w-80 text-center space-y-4">
          <MapPin className="h-10 w-10 text-blue-500 mx-auto" />
          <h3 className="text-white font-semibold text-lg">
            Enable Location
          </h3>
          <p className="text-sm text-zinc-400">
            We need your location to show nearby jobs on the map.
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

  /* ---------------- MAIN UI ---------------- */

  return (
    <div className="h-screen flex bg-zinc-950 text-white overflow-hidden">
      {/* LEFT PANEL */}
      <div className="w-80 border-r border-zinc-800 p-4 space-y-4">
        <div className="flex gap-2">
          {["ALL", "MY", "CREATE"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 rounded text-sm font-semibold ${
                activeTab === tab
                  ? "bg-blue-600"
                  : "bg-zinc-800 hover:bg-zinc-700"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === "CREATE" && (
          <JobCreate onCreated={fetchJobs} location={userLocation} />
        )}

        {activeTab === "ALL" && (
          <JobList jobs={jobs} onSelect={selectJobAndJoin} />
        )}

        {activeTab === "MY" && (
          <MyJobs jobs={myJobs} onSelect={selectJobAndJoin} />
        )}
      </div>

      {/* MAP */}
      <div className="flex-1 border-r border-zinc-800">
        <JobsMap
          jobs={jobs}
          selectedJob={selectedJob}
          onSelect={selectJobAndJoin}
          userLocation={userLocation}
        />
      </div>

      {/* CHAT */}
      <div className="w-[420px] p-3">
        {selectedJob ? (
          <JobChat job={selectedJob} />
        ) : (
          <div className="h-full flex items-center justify-center text-zinc-500">
            Select a job to start chatting
          </div>
        )}
      </div>
    </div>
  );
}
