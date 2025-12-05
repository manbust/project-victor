/**
 * Coordinate transformation utilities for Gaussian plume modeling
 * Converts between Cartesian plume coordinates and geographic coordinates
 */

/**
 * Parameters for converting Cartesian coordinates to geographic coordinates
 */
export interface CartesianToGeoParams {
  x: number;              // downwind distance (m)
  y: number;              // crosswind distance (m)
  sourceLatLon: [number, number]; // [latitude, longitude] of source
  windDirection: number;  // degrees from north (0-360)
}

/**
 * Earth's radius in meters (WGS84 mean radius)
 */
const EARTH_RADIUS_M = 6371000;

/**
 * Convert degrees to radians
 */
function degreesToRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Convert radians to degrees
 */
function radiansToDegrees(radians: number): number {
  return radians * (180 / Math.PI);
}

/**
 * Validate latitude is within valid bounds [-90, 90]
 */
function validateLatitude(lat: number): boolean {
  return lat >= -90 && lat <= 90;
}

/**
 * Validate longitude is within valid bounds [-180, 180]
 */
function validateLongitude(lon: number): boolean {
  return lon >= -180 && lon <= 180;
}

/**
 * Normalize longitude to [-180, 180] range
 */
function normalizeLongitude(lon: number): number {
  while (lon > 180) lon -= 360;
  while (lon < -180) lon += 360;
  return lon;
}

/**
 * Apply wind direction rotation matrix to transform coordinates
 * from plume coordinate system (x=downwind, y=crosswind) to 
 * geographic coordinate system aligned with north
 * 
 * @param x - downwind distance (m)
 * @param y - crosswind distance (m) 
 * @param windDirection - wind direction in degrees from north (0-360)
 * @returns [northing, easting] in meters
 */
function applyWindRotation(x: number, y: number, windDirection: number): [number, number] {
  // Convert wind direction to radians
  const windRadians = degreesToRadians(windDirection);
  
  // Rotation matrix for wind direction
  // Wind direction is "from" direction, so we rotate by that angle
  const cosTheta = Math.cos(windRadians);
  const sinTheta = Math.sin(windRadians);
  
  // Apply rotation matrix
  // [northing]   [cos(θ)  -sin(θ)] [x]
  // [easting ] = [sin(θ)   cos(θ)] [y]
  const northing = cosTheta * x - sinTheta * y;
  const easting = sinTheta * x + cosTheta * y;
  
  return [northing, easting];
}

/**
 * Convert Cartesian plume coordinates to geographic coordinates (lat/lon)
 * 
 * This function transforms coordinates from the plume coordinate system
 * (where x is downwind distance and y is crosswind distance) to 
 * geographic coordinates (latitude/longitude).
 * 
 * @param params - Transformation parameters
 * @returns [latitude, longitude] in decimal degrees
 * @throws Error if source coordinates are invalid or result is out of bounds
 */
export function cartesianToGeographic(params: CartesianToGeoParams): [number, number] {
  const { x, y, sourceLatLon, windDirection } = params;
  const [sourceLat, sourceLon] = sourceLatLon;
  
  // Validate source coordinates
  if (!validateLatitude(sourceLat)) {
    throw new Error(`Invalid source latitude: ${sourceLat}. Must be between -90 and 90 degrees.`);
  }
  if (!validateLongitude(sourceLon)) {
    throw new Error(`Invalid source longitude: ${sourceLon}. Must be between -180 and 180 degrees.`);
  }
  
  // Validate wind direction
  if (windDirection < 0 || windDirection >= 360) {
    throw new Error(`Invalid wind direction: ${windDirection}. Must be between 0 and 360 degrees.`);
  }
  
  // Apply wind direction rotation to get northing/easting offsets
  const [northing, easting] = applyWindRotation(x, y, windDirection);
  
  // Convert source coordinates to radians
  const sourceLatRad = degreesToRadians(sourceLat);
  const sourceLonRad = degreesToRadians(sourceLon);
  
  // Calculate new latitude
  // Δlat = northing / R
  const deltaLatRad = northing / EARTH_RADIUS_M;
  const newLatRad = sourceLatRad + deltaLatRad;
  const newLat = radiansToDegrees(newLatRad);
  
  // Calculate new longitude
  // Δlon = easting / (R * cos(lat))
  // Use average latitude for more accurate calculation
  const avgLatRad = (sourceLatRad + newLatRad) / 2;
  const deltaLonRad = easting / (EARTH_RADIUS_M * Math.cos(avgLatRad));
  const newLonRad = sourceLonRad + deltaLonRad;
  const newLon = normalizeLongitude(radiansToDegrees(newLonRad));
  
  // Validate result coordinates
  if (!validateLatitude(newLat)) {
    throw new Error(`Calculated latitude ${newLat} is out of valid bounds [-90, 90].`);
  }
  if (!validateLongitude(newLon)) {
    throw new Error(`Calculated longitude ${newLon} is out of valid bounds [-180, 180].`);
  }
  
  return [newLat, newLon];
}

/**
 * Calculate the distance in meters between two geographic points
 * using the Haversine formula
 * 
 * @param lat1 - First point latitude
 * @param lon1 - First point longitude  
 * @param lat2 - Second point latitude
 * @param lon2 - Second point longitude
 * @returns Distance in meters
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const lat1Rad = degreesToRadians(lat1);
  const lon1Rad = degreesToRadians(lon1);
  const lat2Rad = degreesToRadians(lat2);
  const lon2Rad = degreesToRadians(lon2);
  
  const deltaLat = lat2Rad - lat1Rad;
  const deltaLon = lon2Rad - lon1Rad;
  
  const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
            Math.cos(lat1Rad) * Math.cos(lat2Rad) *
            Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return EARTH_RADIUS_M * c;
}

/**
 * Validate that coordinates are within valid geographic bounds
 * 
 * @param lat - Latitude to validate
 * @param lon - Longitude to validate
 * @returns true if coordinates are valid, false otherwise
 */
export function validateCoordinates(lat: number, lon: number): boolean {
  return validateLatitude(lat) && validateLongitude(lon);
}