'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/shared/Header';
import Footer from '@/components/shared/Footer';
import {
  getStoredToken,
  verifySession,
  getProfile,
  updateProfile,
  submitLicenseCheckCode,
  addVehicle,
  requestDocumentUploadUrl,
  confirmDocumentUpload,
  DriverProfile,
  DriverVehicle,
} from '@/lib/services/driverApi';

type OnboardingStep = 'availability' | 'license' | 'vehicle' | 'documents' | 'complete';

const STEPS: { id: OnboardingStep; title: string; description: string }[] = [
  { id: 'availability', title: 'Working Hours', description: 'Set your availability' },
  { id: 'license', title: 'License', description: 'Verify your driving license' },
  { id: 'vehicle', title: 'Vehicle', description: 'Add your vehicle' },
  { id: 'documents', title: 'Documents', description: 'Upload required documents' },
  { id: 'complete', title: 'Complete', description: 'Review and finish' },
];

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export default function DriverOnboardingPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('availability');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const router = useRouter();

  // Form states
  const [workingDays, setWorkingDays] = useState<string[]>([]);
  const [workingHoursStart, setWorkingHoursStart] = useState('08:00');
  const [workingHoursEnd, setWorkingHoursEnd] = useState('18:00');
  const [checkCode, setCheckCode] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [vrn, setVrn] = useState('');
  const [vehicleType, setVehicleType] = useState<'standard' | 'executive' | 'minibus'>('standard');
  const [addedVehicle, setAddedVehicle] = useState<DriverVehicle | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadedDocs, setUploadedDocs] = useState<{ phv: boolean; insurance: boolean }>({ phv: false, insurance: false });

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
        const profileRes = await getProfile();
        setProfile(profileRes.profile);

        // Pre-populate form if data exists
        if (profileRes.profile.workingDays?.length) {
          setWorkingDays(profileRes.profile.workingDays);
        }
        if (profileRes.profile.workingHoursStart) {
          setWorkingHoursStart(profileRes.profile.workingHoursStart);
        }
        if (profileRes.profile.workingHoursEnd) {
          setWorkingHoursEnd(profileRes.profile.workingHoursEnd);
        }

        // Determine starting step based on profile completion
        if (profileRes.profile.status === 'active') {
          router.push('/driver/dashboard');
          return;
        }
      } catch {
        setError('Failed to load profile');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [router]);

  const currentStepIndex = STEPS.findIndex(s => s.id === currentStep);

  const handleAvailabilitySubmit = async () => {
    if (workingDays.length === 0) {
      setError('Please select at least one working day');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const result = await updateProfile({
        workingDays,
        workingHoursStart,
        workingHoursEnd,
      });

      if (result.success && result.profile) {
        setProfile(result.profile);
        setCurrentStep('license');
      } else {
        setError(result.message || 'Failed to save availability');
      }
    } catch {
      setError('Failed to save availability');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLicenseSubmit = async () => {
    if (!checkCode || !licenseNumber) {
      setError('Please enter both check code and license number');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const result = await submitLicenseCheckCode({
        checkCode: checkCode.toUpperCase(),
        licenseNumber: licenseNumber.toUpperCase(),
      });

      if (result.success) {
        // Refresh profile
        const profileRes = await getProfile();
        setProfile(profileRes.profile);
        setCurrentStep('vehicle');
      } else {
        setError(result.message || 'Failed to verify license');
      }
    } catch {
      setError('Failed to verify license');
    } finally {
      setIsSaving(false);
    }
  };

  const handleVehicleSubmit = async () => {
    if (!vrn) {
      setError('Please enter your vehicle registration number');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const result = await addVehicle({
        vrn: vrn.toUpperCase().replace(/\s/g, ''),
        vehicleType,
      });

      if (result.success && result.vehicle) {
        setAddedVehicle(result.vehicle);
        setCurrentStep('documents');
      } else {
        setError(result.message || 'Failed to add vehicle');
      }
    } catch {
      setError('Failed to add vehicle');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDocumentUpload = async (
    file: File,
    docType: 'phv_driver_license' | 'driver_insurance'
  ) => {
    setError('');
    setIsSaving(true);

    try {
      // Get presigned URL
      const urlResult = await requestDocumentUploadUrl({
        documentType: docType,
        fileName: file.name,
        contentType: file.type,
      });

      if (!urlResult.success) {
        throw new Error('Failed to get upload URL');
      }

      // Upload to S3
      const uploadResponse = await fetch(urlResult.uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file');
      }

      // Confirm upload
      const confirmResult = await confirmDocumentUpload(urlResult.documentId);

      if (confirmResult.success) {
        setUploadedDocs(prev => ({
          ...prev,
          [docType === 'phv_driver_license' ? 'phv' : 'insurance']: true,
        }));
        setSuccessMessage(`${docType === 'phv_driver_license' ? 'PHV License' : 'Insurance'} uploaded successfully`);
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        throw new Error(confirmResult.message || 'Failed to confirm upload');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload document');
    } finally {
      setIsSaving(false);
    }
  };

  const handleComplete = () => {
    router.push('/driver/dashboard');
  };

  const toggleDay = (day: string) => {
    setWorkingDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
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
          <div className="max-w-2xl mx-auto">
            {/* Header */}
            <div className="text-center mb-8">
              <span className="inline-block px-4 py-2 bg-sage/10 text-sage text-sm font-medium rounded-full mb-4">
                Driver Onboarding
              </span>
              <h1 className="text-2xl font-semibold text-gray-900">
                Welcome, {profile?.firstName}!
              </h1>
              <p className="text-gray-600 mt-2">
                Complete these steps to start receiving job offers
              </p>
            </div>

            {/* Progress Stepper */}
            <div className="mb-8">
              <div className="flex justify-between items-center">
                {STEPS.map((step, index) => (
                  <div key={step.id} className="flex-1 relative">
                    <div className="flex items-center">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                          index < currentStepIndex
                            ? 'bg-green-500 text-white'
                            : index === currentStepIndex
                            ? 'bg-sage text-white'
                            : 'bg-gray-200 text-gray-500'
                        }`}
                      >
                        {index < currentStepIndex ? (
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          index + 1
                        )}
                      </div>
                      {index < STEPS.length - 1 && (
                        <div
                          className={`flex-1 h-1 mx-2 ${
                            index < currentStepIndex ? 'bg-green-500' : 'bg-gray-200'
                          }`}
                        />
                      )}
                    </div>
                    <p className="text-xs text-gray-600 mt-1 hidden md:block">{step.title}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="rounded-md bg-red-50 p-4 mb-6">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Success Message */}
            {successMessage && (
              <div className="rounded-md bg-green-50 p-4 mb-6">
                <p className="text-sm text-green-800">{successMessage}</p>
              </div>
            )}

            {/* Step Content */}
            <div className="bg-white rounded-lg shadow p-6">
              {/* Step 1: Availability */}
              {currentStep === 'availability' && (
                <div>
                  <h2 className="text-lg font-medium text-gray-900 mb-2">Set Your Working Hours</h2>
                  <p className="text-sm text-gray-600 mb-6">
                    Let us know when you&apos;re available to accept jobs.
                  </p>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Working Days
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {DAYS.map(day => (
                          <button
                            key={day}
                            type="button"
                            onClick={() => toggleDay(day)}
                            className={`px-4 py-2 rounded-full text-sm capitalize ${
                              workingDays.includes(day)
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
                        <label className="block text-sm font-medium text-gray-700">
                          Start Time
                        </label>
                        <input
                          type="time"
                          value={workingHoursStart}
                          onChange={(e) => setWorkingHoursStart(e.target.value)}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-sage focus:border-sage sm:text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          End Time
                        </label>
                        <input
                          type="time"
                          value={workingHoursEnd}
                          onChange={(e) => setWorkingHoursEnd(e.target.value)}
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-sage focus:border-sage sm:text-sm"
                        />
                      </div>
                    </div>

                    <button
                      onClick={handleAvailabilitySubmit}
                      disabled={isSaving}
                      className="w-full py-3 px-4 bg-sage text-white rounded-md hover:bg-sage-dark disabled:opacity-50 transition-colors"
                    >
                      {isSaving ? 'Saving...' : 'Continue'}
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: License */}
              {currentStep === 'license' && (
                <div>
                  <h2 className="text-lg font-medium text-gray-900 mb-2">Verify Your Driving License</h2>
                  <p className="text-sm text-gray-600 mb-6">
                    We need to verify your UK driving license using a DVLA check code.
                  </p>

                  {profile?.licenseVerified ? (
                    <div className="space-y-4">
                      <div className="flex items-center text-green-600 p-4 bg-green-50 rounded-lg">
                        <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="font-medium">License already verified</span>
                      </div>
                      <button
                        onClick={() => setCurrentStep('vehicle')}
                        className="w-full py-3 px-4 bg-sage text-white rounded-md hover:bg-sage-dark transition-colors"
                      >
                        Continue
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="font-medium text-blue-900 mb-2">How to get your check code:</h4>
                        <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                          <li>Visit <a href="https://www.gov.uk/view-driving-licence" target="_blank" rel="noopener noreferrer" className="underline">gov.uk/view-driving-licence</a></li>
                          <li>Sign in and click &quot;Get a check code&quot;</li>
                          <li>Enter the code below (valid for 21 days)</li>
                        </ol>
                      </div>

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
                        />
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
                        />
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={() => setCurrentStep('availability')}
                          className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                        >
                          Back
                        </button>
                        <button
                          onClick={handleLicenseSubmit}
                          disabled={isSaving || !checkCode || !licenseNumber}
                          className="flex-1 py-3 px-4 bg-sage text-white rounded-md hover:bg-sage-dark disabled:opacity-50 transition-colors"
                        >
                          {isSaving ? 'Verifying...' : 'Verify License'}
                        </button>
                      </div>

                      <button
                        onClick={() => setCurrentStep('vehicle')}
                        className="w-full text-sm text-gray-500 hover:text-gray-700"
                      >
                        Skip for now
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Step 3: Vehicle */}
              {currentStep === 'vehicle' && (
                <div>
                  <h2 className="text-lg font-medium text-gray-900 mb-2">Add Your Vehicle</h2>
                  <p className="text-sm text-gray-600 mb-6">
                    Enter your vehicle registration number. We&apos;ll automatically verify MOT and tax status.
                  </p>

                  {addedVehicle ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-green-50 rounded-lg">
                        <div className="flex items-center text-green-600 mb-2">
                          <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span className="font-medium">Vehicle Added</span>
                        </div>
                        <p className="text-sm text-gray-700">
                          {addedVehicle.vrn} - {addedVehicle.make || 'Unknown make'} ({addedVehicle.colour || 'Unknown color'})
                        </p>
                      </div>
                      <button
                        onClick={() => setCurrentStep('documents')}
                        className="w-full py-3 px-4 bg-sage text-white rounded-md hover:bg-sage-dark transition-colors"
                      >
                        Continue
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Vehicle Registration Number
                        </label>
                        <input
                          type="text"
                          value={vrn}
                          onChange={(e) => setVrn(e.target.value.toUpperCase())}
                          placeholder="e.g. AB12 CDE"
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-sage focus:border-sage sm:text-sm uppercase"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Vehicle Type
                        </label>
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
                          onClick={() => setCurrentStep('license')}
                          className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                        >
                          Back
                        </button>
                        <button
                          onClick={handleVehicleSubmit}
                          disabled={isSaving || !vrn}
                          className="flex-1 py-3 px-4 bg-sage text-white rounded-md hover:bg-sage-dark disabled:opacity-50 transition-colors"
                        >
                          {isSaving ? 'Adding...' : 'Add Vehicle'}
                        </button>
                      </div>

                      <button
                        onClick={() => setCurrentStep('documents')}
                        className="w-full text-sm text-gray-500 hover:text-gray-700"
                      >
                        Skip for now
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Step 4: Documents */}
              {currentStep === 'documents' && (
                <div>
                  <h2 className="text-lg font-medium text-gray-900 mb-2">Upload Documents</h2>
                  <p className="text-sm text-gray-600 mb-6">
                    Upload your PHV driver license and insurance certificate for verification.
                  </p>

                  <div className="space-y-4">
                    {/* PHV License Upload */}
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-gray-900">PHV Driver License</h3>
                        {uploadedDocs.phv && (
                          <span className="text-green-600 text-sm flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            Uploaded
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-3">
                        Your Private Hire Vehicle driver license from your local council
                      </p>
                      <label className="block">
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleDocumentUpload(file, 'phv_driver_license');
                            e.target.value = '';
                          }}
                          disabled={isSaving}
                        />
                        <span className="inline-block px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 cursor-pointer text-sm">
                          {isSaving ? 'Uploading...' : uploadedDocs.phv ? 'Replace' : 'Choose file'}
                        </span>
                      </label>
                    </div>

                    {/* Insurance Upload */}
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-gray-900">Driver Insurance</h3>
                        {uploadedDocs.insurance && (
                          <span className="text-green-600 text-sm flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            Uploaded
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-3">
                        Your hire and reward insurance certificate
                      </p>
                      <label className="block">
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleDocumentUpload(file, 'driver_insurance');
                            e.target.value = '';
                          }}
                          disabled={isSaving}
                        />
                        <span className="inline-block px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 cursor-pointer text-sm">
                          {isSaving ? 'Uploading...' : uploadedDocs.insurance ? 'Replace' : 'Choose file'}
                        </span>
                      </label>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button
                        onClick={() => setCurrentStep('vehicle')}
                        className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                      >
                        Back
                      </button>
                      <button
                        onClick={() => setCurrentStep('complete')}
                        className="flex-1 py-3 px-4 bg-sage text-white rounded-md hover:bg-sage-dark transition-colors"
                      >
                        Continue
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 5: Complete */}
              {currentStep === 'complete' && (
                <div className="text-center py-6">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">Onboarding Complete!</h2>
                  <p className="text-gray-600 mb-6">
                    Thank you for completing your driver profile. Our team will review your information
                    and documents within 24-48 hours. You&apos;ll receive an email once your account is approved.
                  </p>
                  <div className="space-y-3">
                    <button
                      onClick={handleComplete}
                      className="w-full py-3 px-4 bg-sage text-white rounded-md hover:bg-sage-dark transition-colors"
                    >
                      Go to Dashboard
                    </button>
                    <p className="text-sm text-gray-500">
                      You can update your information anytime from your dashboard.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Skip Link */}
            <div className="mt-6 text-center">
              <Link href="/driver/dashboard" className="text-sm text-gray-600 hover:text-gray-900">
                Skip onboarding and go to dashboard
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
