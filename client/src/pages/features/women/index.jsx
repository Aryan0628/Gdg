import { useState, useEffect, useRef } from "react"
import { Button } from "../../../ui/button"
import { Badge } from "../../../ui/badge"
import { Navigation, X, ArrowLeft } from "lucide-react"
import { useNavigate } from "react-router-dom"
// 1. Added missing imports (push, serverTimestamp)
import { ref, get, update, onValue, off, push, set, serverTimestamp } from "firebase/database"
import { db } from "../../../firebase/firebase"
import { useAuthStore } from "../../../store/useAuthStore"
import GoogleMapComponent from "../../../components/google-map"
import FeaturePanel from "../../../components/feature-panel"
import { WOMEN_FEATURE } from "./config"
import LocationAccess from "./LocationAccess"
import Commute from "./Commute"
// 2. Added axios import
import axios from "axios"

export default function WomenSafetyPage() {
  const [currentLocation, setCurrentLocation] = useState(null)
  const [isLoadingLocation, setIsLoadingLocation] = useState(false)
  const [stage, setStage] = useState("location")
  const [routeStart, setRouteStart] = useState(null)
  const [routeEnd, setRouteEnd] = useState(null)
  const [isLoadingRoute, setIsLoadingRoute] = useState(false)
  const [otherUsers, setOtherUsers] = useState([])
  const [activeRouteId, setActiveRouteId] = useState(null)
  
  // 3. Added State for Messages
  const [chatMessages, setChatMessages] = useState([]) 

  const geoWatchIdRef = useRef(null)
  const roomListenerUnsubscribeRef = useRef(null)
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const feature = WOMEN_FEATURE

  // ... (requestLocation function is fine) ...
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
      setStage("commute")
    } catch (error) {
      console.error("Location permission denied:", error)
    } finally {
      setIsLoadingLocation(false)
    }
  }

  // ... (useEffect for route data is fine) ...
  useEffect(() => {
    // Cleanup function
    return () => {
      if (geoWatchIdRef.current !== null) {
        navigator.geolocation.clearWatch(geoWatchIdRef.current)
      }
      if (roomListenerUnsubscribeRef.current) {
        roomListenerUnsubscribeRef.current()
      }
    }
  }, [])

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

            if (data.routeId) {
              setActiveRouteId(data.routeId)
              startLocationTracking(data.routeId)
              roomListenerUnsubscribeRef.current = listenToRoomMembers(data.routeId)
            }
          }
        }
      } catch (error) {
        console.error("Error fetching route data:", error)
      } finally {
        setIsLoadingRoute(false)
      }
    }

    fetchRouteData()
  }, [stage, user])

  // 4. Fixed Message Listener
  useEffect(() => {
    if (!activeRouteId) return

    const messageRef = ref(db, `women/rooms/${activeRouteId}/messages`)

    // Fixed: Listening to 'messageRef', not 'message'
    const unsubscribe = onValue(messageRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val()
        const loadedMessages = Object.entries(data).map(([key, value]) => ({
          id: key,
          ...value,
        }))
        setChatMessages(loadedMessages)
      } else {
        setChatMessages([])
      }
    })

    return () => off(messageRef)
  }, [activeRouteId])

  // ... (startLocationTracking and listenToRoomMembers are fine) ...
  const startLocationTracking = (routeId) => {
    if (!navigator.geolocation) return

    if (geoWatchIdRef.current !== null) {
      navigator.geolocation.clearWatch(geoWatchIdRef.current)
    }

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const lat = position.coords.latitude
        const lng = position.coords.longitude
        setCurrentLocation({ lat, lng })

        try {
          await update(ref(db, `women/user_active/${user.sub}`), {
            current: { lat, lng },
          })
          await update(ref(db, `women/rooms/${routeId}/members/${user.sub}`), {
            current_lat: lat,
            current_lng: lng,
          })
        } catch (error) {
          console.error("Error updating location:", error)
        }
      },
      (error) => console.error(error),
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
    )
    geoWatchIdRef.current = watchId
  }

  const listenToRoomMembers = (routeId) => {
    const roomMembersRef = ref(db, `women/rooms/${routeId}/members`)
    return onValue(roomMembersRef, (snapshot) => {
      if (snapshot.exists()) {
        const membersData = snapshot.val()
        const members = []
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
  }

  // 5. Fixed pushMessage function
  const pushMessage = async (messageText) => {
    // Note: We don't need to pass routeId/user as args, we can use state/context
    if (!messageText || messageText.trim() === "") {
      console.log("No message typed")
      return
    }
    if (!activeRouteId || !user) {
      console.log("Route or User is not defined")
      return
    }

    try {
      // 1. Realtime DB
      const messagesRef = ref(db, `women/rooms/${activeRouteId}/messages`)
      const newMessageRef = push(messagesRef)

      await set(newMessageRef, {
        userId: user.sub,
        userName: user.name || "Anonymous",
        text: messageText,
        timestamp: serverTimestamp(),
      })

      console.log("Message sent to Realtime DB")

      // 2. Firestore Backup via Axios
      // Ensure your API route is correct (leading slash usually needed)
      await axios.post(
        `/api/room/room_data`, 
        {
          roomId: activeRouteId,
          userId: user.sub,
          message: messageText,
        },
        { headers: { "Content-Type": "application/json" } }
      )
      console.log("Added message to backend")

    } catch (error) {
      console.error("Error sending message:", error)
    }
  }

  const handleCommuteComplete = () => setStage("map")

  if (stage === "location") return <LocationAccess onRequestLocation={requestLocation} isLoadingLocation={isLoadingLocation} />

  if (stage === "commute") {
     // ... (Commute Render is fine) ...
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

        <div className="flex-1">
          <Commute onComplete={handleCommuteComplete} userLocation={currentLocation} />
        </div>
      </div>
    )
  }

  // Stage 3: Final Map View
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* ... Header ... */}
      <header className="border-b border-zinc-800 bg-zinc-900">
        <div className="px-6 py-4 flex items-center justify-between">
            {/* ... Header content ... */}
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

      <div className="flex-1 flex overflow-hidden">
        <div className="w-96 overflow-y-auto border-r border-zinc-800 bg-zinc-900">
          <div className="p-6 space-y-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/dashboard")}
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
              routeId={activeRouteId}
              // 6. PASSED THE MISSING PROPS HERE
              chatMessages={chatMessages}
              onSendMessage={pushMessage} 
            />
          </div>
        </div>

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