'use client';

import { MapPin, Clock, Car, User, Calendar, CheckCircle, XCircle } from 'lucide-react';
import { type ApprovalRequest } from '@/lib/services/corporateApi';

interface ApprovalCardProps {
  approval: ApprovalRequest;
  onApprove: () => void;
  onDeny: () => void;
  isProcessing?: boolean;
}

export default function ApprovalCard({
  approval,
  onApprove,
  onDeny,
  isProcessing = false,
}: ApprovalCardProps) {
  const isPending = approval.status === 'pending_approval';
  const isApproved = approval.status === 'approved';
  const isDenied = approval.status === 'denied';

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatPrice = (pence: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(pence / 100);
  };

  const getStatusBadge = () => {
    if (isApproved) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
          <CheckCircle className="h-3 w-3" />
          Approved
        </span>
      );
    }
    if (isDenied) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
          <XCircle className="h-3 w-3" />
          Denied
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
        <Clock className="h-3 w-3" />
        Pending
      </span>
    );
  };

  return (
    <div className={`corp-card rounded-xl overflow-hidden ${
      isPending ? 'border-l-4 border-l-amber-500' : ''
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b corp-border bg-[var(--corp-bg-elevated)]">
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm font-medium text-[var(--corp-accent)]">
            {approval.bookingId}
          </span>
          {getStatusBadge()}
        </div>
        <div className="text-lg font-semibold">
          {formatPrice(approval.estimatedPrice)}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Route */}
        <div className="flex items-start gap-3 mb-4">
          <div className="flex flex-col items-center">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <div className="w-0.5 h-8 bg-[var(--corp-border-default)]" />
            <div className="w-3 h-3 rounded-full bg-red-500" />
          </div>
          <div className="flex-1 space-y-2">
            <div>
              <p className="text-xs text-[var(--corp-text-muted)] uppercase">Pickup</p>
              <p className="text-sm font-medium">{approval.pickupLocation.address}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--corp-text-muted)] uppercase">Drop-off</p>
              <p className="text-sm font-medium">{approval.dropoffLocation.address}</p>
            </div>
          </div>
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-[var(--corp-text-muted)]" />
            <div>
              <p className="text-xs text-[var(--corp-text-muted)]">Pickup Time</p>
              <p className="text-sm font-medium">{formatDate(approval.pickupTime)}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Car className="h-4 w-4 text-[var(--corp-text-muted)]" />
            <div>
              <p className="text-xs text-[var(--corp-text-muted)]">Vehicle</p>
              <p className="text-sm font-medium capitalize">{approval.vehicleType}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-[var(--corp-text-muted)]" />
            <div>
              <p className="text-xs text-[var(--corp-text-muted)]">Requested By</p>
              <p className="text-sm font-medium">{approval.requestedBy.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-[var(--corp-text-muted)]" />
            <div>
              <p className="text-xs text-[var(--corp-text-muted)]">Requested</p>
              <p className="text-sm font-medium">{formatDate(approval.requestedAt)}</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        {isPending && (
          <div className="flex gap-3 pt-4 border-t corp-border">
            <button
              onClick={onDeny}
              disabled={isProcessing}
              className="corp-btn corp-btn-secondary flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 font-medium rounded-lg disabled:opacity-50"
            >
              <XCircle className="h-4 w-4" />
              Deny
            </button>
            <button
              onClick={onApprove}
              disabled={isProcessing}
              className="corp-btn corp-btn-primary flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 font-medium rounded-lg disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Approve
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
