import { useState } from "react"
import { Button } from "../../../ui/button"
import { Badge } from "../../../ui/badge"
import { Navigation, X, ArrowLeft } from "lucide-react"
import { useNavigate } from "react-router-dom"
import GoogleMapComponent from "../../../components/google-map"
import FeaturePanel from "../../../components/feature-panel"
import FloatingLines from "../../../ui/FloatingLines"
import { GARBAGE_FEATURE } from "./config"

export default function GarbagePage() {
  const [userLocation, setUserLocation] = useState(null)
  const [locationPermission, setLocationPermission] = useState("prompt")
  const [isLoadingLocation, setIsLoadingLocation] = useState(false)
  const navigate = useNavigate()

  const feature = GARBAGE_FEATURE
  const needsOnboarding = false

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
    } catch (error) {
      console.error("Location permission denied:", error)
      setLocationPermission("denied")
    } finally {
      setIsLoadingLocation(false)
    }
  }

  return (
    <div className="relative h-screen w-full bg-slate-950 text-white flex flex-col overflow-hidden">
      {/* GLOBAL BACKGROUND THEME */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-linear-to-br from-slate-950 via-blue-900/30 to-slate-950" />
      </div>

      {/* HEADER */}
      <header className="relative z-50 w-full h-20 px-8 flex items-center justify-between bg-black/40 backdrop-blur-2xl border-b border-white/10">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/dashboard")}
            className="text-zinc-400 hover:text-white mr-2 p-2 bg-transparent border-transparent"
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
          <Badge className="gap-2 bg-green-500/20 text-green-400 border-green-500/30">
            <Navigation className="h-3 w-3" />
            Location Active
          </Badge>
        )}
      </header>

      {/* BODY */}
      <div className="flex-1 flex overflow-hidden relative z-10">
        {/* LEFT PANEL - Glass effect aur FloatingLines ke saath */}
        <div className="w-96 relative overflow-hidden border-r border-white/10 bg-black/40 backdrop-blur-3xl">
          {/* FloatingLines sirf sidebar ke background mein rahega */}
          <div className="absolute inset-0 z-0 opacity-40 pointer-events-none">
            <FloatingLines mixBlendMode="screen" />
          </div>
          
          <div className="relative z-10 p-6 space-y-4 overflow-y-auto h-full no-scrollbar">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                navigate("/dashboard")
              }}
              className="mb-4 text-zinc-400 hover:text-white bg-transparent border-transparent"
            >
              <X className="h-4 w-4 mr-2" />
              Close Map View
            </Button>

            {needsOnboarding ? null : (
              <FeaturePanel
                feature={feature}
                userLocation={userLocation}
                isLoadingLocation={isLoadingLocation}
                onRequestLocation={requestLocation}
              />
            )}
          </div>
        </div>

        {/* MAP PANEL */}
        {!needsOnboarding ? (
          <div className="flex-1 relative">
            <GoogleMapComponent
              userLocation={userLocation}
              selectedFeature={feature.id}
              isLoadingLocation={isLoadingLocation}
            />
          </div>
        ) : null}
      </div>
    </div>
  )
}