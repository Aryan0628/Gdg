function startTracking(socket, userId) {
  if (!navigator.geolocation) {
    alert("Geolocation not supported");
    return;
  }

  navigator.geolocation.watchPosition(
    (position) => {
      const payload = {
        userId,
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: Date.now()
      };

      socket.send(JSON.stringify(payload));
    },
    (error) => {
      console.error("Location error", error);
    },
    {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 10000
    }
  );
}

const socket = new WebSocket("wss://api.cityos.com/live");

socket.onopen = () => {
  startTracking(socket, "user_123");
};
