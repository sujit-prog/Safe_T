import { useEffect, useState } from "react";

export function useGeolocation() {
  const [coords, setCoords] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }),
      () => setError("Location permission denied")
    );
  }, []);

  return { coords, error };
}
