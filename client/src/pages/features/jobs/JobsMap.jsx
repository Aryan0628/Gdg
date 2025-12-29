import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";
import { Loader2 } from "lucide-react";

const containerStyle = {
  width: "100%",
  height: "100%",
};

export default function JobsMap({
  jobs,
  selectedJob,
  onSelect,
  userLocation,
}) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  });

  if (!isLoaded) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={userLocation}
      zoom={13}
      options={{ fullscreenControl: false }}
    >
      {/* JOB MARKERS */}
      {jobs.map((job) => (
        <Marker
          key={job.id}
          position={job.location}
          onClick={() => onSelect(job)}
          icon={{
            url:
              selectedJob?.id === job.id
                ? "http://maps.google.com/mapfiles/ms/icons/green-dot.png"
                : "http://maps.google.com/mapfiles/ms/icons/blue-dot.png",
          }}
        />
      ))}
    </GoogleMap>
  );
}
