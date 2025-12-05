/**
 * Unit tests for TriageDashboard component
 * 
 * Tests core functionality including:
 * - Component rendering and initialization
 * - State management and interface compliance
 * - Integration points with existing components
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TriageDashboard } from './triage-dashboard';

// Mock the GaussianPlumeMap component since it has complex dependencies
vi.mock('./gaussian-plume-map', () => ({
  GaussianPlumeMap: ({ initialCenter, initialZoom }: { initialCenter?: [number, number], initialZoom?: number }) => (
    <div data-testid="gaussian-plume-map">
      Mock GaussianPlumeMap - Center: {initialCenter?.join(',')} Zoom: {initialZoom}
    </div>
  )
}));

describe('TriageDashboard', () => {
  it('renders with default props', () => {
    render(<TriageDashboard />);
    
    // Check for main dashboard elements - now using TriagePanel
    expect(screen.getByText('V.I.C.T.O.R. TRIAGE PANEL')).toBeInTheDocument();
    expect(screen.getByText('SYMPTOM SELECTION')).toBeInTheDocument();
    expect(screen.getByText('INITIATE THREAT ANALYSIS')).toBeInTheDocument();
    
    // Check that the map component is rendered
    expect(screen.getByTestId('gaussian-plume-map')).toBeInTheDocument();
  });

  it('renders with custom initial map center and zoom', () => {
    const customCenter: [number, number] = [51.5074, -0.1278]; // London
    const customZoom = 12;
    
    render(
      <TriageDashboard 
        initialMapCenter={customCenter}
        initialMapZoom={customZoom}
      />
    );
    
    // Verify the map receives the custom props
    const mapElement = screen.getByTestId('gaussian-plume-map');
    expect(mapElement).toHaveTextContent('Center: 51.5074,-0.1278');
    expect(mapElement).toHaveTextContent('Zoom: 12');
  });

  it('displays available symptoms', () => {
    render(<TriageDashboard />);
    
    // Check that symptoms are displayed in the SymptomSelector
    expect(screen.getByText('Fever')).toBeInTheDocument();
    expect(screen.getByText('Hemorrhage')).toBeInTheDocument();
    expect(screen.getByText('Cough')).toBeInTheDocument();
  });

  it('shows no selected symptoms initially', () => {
    render(<TriageDashboard />);
    
    // Check that no symptoms are selected initially - shown as "0 SELECTED"
    expect(screen.getByText('0 SELECTED')).toBeInTheDocument();
  });

  it('has proper V.I.C.T.O.R. styling classes', () => {
    const { container } = render(<TriageDashboard />);
    
    // Check for dark theme and proper layout classes on the main element
    const mainContainer = container.querySelector('main');
    expect(mainContainer).toHaveClass('bg-black');
    expect(mainContainer).toHaveClass('flex');
    expect(mainContainer).toHaveClass('min-h-screen');
  });

  it('renders triage panel with proper structure', () => {
    const { container } = render(<TriageDashboard />);
    
    // Check for triage panel structure - updated for new TriagePanel component
    expect(screen.getByText('SYMPTOM SELECTION')).toBeInTheDocument();
    expect(screen.getByText('No analysis results available')).toBeInTheDocument();
    
    // Verify the panel container has proper styling
    const panelContainer = container.querySelector('.lg\\:w-96');
    expect(panelContainer).toHaveClass('border-r');
    expect(panelContainer).toHaveClass('victor-border-primary');
  });
});