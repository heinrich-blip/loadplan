/**
 * Fixed Depot/Waypoint Coordinates
 * These are the loading and offloading locations used for route tracking
 */

export interface Depot {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  type: "depot" | "warehouse" | "market" | "border";
  country: "Zimbabwe" | "South Africa" | "Mozambique";
  radius: number; // Geofence radius in meters
}

// Fixed depot coordinates - these are the known loading/offloading points
export const DEPOTS: Depot[] = [
  {
    id: "bulawayo-depot",
    name: "Bulawayo Depot",
    latitude: -20.14704034,
    longitude: 28.56972715,
    type: "depot",
    country: "Zimbabwe",
    radius: 500,
  },
  {
    id: "bv",
    name: "BV",
    latitude: -19.18134742,
    longitude: 32.6994949,
    type: "depot",
    country: "Zimbabwe",
    radius: 500,
  },
  {
    id: "cbc",
    name: "CBC",
    latitude: -20.08999732,
    longitude: 32.62297647,
    type: "depot",
    country: "Zimbabwe",
    radius: 500,
  },
  {
    id: "rezende-depot",
    name: "Rezende Depot",
    latitude: -17.83969405,
    longitude: 31.04586039,
    type: "depot",
    country: "Zimbabwe",
    radius: 500,
  },
  {
    id: "mutare-depot",
    name: "Mutare Depot",
    latitude: -19.00251415,
    longitude: 32.6388758,
    type: "depot",
    country: "Zimbabwe",
    radius: 500,
  },
  {
    id: "freshmark-polokwane",
    name: "Freshmark Polokwane",
    latitude: -23.8594826,
    longitude: 29.4747646,
    type: "warehouse",
    country: "South Africa",
    radius: 500,
  },
  {
    id: "freshmark-centurion",
    name: "Freshmark Centurion",
    latitude: -25.9133944,
    longitude: 28.1664809,
    type: "warehouse",
    country: "South Africa",
    radius: 500,
  },
  {
    id: "dapper-market",
    name: "Dapper Market",
    latitude: -26.2320022,
    longitude: 28.0824127,
    type: "market",
    country: "South Africa",
    radius: 500,
  },
  {
    id: "farmers-trust",
    name: "Farmers Trust",
    latitude: -25.7402845,
    longitude: 28.1702523,
    type: "warehouse",
    country: "South Africa",
    radius: 500,
  },
];

/**
 * Find a depot by name (fuzzy match)
 */
export function findDepotByName(name: string): Depot | null {
  if (!name) return null;
  const normalizedName = name.toLowerCase().trim();
  // Canonical aliases for depots
  const depotAliases: Record<string, string> = {
    'bulawayo': 'Bulawayo Depot',
    'bulawayo depot': 'Bulawayo Depot',
    'rezende': 'Rezende Depot',
    'rezende depot': 'Rezende Depot',
  };
  if (depotAliases[normalizedName]) {
    return DEPOTS.find((d) => d.name === depotAliases[normalizedName]) || null;
  }
  // Try exact match first
  let depot = DEPOTS.find((d) => d.name.toLowerCase() === normalizedName);
  if (depot) return depot;
  // Try partial match
  depot = DEPOTS.find(
    (d) =>
      d.name.toLowerCase().includes(normalizedName) ||
      normalizedName.includes(d.name.toLowerCase())
  );
  if (depot) return depot;
  // Try matching key words
  const words = normalizedName.split(/[\s,]+/).filter((w) => w.length > 2);
  for (const word of words) {
    depot = DEPOTS.find((d) => d.name.toLowerCase().includes(word));
    if (depot) return depot;
  }
  return null;
}

/**
 * Find the nearest depot to given coordinates
 */
export function findNearestDepot(
  latitude: number,
  longitude: number
): { depot: Depot; distance: number } | null {
  if (!latitude || !longitude) return null;

  let nearest: Depot | null = null;
  let minDistance = Infinity;

  for (const depot of DEPOTS) {
    const distance = calculateHaversineDistance(
      latitude,
      longitude,
      depot.latitude,
      depot.longitude
    );

    if (distance < minDistance) {
      minDistance = distance;
      nearest = depot;
    }
  }

  return nearest ? { depot: nearest, distance: minDistance } : null;
}

/**
 * Check if a position is within a depot's geofence
 */
