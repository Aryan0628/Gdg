import { useState } from "react"
import { Button } from "../ui/button"
import { Badge } from "../ui/badge"
import {
  MapPin,
  Shield,
  Car,
  Trash2,
  Heart,
  Briefcase,
  Navigation,
  X,
} from "lucide-react"

import GoogleMapComponent from "../components/google-map"
import FeaturePanel from "../components/feature-panel"
import {SafetyOnboarding} from "../components/safety-onboarding"

export default function CivicHub() {
  const [selectedFeature, setSelectedFeature] = useState(null)
  const [userLocation, setUserLocation] = useState(null)
  const [locationPermission, setLocationPermission] = useState("prompt")
  const [isLoadingLocation, setIsLoadingLocation] = useState(false)
  const [hasJoined, setHasJoined] = useState(false)

  const features = [
    {
      id: "women-safety",
      title: "Women Safety",
      description: "Report safety concerns and get emergency assistance",
      icon: Shield,
      color: "text-red-500",
      bgColor: "bg-red-500/10",
      stats: "24/7 Emergency Support",
    },
    {
      id: "traffic",
      title: "Traffic",
      description: "Report accidents, congestion, and road issues",
      icon: Car,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      stats: "Live Traffic Updates",
    },
    {
      id: "garbage",
      title: "Garbage",
      description: "Report waste management and cleanliness issues",
      icon: Trash2,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      stats: "Daily Collection Routes",
    },
    {
      id: "ngo",
      title: "NGO",
      description: "Connect with NGOs and volunteer opportunities",
      icon: Heart,
      color: "text-pink-500",
      bgColor: "bg-pink-500/10",
      stats: "50+ Partner Organizations",
    },
    {
      id: "jobs",
      title: "Jobs",
      description: "Find local employment and career opportunities",
      icon: Briefcase,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
      stats: "100+ Active Listings",
    },
  ]

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

  const handleFeatureClick = (featureId) => {
    setSelectedFeature(featureId)
    setHasJoined(false)

    if (featureId !== "women-safety" && featureId !== "traffic") {
      setUserLocation(null)
      setLocationPermission("prompt")
    }
  }

  const handleJoinComplete = () => {
    setHasJoined(true)
  }

  const currentFeature = features.find((f) => f.id === selectedFeature)
  const needsOnboarding =
    selectedFeature === "women-safety" || selectedFeature === "traffic"

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* HEADER */}
      <header className="border-b border-zinc-800 bg-zinc-900">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center">
              <MapPin className="h-6 w-6 text-white" />
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
        <div
          className={`${
            selectedFeature ? "w-96" : "flex-1"
          } overflow-y-auto transition-all duration-300 border-r border-zinc-800 bg-zinc-900`}
        >
          <div className="p-6 space-y-4">
            {!selectedFeature && (
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-white">
                  Select a Service
                </h2>
                <p className="text-zinc-400">
                  Choose a service to view on the map
                </p>
              </div>
            )}

            <div
              className={`grid gap-3 ${
                selectedFeature
                  ? "grid-cols-1"
                  : "md:grid-cols-2 lg:grid-cols-3"
              }`}
            >
              {features.map((feature) => {
                const Icon = feature.icon
                const isSelected = feature.id === selectedFeature

                return (
                  <button
                    key={feature.id}
                    onClick={() => handleFeatureClick(feature.id)}
                    className={`rounded-xl p-4 text-left transition-all ${
                      isSelected
                        ? "bg-zinc-800 border-2 border-blue-500"
                        : "bg-zinc-800/50 border border-zinc-700 hover:bg-zinc-800 hover:scale-105"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-12 w-12 rounded-lg ${feature.bgColor} flex items-center justify-center`}
                      >
                        <Icon className={`h-6 w-6 ${feature.color}`} />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-white font-semibold">
                          {feature.title}
                        </h3>
                        {!selectedFeature && (
                          <p className="text-xs text-zinc-400">
                            {feature.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            {selectedFeature && currentFeature && (
              <div className="pt-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedFeature(null)
                    setHasJoined(false)
                  }}
                  className="mb-4 text-zinc-400 hover:text-white"
                >
                  <X className="h-4 w-4 mr-2" />
                  Close Map View
                </Button>

                {needsOnboarding && !hasJoined ? (
                  <SafetyOnboarding
                    feature={currentFeature}
                    userLocation={userLocation}
                    isLoadingLocation={isLoadingLocation}
                    onRequestLocation={requestLocation}
                    onJoinComplete={handleJoinComplete}
                  />
                ) : (
                  <FeaturePanel
                    feature={currentFeature}
                    userLocation={userLocation}
                    isLoadingLocation={isLoadingLocation}
                    onRequestLocation={requestLocation}
                  />
                )}
              </div>
            )}
          </div>
        </div>

        {/* MAP */}
        {selectedFeature &&
          ((needsOnboarding && hasJoined) || !needsOnboarding) && (
            <div className="flex-1 relative">
              <GoogleMapComponent
                userLocation={userLocation}
                selectedFeature={selectedFeature}
                isLoadingLocation={isLoadingLocation}
              />
            </div>
          )}
      </div>
    </div>
  )
}
