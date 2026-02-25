'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, CheckCircle, Copy, Plus, UserCog } from 'lucide-react';
import { useRequireCorporateAuth } from '@/lib/hooks/useCorporateAuth';
import {
  getTeamMembers,
  addTeamMember,
  updateTeamMember,
  removeTeamMember,
  resendInvite,
} from '@/lib/services/corporateApi';
import CorporateLayout from '@/components/corporate/CorporateLayout';

interface TeamMember {
  userId: string;
  email: string;
  name: string;
  role: 'admin' | 'booker';
  requiresApproval?: boolean;
  status: string;
  lastLogin?: string;
  createdAt: string;
}

interface AddMemberResult {
  success: boolean;
  user?: TeamMember;
  magicLink?: string;
  instructions?: { note: string };
  message?: string;
}

export default function CorporateTeamPage() {
  const { user, isAdmin } = useRequireCorporateAuth();
  const router = useRouter();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMember, setNewMember] = useState<{ email: string; name: string; role: 'admin' | 'booker'; requiresApproval: boolean }>({ email: '', name: '', role: 'booker', requiresApproval: false });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successResult, setSuccessResult] = useState<AddMemberResult | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ show: boolean; userId: string; name: string } | null>(null);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    if (user && !isAdmin) {
      router.push('/corporate/dashboard');
    }
  }, [user, isAdmin, router]);

  useEffect(() => {
    if (user && isAdmin) {
      getTeamMembers()
        .then((teamData) => {
          setMembers(teamData.users);
        })
        .catch(console.error)
        .finally(() => setIsLoading(false));
    }
  }, [user, isAdmin]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const result = await addTeamMember(newMember) as AddMemberResult;
      if (result.success && result.user) {
        setMembers([...members, result.user]);
        setShowAddModal(false);
        setNewMember({ email: '', name: '', role: 'booker', requiresApproval: false });
        setSuccessResult(result);
      } else {
        setError(result.message || 'Failed to add team member');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add team member');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'booker') => {
    try {
      await updateTeamMember(userId, { role: newRole });
      setMembers(members.map((m) => (m.userId === userId ? { ...m, role: newRole } : m)));
      showToast('Role updated successfully');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update role', 'error');
    }
  };

  const handleRemoveClick = (userId: string, name: string) => {
    setConfirmDialog({ show: true, userId, name });
  };

  const handleConfirmRemove = async () => {
    if (!confirmDialog) return;

    try {
      await removeTeamMember(confirmDialog.userId);
      setMembers(members.filter((m) => m.userId !== confirmDialog.userId));
      showToast('Team member removed successfully');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to remove team member', 'error');
    } finally {
      setConfirmDialog(null);
    }
  };

  const handleResendInvite = async (userId: string) => {
    try {
      const result = await resendInvite(userId);
      if (result.success) {
        setSuccessResult({
          success: true,
          magicLink: result.magicLink,
          message: result.message,
        });
      } else {
        showToast(result.message || 'Failed to resend invite', 'error');
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to resend invite', 'error');
    }
  };

  return (
    <CorporateLayout pageTitle="Team Management">
      <div className="max-w-6xl mx-auto">
        {/* Admin Badge */}
        <div className="mb-6">
          <div className="corp-badge corp-badge-admin inline-flex">
            <UserCog className="w-4 h-4 mr-1 inline" />
            Admin Only
          </div>
        </div>

        {/* Team Members Card */}
        <div className="corp-card rounded-lg">
          <div className="p-6 border-b corp-border flex justify-between items-center">
            <h2 className="corp-section-title text-lg font-semibold">Team Members</h2>
            <button
              onClick={() => setShowAddModal(true)}
              className="corp-btn corp-btn-primary inline-flex items-center px-4 py-2 rounded-full text-sm font-medium"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Team Member
            </button>
          </div>

          {isLoading ? (
            <div className="p-6 text-center">
              <div className="corp-loading-spinner w-8 h-8 border-4 rounded-full animate-spin mx-auto" />
            </div>
          ) : members.length === 0 ? (
            <div className="p-6 text-center">
              <p className="corp-page-subtitle">No team members yet. Add your first team member above.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="corp-table-header-sage">
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Last Login</th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y corp-border">
                  {members.map((member) => (
                    <tr key={member.userId} className="corp-table-row">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium">{member.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm opacity-70">{member.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={member.role}
                          onChange={(e) => handleRoleChange(member.userId, e.target.value as 'admin' | 'booker')}
                          disabled={member.userId === user?.userId}
                          className="corp-input text-sm rounded-md py-1 px-2 disabled:opacity-50"
                        >
                          <option value="admin">Admin</option>
                          <option value="booker">Booker</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`corp-badge text-xs ${
                            member.status === 'active'
                              ? 'corp-badge-success'
                              : member.status === 'pending'
                              ? 'corp-badge-warning'
                              : 'corp-badge-neutral'
                          }`}
                        >
                          {member.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm opacity-70">
                        {member.lastLogin
                          ? new Date(member.lastLogin).toLocaleDateString()
                          : 'Never'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-3">
                        {member.userId !== user?.userId && (
                          <>
                            {member.status === 'pending' && (
                              <button
                                onClick={() => handleResendInvite(member.userId)}
                                className="corp-link font-medium"
                              >
                                Resend Invite
                              </button>
                            )}
                            <button
                              onClick={() => handleRemoveClick(member.userId, member.name)}
                              className="text-red-600 hover:text-red-800 font-medium"
                            >
                              Remove
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div
              className="fixed inset-0 bg-black/50 transition-opacity"
              onClick={() => setShowAddModal(false)}
            />
            <div className="corp-modal relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold mb-4">Add Team Member</h3>
              <form onSubmit={handleAddMember}>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium">Name</label>
                    <input
                      type="text"
                      id="name"
                      required
                      value={newMember.name}
                      onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                      className="corp-input mt-1 block w-full px-3 py-2 rounded-lg"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium">Email</label>
                    <input
                      type="email"
                      id="email"
                      required
                      value={newMember.email}
                      onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                      className="corp-input mt-1 block w-full px-3 py-2 rounded-lg"
                    />
                  </div>
                  <div>
                    <label htmlFor="role" className="block text-sm font-medium">Role</label>
                    <select
                      id="role"
                      value={newMember.role}
                      onChange={(e) =>
                        setNewMember({ ...newMember, role: e.target.value as 'admin' | 'booker', requiresApproval: false })
                      }
                      className="corp-input mt-1 block w-full px-3 py-2 rounded-lg"
                    >
                      <option value="booker">Booker - Can book transfers</option>
                      <option value="admin">Admin - Full access including team management</option>
                    </select>
                  </div>

                  {newMember.role === 'booker' && (
                    <div className="flex items-start">
                      <div className="flex items-center h-5">
                        <input
                          id="requiresApproval"
                          type="checkbox"
                          checked={newMember.requiresApproval}
                          onChange={(e) => setNewMember({ ...newMember, requiresApproval: e.target.checked })}
                          className="h-4 w-4 rounded"
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label htmlFor="requiresApproval" className="font-medium">Requires approval</label>
                        <p className="opacity-70">
                          Bookings from this user will need admin approval before being confirmed.
                        </p>
                      </div>
                    </div>
                  )}

                  {error && (
                    <div className="corp-alert corp-alert-error rounded-md p-3">
                      <p className="text-sm">{error}</p>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="corp-btn corp-btn-secondary px-4 py-2 text-sm font-medium rounded-full"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="corp-btn corp-btn-primary px-4 py-2 text-sm font-medium rounded-full disabled:opacity-50"
                  >
                    {isSubmitting ? 'Adding...' : 'Add & Send Invite'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal with Magic Link */}
      {successResult && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div
              className="fixed inset-0 bg-black/50 transition-opacity"
              onClick={() => setSuccessResult(null)}
            />
            <div className="corp-modal relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="text-center mb-4">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-sage/20 mb-4">
                  <CheckCircle className="h-6 w-6 text-sage" />
                </div>
                <h3 className="text-lg font-semibold">Team Member Added!</h3>
                <p className="text-sm opacity-70 mt-2">
                  An invitation email has been sent to <strong>{successResult.user?.email}</strong>.
                </p>
              </div>

              {successResult.magicLink && (
                <div className="bg-sage/5 rounded-lg p-4 mb-4">
                  <p className="text-sm font-medium mb-2">Magic Link (backup)</p>
                  <p className="text-xs opacity-70 mb-2">
                    If they don&apos;t receive the email, share this link directly:
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={successResult.magicLink}
                      className="corp-input flex-1 text-xs px-2 py-1.5 rounded"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(successResult.magicLink!);
                        showToast('Link copied to clipboard!');
                      }}
                      className="corp-btn corp-btn-secondary px-3 py-1.5 text-xs font-medium rounded flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      Copy
                    </button>
                  </div>
                  <p className="text-xs opacity-50 mt-2">This link expires in 5 days.</p>
                </div>
              )}

              <button
                onClick={() => setSuccessResult(null)}
                className="corp-btn corp-btn-primary w-full px-4 py-2 text-sm font-medium rounded-full"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmDialog?.show && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div
              className="fixed inset-0 bg-black/50 transition-opacity"
              onClick={() => setConfirmDialog(null)}
            />
            <div className="corp-modal relative bg-white rounded-lg shadow-xl max-w-sm w-full p-6">
              <div className="text-center mb-4">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold">Remove Team Member?</h3>
                <p className="text-sm opacity-70 mt-2">
                  Are you sure you want to remove <strong>{confirmDialog.name}</strong> from the team? They will no longer be able to book transfers.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDialog(null)}
                  className="corp-btn corp-btn-secondary flex-1 px-4 py-2 text-sm font-medium rounded-full"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmRemove}
                  className="corp-btn corp-btn-danger flex-1 px-4 py-2 text-sm font-medium rounded-full"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast?.show && (
        <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg ${
            toast.type === 'success' ? 'bg-sage text-white' : 'bg-red-600 text-white'
          }`}>
            {toast.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertTriangle className="w-5 h-5" />
            )}
            <span className="text-sm font-medium">{toast.message}</span>
          </div>
        </div>
      )}
    </CorporateLayout>
  );
}
