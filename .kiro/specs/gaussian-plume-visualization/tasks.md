# Implementation Plan

- [x] 1. Install required dependencies and set up project structure





  - Install Leaflet, React-Leaflet, and type definitions
  - Install fast-check for property-based testing
  - Install Vitest if not already present
  - Create directory structure: `lib/`, `components/`, `types/`
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. Implement core Gaussian plume mathematical functions





  - Create `lib/gaussian-plume.ts` with TypeScript interfaces
  - Define `PlumeParameters`, `ConcentrationPoint`, `DispersionCoefficients` types
  - Implement dispersion coefficient calculation using Briggs formulas
  - Document all mathematical constants and formulas with inline comments
  - _Requirements: 2.1, 2.2, 6.1, 6.2, 6.4_

- [x] 2.1 Implement the main Gaussian plume concentration calculation


  - Write `calculateConcentration()` function with the equation C(x,y,z) = (Q / (2π * u * σy * σz)) * exp(-y² / (2σy²)) * exp(-(z-H)² / (2σz²))
  - Add input validation for non-positive wind speed and negative emission rate
  - Handle edge cases for very large exponents to prevent overflow
  - Ensure strict typing for all numeric operations
  - _Requirements: 2.1, 2.3, 2.4, 2.5, 6.3_

- [ ]* 2.2 Write property test for non-negative concentrations
  - **Property 1: Non-negative concentrations**
  - **Validates: Requirements 2.5, 6.5**

- [ ]* 2.3 Write property test for zero emission
  - **Property 2: Zero emission yields zero concentration**
  - **Validates: Requirements 2.3**

- [ ]* 2.4 Write property test for concentration symmetry
  - **Property 3: Concentration symmetry about plume centerline**
  - **Validates: Requirements 2.1**

- [ ]* 2.5 Write property test for concentration decrease with distance
  - **Property 4: Concentration decreases with distance from source**
  - **Validates: Requirements 2.1**

- [ ]* 2.6 Write property test for dispersion coefficient monotonicity
  - **Property 5: Dispersion coefficients increase with distance**
  - **Validates: Requirements 2.2**

- [ ]* 2.7 Write property test for linear scaling with emission rate
  - **Property 6: Linear scaling with emission rate**
  - **Validates: Requirements 2.1, 4.4**

- [x] 3. Implement coordinate transformation utilities





  - Create `lib/coordinate-transform.ts`
  - Implement `cartesianToGeographic()` function to convert plume coordinates to lat/lon
  - Implement wind direction rotation matrix
  - Add validation for latitude [-90, 90] and longitude [-180, 180] bounds
  - _Requirements: 3.3, 4.1, 4.2_

- [ ]* 3.1 Write property test for geographic coordinate bounds
  - **Property 7: Map coordinates remain within valid bounds**
  - **Validates: Requirements 3.3**

- [ ]* 3.2 Write unit tests for coordinate transformation
  - Test known coordinate transformations with specific examples
  - Test wind direction rotation for cardinal directions (0°, 90°, 180°, 270°)
  - _Requirements: 3.3, 4.2_

- [x] 4. Implement concentration grid generation




  - Create `generateConcentrationGrid()` function in `lib/gaussian-plume.ts`
  - Generate grid of points covering the plume domain
  - Calculate concentration at each grid point
  - Transform Cartesian coordinates to geographic coordinates
  - Optimize by skipping points with negligible concentration
  - _Requirements: 2.1, 2.2, 3.3, 4.1_


- [x] 5. Implement contour polygon generation




  - Create `lib/contour-polygons.ts`
  - Implement marching squares or similar algorithm to extract contour lines
  - Convert contour lines to closed polygon geometries
  - Map concentration levels to polygon properties (color, opacity)
  - _Requirements: 3.1, 3.2, 3.4_

- [ ]* 5.1 Write property test for polygon closure
  - **Property 8: Polygon coordinates form closed shapes**
  - **Validates: Requirements 3.1**

- [ ]* 5.2 Write unit tests for contour generation
  - Test contour extraction with simple concentration fields
  - Verify color mapping for different concentration thresholds
  - _Requirements: 3.1, 3.2, 3.4_


- [x] 6. Create base Leaflet map component




  - Create `components/gaussian-plume-map.tsx` as a client component
  - Set up React-Leaflet MapContainer with default center and zoom
  - Add TileLayer with dark theme (CartoDB Dark Matter or similar)
  - Implement pan and zoom controls
  - Add proper attribution
  - _Requirements: 1.1, 1.2, 1.3_

- [ ]* 6.1 Write unit test for map initialization
  - Verify map renders with correct default center and zoom
  - Verify tile layer loads with attribution
  - _Requirements: 1.1, 1.3_


- [x] 7. Create plume polygon overlay component



  - Create `components/plume-polygon-overlay.tsx`
  - Accept concentration grid and threshold props
  - Render Leaflet Polygon components for each contour
  - Apply color mapping based on concentration levels
  - Use V.I.C.T.O.R. color scheme (red/yellow for high concentrations)
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 8. Create source marker component





  - Create `components/source-marker.tsx`
  - Render a marker at the emission source location
  - Style with pulsing red circle effect
  - Add tooltip showing source parameters
  - _Requirements: 4.1_

- [x] 9. Create parameter control panel





  - Create `components/plume-parameter-controls.tsx`
  - Add input fields for source location (lat/lon)
  - Add input for emission rate (Q)
  - Add input for wind speed and direction
  - Add input for stack height (H)
  - Add dropdown for atmospheric stability class (A-F)
  - Default the initial state for all applicable inputs (like wind speed and direction) to fetch from Open-Meteo API based on the map center, and then allow users to edit/enter custom amounts
  - Style with dark clinical aesthetic using Tailwind
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_


- [x] 10. Integrate calculation with map visualization




  - Connect parameter controls to plume calculation
  - Implement state management for plume parameters
  - Trigger recalculation when parameters change
  - Pass concentration grid to polygon overlay component
  - Add debouncing (300ms) for parameter changes
  - _Requirements: 5.1, 5.2, 5.4_

- [ ]* 10.1 Write integration test for parameter updates
  - Verify changing parameters triggers recalculation
  - Verify debouncing prevents excessive calculations
  - _Requirements: 5.1, 5.4_


- [x] 11. Add performance optimizations



  - Implement memoization for dispersion coefficient calculations
  - Add concentration threshold to skip negligible values
  - Simplify polygon geometries if point count exceeds threshold
  - Add loading indicator during calculations
  - _Requirements: 5.3_


- [x] 12. Create main page integration




  - Update `app/page.tsx` to include Gaussian plume map
  - Add page title and description
  - Ensure responsive layout
  - Apply V.I.C.T.O.R. dark theme styling
  - _Requirements: 1.1_


- [x] 13. Checkpoint - Ensure all tests pass




  - Ensure all tests pass, ask the user if questions arise.

- [ ]* 14. Add error handling and edge case management
  - Add try-catch blocks for calculation errors
  - Display user-friendly error messages for invalid inputs
  - Handle tile loading failures gracefully
  - Log errors for debugging
  - _Requirements: 2.3, 6.3_

- [ ]* 15. Write end-to-end integration tests
  - Test full workflow from parameter input to map rendering
  - Verify polygon updates when parameters change
  - Test edge cases: zero emission, extreme distances
  - _Requirements: 1.1, 2.1, 3.1, 5.1_


- [x] 16. Final checkpoint - Ensure all tests pass




  - Ensure all tests pass, ask the user if questions arise.
