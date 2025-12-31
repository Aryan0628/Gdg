import { useState, useCallback, memo, useEffect, useMemo } from "react"
import { GoogleMap, Marker, useJsApiLoader, OverlayView } from "@react-google-maps/api"
import { Loader2, MapPin, AlertCircle, ShieldAlert } from "lucide-react"

const mapContainerStyle = {
  width: "100%",
  height: "100%",
}

const defaultCenter = {
  lat: 28.6139,
  lng: 77.209,
}

const mapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: false,
  styles: [
    { elementType: "geometry", stylers: [{ color: "#212121" }] },
    { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#212121" }] },
    { featureType: "road", elementType: "geometry.fill", stylers: [{ color: "#2c2c2c" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#000000" }] },
  ],
}

// --- 1. CURRENT USER MARKER (ME) ---
const CurrentUserMarker = memo(({ currentUserLocation, userImage, isMySos }) => {
  if (!currentUserLocation) return null;

  return (
    <OverlayView
      position={currentUserLocation}
      mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
    >
      {/* Container with high Z-index to stay on top */}
      <div className="relative flex items-center justify-center z-[1000]">
        
        {/* Red Pulse Animation (Absolute position BEHIND the image) */}
        {isMySos && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
            <div className="w-24 h-24 bg-red-500/30 rounded-full animate-ping" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-red-500/50 rounded-full animate-pulse" />
          </div>
        )}

        {/* Profile Picture Circle */}
        <div 
          className={`
            relative z-10 w-14 h-14 rounded-full flex items-center justify-center overflow-hidden bg-zinc-800 transition-all duration-300
            ${isMySos 
              ? "border-[3px] border-red-600 shadow-[0_0_25px_rgba(220,38,38,1)] scale-110" 
              : "border-[3px] border-white shadow-lg ring-2 ring-blue-500/30"
            }
          `}
        >
          {userImage ? (
            <img
              src={userImage}
              alt="Me"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-full h-full bg-blue-600 flex items-center justify-center">
               <MapPin className="w-6 h-6 text-white" />
            </div>
          )}
        </div>

        {/* Status Badge Icon */}
        {isMySos && (
          <div className="absolute -bottom-1 -right-1 z-20 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center bg-red-600 animate-bounce">
              <ShieldAlert className="w-3 h-3 text-white" />
          </div>
        )}
      </div>
    </OverlayView>
  )
})
CurrentUserMarker.displayName = "CurrentUserMarker"

// --- 2. OTHER USERS MARKERS (THEM) ---
const OtherUsersMarkers = memo(({ otherUsers, sosTriggerCount, sosUserId, currentUserId }) => {
  
  const visibleUsers = useMemo(() => {
    // 1. If SOS is OFF -> Show NO ONE.
    if (!sosTriggerCount || sosTriggerCount === 0) return [];
    
    // 2. Filter: Show user ONLY if they are the SOS triggerer AND NOT ME
    return otherUsers.filter(u => {
        const isSOSUser = String(u.userId) === String(sosUserId);
        const isNotMe = String(u.userId) !== String(currentUserId);
        return isSOSUser && isNotMe;
    });
  }, [otherUsers, sosTriggerCount, sosUserId, currentUserId]);

  return (
    <>
      {visibleUsers.map((member) => (
        <OverlayView
          key={member.userId}
          position={{
            lat: member.current_lat,
            lng: member.current_lng,
          }}
          mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
        >
          <div className="relative flex items-center justify-center z-[500]">
            {/* Red Pulse */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                <div className="w-28 h-28 bg-red-600/40 rounded-full animate-ping" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-red-600/60 rounded-full animate-pulse" />
            </div>

            {/* Red Icon (No Profile Pic) */}
            <div className="relative z-10 w-12 h-12 rounded-full border-4 border-red-500 bg-red-800 flex items-center justify-center shadow-[0_0_40px_rgba(220,38,38,1)]">
              <AlertCircle className="w-7 h-7 text-white animate-pulse" />
            </div>

            {/* Label */}
            <div className="absolute -bottom-9 bg-red-700 text-white text-[10px] font-black px-3 py-1 rounded-full shadow-lg border border-red-500 uppercase tracking-widest whitespace-nowrap">
              SOS ACTIVE
            </div>
          </div>
        </OverlayView>
      ))}
    </>
  )
})
OtherUsersMarkers.displayName = "OtherUsersMarkers"

function GoogleMapComponent({ 
  selectedFeature, 
  isLoadingLocation, 
  routeStart, 
  routeEnd, 
  currentUserLocation,
  currentUser,
  otherUsers = [],
  sosTriggerCount, 
  sosUserId        
}) {
  const [map, setMap] = useState(null)

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY ,
  })

  // Extract simple props to pass to memoized components
  const userImage = currentUser?.picture || currentUser?.photoURL || currentUser?.profileurl;
  const currentUserId = currentUser?.sub;
  const isMySos = sosTriggerCount > 0 && String(sosUserId) === String(currentUserId);

  const onLoad = useCallback((mapInstance) => {
    setMap(mapInstance)
    if (routeStart && routeEnd && mapInstance) {
      const bounds = new window.google.maps.LatLngBounds()
      bounds.extend(new window.google.maps.LatLng(routeStart.lat, routeStart.lng))
      bounds.extend(new window.google.maps.LatLng(routeEnd.lat, routeEnd.lng))
      mapInstance.fitBounds(bounds, 100)
    }
  }, [routeStart, routeEnd])

  const onUnmount = useCallback(() => {
    setMap(null)
  }, [])

  useEffect(() => {
    if (map && routeStart && routeEnd) {
      const bounds = new window.google.maps.LatLngBounds()
      bounds.extend(new window.google.maps.LatLng(routeStart.lat, routeStart.lng))
      bounds.extend(new window.google.maps.LatLng(routeEnd.lat, routeEnd.lng))
      map.fitBounds(bounds, 100)
    }
  }, [map, routeStart, routeEnd])

  useEffect(() => {
    if (map && currentUserLocation) {
      map.panTo({
        lat: currentUserLocation.lat,
        lng: currentUserLocation.lng,
      })
    }
  }, [map, currentUserLocation])


  if (loadError || !import.meta.env.VITE_GOOGLE_MAPS_API_KEY) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-zinc-950">
        <div className="text-center space-y-4 max-w-md px-6">
          <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto" />
          <p className="text-sm font-medium text-white">Google Maps API Key Required</p>
        </div>
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-zinc-950">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <>
      {isLoadingLocation && (
        <div className="absolute inset-0 bg-black/80 z-10 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      )}

      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={currentUserLocation || routeStart || defaultCenter}
        defaultZoom={15}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={mapOptions}
      >
        {routeStart && <Marker position={routeStart} icon="http://maps.google.com/mapfiles/ms/icons/green-dot.png" />}
        {routeEnd && <Marker position={routeEnd} icon="http://maps.google.com/mapfiles/ms/icons/green-dot.png" />}

        {/* MY MARKER */}
        <CurrentUserMarker 
            currentUserLocation={currentUserLocation} 
            userImage={userImage}
            isMySos={isMySos}
        />

        {/* OTHER MARKERS */}
        <OtherUsersMarkers 
            otherUsers={otherUsers} 
            sosTriggerCount={sosTriggerCount}
            sosUserId={sosUserId}
            currentUserId={currentUserId}
        />
      </GoogleMap>

      {/* Floating Status Bar */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
        <div className={`
            px-4 py-2 rounded-full shadow-xl backdrop-blur border transition-all duration-500
            ${sosTriggerCount > 0 
                ? "bg-red-900/90 border-red-500 animate-pulse" 
                : "bg-zinc-900/90 border-zinc-800"
            }
        `}>
          <p className={`
              text-[10px] uppercase font-bold tracking-widest 
              ${sosTriggerCount > 0 ? "text-red-100" : "text-zinc-400"}
          `}>
            {sosTriggerCount > 0 ? "⚠️ Emergency Mode Active" : "🛡️ Secure Route Monitoring"}
          </p>
        </div>
      </div>
    </>
  )
}

export default memo(GoogleMapComponent)