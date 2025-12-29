import { useEffect, useState } from "react";
import { ref, set, serverTimestamp } from "firebase/database";
import axios from "axios";

import { db } from "../../../firebase/firebase.js";
import { useAuthStore } from "../../../store/useAuthStore.js";

import JobCreate from "./JobCreate";
import JobList from "./JobList";
import MyJobs from "./MyJobs";
import JobChat from "./JobChat";
import JobsMap from "./JobsMap";

export default function JobsPage() {
  const { user } = useAuthStore();

  const [activeTab, setActiveTab] = useState("ALL");
  const [jobs, setJobs] = useState([]);
  const [myJobs, setMyJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);

  /* ---------------- FETCH JOBS ---------------- */

  const fetchJobs = async () => {
    const res = await axios.get("/api/jobs");
    setJobs(res.data.jobs || []);
  };

  const fetchMyJobs = async () => {
    if (!user) return;

    const res = await axios.get("/api/jobs/my", {
      headers: {
        Authorization: `Bearer ${user.accessToken}`,
      },
    });
    setMyJobs(res.data.jobs || []);
  };

  useEffect(() => {
    fetchJobs();
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

  /* ---------------- UI ---------------- */

  return (
    <div className="h-screen flex bg-zinc-950 text-white overflow-hidden">
      {/* LEFT PANEL */}
      <div className="w-80 border-r border-zinc-800 p-4 space-y-4">
        {/* TABS */}
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

        {/* CONTENT */}
        {activeTab === "CREATE" && (
          <JobCreate onCreated={fetchJobs} />
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
