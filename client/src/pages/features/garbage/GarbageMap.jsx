import { useCallback, memo, useState } from "react";
import {
  GoogleMap,
  Marker,
  InfoWindow,
  useJsApiLoader,
} from "@react-google-maps/api";
import { Loader2, MapPin, AlertCircle } from "lucide-react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import axios from "axios";

const mapContainerStyle = {
  width: "100%",
  height: "100%",
};

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
    {
      featureType: "road",
      elementType: "geometry.fill",
      stylers: [{ color: "#2c2c2c" }],
    },
    {
      featureType: "water",
      elementType: "geometry",
      stylers: [{ color: "#000000" }],
    },
  ],
};

function GarbageMap({
  userLocation,
  reports,
  selectedReport,
  onSelect,
  onVote,
  onToggleType,
}) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  });

  const handleMarkerClick = useCallback(
    (report) => {
      onSelect(report);
    },
    [onSelect]
  );
  if (loadError || !import.meta.env.VITE_GOOGLE_MAPS_API_KEY) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-zinc-950">
        <div className="text-center space-y-3">
          <AlertCircle className="h-10 w-10 text-yellow-500 mx-auto" />
          <p className="text-sm text-white">Google Maps API key missing</p>
        </div>
      </div>
    );
  }

  /* ⏳ Loading state */
  if (!isLoaded) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-zinc-950">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  /* 📍 No location */
  if (!userLocation) {
    return (
      <div className="absolute inset-0 bg-black/80 z-10 flex items-center justify-center">
        <div className="text-center">
          <MapPin className="h-12 w-12 text-zinc-500 mx-auto" />
          <p className="text-sm text-white">Location access required</p>
        </div>
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      center={userLocation}
      zoom={15}
      options={mapOptions}
    >
      {/* 🧍 User Marker */}
      <Marker
        position={userLocation}
        title="Your Location"
        icon={{
          url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png",
        }}
      />

      {/* 🗑️ Garbage Markers */}
      {reports.map((r) => (
        <Marker
          key={r.id}
          position={r.location}
          onClick={() => handleMarkerClick(r)}
          icon={{
  url:
    r.type === "DUSTBIN"
      ? "http://maps.google.com/mapfiles/ms/icons/green-dot.png"
      : "http://maps.google.com/mapfiles/ms/icons/red-dot.png",
}}
        />
      ))}

      {/* ℹ️ Info Window */}
      {selectedReport && (
        <InfoWindow
          position={selectedReport.location}
          onCloseClick={() => onSelect(null)}
        >
          <div className="text-black w-56 space-y-2">
            <img
              src={selectedReport.imageUrl}
              className="rounded-md w-full h-28 object-cover"
              alt="garbage"
            />

            <h3 className="font-semibold text-sm">{selectedReport.title}</h3>

            <div className="flex justify-between pt-2">
              <button
                onClick={() => onVote(selectedReport.id, "UP")}
                className="flex items-center gap-1 text-green-600"
              >
                <ThumbsUp size={16} />
                {selectedReport.upvotes}
              </button>

              <button
                onClick={() => onVote(selectedReport.id, "DOWN")}
                className="flex items-center gap-1 text-red-600"
              >
                <ThumbsDown size={16} />
                {selectedReport.downvotes}
              </button>
            </div>
            <button
              onClick={() =>
                onToggleType(
                  selectedReport.id,
                  selectedReport.type === "GARBAGE" ? "DUSTBIN" : "GARBAGE"
                )
              }
              className={`w-full mt-3 py-1 rounded text-xs font-semibold ${
                selectedReport.type === "GARBAGE"
                  ? "bg-green-600 text-white"
                  : "bg-red-600 text-white"
              }`}
            >
              {selectedReport.type === "GARBAGE"
                ? "Mark as Dustbin Available"
                : "Mark as Garbage"}
            </button>
          </div>
        </InfoWindow>
      )}
    </GoogleMap>
  );
}

export default memo(GarbageMap);
