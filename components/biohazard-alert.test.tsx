import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BiohazardAlert } from './biohazard-alert';
import { PathogenScore } from '@/lib/triage/types';

describe('BiohazardAlert', () => {
  const mockThreat: PathogenScore = {
    pathogenId: 'test-pathogen-1',
    pathogenName: 'Test Pathogen',
    score: 85.5,
    isViable: true
  };

  const mockOnDismiss = vi.fn();

  beforeEach(() => {
    mockOnDismiss.mockClear();
  });

  it('renders nothing when not visible', () => {
    const { container } = render(
      <BiohazardAlert
        isVisible={false}
        selectedThreat={mockThreat}
        onDismiss={mockOnDismiss}
      />
    );
    
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when no threat is provided', () => {
    const { container } = render(
      <BiohazardAlert
        isVisible={true}
        selectedThreat={null}
        onDismiss={mockOnDismiss}
      />
    );
    
    expect(container.firstChild).toBeNull();
  });

  it('renders alert when visible with threat', () => {
    render(
      <BiohazardAlert
        isVisible={true}
        selectedThreat={mockThreat}
        onDismiss={mockOnDismiss}
      />
    );
    
    expect(screen.getByText('BIO-HAZARD ALERT')).toBeInTheDocument();
    expect(screen.getByText('Test Pathogen')).toBeInTheDocument();
    expect(screen.getByText('85.5%')).toBeInTheDocument();
  });

  it('displays correct alert level for high score', () => {
    const highScoreThreat: PathogenScore = {
      ...mockThreat,
      score: 85
    };
    
    render(
      <BiohazardAlert
        isVisible={true}
        selectedThreat={highScoreThreat}
        onDismiss={mockOnDismiss}
      />
    );
    
    expect(screen.getByText('HIGH RISK PATHOGEN DETECTED')).toBeInTheDocument();
  });

  it('displays correct alert level for critical score', () => {
    const criticalThreat: PathogenScore = {
      ...mockThreat,
      score: 95
    };
    
    render(
      <BiohazardAlert
        isVisible={true}
        selectedThreat={criticalThreat}
        onDismiss={mockOnDismiss}
      />
    );
    
    expect(screen.getByText('CRITICAL RISK PATHOGEN DETECTED')).toBeInTheDocument();
  });

  it('displays viability status correctly', () => {
    render(
      <BiohazardAlert
        isVisible={true}
        selectedThreat={mockThreat}
        onDismiss={mockOnDismiss}
      />
    );
    
    expect(screen.getByText('CONFIRMED')).toBeInTheDocument();
  });

  it('displays non-viable status correctly', () => {
    const nonViableThreat: PathogenScore = {
      ...mockThreat,
      isViable: false
    };
    
    render(
      <BiohazardAlert
        isVisible={true}
        selectedThreat={nonViableThreat}
        onDismiss={mockOnDismiss}
      />
    );
    
    expect(screen.getByText('NON-VIABLE')).toBeInTheDocument();
  });

  it('calls onDismiss when acknowledge button is clicked', () => {
    render(
      <BiohazardAlert
        isVisible={true}
        selectedThreat={mockThreat}
        onDismiss={mockOnDismiss}
      />
    );
    
    const acknowledgeButton = screen.getByText('ACKNOWLEDGE ALERT');
    fireEvent.click(acknowledgeButton);
    
    expect(mockOnDismiss).toHaveBeenCalledTimes(1);
  });

  it('displays emergency protocols information', () => {
    render(
      <BiohazardAlert
        isVisible={true}
        selectedThreat={mockThreat}
        onDismiss={mockOnDismiss}
      />
    );
    
    expect(screen.getByText('EMERGENCY PROTOCOLS:')).toBeInTheDocument();
    expect(screen.getByText(/Notify incident commander/)).toBeInTheDocument();
  });

  it('displays persistence information', () => {
    render(
      <BiohazardAlert
        isVisible={true}
        selectedThreat={mockThreat}
        onDismiss={mockOnDismiss}
      />
    );
    
    expect(screen.getByText(/Alert will persist until threat is cleared/)).toBeInTheDocument();
  });
});