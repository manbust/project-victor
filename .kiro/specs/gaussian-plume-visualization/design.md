# Design Document: Gaussian Plume Model Visualization

## Overview

This feature implements a Gaussian plume atmospheric dispersion model with interactive visualization on a Leaflet map. The system calculates contaminant concentration fields using the classic Gaussian plume equation and renders the results as color-coded polygon overlays, enabling real-time scenario analysis for viral incident response and environmental risk assessment.

The implementation follows a modular architecture with three primary layers:
1. **Calculation Layer**: Pure mathematical functions for Gaussian plume modeling
2. **Visualization Layer**: Polygon generation and map rendering logic
3. **UI Layer**: React components for map display and parameter controls

## Architecture

### Component Hierarchy

```
GaussianPlumeMap (Client Component)
├── LeafletMapContainer
│   ├── TileLayer
│   ├── PlumePolygonOverlay
│   └── SourceMarker
└── PlumeParameterControls
    ├── SourceLocationInput
    ├── WindParametersInput
    ├── EmissionRateInput
    └── StabilityClassSelector
```

### Data Flow

1. User modifies parameters via `PlumeParameterControls`
2. Parameters trigger recalculation in `calculateGaussianPlume()`
3. Concentration grid is generated across the domain
4. Contour polygons are extracted from concentration field
5. Polygons are rendered on Leaflet map with color mapping
6. Map updates reflect new dispersion pattern

### Technology Stack

- **Leaflet 1.9+**: Map rendering and interaction
- **React-Leaflet 4+**: React bindings for Leaflet
- **TypeScript**: Strict typing for mathematical operations
- **Tailwind CSS**: Styling consistent with V.I.C.T.O.R. dark aesthetic

## Components and Interfaces

### Core Calculation Module

**File**: `lib/gaussian-plume.ts`

```typescript
interface PlumeParameters {
  sourceX: number;          // Source longitude
  sourceY: number;          // Source latitude
  emissionRate: number;     // Q (g/s)
  windSpeed: number;        // u (m/s)
  windDirection: number;    // degrees from north
  stackHeight: number;      // H (meters)
  stabilityClass: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
}

interface ConcentrationPoint {
  x: number;                // downwind distance (m)
  y: number;                // crosswind distance (m)
  concentration: number;    // C (g/m³)
  lat: number;              // geographic latitude
  lon: number;              // geographic longitude
}

interface DispersionCoefficients {
  sigmaY: number;           // horizontal dispersion (m)
  sigmaZ: number;           // vertical dispersion (m)
}

// Calculate concentration at a single point
function calculateConcentration(
  x: number,
  y: number,
  z: number,
  params: PlumeParameters,
  coeffs: DispersionCoefficients
): number;

// Calculate dispersion coefficients based on stability and distance
function calculateDispersionCoefficients(
  downwindDistance: number,
  stabilityClass: string
): DispersionCoefficients;

// Generate concentration grid over domain
function generateConcentrationGrid(
  params: PlumeParameters,
  gridResolution: number,
  maxDistance: number
): ConcentrationPoint[];
```

### Map Component

**File**: `components/gaussian-plume-map.tsx`

```typescript
interface GaussianPlumeMapProps {
  initialCenter: [number, number];
  initialZoom: number;
  plumeParams: PlumeParameters;
  onParamsChange: (params: PlumeParameters) => void;
}

// Main map component (client-side)
export function GaussianPlumeMap(props: GaussianPlumeMapProps): JSX.Element;
```

### Polygon Overlay Component

**File**: `components/plume-polygon-overlay.tsx`

```typescript
interface PlumePolygon {
  coordinates: [number, number][];  // [lat, lon] pairs
  concentrationLevel: number;
  color: string;
  opacity: number;
}

interface PlumePolygonOverlayProps {
  concentrationGrid: ConcentrationPoint[];
  thresholds: number[];  // Concentration levels for contours
}

// Renders concentration contours as Leaflet polygons
export function PlumePolygonOverlay(props: PlumePolygonOverlayProps): JSX.Element;
```

## Data Models

### Pasquill-Gifford Stability Classes

The atmospheric stability affects dispersion rates. Standard classifications:

- **A**: Extremely unstable (strong daytime heating)
- **B**: Moderately unstable
- **C**: Slightly unstable
- **D**: Neutral (overcast or moderate wind)
- **E**: Slightly stable (nighttime, light wind)
- **F**: Moderately stable (clear night, light wind)

### Dispersion Coefficient Formulas

Using Briggs rural formulas for σy and σz as functions of downwind distance x:

**For σy (horizontal dispersion)**:
- Class A: σy = 0.22x(1 + 0.0001x)^(-0.5)
- Class B: σy = 0.16x(1 + 0.0001x)^(-0.5)
- Class C: σy = 0.11x(1 + 0.0001x)^(-0.5)
- Class D: σy = 0.08x(1 + 0.0001x)^(-0.5)
- Class E: σy = 0.06x(1 + 0.0001x)^(-0.5)
- Class F: σy = 0.04x(1 + 0.0001x)^(-0.5)

**For σz (vertical dispersion)**:
- Class A: σz = 0.20x
- Class B: σz = 0.12x
- Class C: σz = 0.08x(1 + 0.0002x)^(-0.5)
- Class D: σz = 0.06x(1 + 0.0015x)^(-0.5)
- Class E: σz = 0.03x(1 + 0.0003x)^(-1)
- Class F: σz = 0.016x(1 + 0.0003x)^(-1)

### Coordinate Transformation

Convert between Cartesian plume coordinates and geographic coordinates:

