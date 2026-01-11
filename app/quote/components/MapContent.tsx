'use client';

import L from 'leaflet';
import { useEffect, useRef, useCallback } from 'react';

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
    // Accessing getContainer will throw if map is destroyed
    return !!map.getContainer();
  } catch {
    return false;
  }
}

// Pure Leaflet implementation - no react-leaflet hooks
export default function MapContent({ locations, mapCenter }: MapContentProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const isMountedRef = useRef(true);

  // Memoized safe fitBounds operation
  const safeFitBounds = useCallback((map: L.Map, bounds: [number, number][]) => {
    if (!isMountedRef.current || !isMapValid(map)) return;

    try {
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 12 });
    } catch {
      // Map may have been destroyed - silently ignore
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;

    if (!containerRef.current || mapRef.current) return;

    // Initialize map
    const map = L.map(containerRef.current, {
      center: mapCenter,
      zoom: 10,
      scrollWheelZoom: false,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '',
    }).addTo(map);

    mapRef.current = map;

    // Add markers
    const validLocations = locations.filter(loc => loc.coords);
    validLocations.forEach(loc => {
      if (loc.coords && isMapValid(map)) {
        const marker = L.marker([loc.coords.lat, loc.coords.lng]).addTo(map);
        marker.bindPopup(`<strong>${loc.type}</strong><br/>${loc.location.address}`);
      }
    });

    // Draw route line
    if (validLocations.length > 1 && isMapValid(map)) {
      const polylineCoords = validLocations.map(loc => [loc.coords!.lat, loc.coords!.lng] as [number, number]);
      L.polyline(polylineCoords, { color: '#8fb894', weight: 4, opacity: 0.7 }).addTo(map);
    }

    // Fit bounds with safety check
    if (validLocations.length > 0) {
      const bounds = validLocations.map(loc => [loc.coords!.lat, loc.coords!.lng] as [number, number]);
      // Use setTimeout instead of requestAnimationFrame for better cleanup handling
      const timeoutId = setTimeout(() => {
        safeFitBounds(map, bounds);
      }, 100);

      // Store timeout ID for cleanup
      return () => {
        clearTimeout(timeoutId);
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
    }

    // Cleanup when no bounds to fit
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
  }, [locations, mapCenter, safeFitBounds]);

  // Update map bounds when locations change (for dynamic updates)
  useEffect(() => {
    if (!isMapValid(mapRef.current)) return;

    const map = mapRef.current;
    const validLocations = locations.filter(loc => loc.coords);

    if (validLocations.length > 0) {
      const bounds = validLocations.map(loc => [loc.coords!.lat, loc.coords!.lng] as [number, number]);
      safeFitBounds(map, bounds);
    }
  }, [locations, safeFitBounds]);

  return <div ref={containerRef} className="w-full h-full" style={{ minHeight: '200px' }} />;
}
