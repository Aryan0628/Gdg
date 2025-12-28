import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Label } from "../ui/label";
import { Alert, AlertDescription } from "../ui/alert";
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
  MessageCircle,
  Send,
  Navigation,
  ArrowLeft,
} from "lucide-react";

export default function NgoPortal({
  userLocation,
  onRequestLocation,
  onLocationUpdate,
  onMapVisibilityChange,
}) {
  const [userType, setUserType] = useState(null); // donor | recipient
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [locationMethod, setLocationMethod] = useState(null);
  const [chatMessage, setChatMessage] = useState("");

  // 🔥 Will be filled from backend later
  const [donations, setDonations] = useState([]);

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

  /* ---------------- DERIVED DATA ---------------- */

  const filteredDonations = donations.filter(
    (d) => d.category === selectedCategory
  );

  /* ---------------- MAP CONTROL LOGIC (CRITICAL FIX) ---------------- */

  useEffect(() => {
    // Recipient flow ONLY
    if (userType !== "recipient") return;

    // Show map ONLY if donations exist
    if (selectedCategory && filteredDonations.length > 0) {
      const firstDonation = filteredDonations[0];

      onMapVisibilityChange?.(true);
      onLocationUpdate?.({
        lat: firstDonation.lat,
        lng: firstDonation.lng,
      });
    } else {
      // No donations → hide map
      onMapVisibilityChange?.(false);
    }
  }, [userType, selectedCategory, filteredDonations]);

  /* ---------------- HANDLERS ---------------- */

  const handleBackToSelection = () => {
    setUserType(null);
    setSelectedCategory(null);
    setLocationMethod(null);
    onMapVisibilityChange?.(false);
  };

  const handleBackToCategories = () => {
    setSelectedCategory(null);
    setLocationMethod(null);
    onMapVisibilityChange?.(false);
  };

  const handleSelectCategory = (id) => {
    setSelectedCategory(id);
    // ❌ DO NOT trigger map here for recipient
  };

  const handleUseCurrentLocation = () => {
    // ✅ Donor only
    onRequestLocation?.();
    setLocationMethod("current");
    onMapVisibilityChange?.(true);
  };

  const handleSubmitDonation = () => {
    console.log("Donation submitted:", {
      ...donationForm,
      category: selectedCategory,
      location:
        locationMethod === "current" ? userLocation : donationForm.location,
    });

    alert("Donation posted successfully!");

    setDonationForm({ description: "", location: "", time: "" });
    setUserType(null);
    setSelectedCategory(null);
    setLocationMethod(null);
    onMapVisibilityChange?.(false);
  };

  /* ---------------- UI ---------------- */

  return (
    <div className="space-y-4">

      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex gap-4">
            <div className="h-14 w-14 rounded-xl bg-pink-500/10 flex items-center justify-center">
              <Heart className="h-7 w-7 text-pink-500" />
            </div>
            <div>
              <CardTitle className="text-2xl">NGO Portal</CardTitle>
              <CardDescription>
                Connect donors with those in need
              </CardDescription>
              <Badge variant="outline" className="mt-2">
                50+ Partner Organizations
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* User Type Selection */}
      {!userType && (
        <Card>
          <CardHeader>
            <CardTitle>How would you like to participate?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              className="w-full"
              variant="outline"
              onClick={() => setUserType("donor")}
            >
              <HandHeart className="mr-2 h-5 w-5" />
              I Want to Donate
            </Button>
            <Button
              className="w-full"
              variant="outline"
              onClick={() => setUserType("recipient")}
            >
              <Package className="mr-2 h-5 w-5" />
              I Need Help
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Category Selection */}
      {userType && !selectedCategory && (
        <Card>
          <CardHeader>
            <Button variant="ghost" onClick={handleBackToSelection}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <CardTitle>Select Category</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            {categories.map((c) => {
              const Icon = c.icon;
              return (
                <Button
                  key={c.id}
                  variant="outline"
                  onClick={() => handleSelectCategory(c.id)}
                >
                  <Icon className="mr-2 h-5 w-5" />
                  {c.label}
                </Button>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* ================= RECIPIENT VIEW ================= */}
      {userType === "recipient" && selectedCategory && (
        <Card>
          <CardHeader>
            <Button variant="ghost" onClick={handleBackToCategories}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <CardTitle>Available Donations</CardTitle>
            <CardDescription>
              Locations where {selectedCategory} are available
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3">
            {filteredDonations.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No donations available for this category right now.
              </p>
            ) : (
              filteredDonations.map((d) => (
                <Card key={d.id}>
                  <CardContent className="pt-4 space-y-2">
                    <h4 className="font-semibold">{d.description}</h4>

                    {/* Written Address */}
                    <p className="text-sm text-muted-foreground">
                      📍 {d.location}
                    </p>

                    <p className="text-xs">{d.time}</p>

                    {/* Focus map on donation location */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        onLocationUpdate?.({
                          lat: d.lat,
                          lng: d.lng,
                        });
                        onMapVisibilityChange?.(true);
                      }}
                    >
                      <MapPin className="mr-2 h-4 w-4" />
                      Show on Map
                    </Button>

                    <Textarea
                      placeholder="Send a message to donor..."
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                    />
                    <Button size="sm">
                      <MessageCircle className="mr-2 h-4 w-4" />
                      Send Message
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* ================= DONOR VIEW ================= */}
      {userType === "donor" && selectedCategory && (
        <Card>
          <CardHeader>
            <Button variant="ghost" onClick={handleBackToCategories}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <CardTitle>Donate {selectedCategory}</CardTitle>
            <CardDescription>
              Provide details about your donation
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div>
              <Label>Description</Label>
              <Textarea
                placeholder="Describe the items you're donating..."
                value={donationForm.description}
                onChange={(e) =>
                  setDonationForm({
                    ...donationForm,
                    description: e.target.value,
                  })
                }
              />
            </div>

            <div>
              <Label>Pickup Location</Label>
              {!locationMethod && (
                <div className="flex gap-2 mt-2">
                  <Button variant="outline" onClick={handleUseCurrentLocation}>
                    <Navigation className="mr-2 h-4 w-4" />
                    Use Current Location
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setLocationMethod("manual")}
                  >
                    Enter Manually
                  </Button>
                </div>
              )}

              {locationMethod === "current" && userLocation && (
                <Alert className="mt-2">
                  <AlertDescription>
                    Current Location Detected
                    <br />
                    Lat: {userLocation.lat}, Lng: {userLocation.lng}
                  </AlertDescription>
                </Alert>
              )}

              {locationMethod === "manual" && (
                <Input
                  className="mt-2"
                  placeholder="Enter pickup address"
                  value={donationForm.location}
                  onChange={(e) =>
                    setDonationForm({
                      ...donationForm,
                      location: e.target.value,
                    })
                  }
                />
              )}
            </div>

            <div>
              <Label>Available Time</Label>
              <Input
                placeholder="e.g. Mon–Fri 2–5 PM"
                value={donationForm.time}
                onChange={(e) =>
                  setDonationForm({
                    ...donationForm,
                    time: e.target.value,
                  })
                }
              />
            </div>

            <Button className="w-full" onClick={handleSubmitDonation}>
              <Send className="mr-2 h-4 w-4" />
              Post Donation
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

