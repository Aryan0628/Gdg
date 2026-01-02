import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../ui/card";
import { Button } from "../../../ui/button";
import { Badge } from "../../../ui/badge";
import { Input } from "../../../ui/input";
import { Textarea } from "../../../ui/textarea";

import {
  MapPin,
  Heart,
  HandHeart,
  Package,
  ShirtIcon,
  BookOpen,
  Pill,
  Laptop,
  MoreHorizontal,
  Navigation,
  ArrowLeft,
  Send,
} from "lucide-react";

export default function NgoPortal({
  userLocation,
  onRequestLocation,
  onLocationUpdate,
  onMapVisibilityChange,
}) {
  /* ================= AUTH ================= */
  const { getAccessTokenSilently } = useAuth0();

  /* ================= STATE ================= */
  const [userType, setUserType] = useState(null); // donor | recipient
  const [donorView, setDonorView] = useState(null); // null | post
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [locationMethod, setLocationMethod] = useState(null);
  const [donations, setDonations] = useState([]);
  const [interestedDonationIds, setInterestedDonationIds] = useState(new Set());

  const navigate = useNavigate();

  const [donationForm, setDonationForm] = useState({
    description: "",
    location: "",
    time: "",
  });

  const categories = [
    { id: "clothes", label: "Clothes", icon: ShirtIcon },
    { id: "books", label: "Books", icon: BookOpen },
    { id: "medicines", label: "Medicines", icon: Pill },
    { id: "electronics", label: "Electronics", icon: Laptop },
    { id: "others", label: "Others", icon: MoreHorizontal },
  ];

  /* ================= GEO HELPERS ================= */

  const reverseGeocode = async (lat, lng) => {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`
    );
    const data = await res.json();
    return data.results?.[0]?.formatted_address || "Current Location";
  };

  const geocodeAddress = async (address) => {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        address
      )}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`
    );
    const data = await res.json();
    return data.results?.[0]?.geometry?.location;
  };

  /* ================= FETCH DONATIONS (RECIPIENT) ================= */

  useEffect(() => {
    if (userType !== "recipient" || !selectedCategory) return;

    const fetchDonations = async () => {
      try {
        const res = await axios.get(
          `/api/donations?category=${selectedCategory}`
        );
        setDonations(res.data.data || []);
      } catch {
        setDonations([]);
      }
    };

    fetchDonations();
  }, [userType, selectedCategory]);
  /* ================= FETCH MY INTERESTS (DEDUP) ================= */
