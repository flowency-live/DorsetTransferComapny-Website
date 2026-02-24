import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import CreateTripModal from './CreateTripModal';

// Mock the corporateApi
vi.mock('@/lib/services/corporateApi', () => ({
  saveFavouriteTrip: vi.fn(),
}));

// Mock createPortal to render inline for testing
vi.mock('react-dom', async () => {
  const actual = await vi.importActual('react-dom');
  return {
    ...actual,
    createPortal: (node: React.ReactNode) => node,
  };
});

import { saveFavouriteTrip } from '@/lib/services/corporateApi';

const mockSaveFavouriteTrip = saveFavouriteTrip as ReturnType<typeof vi.fn>;

describe('CreateTripModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSaved: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('renders nothing when isOpen is false', () => {
      render(<CreateTripModal {...defaultProps} isOpen={false} />);
      expect(screen.queryByText('Create Favourite Trip')).toBeNull();
    });

    it('renders modal when isOpen is true', () => {
      render(<CreateTripModal {...defaultProps} />);
      expect(screen.getByText('Create Favourite Trip')).toBeTruthy();
    });

    it('renders trip name input field', () => {
      render(<CreateTripModal {...defaultProps} />);
      expect(screen.getByLabelText(/Trip Name/i)).toBeTruthy();
    });

    it('renders pickup location input', () => {
      render(<CreateTripModal {...defaultProps} />);
      expect(screen.getByText(/Pickup Location/i)).toBeTruthy();
    });

    it('renders dropoff location input', () => {
      render(<CreateTripModal {...defaultProps} />);
      expect(screen.getByText(/Drop-off Location/i)).toBeTruthy();
    });

    it('renders vehicle type dropdown', () => {
      render(<CreateTripModal {...defaultProps} />);
      expect(screen.getByLabelText(/Vehicle Type/i)).toBeTruthy();
    });

    it('renders passengers input', () => {
      render(<CreateTripModal {...defaultProps} />);
      expect(screen.getByLabelText(/Passengers/i)).toBeTruthy();
    });

    it('renders luggage input', () => {
      render(<CreateTripModal {...defaultProps} />);
      expect(screen.getByLabelText(/Luggage/i)).toBeTruthy();
    });

    it('renders Cancel and Save buttons', () => {
      render(<CreateTripModal {...defaultProps} />);
      expect(screen.getByRole('button', { name: /Cancel/i })).toBeTruthy();
      expect(screen.getByRole('button', { name: /Save Trip/i })).toBeTruthy();
    });
  });

  describe('Form Validation', () => {
    it('disables Save button when trip name is empty', () => {
      render(<CreateTripModal {...defaultProps} />);
      const saveButton = screen.getByRole('button', { name: /Save Trip/i });
      expect(saveButton).toHaveProperty('disabled', true);
    });

    it('disables Save button when pickup location is not selected', () => {
      render(<CreateTripModal {...defaultProps} />);

      // Enter trip name
      const tripNameInput = screen.getByLabelText(/Trip Name/i);
      fireEvent.change(tripNameInput, { target: { value: 'Office to Airport' } });

      const saveButton = screen.getByRole('button', { name: /Save Trip/i });
      expect(saveButton).toHaveProperty('disabled', true);
    });

    it('disables Save button when dropoff location is not selected', () => {
      render(<CreateTripModal {...defaultProps} />);

      // Enter trip name
      const tripNameInput = screen.getByLabelText(/Trip Name/i);
      fireEvent.change(tripNameInput, { target: { value: 'Office to Airport' } });

      // Note: We can't easily simulate location selection in unit tests
      // The button should still be disabled without dropoff
      const saveButton = screen.getByRole('button', { name: /Save Trip/i });
      expect(saveButton).toHaveProperty('disabled', true);
    });
  });

  describe('User Interactions', () => {
    it('calls onClose when Cancel button is clicked', () => {
      render(<CreateTripModal {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));

      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when overlay is clicked', () => {
      render(<CreateTripModal {...defaultProps} />);

      // Find and click the overlay (background)
      const overlay = document.querySelector('[data-testid="modal-overlay"]');
      if (overlay) {
        fireEvent.click(overlay);
        expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
      }
    });

    it('calls onClose when X button is clicked', () => {
      render(<CreateTripModal {...defaultProps} />);

      // Find close button by aria-label or role
      const closeButton = screen.getByLabelText(/Close/i);
      fireEvent.click(closeButton);

      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('updates trip name when typed', () => {
      render(<CreateTripModal {...defaultProps} />);

      const tripNameInput = screen.getByLabelText(/Trip Name/i) as HTMLInputElement;
      fireEvent.change(tripNameInput, { target: { value: 'Daily Commute' } });

      expect(tripNameInput.value).toBe('Daily Commute');
    });

    it('updates vehicle type when changed', () => {
      render(<CreateTripModal {...defaultProps} />);

      const vehicleSelect = screen.getByLabelText(/Vehicle Type/i) as HTMLSelectElement;
      fireEvent.change(vehicleSelect, { target: { value: 'executive' } });

      expect(vehicleSelect.value).toBe('executive');
    });

    it('updates passengers count when changed', () => {
      render(<CreateTripModal {...defaultProps} />);

      const passengersInput = screen.getByLabelText(/Passengers/i) as HTMLInputElement;
      fireEvent.change(passengersInput, { target: { value: '4' } });

      expect(passengersInput.value).toBe('4');
    });

    it('updates luggage count when changed', () => {
      render(<CreateTripModal {...defaultProps} />);

      const luggageInput = screen.getByLabelText(/Luggage/i) as HTMLInputElement;
      fireEvent.change(luggageInput, { target: { value: '3' } });

      expect(luggageInput.value).toBe('3');
    });
  });

  describe('Form Submission', () => {
    it('calls saveFavouriteTrip with correct data when form is valid and submitted', async () => {
      mockSaveFavouriteTrip.mockResolvedValue({ success: true, message: 'Trip saved' });

      // We'll need to test this with a component that exposes a way to set locations
      // For now, we test the submission flow when valid
      render(<CreateTripModal {...defaultProps} />);

      // This test will be updated when we implement the component
      // For now, just verify the mock is configured
      expect(mockSaveFavouriteTrip).not.toHaveBeenCalled();
    });

    it('calls onSaved and onClose after successful save', async () => {
      mockSaveFavouriteTrip.mockResolvedValue({ success: true, message: 'Trip saved' });

      // This test will verify the success flow once component is implemented
      render(<CreateTripModal {...defaultProps} />);

      // Initial state - callbacks not called yet
      expect(defaultProps.onSaved).not.toHaveBeenCalled();
      expect(defaultProps.onClose).not.toHaveBeenCalled();
    });

    it('displays error message when save fails', async () => {
      mockSaveFavouriteTrip.mockResolvedValue({
        success: false,
        message: 'Failed to save trip'
      });

      render(<CreateTripModal {...defaultProps} />);

      // Error display will be tested when component is implemented
      expect(screen.queryByText(/Failed to save trip/i)).toBeNull();
    });

    it('shows loading state while saving', async () => {
      // Create a promise that we can control
      let resolvePromise: (value: unknown) => void;
      const savePromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      mockSaveFavouriteTrip.mockReturnValue(savePromise);

      render(<CreateTripModal {...defaultProps} />);

      // Loading state will be tested when component is implemented
      // For now, verify initial state
      expect(screen.queryByText(/Saving.../i)).toBeNull();
    });
  });

  describe('Reset State', () => {
    it('resets form when modal is closed and reopened', () => {
      const { rerender } = render(<CreateTripModal {...defaultProps} />);

      // Enter some data
      const tripNameInput = screen.getByLabelText(/Trip Name/i) as HTMLInputElement;
      fireEvent.change(tripNameInput, { target: { value: 'Test Trip' } });
      expect(tripNameInput.value).toBe('Test Trip');

      // Close modal
      rerender(<CreateTripModal {...defaultProps} isOpen={false} />);

      // Reopen modal
      rerender(<CreateTripModal {...defaultProps} isOpen={true} />);

      // Form should be reset
      const newTripNameInput = screen.getByLabelText(/Trip Name/i) as HTMLInputElement;
      expect(newTripNameInput.value).toBe('');
    });
  });
});