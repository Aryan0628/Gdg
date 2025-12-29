export default function JobCard({ job, onClick }) {
  return (
    <div
      onClick={onClick}
      className="cursor-pointer bg-zinc-800 p-3 rounded hover:bg-zinc-700"
    >
      <h3 className="font-semibold">{job.title}</h3>
      <p className="text-sm text-zinc-400">
        ₹{job.amount} • {job.time}
      </p>
      <p className="text-xs text-zinc-500">
        Posted by {job.employer}
      </p>
    </div>
  );
}
