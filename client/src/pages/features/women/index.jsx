import { useState, useEffect, useRef } from "react"
import { Button } from "../../../ui/button"
import { Badge } from "../../../ui/badge"
import { Navigation, ArrowLeft } from "lucide-react" 
import { useNavigate } from "react-router-dom"
import { ref, get, update, onValue, off, push, set, serverTimestamp } from "firebase/database"
import { db } from "../../../firebase/firebase"
import { useAuthStore } from "../../../store/useAuthStore"
import GoogleMapComponent from "../../../components/google-map"
import ChatSidePanel from "./chat-side-panel"
import { WOMEN_FEATURE } from "./config"
import LocationAccess from "./LocationAccess"
import Commute from "./Commute"
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
  const [chatMessages, setChatMessages] = useState([]) 

  const geoWatchIdRef = useRef(null)
  const roomListenerUnsubscribeRef = useRef(null)
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
      setStage("commute")
    } catch (error) {
      console.error("Location permission denied:", error)
    } finally {
      setIsLoadingLocation(false)
    }
  }

  useEffect(() => {
    return () => {
      if (geoWatchIdRef.current !== null) navigator.geolocation.clearWatch(geoWatchIdRef.current)
      if (roomListenerUnsubscribeRef.current) roomListenerUnsubscribeRef.current()
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
            setRouteStart({ lat: data.start.start_lat, lng: data.start.start_lng })
            setRouteEnd({ lat: data.end.end_lat, lng: data.end.end_lng })
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


  useEffect(() => {
    if (!activeRouteId) return
    const messageRef = ref(db, `women/rooms/${activeRouteId}/messages`)
    const unsubscribe = onValue(messageRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val()
        const loadedMessages = Object.entries(data).map(([key, value]) => ({
          id: key,
          ...value,
        }))

        loadedMessages.sort((a, b) => a.timestamp - b.timestamp)
        setChatMessages(loadedMessages)
      } else {
        setChatMessages([])
      }
    })
    return () => off(messageRef)
  }, [activeRouteId])

  const throttle=async(chatMessages)=>{

    try {
      await axios.post(`/api/model/throttle`,{
        message:chatMessages,
        userId:user.sub,
        routeId:activeRouteId
      },{headers:{"Content-Type": "application/json"}}
      )
      console.log("emergency agent activated",message)
    } catch (error) {
      console.log("Error calling emergency agent",error.message)
    }
  }
  const startLocationTracking = (routeId) => {
    if (!navigator.geolocation) return
    if (geoWatchIdRef.current !== null) navigator.geolocation.clearWatch(geoWatchIdRef.current)

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const lat = position.coords.latitude
        const lng = position.coords.longitude
        setCurrentLocation({ lat, lng })
        try {
          await update(ref(db, `women/user_active/${user.sub}`), { current: { lat, lng } })
          await update(ref(db, `women/rooms/${routeId}/members/${user.sub}`), { current_lat: lat, current_lng: lng })
        } catch (error) { console.error("Error updating location:", error) }
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

  const pushMessage = async (messageText) => {
    if (!messageText || !messageText.trim()) return
    if (!activeRouteId || !user) return

    try {
      // 1 Send to Firebase Realtime DB (Instant UI Update)
      const messagesRef = ref(db, `women/rooms/${activeRouteId}/messages`)
      const newMessageRef = push(messagesRef)
      await set(newMessageRef, {
        userId: user.sub,
        userName: user.name || "Anonymous",
        userImage: user.profileurl || user.picture || "", 
        text: messageText,
        timestamp: serverTimestamp(),
      })

      // 2  Backup to Firestore (Existing Logic)
      await axios.post(`/api/room/room_data`, {
          roomId: activeRouteId,
          userId: user.sub,
          message: messageText,
        },
        { headers: { "Content-Type": "application/json" } }
      )
      console.log("save root to firestore")

      const recentHistory = chatMessages
        .slice(-10) // Take last 10
        .map(msg => ({
          userId: msg.userId,
          message: msg.text // Map 'text' to 'message' as expected by Python Schema
        }));

        console.log("recentHistory",recentHistory);

      // Send to the Model Controller
      // We use 'currentUseremssage' to match the typo in your controller file
      const response=await axios.post(`/api/model/agent1`, {
        roomId: activeRouteId,
        messages: recentHistory,
        currentUseremssage: messageText, // The message just sent
        currentUserId: user.sub
      });

      console.log("response from agent1",response);
      const {final_score}=response.data;
      const baseRef = ref(db, `women/rooms/${activeRouteId}/finalScore`);
      if (final_score !== undefined && final_score !== null) {
        await set(baseRef, {
          score: final_score
        });
      }

      console.log("Final score added in rooms")
      let foundGeoHash = null;
      const geosHOT = await get(ref(db, "women/localrooms"));

      if (geosHOT.exists()) {
        const data = snapshot.val();

        for (const geoHash in data) {
          if (data[geoHash][routeId]) {
            foundGeoHash = geoHash;
            break;
          }
        }
      }
      console.log("Geohashfound",foundGeoHash);


      const localref=ref(db,(`women/localroom/${foundGeoHash}/${activeRouteId}`));
      if(final_score){
        const finalscorel=push(ref(localref,"finalScore"));
        await set(finalscorel,{
          score:final_score
        })
      }
      console.log("Initialised score in localroom")
      const snapshot = await get(ref(db, `women/localroom/${foundGeoHash}`));
      const result = {};

      if (snapshot.exists()) {
        const routes = snapshot.val();

        for (const routeId in routes) {
          const finalScoreNode = routes[routeId].finalScore;

          if (!finalScoreNode) continue;

          result[routeId] = Object.values(finalScoreNode).map(
            entry => entry.score
          );
        }
      }
      console.log("result ready to push to agent2 ",result);
 
    //now i am having roomIds with their score its time to send data to my model 
      const response_agent2=await axios.post(`/api/model/agent2`,{
        payload:result,
      });
      console.log("Message sent to AI for analysis");

    } catch (error) {
      console.error("Error sending message or analyzing:", error)
    }
  }

  const handleCommuteComplete = () => setStage("map")
  const handleCloseMap = () => navigate("/dashboard")

  if (stage === "location") return <LocationAccess onRequestLocation={requestLocation} isLoadingLocation={isLoadingLocation} />

  if (stage === "commute") {
    // ... [Keep existing Commute UI] ...
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col">
        <header className="border-b border-zinc-800 bg-zinc-900">
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => setStage("location")} className="text-zinc-400 hover:text-white mr-2 p-0">
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

  // --- STAGE 3: MAP & CHAT ---
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* HEADER */}
      <header className="border-b border-zinc-800 bg-zinc-900">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="text-zinc-400 hover:text-white mr-2 p-0">
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
          {currentLocation && (
            <Badge className="gap-2 bg-green-600 text-white border-0">
              <Navigation className="h-3 w-3" />
              Location Active
            </Badge>
          )}
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* LEFT PANEL - CHAT */}
        <div className="w-96 border-r border-zinc-800 bg-zinc-900 h-full">
          <ChatSidePanel 
            messages={chatMessages}
            currentUser={user}
            onSendMessage={pushMessage}
            onClose={handleCloseMap}
            routeId={activeRouteId}
          />
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