```typescript
interface CartesianToGeo {
  x: number;              // downwind distance (m)
  y: number;              // crosswind distance (m)
  sourceLatLon: [number, number];
  windDirection: number;  // degrees from north
}

// Returns [lat, lon]
function cartesianToGeographic(params: CartesianToGeo): [number, number];
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Non-negative concentrations

*For any* valid plume parameters and any point in space, the calculated concentration value should be greater than or equal to zero.

**Validates: Requirements 2.5, 6.5**

### Property 2: Zero emission yields zero concentration

*For any* plume parameters where emission rate Q = 0, the concentration at all points should equal zero.

**Validates: Requirements 2.3**

### Property 3: Concentration symmetry about plume centerline

*For any* point at crosswind distance +y and its mirror point at -y (same downwind distance x), the concentration values should be equal when z and all other parameters are identical.

**Validates: Requirements 2.1**

### Property 4: Concentration decreases with distance from source

*For any* two points along the plume centerline (y=0, z=H) where x2 > x1 > 0, the concentration at x2 should be less than or equal to the concentration at x1.

**Validates: Requirements 2.1**

### Property 5: Dispersion coefficients increase with distance

*For any* stability class and any two downwind distances where x2 > x1 > 0, both σy(x2) ≥ σy(x1) and σz(x2) ≥ σz(x1) should hold.

**Validates: Requirements 2.2**

### Property 6: Linear scaling with emission rate

*For any* plume parameters and any point in space, if the emission rate is multiplied by a factor k > 0, the concentration at that point should also be multiplied by k.

**Validates: Requirements 2.1, 4.4**

### Property 7: Map coordinates remain within valid bounds

*For any* generated concentration point, the latitude should be between -90 and 90 degrees, and longitude should be between -180 and 180 degrees.

**Validates: Requirements 3.3**

### Property 8: Polygon coordinates form closed shapes

*For any* generated polygon representing a concentration contour, the first coordinate pair should equal the last coordinate pair.

**Validates: Requirements 3.1**

## Error Handling

### Input Validation

- **Invalid coordinates**: Reject latitude outside [-90, 90] or longitude outside [-180, 180]
- **Non-positive wind speed**: Reject wind speed ≤ 0 m/s (plume equation undefined)
- **Negative emission rate**: Reject Q < 0 (physically meaningless)
- **Invalid stability class**: Reject values outside A-F range
- **Negative stack height**: Reject H < 0

### Numerical Edge Cases

- **Very large exponents**: Cap exponential arguments to prevent overflow (e.g., exp(x) where x > 100)
- **Division by zero**: Handle σy = 0 or σz = 0 cases (should not occur with proper dispersion formulas)
- **Very small concentrations**: Set threshold below which concentration is treated as zero (e.g., < 1e-12)

### Map Rendering Errors

- **Tile loading failures**: Display fallback message, allow retry
- **Polygon rendering errors**: Log error, skip invalid polygons, continue with valid ones
- **Performance degradation**: Limit grid resolution if calculation time exceeds threshold

## Testing Strategy

### Unit Testing

The implementation will use **Vitest** as the testing framework for unit tests.

Unit tests will cover:
- Specific example calculations with known results from atmospheric dispersion literature
- Edge cases: zero emission, very large distances, extreme stability classes
- Coordinate transformation accuracy for known lat/lon pairs
- Input validation rejection of invalid parameters

### Property-Based Testing

The implementation will use **fast-check** as the property-based testing library for TypeScript.

Property-based tests will:
- Run a minimum of 100 iterations per property
- Use custom generators for valid plume parameters (positive emission rates, valid stability classes, reasonable distances)
- Tag each test with the format: `**Feature: gaussian-plume-visualization, Property {number}: {property_text}**`
- Implement each correctness property as a single property-based test

Property tests will verify:
- Property 1: Non-negative concentrations across random valid inputs
- Property 2: Zero emission produces zero concentration
- Property 3: Symmetry about centerline for random crosswind distances
- Property 4: Monotonic decrease along centerline
- Property 5: Monotonic increase of dispersion coefficients
- Property 6: Linear scaling with emission rate
- Property 7: Geographic coordinate bounds
- Property 8: Polygon closure

### Integration Testing

- Full map rendering with sample plume parameters
- Parameter updates trigger correct recalculation and re-rendering
- User interactions (pan, zoom) maintain polygon overlay integrity

## Performance Considerations

### Grid Resolution

- Default: 50x50 grid points (2,500 calculations)
- Adjustable based on device performance
- Consider adaptive resolution: finer near source, coarser far away

### Calculation Optimization

- Memoize dispersion coefficients for repeated distances
- Skip calculations for points with negligible concentration (< threshold)
- Use Web Workers for heavy calculations to avoid blocking UI

### Rendering Optimization

- Limit number of contour levels (e.g., 5-10 polygons)
- Simplify polygon geometries using Douglas-Peucker algorithm
- Debounce parameter changes (300ms) to reduce recalculation frequency

## Visual Design

### Color Mapping

Following V.I.C.T.O.R.'s dark clinical aesthetic:

- **Low concentration**: Transparent or dark blue
- **Medium concentration**: Yellow (`border-yellow-500`)
- **High concentration**: Red (`border-red-500/600`)
- **Critical concentration**: Bright red with high opacity

### Map Styling

- Dark tile layer (e.g., CartoDB Dark Matter)
- Monospaced font (Geist Mono) for concentration labels
- High-contrast borders on polygons
- Source marker: Pulsing red circle

## Future Enhancements

- Multiple source support (superposition of plumes)
- Time-varying emissions and wind conditions
- 3D visualization of vertical concentration profile
- Integration with real-time weather data from Open-Meteo API
- Export concentration data as GeoJSON or CSV
- Comparison with measured concentration data
