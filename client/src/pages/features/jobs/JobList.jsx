export default function JobList({ jobs, onSelect }) {
  return (
    <div className="space-y-3">
      {jobs.map((job) => (
        <div
          key={job.id}
          onClick={() => onSelect(job)}
          className="cursor-pointer bg-zinc-800 p-3 rounded"
        >
          <h3>{job.title}</h3>
          <p className="text-sm text-zinc-400">
            ₹{job.amount} • {job.time}
          </p>
        </div>
      ))}
    </div>
  );
}
