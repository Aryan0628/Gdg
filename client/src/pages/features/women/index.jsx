import { useState } from "react"
import { Button } from "../../../ui/button"
import { Badge } from "../../../ui/badge"
import { Navigation, X, ArrowLeft } from "lucide-react"
import { useNavigate } from "react-router-dom"
import GoogleMapComponent from "../../../components/google-map"
import FeaturePanel from "../../../components/feature-panel"
import { WOMEN_FEATURE } from "./config"
import LocationAccess from "./LocationAccess"
import Commute from "./Commute"

export default function WomenSafetyPage() {
  const [userLocation, setUserLocation] = useState(null)
  const [locationPermission, setLocationPermission] = useState("prompt")
  const [isLoadingLocation, setIsLoadingLocation] = useState(false)
  const [stage, setStage] = useState("location") // "location" | "commute" | "map"
  const navigate = useNavigate()

  const feature = WOMEN_FEATURE

  const requestLocation = async () => {
    setIsLoadingLocation(true)
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject)
      })

      setUserLocation({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      })
      setLocationPermission("granted")
      setStage("commute") // Move to commute after location access
    } catch (error) {
      console.error("Location permission denied:", error)
      setLocationPermission("denied")
    } finally {
      setIsLoadingLocation(false)
    }
  }

  const handleCommuteComplete = () => {
    setStage("map") // Move to final map view after commute setup
  }

  // Stage 1: Location Access
  if (stage === "location") {
    return <LocationAccess onRequestLocation={requestLocation} isLoadingLocation={isLoadingLocation} />
  }

  // Stage 2: Commute Setup
  if (stage === "commute") {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col">
        {/* HEADER */}
        <header className="border-b border-zinc-800 bg-zinc-900">
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStage("location")}
                className="text-zinc-400 hover:text-white mr-2 p-0"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center">
                <feature.icon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">UrbanFlow</h1>
                <p className="text-xs text-zinc-400">Women Safety - Commute Planning</p>
              </div>
            </div>

            {userLocation && (
              <Badge className="gap-2 bg-green-600 text-white border-0">
                <Navigation className="h-3 w-3" />
                Location Active
              </Badge>
            )}
          </div>
        </header>

        {/* Commute Component */}
        <div className="flex-1">
          <Commute onComplete={handleCommuteComplete} userLocation={userLocation} />
        </div>
      </div>
    )
  }

  // Stage 3: Final Map View
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* HEADER */}
      <header className="border-b border-zinc-800 bg-zinc-900">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/dashboard")}
              className="text-zinc-400 hover:text-white mr-2 p-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center">
              <feature.icon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">UrbanFlow</h1>
              <p className="text-xs text-zinc-400">
                Community Safety Dashboard
              </p>
            </div>
          </div>

          {userLocation && (
            <Badge className="gap-2 bg-green-600 text-white border-0">
              <Navigation className="h-3 w-3" />
              Location Active
            </Badge>
          )}
        </div>
      </header>

      {/* BODY */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT PANEL */}
        <div className="w-96 overflow-y-auto border-r border-zinc-800 bg-zinc-900">
          <div className="p-6 space-y-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                navigate("/dashboard")
              }}
              className="mb-4 text-zinc-400 hover:text-white"
            >
              <X className="h-4 w-4 mr-2" />
              Close Map View
            </Button>

            <FeaturePanel
              feature={feature}
              userLocation={userLocation}
              isLoadingLocation={isLoadingLocation}
              onRequestLocation={requestLocation}
            />
          </div>
        </div>

        {/* MAP */}
        <div className="flex-1 relative">
          <GoogleMapComponent
            userLocation={userLocation}
            selectedFeature={feature.id}
            isLoadingLocation={isLoadingLocation}
          />
        </div>
      </div>
    </div>
  )
}
