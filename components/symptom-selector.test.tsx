import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SymptomSelector } from './symptom-selector';
import { Symptom } from '@/lib/triage/types';

describe('SymptomSelector', () => {
  const mockAvailableSymptoms = [
    'Fever',
    'Hemorrhage', 
    'Cough',
    'Headache',
    'Nausea'
  ];

  const mockOnSymptomToggle = vi.fn();
  const mockOnSubmit = vi.fn();

  const defaultProps = {
    availableSymptoms: mockAvailableSymptoms,
    selectedSymptoms: [] as Symptom[],
    onSymptomToggle: mockOnSymptomToggle,
    onSubmit: mockOnSubmit,
    disabled: false,
    disableDebounce: true
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders symptom selection interface with predefined options', () => {
    render(<SymptomSelector {...defaultProps} />);
    
    // Check header is present
    expect(screen.getByText('SYMPTOM SELECTION')).toBeInTheDocument();
    
    // Check that all available symptoms are rendered
    mockAvailableSymptoms.forEach(symptom => {
      expect(screen.getByText(symptom)).toBeInTheDocument();
    });
    
    // Check submit button is present
    expect(screen.getByText('INITIATE THREAT ANALYSIS')).toBeInTheDocument();
  });

  it('displays symptoms organized by category', () => {
    render(<SymptomSelector {...defaultProps} />);
    
    // Check that category headers are present (rendered in lowercase)
    expect(screen.getByText(/systemic/i)).toBeInTheDocument();
    expect(screen.getByText(/hemorrhagic/i)).toBeInTheDocument();
    expect(screen.getByText(/respiratory/i)).toBeInTheDocument();
    expect(screen.getByText(/neurological/i)).toBeInTheDocument();
    expect(screen.getByText(/gastrointestinal/i)).toBeInTheDocument();
  });

  it('handles symptom toggle functionality', () => {
    render(<SymptomSelector {...defaultProps} />);
    
    const feverButton = screen.getByText('Fever').closest('button');
    expect(feverButton).toBeInTheDocument();
    
    fireEvent.click(feverButton!);
    
    expect(mockOnSymptomToggle).toHaveBeenCalledWith('Fever');
    expect(mockOnSymptomToggle).toHaveBeenCalledTimes(1);
  });

  it('shows selected symptoms with visual indicators', () => {
    const selectedSymptoms = ['Fever', 'Cough'];
    render(<SymptomSelector {...defaultProps} selectedSymptoms={selectedSymptoms} />);
    
    // Check selection count
    expect(screen.getByText('2 SELECTED')).toBeInTheDocument();
    
    // Check selection summary
    expect(screen.getByText('SELECTED SYMPTOMS:')).toBeInTheDocument();
    expect(screen.getByText('Fever • Cough')).toBeInTheDocument();
  });

  it('validates symptom selection before submission', () => {
    render(<SymptomSelector {...defaultProps} />);
    
    const submitButton = screen.getByText('INITIATE THREAT ANALYSIS');
    
    // Submit button should be disabled when no symptoms selected
    expect(submitButton).toBeDisabled();
    
    // Try to submit with no symptoms - should not call onSubmit
    fireEvent.click(submitButton);
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('enables submission when symptoms are selected', () => {
    const selectedSymptoms = ['Fever'];
    render(<SymptomSelector {...defaultProps} selectedSymptoms={selectedSymptoms} />);
    
    const submitButton = screen.getByText('INITIATE THREAT ANALYSIS');
    expect(submitButton).not.toBeDisabled();
    
    fireEvent.click(submitButton);
    expect(mockOnSubmit).toHaveBeenCalledTimes(1);
    // Check that prepared data is passed
    expect(mockOnSubmit).toHaveBeenCalledWith(expect.objectContaining({
      symptoms: expect.arrayContaining(['fever']),
      severityScore: expect.any(Number),
      metadata: expect.any(Object)
    }));
  });

  it('shows validation error for invalid symptoms', () => {
    const invalidSymptoms = ['InvalidSymptom'];
    render(<SymptomSelector {...defaultProps} selectedSymptoms={invalidSymptoms} />);
    
    const submitButton = screen.getByText('INITIATE THREAT ANALYSIS');
    fireEvent.click(submitButton);
    
    expect(screen.getByText(/Invalid symptoms detected/)).toBeInTheDocument();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('disables all interactions when disabled prop is true', () => {
    render(<SymptomSelector {...defaultProps} disabled={true} />);
    
    // Check submit button shows analyzing state
    expect(screen.getByText('ANALYZING...')).toBeInTheDocument();
    
    // Try to click a symptom - should not call toggle
    const feverButton = screen.getByText('Fever').closest('button');
    fireEvent.click(feverButton!);
    expect(mockOnSymptomToggle).not.toHaveBeenCalled();
  });

  it('displays severity indicators for symptoms', () => {
    render(<SymptomSelector {...defaultProps} />);
    
    // Check that severity indicators are present (rendered in lowercase)
    expect(screen.getByText('moderate')).toBeInTheDocument(); // Fever
    expect(screen.getByText('severe')).toBeInTheDocument(); // Hemorrhage
    expect(screen.getAllByText('mild')).toHaveLength(3); // Cough, Headache, Nausea
  });

  it('applies correct styling for V.I.C.T.O.R. clinical aesthetic', () => {
    render(<SymptomSelector {...defaultProps} />);
    
    const container = screen.getByText('SYMPTOM SELECTION').closest('div')?.parentElement;
    expect(container).toHaveClass('victor-panel', 'victor-border-primary');
  });

  it('handles empty available symptoms gracefully', () => {
    render(<SymptomSelector {...defaultProps} availableSymptoms={[]} />);
    
    expect(screen.getByText('SYMPTOM SELECTION')).toBeInTheDocument();
    expect(screen.getByText('0 SELECTED')).toBeInTheDocument();
  });
});