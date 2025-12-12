'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRequireCorporateAuth } from '@/lib/hooks/useCorporateAuth';
import {
  getTeamMembers,
  addTeamMember,
  updateTeamMember,
  removeTeamMember,
  getDashboard,
} from '@/lib/services/corporateApi';
import CorporateHeader from '@/components/corporate/CorporateHeader';
import Footer from '@/components/shared/Footer';

interface TeamMember {
  userId: string;
  email: string;
  name: string;
  role: 'admin' | 'booker';
  status: string;
  lastLogin?: string;
  createdAt: string;
}

export default function CorporateTeamPage() {
  const { user, isLoading: authLoading, logout, isAdmin } = useRequireCorporateAuth();
  const router = useRouter();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [companyName, setCompanyName] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMember, setNewMember] = useState<{ email: string; name: string; role: 'admin' | 'booker' }>({ email: '', name: '', role: 'booker' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

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
      const result = await addTeamMember(newMember);
      if (result.success && result.user) {
        setMembers([...members, result.user]);
        setShowAddModal(false);
        setNewMember({ email: '', name: '', role: 'booker' });
      } else {
        setError('Failed to add team member');
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
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update role');
    }
  };

  const handleRemoveMember = async (userId: string, name: string) => {
    if (!confirm(`Are you sure you want to remove ${name} from the team?`)) {
      return;
    }

    try {
      await removeTeamMember(userId);
      setMembers(members.filter((m) => m.userId !== userId));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to remove team member');
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
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                          {member.userId !== user.userId && (
                            <button
                              onClick={() => handleRemoveMember(member.userId, member.name)}
                              className="text-red-600 hover:text-red-800 font-medium"
                            >
                              Remove
                            </button>
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
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-sage focus:border-sage sm:text-sm"
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
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-sage focus:border-sage sm:text-sm"
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
                        setNewMember({ ...newMember, role: e.target.value as 'admin' | 'booker' })
                      }
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-sage focus:border-sage sm:text-sm"
                    >
                      <option value="booker">Booker - Can book transfers</option>
                      <option value="admin">Admin - Full access including team management</option>
                    </select>
                  </div>

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
    </div>
  );
}
