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
  submitLicenseCheckCode,
  getDocuments,
  requestDocumentUploadUrl,
  confirmDocumentUpload,
  deleteDocument,
  getAvailability,
  setAvailability,
  requestVehiclePhotoUploadUrl,
  updateVehiclePhotos,
  DriverProfile,
  DriverVehicle,
  DriverDocument,
  AvailabilityBlock,
} from '@/lib/services/driverApi';

type TabType = 'overview' | 'profile' | 'license' | 'vehicles' | 'calendar' | 'documents';

export default function DriverDashboardPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [vehicles, setVehicles] = useState<DriverVehicle[]>([]);
  const [documents, setDocuments] = useState<DriverDocument[]>([]);
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
        const [profileRes, vehiclesRes, documentsRes] = await Promise.all([
          getProfile(),
          getVehicles(),
          getDocuments(),
        ]);
        setProfile(profileRes.profile);
        setVehicles(vehiclesRes.vehicles);
        setDocuments(documentsRes.documents || []);
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
                  <div className="ml-3 flex-1">
                    <h3 className="text-sm font-medium text-amber-800">Account pending approval</h3>
                    <p className="mt-1 text-sm text-amber-700">
                      Complete your onboarding to speed up the approval process.
                    </p>
                    <Link
                      href="/driver/onboarding"
                      className="mt-2 inline-block text-sm font-medium text-amber-900 hover:text-amber-800 underline"
                    >
                      Continue Onboarding
                    </Link>
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
              <nav className="-mb-px flex space-x-4 md:space-x-8 overflow-x-auto">
                {(['overview', 'profile', 'license', 'vehicles', 'calendar', 'documents'] as TabType[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm capitalize whitespace-nowrap ${
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
              <OverviewTab profile={profile} vehicles={vehicles} documents={documents} />
            )}
            {activeTab === 'profile' && (
              <ProfileTab profile={profile} setProfile={setProfile} setError={setError} />
            )}
            {activeTab === 'license' && (
              <LicenseTab profile={profile} setProfile={setProfile} setError={setError} />
            )}
            {activeTab === 'vehicles' && (
              <VehiclesTab vehicles={vehicles} setVehicles={setVehicles} setError={setError} />
            )}
            {activeTab === 'calendar' && (
              <CalendarTab profile={profile} setError={setError} />
            )}
            {activeTab === 'documents' && (
              <DocumentsTab documents={documents} setDocuments={setDocuments} setError={setError} />
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
function OverviewTab({ profile, vehicles, documents }: { profile: DriverProfile | null; vehicles: DriverVehicle[]; documents: DriverDocument[] }) {
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <ChecklistItem
            completed={!!(profile?.firstName && profile?.lastName && profile?.phone)}
            label="Complete profile"
          />
          <ChecklistItem
            completed={!!(profile?.workingDays && profile.workingDays.length > 0)}
            label="Set working hours"
          />
          <ChecklistItem
            completed={!!profile?.licenseVerified}
            label="Verify driving license"
          />
          <ChecklistItem
            completed={vehicles.length > 0}
            label="Add a vehicle"
          />
          <ChecklistItem
            completed={documents.some(d => d.documentType === 'phv_driver_license' && d.status === 'verified')}
            label="Upload PHV license"
          />
          <ChecklistItem
            completed={documents.some(d => d.documentType === 'driver_insurance' && d.status === 'verified')}
            label="Upload insurance"
          />
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
  const [uploadingPhoto, setUploadingPhoto] = useState<string | null>(null);

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

  const handlePhotoUpload = async (vrn: string, file: File) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Please upload a JPG, PNG, or WebP image');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB');
      return;
    }

    try {
      setUploadingPhoto(vrn);
      setError('');

      // 1. Get presigned URL
      const urlResult = await requestVehiclePhotoUploadUrl({
        vrn,
        fileName: file.name,
        fileType: file.type,
      });

      if (!urlResult.success) {
        throw new Error('Failed to get upload URL');
      }

      // 2. Upload to S3
      const uploadResponse = await fetch(urlResult.uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload image');
      }

      // 3. Update vehicle photos
      const vehicle = vehicles.find(v => v.vrn === vrn);
      const currentPhotos = vehicle?.photos || [];
      const newPhotos = [...currentPhotos, urlResult.publicUrl];

      const updateResult = await updateVehiclePhotos(vrn, newPhotos);
      if (!updateResult.success) {
        throw new Error('Failed to save photo');
      }

      // Update local state
      setVehicles(vehicles.map(v =>
        v.vrn === vrn ? { ...v, photos: newPhotos } : v
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload photo');
    } finally {
      setUploadingPhoto(null);
    }
  };

  const handleRemovePhoto = async (vrn: string, photoUrl: string) => {
    if (!confirm('Remove this photo?')) return;

    try {
      setUploadingPhoto(vrn);
      const vehicle = vehicles.find(v => v.vrn === vrn);
      const newPhotos = (vehicle?.photos || []).filter(p => p !== photoUrl);

      const result = await updateVehiclePhotos(vrn, newPhotos);
      if (result.success) {
        setVehicles(vehicles.map(v =>
          v.vrn === vrn ? { ...v, photos: newPhotos } : v
        ));
      } else {
        setError('Failed to remove photo');
      }
    } catch {
      setError('Failed to remove photo');
    } finally {
      setUploadingPhoto(null);
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
              <p className="mt-1 text-xs text-gray-500">
                Vehicle details will be fetched automatically from DVLA
              </p>
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
                {isAdding ? 'Checking DVLA...' : 'Add vehicle'}
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
            <div
              key={vehicle.vrn}
              className={`bg-white rounded-lg shadow p-6 ${vehicle.canOperate === false ? 'border-2 border-red-300' : ''}`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-lg font-semibold text-gray-900">{vehicle.vrn}</h4>
                  <p className="text-sm text-gray-600">
                    {vehicle.make} {vehicle.colour && `- ${vehicle.colour}`}
                    {vehicle.yearOfManufacture && ` (${vehicle.yearOfManufacture})`}
                  </p>
                  <p className="text-xs text-gray-500 capitalize mt-1">
                    {vehicle.vehicleType} {vehicle.fuelType && `| ${vehicle.fuelType}`}
                  </p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getComplianceBadge(vehicle.complianceStatus)}`}>
                  {vehicle.complianceStatus.replace('_', ' ')}
                </span>
              </div>

              {/* Compliance Alerts */}
              {vehicle.complianceAlerts && vehicle.complianceAlerts.length > 0 && (
                <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
                  {vehicle.complianceAlerts.map((alert, i) => (
                    <p key={i}>{alert}</p>
                  ))}
                </div>
              )}

              <div className="mt-4 grid gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">MOT Status</span>
                  <span className={vehicle.motStatus === 'Valid' ? 'text-green-600' : 'text-red-600'}>
                    {vehicle.motStatus}
                    {vehicle.motExpiryDate && ` (expires ${new Date(vehicle.motExpiryDate).toLocaleDateString()})`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax Status</span>
                  <span className={vehicle.taxStatus === 'Taxed' ? 'text-green-600' : 'text-red-600'}>
                    {vehicle.taxStatus}
                    {vehicle.taxDueDate && ` (due ${new Date(vehicle.taxDueDate).toLocaleDateString()})`}
                  </span>
                </div>
              </div>

              {/* Vehicle Photos */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Photos</span>
                  <label className={`text-xs text-sage hover:text-sage-dark cursor-pointer ${uploadingPhoto === vehicle.vrn ? 'opacity-50' : ''}`}>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      disabled={uploadingPhoto === vehicle.vrn}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handlePhotoUpload(vehicle.vrn, file);
                        e.target.value = '';
                      }}
                    />
                    {uploadingPhoto === vehicle.vrn ? 'Uploading...' : '+ Add photo'}
                  </label>
                </div>
                {vehicle.photos && vehicle.photos.length > 0 ? (
                  <div className="flex gap-2 flex-wrap">
                    {vehicle.photos.map((photo, i) => (
                      <div key={i} className="relative group">
                        <img
                          src={photo}
                          alt={`Vehicle photo ${i + 1}`}
                          className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                        />
                        <button
                          onClick={() => handleRemovePhoto(vehicle.vrn, photo)}
                          className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">No photos - add photos of your vehicle</p>
                )}
              </div>

              {/* Timestamps */}
              <div className="mt-3 text-xs text-gray-400 space-y-1">
                <p>Added: {new Date(vehicle.createdAt).toLocaleDateString()}</p>
                {vehicle.lastApiCheck && (
                  <p>Last DVLA check: {new Date(vehicle.lastApiCheck).toLocaleString()}</p>
                )}
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

// Calendar Tab Component
function CalendarTab({
  profile,
  setError,
}: {
  profile: DriverProfile | null;
  setError: (e: string) => void;
}) {
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Monday start
    const monday = new Date(now);
    monday.setDate(now.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    return monday;
  });
  const [blocks, setBlocks] = useState<AvailabilityBlock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newBlock, setNewBlock] = useState({
    date: '',
    startTime: '09:00',
    endTime: '17:00',
    note: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const dayMap: Record<string, number> = {
    monday: 0, tuesday: 1, wednesday: 2, thursday: 3,
    friday: 4, saturday: 5, sunday: 6,
  };

  // Load availability for current week
  useEffect(() => {
    const loadAvailability = async () => {
      setIsLoading(true);
      try {
        const endDate = new Date(currentWeekStart);
        endDate.setDate(endDate.getDate() + 6);

        const startDateStr = currentWeekStart.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];

        const result = await getAvailability(startDateStr, endDateStr);
        if (result.success) {
          setBlocks(result.blocks);
        }
      } catch (err) {
        console.error('Failed to load availability:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadAvailability();
  }, [currentWeekStart]);

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(newStart.getDate() + (direction === 'prev' ? -7 : 7));
    setCurrentWeekStart(newStart);
  };

  const goToToday = () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    setCurrentWeekStart(monday);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  const formatWeekRange = () => {
    const end = new Date(currentWeekStart);
    end.setDate(end.getDate() + 6);
    return `${formatDate(currentWeekStart)} - ${formatDate(end)}, ${end.getFullYear()}`;
  };

  const getDayDate = (dayIndex: number) => {
    const date = new Date(currentWeekStart);
    date.setDate(date.getDate() + dayIndex);
    return date;
  };

  const isWorkingDay = (dayIndex: number) => {
    if (!profile?.workingDays) return false;
    return profile.workingDays.some(wd => dayMap[wd.toLowerCase()] === dayIndex);
  };

  const getBlocksForDay = (dayIndex: number) => {
    const dayDate = getDayDate(dayIndex);
    const dateStr = dayDate.toISOString().split('T')[0];
    return blocks.filter(b => b.date === dateStr && !b.available);
  };

  const handleAddBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBlock.date) {
      setError('Please select a date');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const result = await setAvailability({
        date: newBlock.date,
        startTime: newBlock.startTime,
        endTime: newBlock.endTime,
        available: false,
        note: newBlock.note || undefined,
      });

      if (result.success && result.block) {
        setBlocks([...blocks, result.block]);
        setShowAddForm(false);
        setNewBlock({ date: '', startTime: '09:00', endTime: '17:00', note: '' });
      } else {
        setError(result.message || 'Failed to add block');
      }
    } catch {
      setError('Failed to add block');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Working Pattern Summary */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-3">Your Working Pattern</h3>
        {profile?.workingDays && profile.workingDays.length > 0 ? (
          <div className="text-sm text-gray-600">
            <p className="capitalize">
              <span className="font-medium">Days:</span>{' '}
              {profile.workingDays.join(', ')}
            </p>
            {profile.workingHoursStart && profile.workingHoursEnd && (
              <p>
                <span className="font-medium">Hours:</span>{' '}
                {profile.workingHoursStart} - {profile.workingHoursEnd}
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            Set your working days in the Profile tab to see your availability.
          </p>
        )}
      </div>

      {/* Calendar Navigation */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigateWeek('prev')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={goToToday}
              className="px-3 py-1 text-sm bg-sage text-white rounded-lg hover:bg-sage-dark"
            >
              Today
            </button>
            <span className="text-sm font-medium text-gray-700">{formatWeekRange()}</span>
          </div>
          <button
            onClick={() => navigateWeek('next')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mb-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-green-100 border border-green-300"></div>
            <span className="text-gray-600">Available</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-red-100 border border-red-300"></div>
            <span className="text-gray-600">Blocked</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-gray-100 border border-gray-300"></div>
            <span className="text-gray-600">Not working</span>
          </div>
        </div>

        {/* Week Grid */}
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sage"></div>
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-2">
            {DAYS.map((day, index) => {
              const dayDate = getDayDate(index);
              const isWorking = isWorkingDay(index);
              const dayBlocks = getBlocksForDay(index);
              const isToday = dayDate.toDateString() === new Date().toDateString();

              return (
                <div
                  key={day}
                  className={`rounded-lg p-3 min-h-[100px] ${
                    isWorking
                      ? dayBlocks.length > 0
                        ? 'bg-red-50 border border-red-200'
                        : 'bg-green-50 border border-green-200'
                      : 'bg-gray-50 border border-gray-200'
                  } ${isToday ? 'ring-2 ring-sage' : ''}`}
                >
                  <div className="text-center mb-2">
                    <div className={`text-xs font-medium ${isToday ? 'text-sage' : 'text-gray-500'}`}>
                      {day}
                    </div>
                    <div className={`text-sm font-semibold ${isToday ? 'text-sage' : 'text-gray-900'}`}>
                      {dayDate.getDate()}
                    </div>
                  </div>
                  {isWorking && dayBlocks.length === 0 && (
                    <div className="text-xs text-green-600 text-center">
                      {profile?.workingHoursStart && profile?.workingHoursEnd
                        ? `${profile.workingHoursStart}-${profile.workingHoursEnd}`
                        : 'Available'}
                    </div>
                  )}
                  {dayBlocks.map(block => (
                    <div
                      key={block.blockId}
                      className="text-xs bg-red-100 text-red-800 rounded px-1 py-0.5 mb-1"
                    >
                      {block.startTime}-{block.endTime}
                      {block.note && <span className="block truncate">{block.note}</span>}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Block Form */}
      {showAddForm ? (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Block Out Time</h3>
          <form onSubmit={handleAddBlock} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Date</label>
              <input
                type="date"
                value={newBlock.date}
                onChange={(e) => setNewBlock({ ...newBlock, date: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-sage focus:border-sage sm:text-sm"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Start Time</label>
                <input
                  type="time"
                  value={newBlock.startTime}
                  onChange={(e) => setNewBlock({ ...newBlock, startTime: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-sage focus:border-sage sm:text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">End Time</label>
                <input
                  type="time"
                  value={newBlock.endTime}
                  onChange={(e) => setNewBlock({ ...newBlock, endTime: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-sage focus:border-sage sm:text-sm"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Reason (optional)</label>
              <input
                type="text"
                value={newBlock.note}
                onChange={(e) => setNewBlock({ ...newBlock, note: e.target.value })}
                placeholder="e.g. Holiday, Appointment"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-sage focus:border-sage sm:text-sm"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 bg-sage text-white rounded-md hover:bg-sage-dark disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Block Time'}
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
          + Block out time (holiday, appointment, etc.)
        </button>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-800 mb-2">How availability works:</h4>
        <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
          <li>Green days show when you&apos;re available based on your working pattern</li>
          <li>Block out times when you&apos;re not available (holidays, appointments)</li>
          <li>Dispatchers will see your availability when assigning jobs</li>
        </ul>
      </div>
    </div>
  );
}

// Checklist Item Helper Component
function ChecklistItem({ completed, label }: { completed: boolean; label: string }) {
  return (
    <div className={`p-4 rounded-lg border ${completed ? 'border-green-200 bg-green-50' : 'border-gray-200'}`}>
      <div className="flex items-center">
        {completed ? (
          <svg className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        ) : (
          <span className="h-5 w-5 rounded-full border-2 border-gray-300 mr-2 flex-shrink-0"></span>
        )}
        <span className="font-medium text-sm">{label}</span>
      </div>
    </div>
  );
}

// License Tab Component
function LicenseTab({
  profile,
  setProfile,
  setError,
}: {
  profile: DriverProfile | null;
  setProfile: (p: DriverProfile) => void;
  setError: (e: string) => void;
}) {
  const [checkCode, setCheckCode] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccessMessage('');

    try {
      const result = await submitLicenseCheckCode({
        checkCode: checkCode.toUpperCase(),
        licenseNumber: licenseNumber.toUpperCase(),
      });

      if (result.success) {
        setSuccessMessage('License verified successfully!');
        setCheckCode('');
        setLicenseNumber('');
        // Refresh profile to get updated license info
        const profileRes = await getProfile();
        if (profileRes.profile) {
          setProfile(profileRes.profile);
        }
      } else {
        setError(result.message || 'Failed to verify license');
      }
    } catch {
      setError('Failed to verify license. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Current License Status */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">License Status</h3>
        {profile?.licenseVerified ? (
          <div className="space-y-4">
            <div className="flex items-center text-green-600">
              <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">License Verified</span>
            </div>
            <div className="grid gap-3 text-sm">
              {profile.licenseCategories && profile.licenseCategories.length > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Categories</span>
                  <span className="font-medium">{profile.licenseCategories.join(', ')}</span>
                </div>
              )}
              {profile.licenseExpiryDate && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Expiry Date</span>
                  <span className="font-medium">{new Date(profile.licenseExpiryDate).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-amber-600 flex items-center">
            <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>License not yet verified</span>
          </div>
        )}
      </div>

      {/* Verification Form */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Verify Your Driving License</h3>
        <p className="text-sm text-gray-600 mb-6">
          To verify your driving license, you need to generate a check code from the DVLA website.
        </p>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h4 className="font-medium text-blue-900 mb-2">How to get your check code:</h4>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
            <li>Visit <a href="https://www.gov.uk/view-driving-licence" target="_blank" rel="noopener noreferrer" className="underline">www.gov.uk/view-driving-licence</a></li>
            <li>Sign in with Government Gateway or verify your identity</li>
            <li>Click &quot;Get a check code&quot;</li>
            <li>Enter the code below (valid for 21 days)</li>
          </ol>
        </div>

        {successMessage && (
          <div className="rounded-md bg-green-50 p-4 mb-4">
            <p className="text-sm text-green-800">{successMessage}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Check Code
            </label>
            <input
              type="text"
              value={checkCode}
              onChange={(e) => setCheckCode(e.target.value.toUpperCase())}
              placeholder="e.g. ABC123XYZ"
              maxLength={16}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-sage focus:border-sage sm:text-sm uppercase"
              required
            />
            <p className="mt-1 text-xs text-gray-500">The code from the DVLA website</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Last 8 Characters of License Number
            </label>
            <input
              type="text"
              value={licenseNumber}
              onChange={(e) => setLicenseNumber(e.target.value.toUpperCase())}
              placeholder="e.g. 12AB34CD"
              maxLength={8}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-sage focus:border-sage sm:text-sm uppercase"
              required
            />
            <p className="mt-1 text-xs text-gray-500">Found on your physical driving license</p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !checkCode || !licenseNumber}
            className="w-full py-2 px-4 bg-sage text-white rounded-md hover:bg-sage-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Verifying...' : 'Verify License'}
          </button>
        </form>
      </div>
    </div>
  );
}

// Documents Tab Component
function DocumentsTab({
  documents,
  setDocuments,
  setError,
}: {
  documents: DriverDocument[];
  setDocuments: (d: DriverDocument[]) => void;
  setError: (e: string) => void;
}) {
  const [uploading, setUploading] = useState<string | null>(null);

  const documentTypes: { type: DriverDocument['documentType']; label: string; description: string }[] = [
    {
      type: 'phv_driver_license',
      label: 'PHV Driver License',
      description: 'Your Private Hire Vehicle driver license from your local council',
    },
    {
      type: 'driver_insurance',
      label: 'Driver Insurance',
      description: 'Your personal hire and reward insurance certificate',
    },
  ];

  const getDocumentByType = (type: DriverDocument['documentType']) => {
    return documents.find(d => d.documentType === type);
  };

  const getStatusBadge = (status: string) => {
    const statusClasses: Record<string, string> = {
      pending: 'bg-amber-100 text-amber-800',
      verified: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };
    return statusClasses[status] || 'bg-gray-100 text-gray-800';
  };

  const handleFileSelect = async (
    e: React.ChangeEvent<HTMLInputElement>,
    docType: DriverDocument['documentType']
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/heic', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      setError('Please upload a JPG, PNG, HEIC, or PDF file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    setUploading(docType);
    setError('');

    try {
      // 1. Get presigned URL
      const urlResult = await requestDocumentUploadUrl({
        documentType: docType,
        fileName: file.name,
        contentType: file.type,
      });

      if (!urlResult.success) {
        throw new Error('Failed to get upload URL');
      }

      // 2. Upload file to S3
      const uploadResponse = await fetch(urlResult.uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file');
      }

      // 3. Confirm upload
      const confirmResult = await confirmDocumentUpload(urlResult.documentId);

      if (confirmResult.success && confirmResult.document) {
        // Update documents list
        const existingIndex = documents.findIndex(d => d.documentType === docType);
        if (existingIndex >= 0) {
          const newDocs = [...documents];
          newDocs[existingIndex] = confirmResult.document;
          setDocuments(newDocs);
        } else {
          setDocuments([...documents, confirmResult.document]);
        }
      } else {
        throw new Error(confirmResult.message || 'Failed to confirm upload');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload document');
    } finally {
      setUploading(null);
      // Reset the file input
      e.target.value = '';
    }
  };

  const handleDelete = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      const result = await deleteDocument(documentId);
      if (result.success) {
        setDocuments(documents.filter(d => d.documentId !== documentId));
      } else {
        setError(result.message || 'Failed to delete document');
      }
    } catch {
      setError('Failed to delete document');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          Upload clear photos or scans of your documents. We&apos;ll extract the key information automatically
          and our team will verify them within 24-48 hours.
        </p>
      </div>

      {documentTypes.map(({ type, label, description }) => {
        const doc = getDocumentByType(type);
        const isUploading = uploading === type;

        return (
          <div key={type} className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900">{label}</h3>
                <p className="text-sm text-gray-600">{description}</p>
              </div>
              {doc && (
                <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusBadge(doc.status)}`}>
                  {doc.status}
                </span>
              )}
            </div>

            {doc ? (
              <div className="space-y-3">
                <div className="text-sm text-gray-600">
                  <p>Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}</p>
                  {doc.expiryDate && (
                    <p>Expires: {new Date(doc.expiryDate).toLocaleDateString()}</p>
                  )}
                  {doc.verifiedAt && (
                    <p>Verified: {new Date(doc.verifiedAt).toLocaleDateString()}</p>
                  )}
                </div>

                {doc.status === 'rejected' && (
                  <div className="bg-red-50 border border-red-200 rounded p-3">
                    <p className="text-sm text-red-800">
                      This document was rejected. Please upload a clearer copy.
                    </p>
                  </div>
                )}

                <div className="flex gap-3">
                  <label className="cursor-pointer text-sm text-sage hover:text-sage-dark">
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      onChange={(e) => handleFileSelect(e, type)}
                      disabled={isUploading}
                    />
                    {isUploading ? 'Uploading...' : 'Replace document'}
                  </label>
                  <button
                    onClick={() => handleDelete(doc.documentId)}
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                  <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div className="mt-4">
                  <label className="cursor-pointer">
                    <span className="mt-2 block text-sm font-medium text-sage hover:text-sage-dark">
                      {isUploading ? 'Uploading...' : 'Upload document'}
                    </span>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      onChange={(e) => handleFileSelect(e, type)}
                      disabled={isUploading}
                    />
                  </label>
                  <p className="mt-1 text-xs text-gray-500">
                    JPG, PNG, HEIC or PDF up to 10MB
                  </p>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
