import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ThreatAnalysisDisplay } from './threat-analysis-display';
import { TriageResult, PathogenScore, WeatherConditions } from '@/lib/triage/types';
import { beforeEach } from 'node:test';

describe('ThreatAnalysisDisplay', () => {
  const mockWeatherConditions: WeatherConditions = {
    humidity: 65,
    temperature: 22
  };

  const mockPathogenScores: PathogenScore[] = [
    {
      pathogenId: 'pathogen-1',
      pathogenName: 'Anthrax',
      score: 85.5,
      isViable: true
    },
    {
      pathogenId: 'pathogen-2', 
      pathogenName: 'Smallpox',
      score: 72.3,
      isViable: true
    },
    {
      pathogenId: 'pathogen-3',
      pathogenName: 'Plague',
      score: 45.1,
      isViable: false
    }
  ];

  const mockTriageResult: TriageResult = {
    scores: mockPathogenScores,
    timestamp: new Date('2024-01-15T10:30:00Z'),
    conditions: mockWeatherConditions
  };

  const mockOnThreatSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders no results state when triageResults is null', () => {
    render(
      <ThreatAnalysisDisplay
        triageResults={null}
        onThreatSelect={mockOnThreatSelect}
        selectedThreat={null}
      />
    );

    expect(screen.getByText('THREAT ANALYSIS:')).toBeInTheDocument();
    expect(screen.getByText('No analysis results available')).toBeInTheDocument();
  });

  it('renders empty state when no threats detected', () => {
    const emptyResult: TriageResult = {
      ...mockTriageResult,
      scores: []
    };

    render(
      <ThreatAnalysisDisplay
        triageResults={emptyResult}
        onThreatSelect={mockOnThreatSelect}
        selectedThreat={null}
      />
    );

    expect(screen.getByText('THREAT ANALYSIS:')).toBeInTheDocument();
    expect(screen.getByText('No threats detected')).toBeInTheDocument();
  });

  it('renders threat list with correct information', () => {
    render(
      <ThreatAnalysisDisplay
        triageResults={mockTriageResult}
        onThreatSelect={mockOnThreatSelect}
        selectedThreat={null}
      />
    );

    // Check header
    expect(screen.getByText('DETECTED THREATS (3)')).toBeInTheDocument();
    
    // Check analysis metadata
    expect(screen.getByText(/Conditions: 22°C, 65% RH/)).toBeInTheDocument();
    
    // Check threat entries
    expect(screen.getByText('Anthrax')).toBeInTheDocument();
    expect(screen.getByText('85.5%')).toBeInTheDocument();
    expect(screen.getByText('HIGH CONFIDENCE')).toBeInTheDocument();
    
    expect(screen.getByText('Smallpox')).toBeInTheDocument();
    expect(screen.getByText('72.3%')).toBeInTheDocument();
    expect(screen.getByText('MODERATE CONFIDENCE')).toBeInTheDocument();
    
    expect(screen.getByText('Plague')).toBeInTheDocument();
    expect(screen.getByText('45.1%')).toBeInTheDocument();
    expect(screen.getByText('LOW CONFIDENCE')).toBeInTheDocument();
  });

  it('shows viability indicators correctly', () => {
    render(
      <ThreatAnalysisDisplay
        triageResults={mockTriageResult}
        onThreatSelect={mockOnThreatSelect}
        selectedThreat={null}
      />
    );

    // Check viable threats
    const viableElements = screen.getAllByText('VIABLE');
    expect(viableElements).toHaveLength(2);
    
    // Check non-viable threat
    expect(screen.getByText('NON-VIABLE')).toBeInTheDocument();
  });

  it('handles threat selection correctly', () => {
    render(
      <ThreatAnalysisDisplay
        triageResults={mockTriageResult}
        onThreatSelect={mockOnThreatSelect}
        selectedThreat={null}
      />
    );

    // Click on first threat
    const anthraxButton = screen.getByRole('option', { name: /Threat 1: Anthrax/ });
    fireEvent.click(anthraxButton);

    expect(mockOnThreatSelect).toHaveBeenCalledWith(mockPathogenScores[0]);
  });

  it('shows selected threat with correct styling', () => {
    render(
      <ThreatAnalysisDisplay
        triageResults={mockTriageResult}
        onThreatSelect={mockOnThreatSelect}
        selectedThreat={mockPathogenScores[1]} // Smallpox selected
      />
    );

    // Check that selected threat shows "SELECTED" indicator
    expect(screen.getByText('SELECTED')).toBeInTheDocument();
  });

  it('displays confidence levels correctly', () => {
    const testScores: PathogenScore[] = [
      { pathogenId: '1', pathogenName: 'High', score: 85, isViable: true },
      { pathogenId: '2', pathogenName: 'Moderate', score: 65, isViable: true },
      { pathogenId: '3', pathogenName: 'Low', score: 45, isViable: true },
      { pathogenId: '4', pathogenName: 'Minimal', score: 25, isViable: true }
    ];

    const testResult: TriageResult = {
      ...mockTriageResult,
      scores: testScores
    };

    render(
      <ThreatAnalysisDisplay
        triageResults={testResult}
        onThreatSelect={mockOnThreatSelect}
        selectedThreat={null}
      />
    );

    expect(screen.getByText('HIGH CONFIDENCE')).toBeInTheDocument();
    expect(screen.getByText('MODERATE CONFIDENCE')).toBeInTheDocument();
    expect(screen.getByText('LOW CONFIDENCE')).toBeInTheDocument();
    expect(screen.getByText('MINIMAL CONFIDENCE')).toBeInTheDocument();
  });

  it('displays threat ranking correctly', () => {
    render(
      <ThreatAnalysisDisplay
        triageResults={mockTriageResult}
        onThreatSelect={mockOnThreatSelect}
        selectedThreat={null}
      />
    );

    // Check ranking numbers
    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getByText('#2')).toBeInTheDocument();
    expect(screen.getByText('#3')).toBeInTheDocument();
  });
});