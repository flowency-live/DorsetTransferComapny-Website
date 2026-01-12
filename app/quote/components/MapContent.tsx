'use client';

import L from 'leaflet';
import { useEffect, useRef } from 'react';

import { Location } from '../lib/types';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon issue with Next.js
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: string })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface Coordinates {
  lat: number;
  lng: number;
}

interface LocationPoint {
  location: Location;
  type: 'pickup' | 'waypoint' | 'dropoff';
  coords?: Coordinates;
}

interface MapContentProps {
  locations: LocationPoint[];
  mapCenter: [number, number];
}

// Helper to safely check if map is still valid and mounted
function isMapValid(map: L.Map | null): map is L.Map {
  if (!map) return false;
  try {
    const container = map.getContainer();
    return !!container && !!container.parentElement && document.body.contains(container);
  } catch {
    return false;
  }
}

export default function MapContent({ locations, mapCenter }: MapContentProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const polylineRef = useRef<L.Polyline | null>(null);
  const isMountedRef = useRef(true);

  // Map initialization - runs ONCE on mount
  useEffect(() => {
    isMountedRef.current = true;

    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: mapCenter,
      zoom: 10,
      scrollWheelZoom: false,
      attributionControl: false,
      zoomAnimation: true,
      fadeAnimation: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '',
    }).addTo(map);

    mapRef.current = map;

    // Cleanup on unmount only
    return () => {
      isMountedRef.current = false;
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch {
          // Map may already be destroyed
        }
        mapRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - map initializes once

  // Markers and route update - runs when locations change
  useEffect(() => {
    const map = mapRef.current;
    if (!isMountedRef.current || !isMapValid(map)) return;

    // Clear existing markers
    markersRef.current.forEach(marker => {
      try {
        marker.remove();
      } catch {
        // Marker may already be removed
      }
    });
    markersRef.current = [];

    // Clear existing polyline
    if (polylineRef.current) {
      try {
        polylineRef.current.remove();
      } catch {
        // Polyline may already be removed
      }
      polylineRef.current = null;
    }

    const validLocations = locations.filter(loc => loc.coords);
    if (validLocations.length === 0) return;

    // Add markers
    validLocations.forEach(loc => {
      if (loc.coords && isMapValid(map)) {
        const marker = L.marker([loc.coords.lat, loc.coords.lng]).addTo(map);
        marker.bindPopup(`<strong>${loc.type}</strong><br/>${loc.location.address}`);
        markersRef.current.push(marker);
      }
    });

    // Draw route line if multiple points
    if (validLocations.length > 1 && isMapValid(map)) {
      const polylineCoords = validLocations.map(loc => [loc.coords!.lat, loc.coords!.lng] as [number, number]);
      polylineRef.current = L.polyline(polylineCoords, { color: '#8fb894', weight: 4, opacity: 0.7 }).addTo(map);
    }

    // Fit bounds to show all markers with animation
    if (validLocations.length > 0 && isMapValid(map)) {
      const bounds = validLocations.map(loc => [loc.coords!.lat, loc.coords!.lng] as [number, number]);
      try {
        map.fitBounds(bounds, {
          padding: [30, 30],
          maxZoom: 12,
          animate: true,
          duration: 0.5,
        });
      } catch {
        // Bounds fitting may fail if map is being destroyed
      }
    }
  }, [locations]);

  return <div ref={containerRef} className="w-full h-full" style={{ minHeight: '200px' }} />;
}
