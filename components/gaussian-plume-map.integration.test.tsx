/**
 * Integration tests for GaussianPlumeMap component
 * Tests the complete workflow from parameter input to visualization
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GaussianPlumeMap } from './gaussian-plume-map';

// Mock Leaflet to avoid DOM issues in tests
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="map-container">{children}</div>
  ),
  TileLayer: () => <div data-testid="tile-layer" />,
  Polygon: ({ positions }: { positions: [number, number][] }) => (
    <div data-testid="polygon" data-positions={JSON.stringify(positions)} />
  ),
  Marker: ({ position, children }: { position: [number, number]; children: React.ReactNode }) => (
    <div data-testid="marker" data-position={JSON.stringify(position)}>
      {children}
    </div>
  ),
  Popup: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="popup">{children}</div>
  )
}));

// Mock the coordinate transform to avoid complex calculations in tests
vi.mock('@/lib/coordinate-transform', () => ({
  cartesianToGeographic: ({ x, y, sourceLatLon }: {
    x: number;
    y: number;
    sourceLatLon: [number, number];
    windDirection: number;
  }) => {
    // Simple mock transformation for testing
    const [sourceLat, sourceLon] = sourceLatLon;
    return [sourceLat + y * 0.0001, sourceLon + x * 0.0001];
  }
}));

// Mock fetch for weather API
global.fetch = vi.fn();

describe('GaussianPlumeMap Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock successful weather API response
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        current: {
          wind_speed_10m: 7.5,
          wind_direction_10m: 180.0
        }
      })
    });
  });

  it('should render all main components', async () => {
    render(<GaussianPlumeMap />);

    // Check that main components are present
    expect(screen.getByText('PLUME PARAMETERS')).toBeInTheDocument();
    expect(screen.getByTestId('map-container')).toBeInTheDocument();
    expect(screen.getByTestId('tile-layer')).toBeInTheDocument();
    expect(screen.getByTestId('marker')).toBeInTheDocument();
  });

  it('should update parameters and maintain ready state', async () => {
    render(<GaussianPlumeMap />);

    // Wait for initial calculation to complete
    await waitFor(() => {
      expect(screen.getByText(/READY/)).toBeInTheDocument();
    });

    // Find and modify emission rate input
    const emissionInput = screen.getByDisplayValue('10');
    fireEvent.change(emissionInput, { target: { value: '20' } });

    // Should eventually return to ready state with new value
    await waitFor(() => {
      expect(screen.getByText(/READY/)).toBeInTheDocument();
      expect(screen.getByDisplayValue('20')).toBeInTheDocument();
    }, { timeout: 1000 });
  });

  it('should update source marker position when coordinates change', async () => {
    render(<GaussianPlumeMap />);

    // Wait for initial render
    await waitFor(() => {
      expect(screen.getByTestId('marker')).toBeInTheDocument();
    });

    // Get initial marker position
    const initialMarker = screen.getByTestId('marker');
    const initialPosition = JSON.parse(initialMarker.getAttribute('data-position') || '[]');
    expect(initialPosition).toEqual([40.7128, -74.0060]); // Default NYC coordinates

    // Change latitude
    const latInput = screen.getByDisplayValue('40.7128');
    fireEvent.change(latInput, { target: { value: '41.0' } });

    // Wait for marker to update
    await waitFor(() => {
      const updatedMarker = screen.getByTestId('marker');
      const updatedPosition = JSON.parse(updatedMarker.getAttribute('data-position') || '[]');
      expect(updatedPosition[0]).toBe(41.0); // Latitude should be updated
    });
  });

  it('should display grid point count in status', async () => {
    render(<GaussianPlumeMap />);

    // Wait for calculation to complete
    await waitFor(() => {
      expect(screen.getByText(/Grid Points:/)).toBeInTheDocument();
    });

    // Should show a reasonable number of grid points
    const gridPointsText = screen.getByText(/Grid Points:/).textContent;
    expect(gridPointsText).toMatch(/Grid Points: \d+/);
  });

  it('should maintain calculation state consistency', async () => {
    render(<GaussianPlumeMap />);

    // Wait for initial state
    await waitFor(() => {
      expect(screen.getByText(/READY/)).toBeInTheDocument();
    });

    // Verify that status section exists and shows grid points
    expect(screen.getByText(/CALCULATION STATUS:/)).toBeInTheDocument();
    expect(screen.getByText(/Grid Points:/)).toBeInTheDocument();
  });

  it('should fetch weather data on mount', async () => {
    render(<GaussianPlumeMap />);

    // Should call weather API
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('api.open-meteo.com')
      );
    });

    // Should update wind parameters with fetched data
    await waitFor(() => {
      expect(screen.getByDisplayValue('7.5')).toBeInTheDocument(); // Wind speed
      expect(screen.getByDisplayValue('180')).toBeInTheDocument(); // Wind direction
    });
  });

  it('should debounce parameter changes', async () => {
    render(<GaussianPlumeMap />);

    // Wait for initial calculation
    await waitFor(() => {
      expect(screen.getByText(/READY/)).toBeInTheDocument();
    });

    // Make rapid changes to emission rate
    const emissionInput = screen.getByDisplayValue('10');
    fireEvent.change(emissionInput, { target: { value: '15' } });
    fireEvent.change(emissionInput, { target: { value: '20' } });
    fireEvent.change(emissionInput, { target: { value: '25' } });

    // Should eventually stabilize with the final value
    await waitFor(() => {
      expect(screen.getByText(/READY/)).toBeInTheDocument();
      expect(screen.getByDisplayValue('25')).toBeInTheDocument();
    }, { timeout: 1000 });
  });
});