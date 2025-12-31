import { db } from "../firebaseadmin/firebaseadmin.js";
import { asyncHandler } from "../utils/aysncHandler.js";
import { ApiResponse } from "../utils/apiResponse.js";

/* ================= CREATE DONATION ================= */
export const createDonation = asyncHandler(async (req, res) => {
  const { category, description, address, lat, lng, time } = req.body;

  /* ---------- VALIDATION ---------- */
  if (
    !category ||
    !description ||
    !address ||
    lat === undefined ||
    lng === undefined ||
    !time
  ) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "All fields are required"));
  }

  if (typeof lat !== "number" || typeof lng !== "number") {
    return res
      .status(400)
      .json(
        new ApiResponse(400, null, "Latitude and Longitude must be numbers")
      );
  }

  /* ---------- AUTH ---------- */
  const donorId = req.auth.payload.sub; // ✅ Auth0 user

  /* ---------- CREATE DONATION ---------- */
  const donationRef = await db.collection("donations").add({
    category,
    description,
    address,
    lat,
    lng,
    time,
    donorId,
    createdAt: new Date(),
  });

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        { id: donationRef.id },
        "Donation created successfully"
      )
    );
});
/* ================= GET DONATIONS ================= */
export const getDonations = asyncHandler(async (req, res) => {
  const { category } = req.query;

  let query = db.collection("donations");

  if (category) {
    query = query.where("category", "==", category.toLowerCase());
  }

  const snapshot = await query.orderBy("createdAt", "desc").get();

  const donations = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  return res
    .status(200)
    .json(new ApiResponse(200, donations, "Donations fetched successfully"));
});
