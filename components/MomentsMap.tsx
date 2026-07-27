/* eslint-disable @next/next/no-img-element -- Leaflet popup images can be authenticated Drive streams. */
"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import Link from "next/link";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import { formatDateID } from "@/lib/format";

export type MapMoment = {
  id: string;
  title: string;
  date: string;
  lat: number;
  lng: number;
  locationName: string;
  coverSrc: string;
};

const markerIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const INDONESIA_CENTER: [number, number] = [-2.5, 118];

export default function MomentsMap({
  moments,
  height = "70vh",
  withPopupLink = true,
}: {
  moments: MapMoment[];
  height?: string;
  withPopupLink?: boolean;
}) {
  const boundsProps =
    moments.length === 0
      ? { center: INDONESIA_CENTER, zoom: 5 }
      : moments.length === 1
        ? { center: [moments[0].lat, moments[0].lng] as [number, number], zoom: 12 }
        : { bounds: L.latLngBounds(moments.map((moment) => [moment.lat, moment.lng] as [number, number])).pad(0.2) };

  return (
    <div style={{ height }} className="moments-map">
      <MapContainer {...boundsProps} scrollWheelZoom style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {moments.map((moment) => (
          <Marker key={moment.id} position={[moment.lat, moment.lng]} icon={markerIcon}>
            <Popup>
              <div className="map-popup-content">
                {moment.coverSrc && <img src={moment.coverSrc} alt="" />}
                <p className="map-popup-date">{formatDateID(moment.date)}</p>
                <p className="map-popup-title">{moment.title}</p>
                {moment.locationName && <p className="map-popup-location">{moment.locationName}</p>}
                {withPopupLink && <Link href={`/moment/${moment.id}`}>Baca ceritanya →</Link>}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
