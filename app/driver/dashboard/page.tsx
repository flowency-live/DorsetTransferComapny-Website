'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/shared/Header';
import Footer from '@/components/shared/Footer';
import {
  getStoredToken,
  verifySession,
  logout,
  getProfile,
  getVehicles,
  updateProfile,
  addVehicle,
  removeVehicle,
  DriverProfile,
  DriverVehicle,
} from '@/lib/services/driverApi';

type TabType = 'overview' | 'profile' | 'vehicles';

export default function DriverDashboardPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [vehicles, setVehicles] = useState<DriverVehicle[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const loadData = async () => {
      const token = getStoredToken();
      if (!token) {
        router.push('/driver/login');
        return;
      }

      const sessionResult = await verifySession();
      if (!sessionResult.valid) {
        router.push('/driver/login');
        return;
      }

      try {
        const [profileRes, vehiclesRes] = await Promise.all([
          getProfile(),
          getVehicles(),
        ]);
        setProfile(profileRes.profile);
        setVehicles(vehiclesRes.vehicles);
      } catch {
        setError('Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [router]);

  const handleLogout = async () => {
    await logout();
    router.push('/driver/login');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-[#FBF7F0]">
        <Header />
        <main className="flex-1 pt-24 pb-16 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sage mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FBF7F0]">
      <Header />

      <main className="flex-1 pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
              <div>
                <span className="inline-block px-3 py-1 bg-sage/10 text-sage text-xs font-medium rounded-full mb-2">
                  Driver Portal
                </span>
                <h1 className="text-2xl font-semibold text-gray-900">
                  Welcome, {profile?.firstName}!
                </h1>
              </div>
              <button
                onClick={handleLogout}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Sign out
              </button>
            </div>

            {/* Status Banner */}
            {profile?.status === 'pending' && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-amber-800">Account pending approval</h3>
                    <p className="mt-1 text-sm text-amber-700">
                      Your account is being reviewed. Complete your profile and add your vehicle to speed up the process.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-md bg-red-50 p-4 mb-6">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Tabs */}
            <div className="border-b border-gray-200 mb-6">
              <nav className="-mb-px flex space-x-8">
                {(['overview', 'profile', 'vehicles'] as TabType[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${
                      activeTab === tab
                        ? 'border-sage text-sage'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
              <OverviewTab profile={profile} vehicles={vehicles} />
            )}
            {activeTab === 'profile' && (
              <ProfileTab profile={profile} setProfile={setProfile} setError={setError} />
            )}
            {activeTab === 'vehicles' && (
              <VehiclesTab vehicles={vehicles} setVehicles={setVehicles} setError={setError} />
            )}

            {/* Back to main site */}
            <div className="mt-8 text-center">
              <Link href="/" className="text-sm text-gray-600 hover:text-gray-900">
                &larr; Back to main site
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

// Overview Tab Component
function OverviewTab({ profile, vehicles }: { profile: DriverProfile | null; vehicles: DriverVehicle[] }) {
  const getStatusBadge = (status: string) => {
    const statusClasses: Record<string, string> = {
      pending: 'bg-amber-100 text-amber-800',
      onboarding: 'bg-blue-100 text-blue-800',
      active: 'bg-green-100 text-green-800',
      suspended: 'bg-red-100 text-red-800',
      inactive: 'bg-gray-100 text-gray-800',
    };
    return statusClasses[status] || statusClasses.inactive;
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Account Status Card */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Account Status</h3>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">Status</span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusBadge(profile?.status || 'pending')}`}>
              {profile?.status || 'pending'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">License Verified</span>
            <span className={profile?.licenseVerified ? 'text-green-600' : 'text-amber-600'}>
              {profile?.licenseVerified ? 'Yes' : 'Not yet'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Vehicles</span>
            <span className="text-gray-900">{vehicles.length}</span>
          </div>
        </div>
      </div>

      {/* Working Hours Card */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Working Hours</h3>
        {profile?.workingDays && profile.workingDays.length > 0 ? (
          <div className="space-y-3">
            <div>
              <span className="text-gray-600 text-sm">Days</span>
              <p className="text-gray-900 capitalize">
                {profile.workingDays.join(', ')}
              </p>
            </div>
            {profile.workingHoursStart && profile.workingHoursEnd && (
              <div>
                <span className="text-gray-600 text-sm">Hours</span>
                <p className="text-gray-900">
                  {profile.workingHoursStart} - {profile.workingHoursEnd}
                </p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">
            Set your working days and hours in the Profile tab.
          </p>
        )}
      </div>

      {/* Quick Actions Card */}
      <div className="bg-white rounded-lg shadow p-6 md:col-span-2">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Getting Started</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <div className={`p-4 rounded-lg border ${profile?.firstName && profile?.lastName && profile?.phone ? 'border-green-200 bg-green-50' : 'border-gray-200'}`}>
            <div className="flex items-center">
              {profile?.firstName && profile?.lastName && profile?.phone ? (
                <svg className="h-5 w-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <span className="h-5 w-5 rounded-full border-2 border-gray-300 mr-2"></span>
              )}
              <span className="font-medium">Complete profile</span>
            </div>
          </div>
          <div className={`p-4 rounded-lg border ${profile?.workingDays && profile.workingDays.length > 0 ? 'border-green-200 bg-green-50' : 'border-gray-200'}`}>
            <div className="flex items-center">
              {profile?.workingDays && profile.workingDays.length > 0 ? (
                <svg className="h-5 w-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <span className="h-5 w-5 rounded-full border-2 border-gray-300 mr-2"></span>
              )}
              <span className="font-medium">Set working hours</span>
            </div>
          </div>
          <div className={`p-4 rounded-lg border ${vehicles.length > 0 ? 'border-green-200 bg-green-50' : 'border-gray-200'}`}>
            <div className="flex items-center">
              {vehicles.length > 0 ? (
                <svg className="h-5 w-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <span className="h-5 w-5 rounded-full border-2 border-gray-300 mr-2"></span>
              )}
              <span className="font-medium">Add a vehicle</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Profile Tab Component
function ProfileTab({
  profile,
  setProfile,
  setError,
}: {
  profile: DriverProfile | null;
  setProfile: (p: DriverProfile) => void;
  setError: (e: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    firstName: profile?.firstName || '',
    lastName: profile?.lastName || '',
    phone: profile?.phone || '',
    workingDays: profile?.workingDays || [],
    workingHoursStart: profile?.workingHoursStart || '08:00',
    workingHoursEnd: profile?.workingHoursEnd || '18:00',
  });

  const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  const toggleDay = (day: string) => {
    setFormData(prev => ({
      ...prev,
      workingDays: prev.workingDays.includes(day)
        ? prev.workingDays.filter(d => d !== day)
        : [...prev.workingDays, day],
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError('');

    try {
      const result = await updateProfile(formData);
      if (result.success && result.profile) {
        setProfile(result.profile);
        setIsEditing(false);
      } else {
        setError(result.message || 'Failed to update profile');
      }
    } catch {
      setError('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-medium text-gray-900">Your Profile</h3>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="text-sm text-sage hover:text-sage-dark"
          >
            Edit
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">First name</label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-sage focus:border-sage sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Last name</label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-sage focus:border-sage sm:text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-sage focus:border-sage sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Working Days</label>
            <div className="flex flex-wrap gap-2">
              {DAYS.map(day => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={`px-3 py-1 rounded-full text-sm capitalize ${
                    formData.workingDays.includes(day)
                      ? 'bg-sage text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {day.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">Start time</label>
              <input
                type="time"
                value={formData.workingHoursStart}
                onChange={(e) => setFormData({ ...formData, workingHoursStart: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-sage focus:border-sage sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">End time</label>
              <input
                type="time"
                value={formData.workingHoursEnd}
                onChange={(e) => setFormData({ ...formData, workingHoursEnd: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-sage focus:border-sage sm:text-sm"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 bg-sage text-white rounded-md hover:bg-sage-dark disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save changes'}
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <span className="text-sm text-gray-600">Name</span>
              <p className="text-gray-900">{profile?.firstName} {profile?.lastName}</p>
            </div>
            <div>
              <span className="text-sm text-gray-600">Email</span>
              <p className="text-gray-900">{profile?.email}</p>
            </div>
            <div>
              <span className="text-sm text-gray-600">Phone</span>
              <p className="text-gray-900">{profile?.phone}</p>
            </div>
            <div>
              <span className="text-sm text-gray-600">Member since</span>
              <p className="text-gray-900">
                {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : '-'}
              </p>
            </div>
          </div>
          <div>
            <span className="text-sm text-gray-600">Working Days</span>
            <p className="text-gray-900 capitalize">
              {profile?.workingDays?.length ? profile.workingDays.join(', ') : 'Not set'}
            </p>
          </div>
          <div>
            <span className="text-sm text-gray-600">Working Hours</span>
            <p className="text-gray-900">
              {profile?.workingHoursStart && profile?.workingHoursEnd
                ? `${profile.workingHoursStart} - ${profile.workingHoursEnd}`
                : 'Not set'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// Vehicles Tab Component
function VehiclesTab({
  vehicles,
  setVehicles,
  setError,
}: {
  vehicles: DriverVehicle[];
  setVehicles: (v: DriverVehicle[]) => void;
  setError: (e: string) => void;
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newVrn, setNewVrn] = useState('');
  const [vehicleType, setVehicleType] = useState<'standard' | 'executive' | 'minibus'>('standard');
  const [isAdding, setIsAdding] = useState(false);

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdding(true);
    setError('');

    try {
      const result = await addVehicle({ vrn: newVrn, vehicleType });
      if (result.success && result.vehicle) {
        setVehicles([...vehicles, result.vehicle]);
        setShowAddForm(false);
        setNewVrn('');
      } else {
        setError(result.message || 'Failed to add vehicle');
      }
    } catch {
      setError('Failed to add vehicle');
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveVehicle = async (vrn: string) => {
    if (!confirm('Are you sure you want to remove this vehicle?')) return;

    try {
      const result = await removeVehicle(vrn);
      if (result.success) {
        setVehicles(vehicles.filter(v => v.vrn !== vrn));
      } else {
        setError(result.message || 'Failed to remove vehicle');
      }
    } catch {
      setError('Failed to remove vehicle');
    }
  };

  const getComplianceBadge = (status: string) => {
    const statusClasses: Record<string, string> = {
      compliant: 'bg-green-100 text-green-800',
      expiring_soon: 'bg-amber-100 text-amber-800',
      expired: 'bg-red-100 text-red-800',
      blocked: 'bg-red-100 text-red-800',
      pending_verification: 'bg-blue-100 text-blue-800',
    };
    return statusClasses[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {/* Add Vehicle Form */}
      {showAddForm ? (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Add a Vehicle</h3>
          <form onSubmit={handleAddVehicle} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Vehicle Registration Number
              </label>
              <input
                type="text"
                value={newVrn}
                onChange={(e) => setNewVrn(e.target.value.toUpperCase())}
                placeholder="AB12 CDE"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-sage focus:border-sage sm:text-sm uppercase"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Vehicle Type</label>
              <select
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value as 'standard' | 'executive' | 'minibus')}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-sage focus:border-sage sm:text-sm"
              >
                <option value="standard">Standard (up to 4 passengers)</option>
                <option value="executive">Executive (up to 4 passengers)</option>
                <option value="minibus">Minibus (up to 8 passengers)</option>
              </select>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isAdding}
                className="px-4 py-2 bg-sage text-white rounded-md hover:bg-sage-dark disabled:opacity-50"
              >
                {isAdding ? 'Adding...' : 'Add vehicle'}
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full py-3 px-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-sage hover:text-sage transition-colors"
        >
          + Add a vehicle
        </button>
      )}

      {/* Vehicle List */}
      {vehicles.length > 0 ? (
        <div className="space-y-4">
          {vehicles.map((vehicle) => (
            <div key={vehicle.vrn} className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-lg font-semibold text-gray-900">{vehicle.vrn}</h4>
                  <p className="text-sm text-gray-600 capitalize">{vehicle.vehicleType}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getComplianceBadge(vehicle.complianceStatus)}`}>
                  {vehicle.complianceStatus.replace('_', ' ')}
                </span>
              </div>
              <div className="mt-4 grid gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">MOT Status</span>
                  <span className={vehicle.motStatus === 'Valid' ? 'text-green-600' : 'text-gray-900'}>
                    {vehicle.motStatus}
                    {vehicle.motExpiryDate && ` (expires ${new Date(vehicle.motExpiryDate).toLocaleDateString()})`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax Status</span>
                  <span className={vehicle.taxStatus === 'Taxed' ? 'text-green-600' : 'text-gray-900'}>
                    {vehicle.taxStatus}
                    {vehicle.taxDueDate && ` (due ${new Date(vehicle.taxDueDate).toLocaleDateString()})`}
                  </span>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200 flex justify-end">
                <button
                  onClick={() => handleRemoveVehicle(vehicle.vrn)}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  Remove vehicle
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        !showAddForm && (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <p className="text-gray-600">No vehicles added yet.</p>
            <p className="text-sm text-gray-500 mt-1">
              Add your vehicle to start receiving job assignments.
            </p>
          </div>
        )
      )}
    </div>
  );
}
