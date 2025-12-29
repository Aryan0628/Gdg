import { useState, useEffect } from "react"
import { Button } from "../../../ui/button"
import { Badge } from "../../../ui/badge"
import { Navigation, X, ArrowLeft } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { ref, get, update, onValue, off } from "firebase/database"
import { db } from "../../../firebase/firebase"
import { useAuthStore } from "../../../store/useAuthStore"
import GoogleMapComponent from "../../../components/google-map"
import FeaturePanel from "../../../components/feature-panel"
import { WOMEN_FEATURE } from "./config"
import LocationAccess from "./LocationAccess"
import Commute from "./Commute"
export default function WomenSafetyPage() {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false)
  const [stage, setStage] = useState("location") // "location" | "commute" | "map"
  const [routeStart, setRouteStart] = useState(null)
  const [routeEnd, setRouteEnd] = useState(null)
  const [isLoadingRoute, setIsLoadingRoute] = useState(false)
  const [otherUsers, setOtherUsers] = useState([])
  const [geoWatchId, setGeoWatchId] = useState(null)
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const feature = WOMEN_FEATURE

  const requestLocation = async () => {
    setIsLoadingLocation(true)
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject)
      })

      setCurrentLocation({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      })
      setStage("commute") // Move to commute after location access
    } catch (error) {
      console.error("Location permission denied:", error)
    } finally {
      setIsLoadingLocation(false)
    }
  }
  // Fetch route data from Firebase when map stage loads
  useEffect(() => {
    const fetchRouteData = async () => {
      if (stage !== "map" || !user) return

      setIsLoadingRoute(true)
      try {
        const userActiveRef = ref(db, `women/user_active/${user.sub}`)
        const snapshot = await get(userActiveRef)

        if (snapshot.exists()) {
          const data = snapshot.val()
          if (data.start && data.end) {
            setRouteStart({
              lat: data.start.start_lat,
              lng: data.start.start_lng,
            })
            setRouteEnd({
              lat: data.end.end_lat,
              lng: data.end.end_lng,
            })
            
            // Start location tracking
            startLocationTracking(data.routeId)
            
            // Listen to room members
            listenToRoomMembers(data.routeId)
          }
        } else {
          console.error("No route data found for user")
        }
      } catch (error) {
        console.error("Error fetching route data:", error)
      } finally {
        setIsLoadingRoute(false)
      }
    }

    fetchRouteData()
    
    // Cleanup on unmount
    return () => {
      if (geoWatchId !== null) {
        navigator.geolocation.clearWatch(geoWatchId)
      }
    }
  }, [stage, user])



const startLocationTracking = (routeId) => {
    if (!navigator.geolocation) {
      console.error("Geolocation not supported")
      return
    }

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const lat = position.coords.latitude
        const lng = position.coords.longitude

        setCurrentLocation({ lat, lng })

        try {
          // Update user's current location in user_active
          await update(ref(db, `women/user_active/${user.sub}`), {
            current: { lat, lng },
          })

          // Update user's location in room members
          await update(
            ref(db, `women/rooms/${routeId}/members/${user.sub}`),
            {
              current_lat: lat,
              current_lng: lng,
            }
          )
        } catch (error) {
          console.error("Error updating location:", error)
        }
      },
      (error) => {
        console.error("Geolocation error:", error)
      },
      {
        enableHighAccuracy: true,
        maximumAge: 3000,
        timeout: 10000,
      }
    )

    setGeoWatchId(watchId)
  }

  const listenToRoomMembers = (routeId) => {
    const roomMembersRef = ref(db, `women/rooms/${routeId}/members`)

    const unsubscribe = onValue(roomMembersRef, (snapshot) => {
      if (snapshot.exists()) {
        const membersData = snapshot.val()
        const members = []

        // Filter out current user and transform data
        Object.entries(membersData).forEach(([userId, memberData]) => {
          if (userId !== user.sub) {
            members.push({
              userId,
              current_lat: memberData.current_lat,
              current_lng: memberData.current_lng,
              status: memberData.status,
            })
          }
        })

        setOtherUsers(members)
      }
    })

    // Cleanup listener on unmount
    return () => off(roomMembersRef)
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

            {currentLocation && (
              <Badge className="gap-2 bg-green-600 text-white border-0">
                <Navigation className="h-3 w-3" />
                Location Active
              </Badge>
            )}
          </div>
        </header>

        {/* Commute Component */}
        <div className="flex-1">
          <Commute onComplete={handleCommuteComplete} userLocation={currentLocation} />
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

          {currentLocation && (
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
              userLocation={currentLocation}
              isLoadingLocation={isLoadingLocation}
              onRequestLocation={requestLocation}
            />
          </div>
        </div>

        {/* MAP */}
        <div className="flex-1 relative">
          <GoogleMapComponent
            selectedFeature={feature.id}
            isLoadingLocation={isLoadingRoute}
            routeStart={routeStart}
            routeEnd={routeEnd}
            currentUserLocation={currentLocation}
            currentUser={user}
            otherUsers={otherUsers}
          />
        </div>
      </div>
    </div>
  )
}
