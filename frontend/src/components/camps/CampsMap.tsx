import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { BloodDonationCamp } from '../../types';

interface CampsMapProps {
  camps: BloodDonationCamp[];
  userLat?: number;
  userLon?: number;
  radiusKm?: number;
  height?: string;
}

export const CampsMap: React.FC<CampsMapProps> = ({
  camps,
  userLat,
  userLon,
  radiusKm = 25,
  height = '500px',
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const defaultCenter: [number, number] =
        userLat && userLon ? [userLat, userLon] : [20.5937, 78.9629]; // Default to center of India

      const map = L.map(mapContainerRef.current, {
        center: defaultCenter,
        zoom: userLat && userLon ? 10 : 5,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 18,
      }).addTo(map);

      layerGroupRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update markers when camps or location changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();

    const bounds: L.LatLngExpression[] = [];

    // 1. Plot user location if available
    if (userLat && userLon) {
      bounds.push([userLat, userLon]);

      // Radius circle
      if (radiusKm) {
        L.circle([userLat, userLon], {
          radius: radiusKm * 1000,
          color: '#e11d48',
          fillColor: '#fda4af',
          fillOpacity: 0.1,
          weight: 1.5,
          dashArray: '4, 4',
        }).addTo(layerGroup);
      }

      // User location marker
      const userIcon = L.divIcon({
        className: 'user-marker',
        html: `
          <div style="background-color: #2563eb; width: 18px; height: 18px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 8px rgba(0,0,0,0.4);"></div>
        `,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });

      L.marker([userLat, userLon], { icon: userIcon })
        .bindPopup(`<b>📍 Your Selected Location</b><br/>Search Radius: ${radiusKm} km`)
        .addTo(layerGroup);
    }

    // 2. Plot real verified camp markers
    const campsWithCoords = camps.filter((c) => c.latitude !== null && c.longitude !== null);

    campsWithCoords.forEach((camp) => {
      const lat = camp.latitude!;
      const lon = camp.longitude!;
      bounds.push([lat, lon]);

      const campIcon = L.divIcon({
        className: 'camp-marker',
        html: `
          <div style="background-color: #e11d48; color: white; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.35);">
            🩸
          </div>
        `,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });

      const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
        `${camp.venue}, ${camp.address}, ${camp.city}`
      )}`;

      const confidenceLabel =
        camp.coordinateConfidence === 'EXACT'
          ? '<span style="color:#059669; font-size:10px; font-weight:bold;">● Exact Venue Coordinates</span>'
          : '<span style="color:#d97706; font-size:10px; font-weight:bold;">▲ City Center Approximation</span>';

      const popupContent = `
        <div style="font-family: inherit; min-width: 220px; line-height: 1.4;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <span style="font-size:10px; background:#dcfce7; color:#15803d; padding:2px 6px; border-radius:4px; font-weight:bold;">
              ${camp.source === 'E_RAKTKOSH' ? 'e-RaktKosh' : 'Verified Camp'}
            </span>
            ${confidenceLabel}
          </div>
          <h4 style="font-size: 13px; font-weight: bold; margin: 0 0 4px; color:#0f172a;">${camp.campName}</h4>
          <p style="font-size: 11px; color:#475569; margin: 0 0 4px;">
            📅 ${new Date(camp.campDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
            <br/>⏰ ${camp.startTime} – ${camp.endTime}
          </p>
          <p style="font-size: 11px; color:#334155; margin: 0 0 6px;">
            📍 <b>${camp.venue}</b>, ${camp.city}
            ${camp.distanceKm !== undefined && camp.distanceKm !== null ? `<br/><b>Distance:</b> ${camp.distanceKm} km away` : ''}
          </p>
          <div style="margin-top:6px; padding-top:6px; border-top:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center;">
            <span style="font-size:10px; color:#64748b;">${camp.organizerName}</span>
            <a href="${directionsUrl}" target="_blank" rel="noopener noreferrer" style="font-size:11px; color:#e11d48; font-weight:bold; text-decoration:none;">
              Directions ↗
            </a>
          </div>
        </div>
      `;

      L.marker([lat, lon], { icon: campIcon })
        .bindPopup(popupContent)
        .addTo(layerGroup);
    });

    if (bounds.length > 0) {
      if (bounds.length === 1) {
        map.setView(bounds[0], 12);
      } else {
        map.fitBounds(L.latLngBounds(bounds), { padding: [40, 40], maxZoom: 14 });
      }
    }
  }, [camps, userLat, userLon, radiusKm]);

  return (
    <div className="relative rounded-3xl overflow-hidden border border-slate-200 shadow-sm bg-white">
      <div ref={mapContainerRef} style={{ height, width: '100%' }} />
      <div className="absolute bottom-3 left-3 z-[1000] bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200/80 text-[11px] font-semibold text-slate-700 shadow-sm flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block"></span>
        <span>
          {camps.filter((c) => c.latitude !== null && c.longitude !== null).length} Verified Camps Plotted
        </span>
      </div>
    </div>
  );
};
