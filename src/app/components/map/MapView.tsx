"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export default function Map({ coords }: any) {
  return (
    <MapContainer
      center={[coords.lat, coords.lng]}
      zoom={14}
      style={{ height: "400px", width: "100%" }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap contributors"
      />
      <Marker position={[coords.lat, coords.lng]}>
        <Popup>You are here</Popup>
      </Marker>
    </MapContainer>
  );
}
