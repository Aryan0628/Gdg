import { Trash2 } from "lucide-react";

export default function MyComplaints({
  reports,
  onDelete,
  onSelect,
}) {
  if (reports.length === 0) {
    return (
      <div className="text-sm text-zinc-500">
        No complaints submitted yet
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-white font-semibold text-sm">
        My Complaints
      </h3>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {reports.map((r) => (
          <div
            key={r.id}
            className="flex items-center justify-between bg-zinc-800 p-3 rounded-lg"
          >
            <div
              className="cursor-pointer"
              onClick={() => onSelect(r)}
            >
              <p className="text-sm text-white font-medium">
                {r.title}
              </p>
              <p className="text-xs text-zinc-400">
                {r.type === "DUSTBIN"
                  ? "🟢 Dustbin"
                  : "🔴 Garbage"}
              </p>
            </div>

            <button
              onClick={() => onDelete(r.id)}
              className="text-red-400 hover:text-red-500"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
