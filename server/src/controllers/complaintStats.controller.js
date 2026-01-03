import { db } from "../firebaseadmin/firebaseadmin.js";

/**
 * Get complaint summary against a user
 * Read-only, privacy-safe
 */
export const getComplaintStatsForUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const snap = await db
      .collection("complaints")
      .where("againstUserId", "==", userId)
      .get();

    const complaints = snap.docs.map(d => d.data());

    res.json({
      total: complaints.length,
      pending: complaints.filter(c => c.status === "pending").length,
      resolved: complaints.filter(c => c.status === "resolved").length,
    });
  } catch (err) {
    console.error("Complaint stats error:", err);
    res.status(500).json({ message: "Failed to fetch complaint stats" });
  }
};
