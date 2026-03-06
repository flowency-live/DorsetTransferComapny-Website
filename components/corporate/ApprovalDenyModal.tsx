'use client';

import { useState, useEffect } from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface ApprovalDenyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  bookingId: string;
  isLoading?: boolean;
}

export default function ApprovalDenyModal({
  isOpen,
  onClose,
  onConfirm,
  bookingId,
  isLoading = false,
}: ApprovalDenyModalProps) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setReason('');
      setError('');
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!reason.trim()) {
      setError('Please provide a reason for denying this booking');
      return;
    }

    if (reason.trim().length < 10) {
      setError('Please provide a more detailed reason (at least 10 characters)');
      return;
    }

    setError('');
    onConfirm(reason.trim());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={!isLoading ? onClose : undefined}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 corp-card rounded-xl shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b corp-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/30">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Deny Booking</h2>
              <p className="text-sm text-[var(--corp-text-muted)]">{bookingId}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-2 rounded-lg hover:bg-[var(--corp-bg-elevated)] transition-colors disabled:opacity-50"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-4">
          <div className="mb-4">
            <label
              htmlFor="deny-reason"
              className="block text-sm font-medium mb-2"
            >
              Reason for denial <span className="text-red-500">*</span>
            </label>
            <textarea
              id="deny-reason"
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError('');
              }}
              placeholder="Please explain why this booking is being denied..."
              rows={4}
              disabled={isLoading}
              className={`w-full px-3 py-2 rounded-lg border bg-[var(--corp-bg-default)]
                focus:outline-none focus:ring-2 focus:ring-[var(--corp-accent)]
                disabled:opacity-50 disabled:cursor-not-allowed
                ${error ? 'border-red-500' : 'corp-border'}`}
            />
            {error && (
              <p className="mt-1 text-sm text-red-500">{error}</p>
            )}
            <p className="mt-1 text-xs text-[var(--corp-text-muted)]">
              This reason will be shared with the person who requested the booking.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="corp-btn corp-btn-secondary flex-1 px-4 py-2.5 font-medium rounded-lg disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !reason.trim()}
              className="corp-btn flex-1 px-4 py-2.5 font-medium rounded-lg
                bg-red-600 hover:bg-red-700 text-white
                disabled:opacity-50 disabled:cursor-not-allowed
                inline-flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Denying...
                </>
              ) : (
                'Confirm Denial'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
