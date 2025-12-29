import axios from "axios";
import { useAuth0 } from "@auth0/auth0-react";

export default function MyJobs({ jobs, onSelect }) {
  const { getAccessTokenSilently } = useAuth0();

  const closeJob = async (jobId) => {
    const token = await getAccessTokenSilently({
      audience: import.meta.env.VITE_AUTH0_AUDIENCE,
    });

    await axios.patch(
      `/api/jobs/${jobId}/close`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
  };

  return (
    <div className="space-y-3">
      {jobs.map((job) => (
        <div
          key={job.id}
          className="bg-zinc-800 p-3 rounded space-y-2"
        >
          <div onClick={() => onSelect(job)}>
            <h3>{job.title}</h3>
            <p className="text-sm text-zinc-400">
              {job.status}
            </p>
          </div>

          {job.status === "OPEN" && (
            <button
              onClick={() => closeJob(job.id)}
              className="text-xs text-red-400"
            >
              Close Deal
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
