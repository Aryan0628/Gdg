import { useState, useCallback, memo, useEffect, useMemo } from "react"
import { GoogleMap, Marker, useJsApiLoader, OverlayView } from "@react-google-maps/api"
import { Loader2, MapPin, AlertCircle } from "lucide-react"
import { Button } from "../ui/button";


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
  streetViewControl: true,
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

// Memoized Current User Marker - Only updates when currentUserLocation or currentUser changes
const CurrentUserMarker = memo(({ currentUserLocation, currentUser }) => {
  if (!currentUserLocation || !currentUser) return null
  
  return (
    <OverlayView
      position={currentUserLocation}
      mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
    >
      <div className="relative">
        <div className="w-12 h-12 rounded-full border-3 border-blue-500 bg-blue-600 flex items-center justify-center shadow-lg overflow-hidden">
          {currentUser.picture ? (
            <img
              src={currentUser.picture}
              alt="Your Location"
              className="w-full h-full object-cover"
            />
          ) : (
            <MapPin className="w-6 h-6 text-white" />
          )}
        </div>
        <div className="absolute -bottom-2 -right-2 w-5 h-5 bg-green-500 rounded-full border-2 border-white" />
      </div>
    </OverlayView>
  )
})
CurrentUserMarker.displayName = "CurrentUserMarker"

// Memoized Other Users Markers - Only updates when otherUsers changes
const OtherUsersMarkers = memo(({ otherUsers }) => {
  return (
    <>
      {otherUsers.map((member) => (
        <OverlayView
          key={member.userId}
          position={{
            lat: member.current_lat,
            lng: member.current_lng,
          }}
          mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
        >
          <div className="relative">
            <div className="w-10 h-10 rounded-full border-2 border-purple-400 bg-purple-600 flex items-center justify-center shadow-lg overflow-hidden">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <div
              className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                member.status === "active" ? "bg-green-500" : "bg-gray-500"
              }`}
            />
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
  otherUsers = []
}) {
  const [map, setMap] = useState(null)

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY ,
  })

  const onLoad = useCallback((mapInstance) => {
    setMap(mapInstance)
    
    // Fit bounds to include both route markers if they exist
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

  // Update map bounds when route changes (initial view)
  useEffect(() => {
    if (map && routeStart && routeEnd) {
      const bounds = new window.google.maps.LatLngBounds()
      bounds.extend(new window.google.maps.LatLng(routeStart.lat, routeStart.lng))
      bounds.extend(new window.google.maps.LatLng(routeEnd.lat, routeEnd.lng))
      map.fitBounds(bounds, 100)
    }
  }, [map, routeStart, routeEnd])

  // Auto-center map on current user location as they move
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
          <p className="text-sm font-medium text-white">
            Google Maps API Key Required
          </p>
        </div>
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-zinc-950">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <p className="text-sm text-zinc-400">Loading Google Maps...</p>
        </div>
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

      {!routeStart && !routeEnd && !isLoadingLocation && (
        <div className="absolute inset-0 bg-black/80 z-10 flex items-center justify-center">
          <div className="text-center">
            <MapPin className="h-12 w-12 text-zinc-500 mx-auto" />
            <p className="text-sm text-white">Loading route data...</p>
          </div>
        </div>
      )}
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={currentUserLocation || routeStart || defaultCenter}
        defaultZoom={12}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={mapOptions}
      >
        {/* Route Start Marker */}
        {routeStart && (
          <Marker
            position={routeStart}
            title={`Start: ${routeStart.lat.toFixed(4)}, ${routeStart.lng.toFixed(4)}`}
            icon="http://maps.google.com/mapfiles/ms/icons/green-dot.png"
          />
        )}
        
        {/* Route End Marker */}
        {routeEnd && (
          <Marker
            position={routeEnd}
            title={`Destination: ${routeEnd.lat.toFixed(4)}, ${routeEnd.lng.toFixed(4)}`}
            icon="http://maps.google.com/mapfiles/ms/icons/green-dot.png"
          />
        )}

        {/* Current User Live Marker - Only updates when location changes */}
        <CurrentUserMarker currentUserLocation={currentUserLocation} currentUser={currentUser} />

        {/* Other Users Live Markers - Only updates when other users change */}
        <OtherUsersMarkers otherUsers={otherUsers} />
      </GoogleMap>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
        <div className="bg-zinc-900 px-4 py-2 rounded-full">
          <p className="text-xs text-white">Route visualization - Start and Destination markers</p>
        </div>
      </div>
    </>
  )
}

export default memo(GoogleMapComponent)
