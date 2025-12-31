import { useState, useEffect, useRef } from "react"
import { Button } from "../../../ui/button"
import { Badge } from "../../../ui/badge"
import { Navigation, ArrowLeft, AlertTriangle } from "lucide-react" 
import { useNavigate } from "react-router-dom"
import { ref, get, update, onValue, off, push, set, serverTimestamp, runTransaction, remove } from "firebase/database"
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
  const [finalScore, setfinalScore] = useState(null)
  const [routeGeoHash, setRouteGeoHash] = useState(null)
  
  const [isSosDisabled, setIsSosDisabled] = useState(false)
  const [showSafetyAlert, setShowSafetyAlert] = useState(false)
  const [sosTriggerCount, setSosTriggerCount] = useState(0)
  
  // --- NEW: Track WHO triggered SOS ---
  const [sosUserId, setSosUserId] = useState(null); 

  const geoWatchIdRef = useRef(null)
  const roomListenerUnsubscribeRef = useRef(null)
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const feature = WOMEN_FEATURE

  // --- Smart Exit Logic ---
  const handleExit = async () => {
    if (geoWatchIdRef.current !== null) {
      navigator.geolocation.clearWatch(geoWatchIdRef.current);
    }

    if (user && activeRouteId) {
      navigate("/dashboard");
      try {
        console.log("Exiting... Synchronizing room state.");

        // Decrement User Count
        const countRef = ref(db, `women/routes/${activeRouteId}/userCount`);
        await runTransaction(countRef, (currentCount) => {
          return (currentCount || 0) > 0 ? currentCount - 1 : 0;
        });

        // Remove Myself
        await remove(ref(db, `women/user_active/${user.sub}`));
        await remove(ref(db, `women/rooms/${activeRouteId}/members/${user.sub}`));

        // Check if room is empty
        const membersSnapshot = await get(ref(db, `women/rooms/${activeRouteId}/members`));
        
        if (!membersSnapshot.exists()) {
            console.log("Room is empty. Resetting room data.");
            const resetUpdates = {};
            resetUpdates[`women/rooms/${activeRouteId}/messages`] = null;
            resetUpdates[`women/rooms/${activeRouteId}/sos_triggered`] = null;
            resetUpdates[`women/rooms/${activeRouteId}/finalScore`] = null;
            resetUpdates[`women/rooms/${activeRouteId}/sos_user_id`] = null;
            await update(ref(db), resetUpdates);
        }

      } catch (error) {
        console.error("Cleanup failed:", error);
      }
    }
  };

  // --- UI Logic ---
  const getScoreUI = (score, sosCount, isMySos) => {
    if (sosCount > 0 || isMySos) {
        return { 
            color: "text-red-500", 
            bg: "bg-red-950/80 border-red-500 animate-pulse shadow-[0_0_15px_rgba(220,38,38,0.5)]", 
            dot: "bg-red-500 animate-ping shadow-[0_0_20px_rgba(239,68,68,1)]",
            text: "SOS ACTIVE" 
        };
    }
    if (score === null) return { color: "text-zinc-500", bg: "bg-zinc-900 border-zinc-700", dot: "bg-zinc-600", text: "Initializing..." };
    const s = Number(score);
    if (s >= 8) return { color: "text-emerald-400", bg: "bg-emerald-950/30 border-emerald-500/30", dot: "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]", text: `Safety Score: ${s}/10` };
    if (s >= 5) return { color: "text-amber-400", bg: "bg-amber-950/30 border-amber-500/30", dot: "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]", text: `Caution: ${s}/10` };
    return { color: "text-red-500", bg: "bg-red-950/30 border-red-500/50", dot: "bg-red-500 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.7)]", text: `CRITICAL: ${s}/10` };
  }

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

  // --- LISTENERS ---
  useEffect(() => {
    if (!activeRouteId) return;
    
    // Listen for count
    const sosRef = ref(db, `women/rooms/${activeRouteId}/sos_triggered`);
    const unsubscribeSos = onValue(sosRef, (snapshot) => {
      const count = snapshot.val();
      setSosTriggerCount(count || 0); 
    });

    // Listen for WHO triggered it
    const sosUserRef = ref(db, `women/rooms/${activeRouteId}/sos_user_id`);
    const unsubscribeUser = onValue(sosUserRef, (snapshot) => {
      setSosUserId(snapshot.val()); 
    });

    return () => {
        off(sosRef);
        off(sosUserRef);
    };
  }, [activeRouteId]);

  useEffect(() => {
    if (!activeRouteId) return;
    const scoreRef = ref(db, `women/rooms/${activeRouteId}/finalScore/score`);
    const unsubscribe = onValue(scoreRef, (snapshot) => {
        setfinalScore(snapshot.exists() ? snapshot.val() : null); 
    });
    return () => off(scoreRef);
  }, [activeRouteId]); 

  // Auto-Throttle Logic
  useEffect(() => {
    if (finalScore === null) return;
    const scoreNum = Number(finalScore);
    if (scoreNum < 4 && !isSosDisabled) {
        throttle();
    } else if (scoreNum < 7 && !isSosDisabled) {
        setShowSafetyAlert(true);
    }
  }, [finalScore]); 

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
              const roomGeoRef = ref(db, `women/routes/${data.routeId}/geoHash`)
              const unsubscribeGeo = onValue(roomGeoRef, (geoSnap) => {
                if (geoSnap.exists()) setRouteGeoHash(geoSnap.val());
              });
              startLocationTracking(data.routeId)
              roomListenerUnsubscribeRef.current = listenToRoomMembers(data.routeId)
              return () => off(roomGeoRef);
            }
          }
        }
      } catch (error) { console.error("Error fetching route data:", error) } 
      finally { setIsLoadingRoute(false) }
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
      } else { setChatMessages([]) }
    })
    return () => off(messageRef)
  }, [activeRouteId])
  
  // --- UPDATED: Throttle Function ---
  const throttle = async () => {
    console.log("Triggering Emergency Throttle...")
    setIsSosDisabled(true);
    setShowSafetyAlert(false);
    try {
      await runTransaction(ref(db, `women/rooms/${activeRouteId}/sos_triggered`), (currentCount) => {
        return (currentCount || 0) + 1;
      });
      
      // Save WHO triggered it
      await update(ref(db, `women/rooms/${activeRouteId}`), {
          sos_user_id: user.sub
      });

      const formattedMessages = chatMessages.map(msg => ({
        userId: msg.userId,  
        message: msg.text 
      }));
    
      await axios.post(`/api/model/throttle`,{
        message: formattedMessages, 
        userId: user.sub,
        routeId: activeRouteId
      },{headers:{"Content-Type": "application/json"}}
      )
    } catch (error) {
      console.log("Error calling emergency agent", error.message)
    }
  }

  const handleConfirmUnsafe = () => {
    throttle(); 
    setShowSafetyAlert(false);
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
      const messagesRef = ref(db, `women/rooms/${activeRouteId}/messages`)
      const newMessageRef = push(messagesRef)
      await set(newMessageRef, {
        userId: user.sub,
        userName: user.name || "Anonymous",
        userImage: user.profileurl || user.picture || "", 
        text: messageText,
        timestamp: serverTimestamp(),
      })

      await axios.post(`/api/room/room_data`, {
          roomId: activeRouteId,
          userId: user.sub,
          message: messageText,
        }, { headers: { "Content-Type": "application/json" } }
      )

      const recentHistory = chatMessages.slice(-10).map(msg => ({
          userId: msg.userId,
          message: msg.text 
      }));

      const response = await axios.post(`/api/model/agent1`, {
        roomId: activeRouteId,
        messages: recentHistory,
        currentUserMessage: messageText, 
        currentUserId: user.sub,
      });

      const { final_score } = response.data;
      const baseRef = ref(db, `women/rooms/${activeRouteId}/finalScore`);
      if (final_score !== undefined && final_score !== null) {
        await set(baseRef, { score: final_score });
      }

      let newScoreKey = null;
      if(final_score){
        const localScoreListRef = ref(db, `women/localroom/${routeGeoHash}/${activeRouteId}/finalScore`);
        const newScoreRef = push(localScoreListRef); 
        newScoreKey = newScoreRef.key; 
        await update(newScoreRef, { score: final_score })
      }

      const snapshot = await get(ref(db, `women/localroom/${routeGeoHash}`));
      const result = {};
      if (snapshot.exists()) {
        const routes = snapshot.val();
        for (const routeId in routes) {
          const finalScoreNode = routes[routeId].finalScore; 
          if (!finalScoreNode) continue;
          let scoresArray = Object.values(finalScoreNode).map(e => e.score);
          if (routeId === activeRouteId && newScoreKey) {
             const isMyScoreAlreadyHere = finalScoreNode.hasOwnProperty(newScoreKey);
             if (!isMyScoreAlreadyHere && final_score) scoresArray.push(final_score);
          }
          result[routeId] = scoresArray;
        }
      } else {
        if (final_score) result[activeRouteId] = [final_score];
      }
      const response_agent2 = await axios.post(`/api/model/agent2`, { payload: result });
      console.log("Agent 2 Analysis:", response_agent2.data);
    } catch (error) { console.error("Error sending message or analyzing:", error) }
  }

  const handleCommuteComplete = () => setStage("map")
  const handleCloseMap = () => navigate("/dashboard")

  if (stage === "location") return <LocationAccess onRequestLocation={requestLocation} isLoadingLocation={isLoadingLocation} />

  if (stage === "commute") {
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
          </div>
        </header>
        <div className="flex-1">
          <Commute onComplete={handleCommuteComplete} userLocation={currentLocation} />
        </div>
      </div>
    )
  }

  const uiStyles = getScoreUI(finalScore, sosTriggerCount, isSosDisabled);

  return (
    <div className="h-screen bg-zinc-950 flex flex-col relative overflow-hidden"> 
      <header className="border-b border-zinc-800 bg-zinc-900 shrink-0">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={handleExit} className="text-zinc-400 hover:text-white mr-2 p-0">
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
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-500 ${uiStyles.bg}`}>
                <div className={`h-2.5 w-2.5 rounded-full transition-all duration-500 ${uiStyles.dot}`} />
                <span className={`text-sm font-semibold transition-colors duration-500 ${uiStyles.color}`}>
                    {uiStyles.text}
                </span>
            </div>

            {currentLocation && (
              <Badge className="gap-2 bg-zinc-800 text-zinc-300 border-zinc-700">
                <Navigation className="h-3 w-3" />
                Live
              </Badge>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        <div className="w-96 border-r border-zinc-800 bg-zinc-900 h-full flex flex-col z-10 relative shadow-xl">
          <ChatSidePanel 
            messages={chatMessages}
            currentUser={user}
            onSendMessage={pushMessage}
            onClose={handleExit} 
            routeId={activeRouteId}
            onThrottle={throttle} 
            isSosDisabled={isSosDisabled} 
            finalScore={finalScore}
            otherUsers={otherUsers}
            sosTriggerCount={sosTriggerCount} 
          />
        </div>

        <div className="flex-1 relative bg-zinc-900">
          <GoogleMapComponent
            selectedFeature={feature.id}
            isLoadingLocation={isLoadingRoute}
            routeStart={routeStart}
            routeEnd={routeEnd}
            currentUserLocation={currentLocation}
            currentUser={user}
            otherUsers={otherUsers}
            sosTriggerCount={sosTriggerCount} /* PASSED TO MAP */
            sosUserId={sosUserId}             /* PASSED TO MAP */
          />
        </div>
      </div>

      {showSafetyAlert && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-red-500/50 rounded-xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-6 w-6 text-red-500" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white mb-2">Safety Check</h3>
                <p className="text-zinc-300 text-sm leading-relaxed mb-4">
                  The safety score for this area has dropped.
                  <br /><br />
                  <span className="font-semibold text-white">Are you feeling unsafe?</span>
                </p>
                <div className="flex items-center justify-end gap-3">
                  <Button variant="ghost" onClick={() => setShowSafetyAlert(false)} className="text-zinc-400 hover:text-white hover:bg-zinc-800">No, I'm fine</Button>
                  <Button onClick={handleConfirmUnsafe} className="bg-red-600 hover:bg-red-700 text-white border-0">Yes, Report Issue</Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}