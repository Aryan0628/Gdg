import { useState } from "react"
import { Button } from "../../../ui/button"
import { Badge } from "../../../ui/badge"
import { Navigation, ArrowLeft } from "lucide-react"
import { useNavigate } from "react-router-dom"

import GoogleMapComponent from "../../../components/google-map"
import NgoPortal from "./NgoPortal"
import { NGO_FEATURE } from "./config"

export default function NGOPage() {
  const [userLocation, setUserLocation] = useState(null)
  const [isLoadingLocation, setIsLoadingLocation] = useState(false)
  const [showMap, setShowMap] = useState(false)

  const navigate = useNavigate()
  const feature = NGO_FEATURE

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
    } catch (error) {
      console.error("Location permission denied:", error)
      alert("Please allow location access")
    } finally {
      setIsLoadingLocation(false)
    }
  }

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

            <div className="h-10 w-10 rounded-lg bg-pink-600 flex items-center justify-center">
              <feature.icon className="h-6 w-6 text-white" />
            </div>

            <div>
              <h1 className="text-xl font-bold text-white">NGO Portal</h1>
              <p className="text-xs text-zinc-400">
                Community Support & Volunteering
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
        {/* LEFT PANEL — NGO PORTAL */}
        <div className="w-[420px] overflow-y-auto border-r border-zinc-800 bg-zinc-900">
          <div className="p-6">
            <NgoPortal
              userLocation={userLocation}
              isLoadingLocation={isLoadingLocation}
              onRequestLocation={requestLocation}
              onLocationUpdate={setUserLocation}
              onMapVisibilityChange={setShowMap}
            />
          </div>
        </div>

        {/* RIGHT PANEL — MAP */}
        <div className="flex-1 relative">
          {showMap && userLocation && (
            <GoogleMapComponent
              userLocation={userLocation}
              selectedFeature={feature.id}
              isLoadingLocation={isLoadingLocation}
            />
          )}
        </div>
      </div>
    </div>
  )
}
