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

function GarbageMap({ userLocation, reports, selectedReport, onSelect, onVote }) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  });

  const getHazardColor = (level) => {
    switch (level) {
      case "High": return "bg-red-500";
      case "Medium": return "bg-orange-500";
      default: return "bg-zinc-500";
    }
  };

  if (loadError) return <div className="flex h-full items-center justify-center bg-zinc-950 text-white"><AlertCircle className="mr-2" /> Map Error</div>;
  if (!isLoaded) return <div className="flex h-full items-center justify-center bg-zinc-950"><Loader2 className="animate-spin text-blue-500" /></div>;

  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      center={userLocation}
      zoom={15}
      options={mapOptions}
    >
      {/* 🧍 User Marker */}
      <Marker position={userLocation} title="You are here" />

      {/* 🗑️ AI-Categorized Markers */}
      {reports.map((r) => (
        <Marker
          key={r.id}
          position={r.location}
          onClick={() => onSelect(r)}
          icon={{
            path: google.maps.SymbolPath.CIRCLE,
            fillColor: r.type === "DUSTBIN" ? "#22c55e" : "#ef4444",
            fillOpacity: 0.9,
            strokeWeight: 2,
            strokeColor: "#ffffff",
            // Scaling logic: Base size 7 + (Severity score 1-10)
            scale: r.type === "DUSTBIN" ? 8 : 6 + (r.severity || 1),
          }}
        />
      ))}

      
      {selectedReport && (
  <InfoWindow
   
    position={selectedReport.location}
    onCloseClick={() => onSelect(null)}
  >
    <div className="text-zinc-900 w-64 max-h-80 overflow-y-auto p-1">
      <img
        src={selectedReport.imageUrl}
        className="rounded-lg w-full h-32 object-cover bg-zinc-200"
        alt="report"
        // Handle broken images
        onError={(e) => { e.target.src = 'https://placehold.co/400x300?text=No+Image'; }}
      />

      <div className="mt-2 space-y-2">
        <h3 className="font-bold text-sm truncate">
          {selectedReport.title || "Untitled Report"}
        </h3>

        <div className="flex gap-2">
           <span className="text-[10px] bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">
             {selectedReport.type || "GARBAGE"}
           </span>
           {selectedReport.hazard && (
             <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded border border-red-200 font-bold">
               {selectedReport.hazard} Hazard
             </span>
           )}
        </div>

        <p className="text-[11px] text-zinc-600 italic leading-snug bg-blue-50/50 p-2 rounded">
          {selectedReport.aiAnalysis || "No analysis available for this report."}
        </p>

        {/* Only show severity if it exists and is not a dustbin */}
        {selectedReport.type !== "DUSTBIN" && selectedReport.severity && (
          <div className="w-full bg-zinc-200 h-1.5 rounded-full">
            <div 
              className="h-full bg-red-500 rounded-full" 
              style={{ width: `${selectedReport.severity * 10}%` }}
            />
          </div>
        )}
      </div>
    </div>
  </InfoWindow>
)}
    </GoogleMap>
  );
}

export default memo(GarbageMap);
