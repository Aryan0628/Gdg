import { db } from "../firebaseadmin/firebaseadmin.js";

/* ================= GET USER BY ID ================= */
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    const userSnap = await db.collection("users").doc(id).get();

    if (!userSnap.exists) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        id: userSnap.id,
        ...userSnap.data(),
      },
    });
  } catch (err) {
    console.error("❌ getUserById error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};