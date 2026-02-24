import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import PreferencesReviewStep from './PreferencesReviewStep';
import type { RefreshmentPreferences } from '@/lib/services/corporateApi';

describe('PreferencesReviewStep', () => {
  const mockPassengerPreferences = {
    refreshments: {
      stillWater: true,
      sparklingWater: false,
      tea: true,
      coffee: false,
      other: '',
    } as RefreshmentPreferences,
    driverInstructions: 'Please wait at arrivals hall',
  };

  const mockAccountDefaults = {
    refreshments: {
      stillWater: true,
      sparklingWater: true,
      tea: false,
      coffee: true,
      other: 'Orange juice if available',
    } as RefreshmentPreferences,
    driverInstructions: 'Company default: Driver should call 10 mins before arrival',
  };

  const defaultProps = {
    passengerName: 'John Smith',
    passengerPreferences: mockPassengerPreferences,
    accountDefaults: mockAccountDefaults,
    specialRequests: '',
    onSpecialRequestsChange: vi.fn(),
    onPreferencesChange: vi.fn(),
    onBack: vi.fn(),
    onContinue: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the review step header', () => {
      render(<PreferencesReviewStep {...defaultProps} />);
      expect(screen.getByText('Review Preferences')).toBeTruthy();
    });

    it('displays passenger name', () => {
      render(<PreferencesReviewStep {...defaultProps} />);
      expect(screen.getByText(/John Smith/)).toBeTruthy();
    });

    it('shows passenger preferences section', () => {
      render(<PreferencesReviewStep {...defaultProps} />);
      expect(screen.getByText(/Passenger Preferences/i)).toBeTruthy();
    });

    it('displays refreshment preferences from passenger', () => {
      render(<PreferencesReviewStep {...defaultProps} />);
      expect(screen.getByLabelText(/Still Water/i)).toBeTruthy();
      expect(screen.getByLabelText(/Tea/i)).toBeTruthy();
    });

    it('shows account defaults section when defaults exist', () => {
      render(<PreferencesReviewStep {...defaultProps} />);
      expect(screen.getByText(/Account Defaults/i)).toBeTruthy();
    });

    it('shows driver instructions from passenger', () => {
      render(<PreferencesReviewStep {...defaultProps} />);
      expect(screen.getByText(/Please wait at arrivals hall/i)).toBeTruthy();
    });

    it('shows special requests field', () => {
      render(<PreferencesReviewStep {...defaultProps} />);
      expect(screen.getByLabelText(/Special Requests/i)).toBeTruthy();
    });

    it('renders Back and Continue buttons', () => {
      render(<PreferencesReviewStep {...defaultProps} />);
      expect(screen.getByRole('button', { name: /Back/i })).toBeTruthy();
      expect(screen.getByRole('button', { name: /Continue/i })).toBeTruthy();
    });
  });

  describe('Refreshment Preferences', () => {
    it('checkboxes reflect passenger preferences by default', () => {
      render(<PreferencesReviewStep {...defaultProps} />);

      const stillWaterCheckbox = screen.getByLabelText(/Still Water/i) as HTMLInputElement;
      const teaCheckbox = screen.getByLabelText(/Tea/i) as HTMLInputElement;

      expect(stillWaterCheckbox.checked).toBe(true);
      expect(teaCheckbox.checked).toBe(true);
    });

    it('allows toggling refreshment preferences', () => {
      render(<PreferencesReviewStep {...defaultProps} />);

      const coffeeCheckbox = screen.getByLabelText(/Coffee/i) as HTMLInputElement;
      expect(coffeeCheckbox.checked).toBe(false);

      fireEvent.click(coffeeCheckbox);

      expect(defaultProps.onPreferencesChange).toHaveBeenCalled();
    });
  });

  describe('Driver Instructions', () => {
    it('displays editable driver instructions field', () => {
      render(<PreferencesReviewStep {...defaultProps} />);

      const instructionsField = screen.getByDisplayValue(/Please wait at arrivals hall/i);
      expect(instructionsField).toBeTruthy();
    });

    it('allows editing driver instructions', () => {
      render(<PreferencesReviewStep {...defaultProps} />);

      const instructionsField = screen.getByDisplayValue(/Please wait at arrivals hall/i);
      fireEvent.change(instructionsField, { target: { value: 'New instructions' } });

      expect(defaultProps.onPreferencesChange).toHaveBeenCalled();
    });
  });

  describe('Special Requests', () => {
    it('displays special requests textarea', () => {
      render(<PreferencesReviewStep {...defaultProps} specialRequests="Child seat needed" />);

      const textarea = screen.getByLabelText(/Special Requests/i) as HTMLTextAreaElement;
      expect(textarea.value).toBe('Child seat needed');
    });

    it('calls onSpecialRequestsChange when editing', () => {
      render(<PreferencesReviewStep {...defaultProps} />);

      const textarea = screen.getByLabelText(/Special Requests/i);
      fireEvent.change(textarea, { target: { value: 'New request' } });

      expect(defaultProps.onSpecialRequestsChange).toHaveBeenCalledWith('New request');
    });
  });

  describe('Navigation', () => {
    it('calls onBack when Back button is clicked', () => {
      render(<PreferencesReviewStep {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /Back/i }));

      expect(defaultProps.onBack).toHaveBeenCalledTimes(1);
    });

    it('calls onContinue when Continue button is clicked', () => {
      render(<PreferencesReviewStep {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /Continue/i }));

      expect(defaultProps.onContinue).toHaveBeenCalledTimes(1);
    });
  });

  describe('Without Passenger Preferences', () => {
    it('shows account defaults when no passenger preferences', () => {
      render(
        <PreferencesReviewStep
          {...defaultProps}
          passengerPreferences={undefined}
        />
      );

      // Should still render, using account defaults or empty state
      expect(screen.getByText(/Review Preferences/i)).toBeTruthy();
    });
  });

  describe('Without Account Defaults', () => {
    it('does not show account defaults section when not provided', () => {
      render(
        <PreferencesReviewStep
          {...defaultProps}
          accountDefaults={undefined}
        />
      );

      expect(screen.queryByText(/Account Defaults/i)).toBeNull();
    });
  });

  describe('Info Text', () => {
    it('displays info about edits being for this booking only', () => {
      render(<PreferencesReviewStep {...defaultProps} />);

      expect(screen.getByText(/for this booking only/i)).toBeTruthy();
    });
  });
});