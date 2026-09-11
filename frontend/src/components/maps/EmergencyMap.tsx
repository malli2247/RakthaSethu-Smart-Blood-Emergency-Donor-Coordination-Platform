import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Layers, Eye, EyeOff, Navigation, ShieldCheck } from 'lucide-react';

export interface MapMarkerItem {
  id: string;
  type: 'REQUEST' | 'HOSPITAL' | 'BLOOD_BANK' | 'DONOR_ZONE';
  name: string;
  latitude: number;
  longitude: number;
  bloodGroup?: string;
  urgency?: string;
  units?: number;
  address?: string;
  phone?: string;
}

interface EmergencyMapProps {
  centerLat?: number;
  centerLng?: number;
  zoom?: number;
  activeRadiusKm?: number;
  highlightedRadii?: number[];
  items?: MapMarkerItem[];
  height?: string;
}

export const EmergencyMap: React.FC<EmergencyMapProps> = ({
  centerLat = 17.4325,
  centerLng = 78.4072,
  zoom = 12,
  activeRadiusKm = 5,
  highlightedRadii = [5, 7, 9, 10, 20],
  items = [],
  height = '480px',
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const circlesGroupRef = useRef<L.LayerGroup | null>(null);

  const [showHospitals, setShowHospitals] = useState<boolean>(true);
  const [showBloodBanks, setShowBloodBanks] = useState<boolean>(true);
  const [showDonorZones, setShowDonorZones] = useState<boolean>(true);
  const [showRequests, setShowRequests] = useState<boolean>(true);
  const [showRings, setShowRings] = useState<boolean>(true);

  // Initialize map instance
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [centerLat, centerLng],
        zoom,
        zoomControl: true,
      });

      // Add OpenStreetMap tile layer (free, legally permissible, and cacheable)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18,
      }).addTo(map);

      layerGroupRef.current = L.layerGroup().addTo(map);
      circlesGroupRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update center
  useEffect(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([centerLat, centerLng], zoom);
    }
  }, [centerLat, centerLng, zoom]);

  // Render Markers and Radius Circles
  useEffect(() => {
    if (!mapInstanceRef.current || !layerGroupRef.current || !circlesGroupRef.current) return;

    layerGroupRef.current.clearLayers();
    circlesGroupRef.current.clearLayers();

    // 1. Render Concentric Search Rings around Center
    if (showRings && highlightedRadii.length > 0) {
      highlightedRadii.forEach((radius) => {
        const isActive = radius === activeRadiusKm;
        const circle = L.circle([centerLat, centerLng], {
          radius: radius * 1000,
          color: isActive ? '#e11d48' : '#94a3b8',
          weight: isActive ? 2.5 : 1.2,
          fillColor: isActive ? '#f43f5e' : '#cbd5e1',
          fillOpacity: isActive ? 0.08 : 0.02,
          dashArray: isActive ? undefined : '5, 5',
        });

        circle.bindTooltip(`${radius} km radius search zone`, {
          permanent: false,
          direction: 'top',
        });

        circlesGroupRef.current?.addLayer(circle);
      });
    }

    // 2. Render Plotted Items
    items.forEach((item) => {
      if (item.type === 'HOSPITAL' && !showHospitals) return;
      if (item.type === 'BLOOD_BANK' && !showBloodBanks) return;
      if (item.type === 'DONOR_ZONE' && !showDonorZones) return;
      if (item.type === 'REQUEST' && !showRequests) return;

      if (item.type === 'DONOR_ZONE') {
        // PRIVACY GUARANTEE: Never pin exact donor houses!
        // Render privacy-safe zone circle with ~1.2 km radius representation
        const donorCircle = L.circle([item.latitude, item.longitude], {
          radius: 1200,
          color: '#10b981',
          weight: 1.5,
          fillColor: '#34d399',
          fillOpacity: 0.15,
        });

        donorCircle.bindPopup(`
          <div style="font-family: sans-serif; font-size: 12px; min-width: 170px;">
            <div style="display: flex; align-items: center; gap: 4px; font-weight: bold; color: #065f46;">
              <span>🟢 Verified Donor Zone</span>
            </div>
            <p style="margin: 4px 0 2px; font-size: 11px; color: #374151;">Approximate location (Home address protected)</p>
            <p style="margin: 2px 0; font-weight: bold; color: #b91c1c;">Blood Group: ${item.bloodGroup || 'Compatible'}</p>
            <p style="margin: 2px 0; font-size: 11px; color: #6b7280;">City: ${item.address || 'Local District'}</p>
          </div>
        `);
        layerGroupRef.current?.addLayer(donorCircle);
      } else {
        // Standard pin for Hospitals, Blood Banks, and Requests
        let pinColor = '#2563eb';
        let pinLabel = 'H';

        if (item.type === 'BLOOD_BANK') {
          pinColor = '#7c3aed';
          pinLabel = 'BB';
        } else if (item.type === 'REQUEST') {
          pinColor = item.urgency === 'CRITICAL' ? '#dc2626' : '#ea580c';
          pinLabel = '🚨';
        }

        const customIcon = L.divIcon({
          className: 'custom-map-marker',
          html: `<div style="background-color: ${pinColor}; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 11px; box-shadow: 0 4px 6px rgba(0,0,0,0.25); border: 2px solid white;">${pinLabel}</div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        const marker = L.marker([item.latitude, item.longitude], { icon: customIcon });

        const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${item.latitude},${item.longitude}`;

        marker.bindPopup(`
          <div style="font-family: sans-serif; font-size: 12px; min-width: 190px;">
            <div style="font-weight: bold; color: #0f172a; font-size: 13px;">${item.name}</div>
            ${item.bloodGroup ? `<div style="color: #be123c; font-weight: bold; margin-top: 2px;">Requirement: ${item.units || 1} unit(s) of ${item.bloodGroup}</div>` : ''}
            ${item.address ? `<div style="color: #64748b; font-size: 11px; margin-top: 4px;">${item.address}</div>` : ''}
            <div style="margin-top: 8px; border-top: 1px solid #e2e8f0; padding-top: 6px;">
              <a href="${directionsUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background: #e11d48; color: white; padding: 4px 10px; border-radius: 4px; font-weight: bold; text-decoration: none; font-size: 11px;">
                Get Directions
              </a>
            </div>
          </div>
        `);

        layerGroupRef.current?.addLayer(marker);
      }
    });
  }, [items, showHospitals, showBloodBanks, showDonorZones, showRequests, showRings, activeRadiusKm, highlightedRadii, centerLat, centerLng]);

  return (
    <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-md bg-slate-100">
      {/* Top Filter Pill Bar */}
      <div className="absolute top-3 left-3 z-[1000] bg-white/95 backdrop-blur-sm p-1.5 rounded-xl shadow-lg border border-slate-200 text-xs flex flex-wrap items-center gap-1.5">
        <div className="flex items-center gap-1 font-bold text-slate-700 px-2">
          <Layers className="w-3.5 h-3.5 text-rose-600" />
          <span>Layers:</span>
        </div>

        <button
          onClick={() => setShowRequests(!showRequests)}
          className={`px-2 py-1 rounded-lg flex items-center gap-1 font-medium transition ${showRequests ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-400 line-through'}`}
        >
          <span>🚨 Requests</span>
        </button>

        <button
          onClick={() => setShowHospitals(!showHospitals)}
          className={`px-2 py-1 rounded-lg flex items-center gap-1 font-medium transition ${showHospitals ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400 line-through'}`}
        >
          <span>🏥 Hospitals</span>
        </button>

        <button
          onClick={() => setShowBloodBanks(!showBloodBanks)}
          className={`px-2 py-1 rounded-lg flex items-center gap-1 font-medium transition ${showBloodBanks ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-400 line-through'}`}
        >
          <span>🧪 Blood Banks</span>
        </button>

        <button
          onClick={() => setShowDonorZones(!showDonorZones)}
          className={`px-2 py-1 rounded-lg flex items-center gap-1 font-medium transition ${showDonorZones ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400 line-through'}`}
        >
          <ShieldCheck className="w-3 h-3 text-emerald-600" />
          <span>🟢 Donor Zones</span>
        </button>

        <button
          onClick={() => setShowRings(!showRings)}
          className={`px-2 py-1 rounded-lg font-medium transition ${showRings ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-400'}`}
        >
          <span>Search Rings</span>
        </button>
      </div>

      {/* Active Radius Tag */}
      <div className="absolute bottom-3 left-3 z-[1000] bg-slate-900/90 text-white px-3 py-1.5 rounded-lg shadow-lg text-xs font-semibold flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
        <span>Current Active Search Radius: {activeRadiusKm} km</span>
      </div>

      {/* Map DOM Container */}
      <div ref={mapContainerRef} style={{ height, width: '100%' }} />
    </div>
  );
};
