import { config } from '../config';
import { logger } from '../utils/logger';
import { calculateDistanceKm } from '../utils/distance';

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  formattedAddress: string;
  city?: string;
  state?: string;
  isFallback: boolean;
}

export interface MapsHealthStatus {
  status: 'configured' | 'unavailable' | 'needs verification';
  details: string;
  provider: 'google-maps' | 'haversine-local';
  latencyMs?: number;
}

// Known regional municipal centroids for safe offline / unconfigured fallback
const REGIONAL_CITY_CENTROIDS: Record<string, { lat: number; lng: number; state: string }> = {
  dehradun: { lat: 30.3165, lng: 78.0322, state: 'Uttarakhand' },
  delhi: { lat: 28.6139, lng: 77.209, state: 'Delhi' },
  mumbai: { lat: 19.076, lng: 72.8777, state: 'Maharashtra' },
  hyderabad: { lat: 17.385, lng: 78.4867, state: 'Telangana' },
  bengaluru: { lat: 12.9716, lng: 77.5946, state: 'Karnataka' },
  bangalore: { lat: 12.9716, lng: 77.5946, state: 'Karnataka' },
  chennai: { lat: 13.0827, lng: 80.2707, state: 'Tamil Nadu' },
  kolkata: { lat: 22.5726, lng: 88.3639, state: 'West Bengal' },
  pune: { lat: 18.5204, lng: 73.8567, state: 'Maharashtra' },
  chandigarh: { lat: 30.7333, lng: 76.7794, state: 'Punjab' },
  jaipur: { lat: 26.9124, lng: 75.7873, state: 'Rajasthan' },
  lucknow: { lat: 26.8467, lng: 80.9462, state: 'Uttar Pradesh' },
};

export class MapsService {
  /**
   * Geocodes a text address or hospital location into geographic coordinates.
   * Uses Google Geocoding API if configured; falls back safely to regional centroids without blocking.
   */
  static async geocode(address: string): Promise<GeocodeResult> {
    const cleanAddress = (address || '').trim();
    if (!cleanAddress) {
      return {
        latitude: 30.3165,
        longitude: 78.0322,
        formattedAddress: 'Dehradun, Uttarakhand',
        city: 'Dehradun',
        state: 'Uttarakhand',
        isFallback: true,
      };
    }

    const apiKey = config.maps.apiKey;

    if (apiKey) {
      try {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
          cleanAddress
        )}&key=${encodeURIComponent(apiKey)}`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data: any = await res.json();
          if (data.status === 'OK' && data.results && data.results.length > 0) {
            const first = data.results[0];
            const loc = first.geometry.location;

            let city: string | undefined;
            let state: string | undefined;

            for (const comp of first.address_components || []) {
              if (comp.types.includes('locality')) city = comp.long_name;
              if (comp.types.includes('administrative_area_level_1')) state = comp.long_name;
            }

            return {
              latitude: loc.lat,
              longitude: loc.lng,
              formattedAddress: first.formatted_address,
              city,
              state,
              isFallback: false,
            };
          } else {
            logger.warn(`[MapsService] Google Geocoding API returned status: ${data.status}`);
          }
        }
      } catch (err: any) {
        logger.error('[MapsService] Exception during Google geocoding query:', err?.message || err);
      }
    }

    // Honest Fallback to Known Centroids (Zero External Dependencies)
    const lower = cleanAddress.toLowerCase();
    for (const [cityName, coords] of Object.entries(REGIONAL_CITY_CENTROIDS)) {
      if (lower.includes(cityName)) {
        return {
          latitude: coords.lat,
          longitude: coords.lng,
          formattedAddress: `${cleanAddress}, ${coords.state}`,
          city: cityName.charAt(0).toUpperCase() + cityName.slice(1),
          state: coords.state,
          isFallback: true,
        };
      }
    }

    // Default safe fallback (Dehradun regional hub)
    return {
      latitude: 30.3165,
      longitude: 78.0322,
      formattedAddress: cleanAddress,
      city: 'Dehradun',
      state: 'Uttarakhand',
      isFallback: true,
    };
  }

  /**
   * Reverse geocodes coordinates to a coarse, privacy-preserving regional address label.
   */
  static async reverseGeocode(latitude: number, longitude: number): Promise<{ regionLabel: string; city?: string }> {
    const apiKey = config.maps.apiKey;

    if (apiKey) {
      try {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&result_type=locality|administrative_area_level_2&key=${encodeURIComponent(
          apiKey
        )}`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data: any = await res.json();
          if (data.status === 'OK' && data.results && data.results.length > 0) {
            return {
              regionLabel: data.results[0].formatted_address,
              city: data.results[0].address_components?.find((c: any) => c.types.includes('locality'))?.long_name,
            };
          }
        }
      } catch {
        // Fall through to Haversine centroid mapping
      }
    }

    // Safe centroid proximity resolution
    let nearestCity = 'Dehradun';
    let minDistance = Infinity;

    for (const [cityName, coords] of Object.entries(REGIONAL_CITY_CENTROIDS)) {
      const dist = calculateDistanceKm(latitude, longitude, coords.lat, coords.lng);
      if (dist !== null && dist < minDistance) {
        minDistance = dist;
        nearestCity = cityName.charAt(0).toUpperCase() + cityName.slice(1);
      }
    }

    return {
      regionLabel: `${nearestCity} Municipal Area`,
      city: nearestCity,
    };
  }

  /**
   * Performs an honest health and connectivity test for the Google Maps service.
   * Never leaks the actual API key.
   */
  static async checkHealth(): Promise<MapsHealthStatus> {
    const apiKey = config.maps.apiKey;

    if (!apiKey) {
      return {
        status: 'unavailable',
        details: 'GOOGLE_MAPS_SERVER_KEY / GOOGLE_MAPS_API_KEY is not configured. Haversine distance engine active.',
        provider: 'haversine-local',
      };
    }

    const start = Date.now();
    try {
      const testUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=Delhi&key=${encodeURIComponent(
        apiKey
      )}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(testUrl, { signal: controller.signal });
      clearTimeout(timeoutId);
      const latencyMs = Date.now() - start;

      if (!res.ok) {
        return {
          status: 'needs verification',
          details: `Google Maps API returned HTTP ${res.status}. Check API key restrictions or quotas.`,
          provider: 'google-maps',
          latencyMs,
        };
      }

      const data: any = await res.json();
      if (data.status === 'OK') {
        return {
          status: 'configured',
          details: 'Google Maps Geocoding API is active and operational.',
          provider: 'google-maps',
          latencyMs,
        };
      } else if (data.status === 'REQUEST_DENIED') {
        return {
          status: 'needs verification',
          details: data.error_message || 'API key was rejected. Ensure Geocoding API is enabled on Google Cloud Console.',
          provider: 'google-maps',
          latencyMs,
        };
      } else if (data.status === 'OVER_QUERY_LIMIT') {
        return {
          status: 'needs verification',
          details: 'Google Maps quota exceeded (OVER_QUERY_LIMIT).',
          provider: 'google-maps',
          latencyMs,
        };
      } else {
        return {
          status: 'configured',
          details: `Google Maps responding with status: ${data.status}.`,
          provider: 'google-maps',
          latencyMs,
        };
      }
    } catch (err: any) {
      const latencyMs = Date.now() - start;
      return {
        status: 'unavailable',
        details: err?.name === 'AbortError' ? 'Google Maps API request timed out (4s).' : 'Unable to connect to Google Maps API.',
        provider: 'google-maps',
        latencyMs,
      };
    }
  }
}
