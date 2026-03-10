'use client';

import { ClipboardCheck, Clock, CheckCircle, XCircle, Filter } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';

import CorporateLayout from '@/components/corporate/CorporateLayout';
import ApprovalCard from '@/components/corporate/ApprovalCard';
import ApprovalDenyModal from '@/components/corporate/ApprovalDenyModal';
import { useRequireCorporateAuth } from '@/lib/hooks/useCorporateAuth';
import {
  getApprovals,
  approveBooking,
  denyBooking,
  type ApprovalRequest,
  type BookingEdits,
} from '@/lib/services/corporateApi';

type StatusFilter = 'pending_approval' | 'approved' | 'denied' | 'all';

export default function ApprovalsPage() {
  const { user, isAdmin } = useRequireCorporateAuth();
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Filter state
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending_approval');

  // Action state
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [denyingApproval, setDenyingApproval] = useState<ApprovalRequest | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchApprovals = useCallback(async () => {
    try {
      setError(null);
      const status = statusFilter === 'all' ? undefined : statusFilter;
      const data = await getApprovals(status);
      setApprovals(data.approvals || []);
    } catch (err) {
      if (err instanceof Error && err.message.includes('not an approver')) {
        setError('You do not have permission to view approvals');
      } else {
        setError('Failed to load approvals');
      }
      console.error('Failed to load approvals:', err);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    if (user && isAdmin) {
      fetchApprovals();
    } else if (user && !isAdmin) {
      setIsLoading(false);
      setError('You do not have permission to view approvals');
    }
  }, [user, isAdmin, fetchApprovals]);

  const handleApprove = async (bookingId: string, edits?: BookingEdits) => {
    setProcessingId(bookingId);
    try {
      await approveBooking(bookingId, edits);
      // Update local state
      setApprovals(prev => prev.map(a =>
        a.bookingId === bookingId
          ? { ...a, status: 'approved' as const }
          : a
      ));
      showToast('Booking approved successfully');
      // If filtering by pending, remove from view
      if (statusFilter === 'pending_approval') {
        setApprovals(prev => prev.filter(a => a.bookingId !== bookingId));
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to approve booking', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeny = async (reason: string) => {
    if (!denyingApproval) return;

    setProcessingId(denyingApproval.bookingId);
    try {
      await denyBooking(denyingApproval.bookingId, reason);
      // Update local state
      setApprovals(prev => prev.map(a =>
        a.bookingId === denyingApproval.bookingId
          ? { ...a, status: 'denied' as const }
          : a
      ));
      showToast('Booking denied');
      setDenyingApproval(null);
      // If filtering by pending, remove from view
      if (statusFilter === 'pending_approval') {
        setApprovals(prev => prev.filter(a => a.bookingId !== denyingApproval.bookingId));
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to deny booking', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const pendingCount = approvals.filter(a => a.status === 'pending_approval').length;
  const approvedCount = approvals.filter(a => a.status === 'approved').length;
  const deniedCount = approvals.filter(a => a.status === 'denied').length;

  const getFilterCount = (filter: StatusFilter) => {
    switch (filter) {
      case 'pending_approval': return pendingCount;
      case 'approved': return approvedCount;
      case 'denied': return deniedCount;
      case 'all': return approvals.length;
    }
  };

  const filteredApprovals = statusFilter === 'all'
    ? approvals
    : approvals.filter(a => a.status === statusFilter);

  return (
    <CorporateLayout pageTitle="Approvals">
      <div className="max-w-6xl mx-auto">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="corp-icon-wrapper p-2 rounded-lg">
              <ClipboardCheck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="corp-page-title text-2xl font-bold">Booking Approvals</h1>
              <p className="corp-page-subtitle text-sm">
                {pendingCount} pending approval{pendingCount !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {([
            { value: 'pending_approval', label: 'Pending', icon: Clock },
            { value: 'approved', label: 'Approved', icon: CheckCircle },
            { value: 'denied', label: 'Denied', icon: XCircle },
            { value: 'all', label: 'All', icon: Filter },
          ] as const).map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setStatusFilter(value)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                statusFilter === value
                  ? 'bg-[var(--corp-accent)] text-white'
                  : 'bg-[var(--corp-bg-secondary)] text-[var(--corp-text-secondary)] hover:bg-[var(--corp-bg-hover)]'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
              <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${
                statusFilter === value
                  ? 'bg-white/20'
                  : 'bg-[var(--corp-bg-hover)]'
              }`}>
                {getFilterCount(value)}
              </span>
            </button>
          ))}
        </div>

        {/* Error message */}
        {error && (
          <div className="corp-alert corp-alert-error mb-6 p-4 rounded-lg">
            {error}
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="flex justify-center py-12">
            <div className="corp-loading-spinner w-8 h-8 border-4 rounded-full animate-spin" />
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && filteredApprovals.length === 0 && (
          <div className="corp-card p-12 text-center rounded-xl">
            <div className="corp-icon-wrapper mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4">
              {statusFilter === 'pending_approval' ? (
                <CheckCircle className="h-8 w-8 text-green-600" />
              ) : (
                <ClipboardCheck className="h-8 w-8" />
              )}
            </div>
            <h3 className="corp-section-title text-lg font-semibold mb-2">
              {statusFilter === 'pending_approval'
                ? 'All caught up!'
                : `No ${statusFilter === 'all' ? '' : statusFilter.replace('_', ' ')} bookings`}
            </h3>
            <p className="corp-page-subtitle max-w-md mx-auto">
              {statusFilter === 'pending_approval'
                ? 'There are no bookings waiting for your approval right now.'
                : 'No bookings match the selected filter.'}
            </p>
          </div>
        )}

        {/* Approvals list */}
        {!isLoading && !error && filteredApprovals.length > 0 && (
          <div className="space-y-4">
            {filteredApprovals.map(approval => (
              <ApprovalCard
                key={approval.bookingId}
                approval={approval}
                onApprove={() => handleApprove(approval.bookingId)}
                onDeny={() => setDenyingApproval(approval)}
                isProcessing={processingId === approval.bookingId}
              />
            ))}
          </div>
        )}
      </div>

      {/* Deny Modal */}
      <ApprovalDenyModal
        isOpen={!!denyingApproval}
        onClose={() => setDenyingApproval(null)}
        onConfirm={handleDeny}
        bookingId={denyingApproval?.bookingId ?? ''}
        isLoading={!!processingId}
      />

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-[10000] animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg ${
            toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
          }`}>
            <span className="text-sm font-medium">{toast.message}</span>
          </div>
        </div>
      )}
    </CorporateLayout>
  );
}
