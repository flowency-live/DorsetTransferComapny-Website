'use client';

import { useState, useEffect } from 'react';
import { X, AlertTriangle, CheckCircle } from 'lucide-react';
import { API_BASE_URL, API_ENDPOINTS } from '@/lib/config/api';
import { getTenantHeaders } from '@/lib/config/tenant';

interface CancellationPreview {
  bookingId: string;
  originalAmount: number;
  displayOriginalAmount: string;
  cancellationFee: number;
  displayCancellationFee: string;
  refundAmount: number;
  displayRefundAmount: string;
  isFreeCancel: boolean;
  freeCancellationHours: number;
  cancellationFeePercent: number;
  hoursUntilPickup: number;
}

interface Props {
  bookingId: string;
  magicToken?: string;
  onClose: () => void;
  onCancelled?: () => void;
}

function formatPrice(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`;
}

export default function CancelBookingModal({ bookingId, magicToken, onClose, onCancelled }: Props) {
  const [cancelPreview, setCancelPreview] = useState<CancellationPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelled, setCancelled] = useState(false);

  useEffect(() => {
    const fetchPreview = async () => {
      if (!bookingId || !magicToken) {
        setError('Unable to load cancellation details');
        setLoading(false);
        return;
      }

      try {
        const url = `${API_BASE_URL}${API_ENDPOINTS.bookings}/${bookingId}/cancel-preview?token=${encodeURIComponent(magicToken)}`;
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...getTenantHeaders(),
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to load cancellation details');
        }

        const data = await response.json();
        setCancelPreview(data);
      } catch (err) {
        console.error('Error fetching cancellation preview:', err);
        setError(err instanceof Error ? err.message : 'Failed to load cancellation details');
      } finally {
        setLoading(false);
      }
    };

    fetchPreview();
  }, [bookingId, magicToken]);

  const handleCancel = async () => {
    if (!magicToken) return;

    setCancelling(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_BASE_URL}${API_ENDPOINTS.bookings}/${bookingId}?token=${encodeURIComponent(magicToken)}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            ...getTenantHeaders(),
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to cancel booking');
      }

      setCancelled(true);
      setTimeout(() => {
        onCancelled?.();
        onClose();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel booking');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="corp-card rounded-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b corp-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-red-100">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <h2 className="text-lg font-semibold">Cancel Booking</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-sage/10 transition-colors"
            disabled={cancelling}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Success State */}
          {cancelled && (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Booking Cancelled</h3>
              <p className="text-sm opacity-70">
                Your booking has been successfully cancelled.
                {cancelPreview?.refundAmount && cancelPreview.refundAmount > 0 && (
                  <span> A refund of {formatPrice(cancelPreview.refundAmount)} will be processed.</span>
                )}
              </p>
            </div>
          )}

          {/* Loading State */}
          {loading && !cancelled && (
            <div className="text-center py-8">
              <div className="corp-loading-spinner w-10 h-10 border-4 rounded-full animate-spin mx-auto" />
              <p className="mt-4 text-sm opacity-70">Loading cancellation details...</p>
            </div>
          )}

          {/* Error State */}
          {error && !loading && !cancelled && (
            <div className="text-center py-6">
              <div className="corp-badge corp-badge-danger px-4 py-2 mb-4">
                {error}
              </div>
              <button onClick={onClose} className="corp-btn corp-btn-secondary">
                Close
              </button>
            </div>
          )}

          {/* Preview State */}
          {cancelPreview && !loading && !error && !cancelled && (
            <>
              {/* Free Cancellation Notice */}
              {cancelPreview.isFreeCancel ? (
                <div className="p-4 rounded-lg bg-green-50 border border-green-200 mb-4">
                  <p className="text-sm text-green-800">
                    <span className="font-semibold">Free cancellation</span> - You will receive a full refund of {formatPrice(cancelPreview.refundAmount)}
                  </p>
                </div>
              ) : (
                <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 mb-4">
                  <p className="text-sm font-semibold text-amber-800 mb-2">Cancellation fee applies</p>
                  <div className="space-y-1 text-sm text-amber-900">
                    <div className="flex justify-between">
                      <span>Original amount:</span>
                      <span>{formatPrice(cancelPreview.originalAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Cancellation fee ({cancelPreview.cancellationFeePercent}%):</span>
                      <span className="text-red-600">-{formatPrice(cancelPreview.cancellationFee)}</span>
                    </div>
                    <div className="flex justify-between font-semibold pt-2 border-t border-amber-200">
                      <span>Refund amount:</span>
                      <span>{formatPrice(cancelPreview.refundAmount)}</span>
                    </div>
                  </div>
                  <p className="text-xs text-amber-700 mt-3">
                    Free cancellation is available up to {cancelPreview.freeCancellationHours} hours before pickup.
                  </p>
                </div>
              )}

              {/* Confirmation Text */}
              <p className="text-sm opacity-70 mb-6">
                Are you sure you want to cancel booking <span className="font-semibold">{bookingId}</span>? This action cannot be undone.
              </p>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  disabled={cancelling}
                  className="corp-btn corp-btn-secondary flex-1"
                >
                  Keep Booking
                </button>
                <button
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="corp-btn corp-btn-danger flex-1"
                >
                  {cancelling ? 'Cancelling...' : 'Yes, Cancel'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}