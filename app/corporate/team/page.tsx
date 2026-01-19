'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, AlertTriangle, CheckCircle, Copy } from 'lucide-react';
import { useRequireCorporateAuth } from '@/lib/hooks/useCorporateAuth';
import {
  getTeamMembers,
  addTeamMember,
  updateTeamMember,
  removeTeamMember,
  resendInvite,
  getDashboard,
} from '@/lib/services/corporateApi';
import CorporateHeader from '@/components/corporate/CorporateHeader';
import Footer from '@/components/shared/Footer';

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
  const { user, isLoading: authLoading, logout, isAdmin } = useRequireCorporateAuth();
  const router = useRouter();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [companyName, setCompanyName] = useState<string | undefined>();
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
      Promise.all([
        getTeamMembers(),
        getDashboard()
      ])
        .then(([teamData, dashboardData]) => {
          setMembers(teamData.users);
          setCompanyName(dashboardData.company?.companyName);
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
        // Show success with magic link
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

  if (authLoading || !user || !isAdmin) {
    return (
      <div className="min-h-screen bg-[#FBF7F0] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sage" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FBF7F0]">
      {/* Header */}
      <CorporateHeader
        userName={user.name}
        companyName={companyName}
        onLogout={logout}
        isAdmin={isAdmin}
      />

      {/* Main Content with padding for fixed header */}
      <main className="flex-1 pt-28 pb-16">
        <div className="container mx-auto px-4 md:px-6">
          {/* Page Header */}
          <div className="mb-8">
            <Link
              href="/corporate/dashboard"
              className="inline-flex items-center text-sm text-navy-light/70 hover:text-sage transition-colors mb-3"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Dashboard
            </Link>
            <h1 className="text-2xl font-bold text-navy">Team Members</h1>
            <p className="text-navy-light/70 mt-1">
              Manage who can book transfers on behalf of your company
            </p>
          </div>

          {/* Team Members Card */}
          <div className="bg-white rounded-lg shadow-sm border border-sage/20">
            <div className="p-6 border-b border-sage/20 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-navy">Team Members</h2>
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-full shadow-sm text-sm font-medium text-white bg-sage hover:bg-sage-dark transition-colors"
              >
                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Team Member
              </button>
            </div>

            {isLoading ? (
              <div className="p-6 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sage mx-auto" />
              </div>
            ) : members.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-navy-light/70">No team members yet. Add your first team member above.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-sage/20">
                  <thead className="bg-sage/5">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-navy-light/70 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-navy-light/70 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-navy-light/70 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-navy-light/70 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-navy-light/70 uppercase tracking-wider">
                        Last Login
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-navy-light/70 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-sage/20">
                    {members.map((member) => (
                      <tr key={member.userId}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-navy">{member.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-navy-light/70">{member.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <select
                            value={member.role}
                            onChange={(e) => handleRoleChange(member.userId, e.target.value as 'admin' | 'booker')}
                            disabled={member.userId === user.userId}
                            className="text-sm border-sage/30 rounded-md shadow-sm focus:border-sage focus:ring-sage disabled:bg-sage/5 disabled:text-navy-light/50"
                          >
                            <option value="admin">Admin</option>
                            <option value="booker">Booker</option>
                          </select>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              member.status === 'active'
                                ? 'bg-sage/20 text-sage-dark'
                                : member.status === 'pending'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {member.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-navy-light/70">
                          {member.lastLogin
                            ? new Date(member.lastLogin).toLocaleDateString()
                            : 'Never'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-3">
                          {member.userId !== user.userId && (
                            <>
                              {member.status === 'pending' && (
                                <button
                                  onClick={() => handleResendInvite(member.userId)}
                                  className="text-sage hover:text-sage-dark font-medium"
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
      </main>

      {/* Footer */}
      <Footer />

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div
              className="fixed inset-0 bg-navy/50 transition-opacity"
              onClick={() => setShowAddModal(false)}
            />
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-navy mb-4">Add Team Member</h3>
              <form onSubmit={handleAddMember}>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-navy">
                      Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      required
                      value={newMember.name}
                      onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-sage/30 rounded-lg shadow-sm focus:ring-2 focus:ring-sage focus:border-sage text-navy placeholder:text-navy-light/50"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-navy">
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      required
                      value={newMember.email}
                      onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-sage/30 rounded-lg shadow-sm focus:ring-2 focus:ring-sage focus:border-sage text-navy placeholder:text-navy-light/50"
                    />
                  </div>
                  <div>
                    <label htmlFor="role" className="block text-sm font-medium text-navy">
                      Role
                    </label>
                    <select
                      id="role"
                      value={newMember.role}
                      onChange={(e) =>
                        setNewMember({ ...newMember, role: e.target.value as 'admin' | 'booker', requiresApproval: false })
                      }
                      className="mt-1 block w-full px-3 py-2 border border-sage/30 rounded-lg shadow-sm focus:ring-2 focus:ring-sage focus:border-sage text-navy bg-white"
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
                          className="h-4 w-4 text-sage border-sage/30 rounded focus:ring-sage"
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label htmlFor="requiresApproval" className="font-medium text-navy">
                          Requires approval
                        </label>
                        <p className="text-navy-light/70">
                          Bookings from this user will need admin approval before being confirmed.
                        </p>
                      </div>
                    </div>
                  )}

                  {error && (
                    <div className="rounded-md bg-red-50 p-3">
                      <p className="text-sm text-red-800">{error}</p>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 text-sm font-medium text-navy bg-white border border-sage/30 rounded-full hover:bg-sage/5 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 text-sm font-medium text-white bg-sage border border-transparent rounded-full hover:bg-sage-dark disabled:opacity-50 transition-colors"
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
              className="fixed inset-0 bg-navy/50 transition-opacity"
              onClick={() => setSuccessResult(null)}
            />
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="text-center mb-4">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-sage/20 mb-4">
                  <CheckCircle className="h-6 w-6 text-sage" />
                </div>
                <h3 className="text-lg font-semibold text-navy">Team Member Added!</h3>
                <p className="text-sm text-navy-light/70 mt-2">
                  An invitation email has been sent to <strong>{successResult.user?.email}</strong>.
                </p>
              </div>

              {successResult.magicLink && (
                <div className="bg-sage/5 rounded-lg p-4 mb-4">
                  <p className="text-sm font-medium text-navy mb-2">Magic Link (backup)</p>
                  <p className="text-xs text-navy-light/70 mb-2">
                    If they don&apos;t receive the email, share this link directly:
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={successResult.magicLink}
                      className="flex-1 text-xs bg-white border border-sage/30 rounded px-2 py-1.5 text-navy-light/70"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(successResult.magicLink!);
                        showToast('Link copied to clipboard!');
                      }}
                      className="px-3 py-1.5 text-xs font-medium text-sage border border-sage rounded hover:bg-sage/10 transition-colors flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      Copy
                    </button>
                  </div>
                  <p className="text-xs text-navy-light/50 mt-2">
                    This link expires in 5 days.
                  </p>
                </div>
              )}

              <button
                onClick={() => setSuccessResult(null)}
                className="w-full px-4 py-2 text-sm font-medium text-white bg-sage border border-transparent rounded-full hover:bg-sage-dark transition-colors"
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
              className="fixed inset-0 bg-navy/50 transition-opacity"
              onClick={() => setConfirmDialog(null)}
            />
            <div className="relative bg-white rounded-lg shadow-xl max-w-sm w-full p-6">
              <div className="text-center mb-4">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-navy">Remove Team Member?</h3>
                <p className="text-sm text-navy-light/70 mt-2">
                  Are you sure you want to remove <strong>{confirmDialog.name}</strong> from the team? They will no longer be able to book transfers.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDialog(null)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-navy bg-white border border-sage/30 rounded-full hover:bg-sage/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmRemove}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-full hover:bg-red-700 transition-colors"
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
    </div>
  );
}
