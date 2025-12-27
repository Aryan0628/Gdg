import { useState, useCallback, memo } from "react"
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api"
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

function GoogleMapComponent({ userLocation, selectedFeature, isLoadingLocation }) {
  const [markers, setMarkers] = useState([])
  const [map, setMap] = useState(null)

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY ,
  })

  const onLoad = useCallback((mapInstance) => {
    setMap(mapInstance)
  }, [])

  const onUnmount = useCallback(() => {
    setMap(null)
  }, [])

  const handleMapClick = useCallback((e) => {
    if (!e.latLng) return

    setMarkers((prev) => [
      ...prev,
      {
        id: `marker-${Date.now()}`,
        lat: e.latLng.lat(),
        lng: e.latLng.lng(),
      },
    ])
  }, [])

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

      {!userLocation && !isLoadingLocation && (
        <div className="absolute inset-0 bg-black/80 z-10 flex items-center justify-center">
          <div className="text-center">
            <MapPin className="h-12 w-12 text-zinc-500 mx-auto" />
            <p className="text-sm text-white">Location access required</p>
          </div>
        </div>
      )}

      {markers.length > 0 && (
        <div className="absolute top-4 left-4 z-10">
          <Button size="sm" onClick={() => setMarkers([])}>
            Clear Pins ({markers.length})
          </Button>
        </div>
      )}

      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={userLocation || defaultCenter}
        zoom={userLocation ? 15 : 12}
        onLoad={onLoad}
        onUnmount={onUnmount}
        onClick={handleMapClick}
        options={mapOptions}
      >
        {userLocation && (
          <Marker
            position={userLocation}
            title="Your Location"
          />
        )}

        {markers.map((marker) => (
          <Marker
            key={marker.id}
            position={{ lat: marker.lat, lng: marker.lng }}
            title={`${selectedFeature || "Location"} report`}
          />
        ))}
      </GoogleMap>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
        <div className="bg-zinc-900 px-4 py-2 rounded-full">
          <p className="text-xs text-white">Click on map to pin locations</p>
        </div>
      </div>
    </>
  )
}

export default memo(GoogleMapComponent)
