/**
 * Unit tests for TriagePanel component
 * 
 * Tests core functionality including:
 * - Component rendering and integration
 * - State management and data flow
 * - User interaction handling
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TriagePanel } from './triage-panel';
import { TriageResult, PathogenScore } from '@/lib/triage/types';

// Mock the child components
vi.mock('./symptom-selector', () => ({
  SymptomSelector: ({ onSubmit, disabled }: { onSubmit: Function, disabled: boolean }) => (
    <div data-testid="symptom-selector">
      <button 
        onClick={() => onSubmit({ symptoms: ['Fever'], severityScore: 5, metadata: { dominantCategory: 'systemic' } })}
        disabled={disabled}
      >
        Mock Submit Symptoms
      </button>
    </div>
  )
}));

vi.mock('./threat-analysis-display', () => ({
  ThreatAnalysisDisplay: ({ triageResults, onThreatSelect }: { triageResults: TriageResult | null, onThreatSelect: Function }) => (
    <div data-testid="threat-analysis-display">
      {triageResults ? (
        <button onClick={() => onThreatSelect({ pathogenId: 'test-pathogen', pathogenName: 'Test Pathogen', score: 85, isViable: true })}>
          Mock Select Threat
        </button>
      ) : (
        <div>No analysis results available</div>
      )}
    </div>
  )
}));

describe('TriagePanel', () => {
  const mockProps = {
    onSymptomsSubmit: vi.fn(),
    triageResults: null,
    onThreatSelect: vi.fn(),
    selectedThreat: null,
    isAnalyzing: false,
    analysisError: null
  };

  it('renders with basic structure', () => {
    render(<TriagePanel {...mockProps} />);
    
    // Check for main panel elements
    expect(screen.getByText('V.I.C.T.O.R. TRIAGE PANEL')).toBeInTheDocument();
    expect(screen.getByText('Viral Incident & Casualty Triage Operations Rig')).toBeInTheDocument();
    expect(screen.getByTestId('symptom-selector')).toBeInTheDocument();
    expect(screen.getByTestId('threat-analysis-display')).toBeInTheDocument();
  });

  it('forwards symptom submission to parent', () => {
    render(<TriagePanel {...mockProps} />);
    
    const submitButton = screen.getByText('Mock Submit Symptoms');
    fireEvent.click(submitButton);
    
    expect(mockProps.onSymptomsSubmit).toHaveBeenCalledWith({
      symptoms: ['Fever'],
      severityScore: 5,
      metadata: { dominantCategory: 'systemic' }
    });
  });

  it('forwards threat selection to parent', () => {
    const mockTriageResults: TriageResult = {
      scores: [{ pathogenId: 'test', pathogenName: 'Test', score: 85, isViable: true }],
      timestamp: new Date(),
      conditions: { temperature: 20, humidity: 60 }
    };

    render(<TriagePanel {...mockProps} triageResults={mockTriageResults} />);
    
    const selectButton = screen.getByText('Mock Select Threat');
    fireEvent.click(selectButton);
    
    expect(mockProps.onThreatSelect).toHaveBeenCalledWith({
      pathogenId: 'test-pathogen',
      pathogenName: 'Test Pathogen',
      score: 85,
      isViable: true
    });
  });

  it('shows analysis status when analyzing', () => {
    render(<TriagePanel {...mockProps} isAnalyzing={true} />);
    
    expect(screen.getByText('ANALYZING THREAT PATTERNS...')).toBeInTheDocument();
  });

  it('shows error message when analysis fails', () => {
    render(<TriagePanel {...mockProps} analysisError="Network error" />);
    
    expect(screen.getByText('⚠ Network error')).toBeInTheDocument();
  });

  it('displays selected threat information in footer', () => {
    const mockThreat: PathogenScore = {
      pathogenId: 'test-pathogen',
      pathogenName: 'Test Pathogen',
      score: 85,
      isViable: true
    };

    render(<TriagePanel {...mockProps} selectedThreat={mockThreat} />);
    
    expect(screen.getByText('Visualizing: Test Pathogen')).toBeInTheDocument();
  });
});