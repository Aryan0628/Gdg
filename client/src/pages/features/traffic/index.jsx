import { useState } from "react"
import { Button } from "../../../ui/button"
import { Badge } from "../../../ui/badge"
import { Navigation, ChevronLeft, ArrowLeft } from "lucide-react"
import { useNavigate } from "react-router-dom"
import GoogleMapComponent from "../../../components/google-map"
import FeaturePanel from "../../../components/feature-panel"
import { SafetyOnboarding } from "../../../components/safety-onboarding"
import { TRAFFIC_FEATURE } from "./config"
import FloatingLines from "../../../ui/FloatingLines"

export default function TrafficPage() {
  const [userLocation, setUserLocation] = useState(null)
  const [isLoadingLocation, setIsLoadingLocation] = useState(false)
  const [hasJoined, setHasJoined] = useState(false)
  const navigate = useNavigate()

  const feature = TRAFFIC_FEATURE
  const needsOnboarding = true

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
    } finally {
      setIsLoadingLocation(false)
    }
  }

  const handleJoinComplete = () => {
    setHasJoined(true)
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* GLOBAL HEADER */}
      <header className="border-b border-zinc-800 bg-zinc-900 z-20">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/dashboard")}
              className="text-zinc-400 hover:text-white mr-2 p-0 border-none shadow-none hover:bg-transparent"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center">
              <feature.icon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">UrbanFlow</h1>
              <p className="text-xs text-zinc-400">Community Safety Dashboard</p>
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
        <div className="w-96 overflow-y-auto border-r border-zinc-800 bg-slate-900 relative">
          
          <div className="absolute inset-0 z-0 pointer-events-none">
            <FloatingLines />
          </div>

          <div className="relative z-10 p-6 space-y-6">
            
            <div className="flex items-start gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/dashboard")}
                className="text-zinc-400 hover:text-white p-0 h-auto w-auto hover:bg-transparent border-none shadow-none"
              >
                <ChevronLeft className="h-6 w-6" /> 
              </Button>
              <div className="flex flex-col">
                <h2 className="text-3xl font-bold text-white tracking-tight leading-tight">
                  {feature.title}
                </h2>
                <p className="text-sm text-zinc-400 mt-1">
                  {feature.description}
                </p>
              </div>
            </div>

            {/* FEATURE CONTENT */}
            {needsOnboarding && !hasJoined ? (
              <SafetyOnboarding
                feature={feature}
                userLocation={userLocation}
                isLoadingLocation={isLoadingLocation}
                onRequestLocation={requestLocation}
                onJoinComplete={handleJoinComplete}
              />
            ) : (
              <FeaturePanel
                feature={feature}
                userLocation={userLocation}
                isLoadingLocation={isLoadingLocation}
                onRequestLocation={requestLocation}
              />
            )}
          </div>
        </div>

        {/* MAP */}
        {(needsOnboarding && hasJoined) || !needsOnboarding ? (
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