useEffect(() => {
  if (userType !== "recipient") return;

  const fetchMyInterests = async () => {
    try {
      const token = await getAccessTokenSilently();
      const res = await axios.get("/api/interests/mine", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const ids = new Set(res.data.map((i) => i.donationId));
      setInterestedDonationIds(ids);
    } catch (err) {
      console.error(err);
    }
  };

  fetchMyInterests();
}, [userType]);


  /* ================= MAP CONTROL ================= */

  useEffect(() => {
    if (userType === "recipient" && donations.length > 0) {
      onMapVisibilityChange?.(true);
      onLocationUpdate?.({
        lat: donations[0].lat,
        lng: donations[0].lng,
      });
    }
  }, [userType, donations]);

  useEffect(() => {
    if (locationMethod === "current" && userLocation) {
      onMapVisibilityChange?.(true);
      onLocationUpdate?.(userLocation);
    }
  }, [locationMethod, userLocation]);

  const handleManualAddressBlur = async () => {
    if (!donationForm.location) return;
    const coords = await geocodeAddress(donationForm.location);
    if (coords) {
      onMapVisibilityChange?.(true);
      onLocationUpdate?.(coords);
    }
  };

  /* ================= RESET ================= */

  const resetState = () => {
    setUserType(null);
    setDonorView(null);
    setSelectedCategory(null);
    setLocationMethod(null);
    setDonations([]);
    onMapVisibilityChange?.(false);
  };

  /* ================= INTEREST (RECIPIENT) ================= */

 const handleInterest = async (donation) => {
  if (interestedDonationIds.has(donation.id)) return;

  try {
    const token = await getAccessTokenSilently();

    await axios.post(
      "/api/interests",
      { donationId: donation.id },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    // ✅ update local state so button disables instantly
    setInterestedDonationIds((prev) => new Set([...prev, donation.id]));

    alert("Interest sent. Waiting for donor approval.");
  } catch (err) {
    console.error(err.response?.data || err);
    alert("Failed to send interest");
  }
};


  /* ================= SUBMIT DONATION (DONOR) ================= */

  const handleSubmitDonation = async () => {
    try {
      const token = await getAccessTokenSilently();

      if (!donationForm.description || !donationForm.time || !locationMethod) {
        alert("Please fill all fields");
        return;
      }

      let lat, lng, address;

      if (locationMethod === "current") {
        lat = userLocation.lat;
        lng = userLocation.lng;
        address = await reverseGeocode(lat, lng);
      } else {
        const coords = await geocodeAddress(donationForm.location);
        lat = coords.lat;
        lng = coords.lng;
        address = donationForm.location;
      }

      await axios.post(
        "/api/donations",
        {
          category: selectedCategory,
          description: donationForm.description,
          address,
          lat,
          lng,
          time: donationForm.time,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      alert("Donation posted successfully!");
      setDonationForm({ description: "", location: "", time: "" });
      resetState();
    } catch (err) {
      console.error(err.response?.data || err);
      alert("Donation failed");
    }
  };

  /* ================= UI ================= */

  return (
    <div className="space-y-4">
      {/* HEADER */}
      <Card>
        <CardHeader className="flex gap-4">
          <Heart className="h-10 w-10 text-pink-500" />
          <div>
            <CardTitle>NGO Portal</CardTitle>
            <CardDescription>Connect donors with those in need</CardDescription>
            <Badge variant="outline">50+ NGOs</Badge>
          </div>
        </CardHeader>
      </Card>

      {/* USER TYPE */}
      {!userType && (
        <Card>
          <CardContent className="space-y-2">
            <Button
              className="w-full"
              onClick={() => {
                setUserType("donor");
                setDonorView(null);
              }}
            >
              <HandHeart className="mr-2" /> I Want to Donate
            </Button>

            <Button className="w-full" onClick={() => setUserType("recipient")}>
              <Package className="mr-2" /> I Need Help
            </Button>
          </CardContent>
        </Card>
      )}

      {/* DONOR MENU */}
      {userType === "donor" && donorView === null && (
        <Card>
          <CardHeader>
            <Button variant="ghost" onClick={resetState}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <CardTitle>Donor Options</CardTitle>
          </CardHeader>

          <CardContent className="space-y-3">
            <Button className="w-full" onClick={() => setDonorView("post")}>
              📦 Post a Donation
            </Button>

            <Button
              className="w-full"
              variant="outline"
              onClick={() => navigate("/ngo/inbox")}
            >
              📥 View Interest Requests
            </Button>
          </CardContent>
        </Card>
      )}

      {/* CATEGORY — DONOR */}
      {userType === "donor" && donorView === "post" && !selectedCategory && (
        <Card>
          <CardHeader>
            <Button variant="ghost" onClick={() => setDonorView(null)}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <CardTitle>Select Category</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            {categories.map((c) => (
              <Button key={c.id} onClick={() => setSelectedCategory(c.id)}>
                <c.icon className="mr-2" /> {c.label}
              </Button>
            ))}
          </CardContent>
        </Card>
      )}

      {/* CATEGORY — RECIPIENT */}
      {userType === "recipient" && !selectedCategory && (
        <Card>
          <CardHeader>
            <Button variant="ghost" onClick={resetState}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <CardTitle>Select Category</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            {categories.map((c) => (
              <Button key={c.id} onClick={() => setSelectedCategory(c.id)}>
                <c.icon className="mr-2" /> {c.label}
              </Button>
            ))}
          </CardContent>
        </Card>
      )}

      {/* RECIPIENT VIEW */}
      {userType === "recipient" && selectedCategory && (
        <Card>
          <CardHeader>
            <Button variant="ghost" onClick={resetState}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <CardTitle>Available Donations</CardTitle>
          </CardHeader>
           <Button
        className="w-full"
        variant="outline"
        onClick={() => navigate("/ngo/chats", {
  state: { category: selectedCategory }
})
}
      >
        💬 My Chats
      </Button>

          <CardContent className="space-y-3">
  

            {donations.map((d) => (
              <Card key={d.id}>
                <CardContent className="space-y-2">
                  <h4 className="font-semibold">{d.description}</h4>
                  <p className="text-sm">📍 {d.address}</p>

                  <Button
                    size="sm"
                    onClick={() =>
                      onLocationUpdate?.({ lat: d.lat, lng: d.lng })
                    }
                  >
                    <MapPin className="mr-2" /> Show on Map
                  </Button>

   <Button
  size="sm"
  variant="outline"
  disabled={interestedDonationIds.has(d.id)}
  onClick={() => handleInterest(d)}
>
  {interestedDonationIds.has(d.id) ? "Requested" : "I'm Interested"}
</Button>




                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>
      )}

      {/* DONOR FORM */}
      {userType === "donor" && donorView === "post" && selectedCategory && (
        <Card>
          <CardHeader>
            <Button variant="ghost" onClick={() => setSelectedCategory(null)}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <CardTitle>Donate {selectedCategory}</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <Textarea
              placeholder="Donation description"
              value={donationForm.description}
              onChange={(e) =>
                setDonationForm({
                  ...donationForm,
                  description: e.target.value,
                })
              }
            />

            {!locationMethod && (
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    onRequestLocation();
                    setLocationMethod("current");
                  }}
                >
                  <Navigation className="mr-2" /> Use Current Location
                </Button>
                <Button onClick={() => setLocationMethod("manual")}>
                  Enter Manually
                </Button>
              </div>
            )}

            {locationMethod === "manual" && (
              <Input
                placeholder="Pickup address"
                value={donationForm.location}
                onChange={(e) =>
                  setDonationForm({
                    ...donationForm,
                    location: e.target.value,
                  })
                }
                onBlur={handleManualAddressBlur}
              />
            )}

            <Input
              placeholder="Available time"
              value={donationForm.time}
              onChange={(e) =>
                setDonationForm({ ...donationForm, time: e.target.value })
              }
            />

            <Button onClick={handleSubmitDonation}>
              <Send className="mr-2" /> Post Donation
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}