export function isWithinDepot(
  latitude: number,
  longitude: number,
  depot: Depot
): boolean {
  const distance = calculateHaversineDistance(
    latitude,
    longitude,
    depot.latitude,
    depot.longitude
  );
  // Convert radius from meters to km
  return distance <= depot.radius / 1000;
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculate trip progress between origin and destination depots
 */
export function calculateDepotTripProgress(
  originDepot: Depot,
  destDepot: Depot,
  currentLat: number,
  currentLon: number
): {
  progress: number;
  totalDistance: number;
  distanceTraveled: number;
  distanceRemaining: number;
  isAtOrigin: boolean;
  isAtDestination: boolean;
  nearestDepot: Depot | null;
  nearestDistance: number;
} {
  const totalDistance = calculateHaversineDistance(
    originDepot.latitude,
    originDepot.longitude,
    destDepot.latitude,
    destDepot.longitude
  );

  const distanceFromOrigin = calculateHaversineDistance(
    originDepot.latitude,
    originDepot.longitude,
    currentLat,
    currentLon
  );

  const distanceToDestination = calculateHaversineDistance(
    currentLat,
    currentLon,
    destDepot.latitude,
    destDepot.longitude
  );

  // Check if at origin or destination
  const isAtOrigin = isWithinDepot(currentLat, currentLon, originDepot);
  const isAtDestination = isWithinDepot(currentLat, currentLon, destDepot);

  // Find nearest depot
  const nearest = findNearestDepot(currentLat, currentLon);

  // Calculate progress percentage
  let progress = 0;
  if (isAtOrigin) {
    progress = 0;
  } else if (isAtDestination) {
    progress = 100;
  } else if (totalDistance > 0) {
    // Use distance from origin as primary metric
    progress = Math.min(
      100,
      Math.max(0, (distanceFromOrigin / totalDistance) * 100)
    );

    // If close to destination, use distance remaining for more accuracy
    if (distanceToDestination < totalDistance * 0.2) {
      progress = Math.min(
        100,
        Math.max(0, 100 - (distanceToDestination / totalDistance) * 100)
      );
    }
  }

  return {
    progress: Math.round(progress),
    totalDistance,
    distanceTraveled: distanceFromOrigin,
    distanceRemaining: distanceToDestination,
    isAtOrigin,
    isAtDestination,
    nearestDepot: nearest?.depot || null,
    nearestDistance: nearest?.distance || 0,
  };
}

/**
 * Calculate ETA based on distance and speed
 */
export function calculateDepotETA(
  distanceKm: number,
  speedKmh: number
): {
  eta: Date;
  etaFormatted: string;
  durationMinutes: number;
  durationFormatted: string;
} {
  const speed = speedKmh > 10 ? speedKmh : 60; // Default to 60 km/h if not moving
  const durationHours = distanceKm / speed;
  const durationMinutes = Math.round(durationHours * 60);

  const hours = Math.floor(durationMinutes / 60);
  const mins = durationMinutes % 60;

  let durationFormatted = "";
  if (hours > 0) {
    durationFormatted = `${hours}h ${mins}m`;
  } else {
    durationFormatted = `${mins}m`;
  }

  const eta = new Date();
  eta.setMinutes(eta.getMinutes() + durationMinutes);
  const etaFormatted = eta.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return { eta, etaFormatted, durationMinutes, durationFormatted };
}

/**
 * Format distance for display
 */
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)}m`;
  }
  return `${Math.round(distanceKm)} km`;
}

/**
 * Get all depots as geofence-compatible objects for map display
 */
export function getDepotsAsGeofences(): Array<{
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  type: string;
}> {
  return DEPOTS.map((depot) => ({
    id: depot.id,
    name: depot.name,
    latitude: depot.latitude,
    longitude: depot.longitude,
    radius: depot.radius,
    type: depot.type,
  }));
}

/**
 * Geofence event tracking - detect entry/exit from depots
 */
export interface GeofenceEvent {
  depotId: string;
  depotName: string;
  eventType: "entry" | "exit";
  timestamp: Date;
  latitude: number;
  longitude: number;
}

/**
 * Check for geofence events based on previous and current position
 */
export function detectGeofenceEvent(
  previousLat: number | null,
  previousLon: number | null,
  currentLat: number,
  currentLon: number
): GeofenceEvent | null {
  if (!previousLat || !previousLon) return null;

  for (const depot of DEPOTS) {
    const wasInside = isWithinDepot(previousLat, previousLon, depot);
    const isInside = isWithinDepot(currentLat, currentLon, depot);

    if (!wasInside && isInside) {
      // Entry event
      return {
        depotId: depot.id,
        depotName: depot.name,
        eventType: "entry",
        timestamp: new Date(),
        latitude: currentLat,
        longitude: currentLon,
      };
    } else if (wasInside && !isInside) {
      // Exit event
      return {
        depotId: depot.id,
        depotName: depot.name,
        eventType: "exit",
        timestamp: new Date(),
        latitude: currentLat,
        longitude: currentLon,
      };
    }
  }

  return null;
}
