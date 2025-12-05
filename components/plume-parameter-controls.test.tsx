import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PlumeParameterControls } from './plume-parameter-controls';
import { PlumeParameters } from '@/lib/gaussian-plume';

// Mock fetch for Open-Meteo API
global.fetch = vi.fn();

describe('PlumeParameterControls', () => {
  const mockParameters: PlumeParameters = {
    sourceX: -74.006,
    sourceY: 40.7128,
    emissionRate: 10.0,
    windSpeed: 5.0,
    windDirection: 270,
    stackHeight: 50,
    stabilityClass: 'D'
  };

  const mockOnParametersChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock successful weather API response
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        current: {
          wind_speed_10m: 7.5,
          wind_direction_10m: 180
        }
      })
    });
  });

  it('renders all parameter input fields', () => {
    render(
      <PlumeParameterControls
        parameters={mockParameters}
        onParametersChange={mockOnParametersChange}
      />
    );

    // Check for section headers
    expect(screen.getByText('PLUME PARAMETERS')).toBeInTheDocument();
    expect(screen.getByText('SOURCE LOCATION')).toBeInTheDocument();
    expect(screen.getByText('EMISSION PARAMETERS')).toBeInTheDocument();
    expect(screen.getByText('ATMOSPHERIC CONDITIONS')).toBeInTheDocument();
    expect(screen.getByText('ATMOSPHERIC STABILITY')).toBeInTheDocument();

    // Check for input labels
    expect(screen.getByText('LATITUDE (°)')).toBeInTheDocument();
    expect(screen.getByText('LONGITUDE (°)')).toBeInTheDocument();
    expect(screen.getByText('EMISSION RATE (g/s)')).toBeInTheDocument();
    expect(screen.getByText('STACK HEIGHT (m)')).toBeInTheDocument();
    expect(screen.getByText('WIND SPEED (m/s)')).toBeInTheDocument();
    expect(screen.getByText('WIND DIRECTION (° from N)')).toBeInTheDocument();
    expect(screen.getByText('PASQUILL-GIFFORD CLASS')).toBeInTheDocument();
  });

  it('displays current parameter values in inputs', () => {
    render(
      <PlumeParameterControls
        parameters={mockParameters}
        onParametersChange={mockOnParametersChange}
      />
    );

    // Check input values
    expect(screen.getByDisplayValue('40.7128')).toBeInTheDocument();
    expect(screen.getByDisplayValue('-74.006')).toBeInTheDocument();
    expect(screen.getByDisplayValue('10')).toBeInTheDocument();
    expect(screen.getByDisplayValue('50')).toBeInTheDocument();
    expect(screen.getByDisplayValue('5')).toBeInTheDocument();
    expect(screen.getByDisplayValue('270')).toBeInTheDocument();
    
    // Check select value using role
    const stabilitySelect = screen.getByRole('combobox');
    expect(stabilitySelect).toHaveValue('D');
  });

  it('calls onParametersChange when latitude is modified', () => {
    render(
      <PlumeParameterControls
        parameters={mockParameters}
        onParametersChange={mockOnParametersChange}
      />
    );

    const latInput = screen.getByDisplayValue('40.7128');
    fireEvent.change(latInput, { target: { value: '41.0' } });

    expect(mockOnParametersChange).toHaveBeenCalledWith({
      ...mockParameters,
      sourceY: 41.0
    });
  });

  it('calls onParametersChange when emission rate is modified', () => {
    render(
      <PlumeParameterControls
        parameters={mockParameters}
        onParametersChange={mockOnParametersChange}
      />
    );

    const emissionInput = screen.getByDisplayValue('10');
    fireEvent.change(emissionInput, { target: { value: '15.5' } });

    expect(mockOnParametersChange).toHaveBeenCalledWith({
      ...mockParameters,
      emissionRate: 15.5
    });
  });

  it('calls onParametersChange when stability class is changed', () => {
    render(
      <PlumeParameterControls
        parameters={mockParameters}
        onParametersChange={mockOnParametersChange}
      />
    );

    const stabilitySelect = screen.getByRole('combobox');
    fireEvent.change(stabilitySelect, { target: { value: 'A' } });

    expect(mockOnParametersChange).toHaveBeenCalledWith({
      ...mockParameters,
      stabilityClass: 'A'
    });
  });

  it('fetches weather data on mount and updates parameters', async () => {
    render(
      <PlumeParameterControls
        parameters={mockParameters}
        onParametersChange={mockOnParametersChange}
        mapCenter={[40.7128, -74.006]}
      />
    );

    // Wait for weather API call
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('api.open-meteo.com')
      );
    });

    // Should update parameters with weather data
    await waitFor(() => {
      expect(mockOnParametersChange).toHaveBeenCalledWith({
        ...mockParameters,
        windSpeed: 7.5,
        windDirection: 180
      });
    });
  });

  it('handles weather API failure gracefully', async () => {
    // Mock API failure
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('API Error'));

    render(
      <PlumeParameterControls
        parameters={mockParameters}
        onParametersChange={mockOnParametersChange}
      />
    );

    // Should still update with default values
    await waitFor(() => {
      expect(mockOnParametersChange).toHaveBeenCalledWith({
        ...mockParameters,
        windSpeed: 5.0,
        windDirection: 270.0
      });
    });
  });

  it('validates latitude bounds', () => {
    render(
      <PlumeParameterControls
        parameters={mockParameters}
        onParametersChange={mockOnParametersChange}
      />
    );

    const latInput = screen.getByDisplayValue('40.7128');
    
    // Test upper bound
    fireEvent.change(latInput, { target: { value: '95' } });
    expect(mockOnParametersChange).toHaveBeenCalledWith({
      ...mockParameters,
      sourceY: 90 // Should be clamped to max
    });

    // Test lower bound
    fireEvent.change(latInput, { target: { value: '-95' } });
    expect(mockOnParametersChange).toHaveBeenCalledWith({
      ...mockParameters,
      sourceY: -90 // Should be clamped to min
    });
  });

  it('validates longitude bounds', () => {
    render(
      <PlumeParameterControls
        parameters={mockParameters}
        onParametersChange={mockOnParametersChange}
      />
    );

    const lonInput = screen.getByDisplayValue('-74.006');
    
    // Test upper bound
    fireEvent.change(lonInput, { target: { value: '185' } });
    expect(mockOnParametersChange).toHaveBeenCalledWith({
      ...mockParameters,
      sourceX: 180 // Should be clamped to max
    });

    // Test lower bound
    fireEvent.change(lonInput, { target: { value: '-185' } });
    expect(mockOnParametersChange).toHaveBeenCalledWith({
      ...mockParameters,
      sourceX: -180 // Should be clamped to min
    });
  });

  it('validates wind speed minimum', () => {
    render(
      <PlumeParameterControls
        parameters={mockParameters}
        onParametersChange={mockOnParametersChange}
      />
    );

    const windSpeedInput = screen.getByDisplayValue('5');
    
    // Test minimum bound
    fireEvent.change(windSpeedInput, { target: { value: '0' } });
    expect(mockOnParametersChange).toHaveBeenCalledWith({
      ...mockParameters,
      windSpeed: 0.1 // Should be clamped to minimum
    });
  });

  it('shows loading indicator during weather fetch', () => {
    // Mock a delayed response
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: () => Promise.resolve({
          current: { wind_speed_10m: 5, wind_direction_10m: 270 }
        })
      }), 100))
    );

    render(
      <PlumeParameterControls
        parameters={mockParameters}
        onParametersChange={mockOnParametersChange}
      />
    );

    expect(screen.getByText('[LOADING WEATHER...]')).toBeInTheDocument();
  });
});