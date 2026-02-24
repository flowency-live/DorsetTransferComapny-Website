'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Upload, Trash2, CheckCircle, AlertTriangle, Eye } from 'lucide-react';
import { useRequireCorporateAuth } from '@/lib/hooks/useCorporateAuth';
import {
  getPreferences,
  updatePreferences,
  getLogoUploadUrl,
  uploadLogoToS3,
  confirmLogoUpload,
  deleteLogo,
  getDashboard,
  type NameBoardFormat,
  type AccountPreferences,
} from '@/lib/services/corporateApi';
import CorporateHeader from '@/components/corporate/CorporateHeader';
import Footer from '@/components/shared/Footer';

const NAME_BOARD_OPTIONS: { value: NameBoardFormat; label: string; example: string }[] = [
  { value: 'title-initial-surname', label: 'Title + Initial + Surname', example: 'Mr J Jones' },
  { value: 'firstname-lastname', label: 'First Name + Last Name', example: 'John Jones' },
  { value: 'company-only', label: 'Company Name Only', example: 'ACME Corp' },
  { value: 'passenger-alias', label: 'Passenger Alias', example: 'Bruce (if set)' },
  { value: 'title-initial-surname-company', label: 'Name + Company (2 lines)', example: 'Mr J Jones / ACME Corp' },
  { value: 'custom', label: 'Custom Text', example: 'Enter your own text' },
];

export default function PreferencesPage() {
  const { user, isLoading: authLoading, logout, isAdmin } = useRequireCorporateAuth();
  const [companyName, setCompanyName] = useState<string | undefined>();
  const [preferences, setPreferences] = useState<AccountPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [selectedFormat, setSelectedFormat] = useState<NameBoardFormat>('title-initial-surname');
  const [customText, setCustomText] = useState('');
  // Default preferences state
  const [defaultRefreshments, setDefaultRefreshments] = useState({
    stillWater: false,
    sparklingWater: false,
    tea: false,
    coffee: false,
    other: '',
  });
  const [defaultDriverInstructions, setDefaultDriverInstructions] = useState('');

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => {
    if (user) {
      Promise.all([
        getPreferences(),
        getDashboard()
      ])
        .then(([prefsData, dashboardData]) => {
          setPreferences(prefsData.preferences);
          setSelectedFormat(prefsData.preferences.nameBoardFormat || 'title-initial-surname');
          setCustomText(prefsData.preferences.nameBoardCustomText || '');
          setCompanyName(dashboardData.company?.companyName);
          // Load default preferences
          if (prefsData.preferences.defaultRefreshments) {
            setDefaultRefreshments({
              stillWater: prefsData.preferences.defaultRefreshments.stillWater || false,
              sparklingWater: prefsData.preferences.defaultRefreshments.sparklingWater || false,
              tea: prefsData.preferences.defaultRefreshments.tea || false,
              coffee: prefsData.preferences.defaultRefreshments.coffee || false,
              other: prefsData.preferences.defaultRefreshments.other || '',
            });
          }
          if (prefsData.preferences.defaultDriverInstructions) {
            setDefaultDriverInstructions(prefsData.preferences.defaultDriverInstructions);
          }
        })
        .catch((err) => {
          console.error('Failed to load preferences:', err);
          showToast('Failed to load preferences', 'error');
        })
        .finally(() => setIsLoading(false));
    }
  }, [user, showToast]);

  const handleSaveFormat = async () => {
    setIsSaving(true);
    try {
      const data: {
        nameBoardFormat: NameBoardFormat;
        nameBoardCustomText?: string;
        defaultRefreshments?: typeof defaultRefreshments | null;
        defaultDriverInstructions?: string | null;
      } = {
        nameBoardFormat: selectedFormat,
      };
      if (selectedFormat === 'custom') {
        data.nameBoardCustomText = customText;
      }
      // Include default preferences
      const hasRefreshments = defaultRefreshments.stillWater || defaultRefreshments.sparklingWater ||
                               defaultRefreshments.tea || defaultRefreshments.coffee || defaultRefreshments.other.trim();
      data.defaultRefreshments = hasRefreshments ? defaultRefreshments : null;
      data.defaultDriverInstructions = defaultDriverInstructions.trim() || null;

      await updatePreferences(data);
      showToast('Preferences saved successfully');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save preferences', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      showToast('Please upload a PNG, JPEG, or SVG file', 'error');
      return;
    }

    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      showToast('File size must be 2MB or less', 'error');
      return;
    }

    setIsUploading(true);
    try {
      // 1. Get presigned URL
      const uploadData = await getLogoUploadUrl({
        contentType: file.type,
        fileName: file.name,
        fileSize: file.size,
      });

      // 2. Upload to S3
      await uploadLogoToS3(uploadData.uploadUrl, file);

      // 3. Confirm upload
      const result = await confirmLogoUpload(uploadData.logoKey);

      // 4. Update local state
      setPreferences((prev) =>
        prev ? { ...prev, logoUrl: result.logoUrl, logoS3Key: result.logoKey } : null
      );

      showToast('Logo uploaded successfully');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to upload logo', 'error');
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteLogo = async () => {
    setIsDeleting(true);
    try {
      await deleteLogo();
      setPreferences((prev) =>
        prev ? { ...prev, logoUrl: null, logoS3Key: null } : null
      );
      showToast('Logo deleted successfully');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete logo', 'error');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const getNameBoardPreview = (): string => {
    if (selectedFormat === 'custom') {
      return customText || 'Custom text will appear here';
    }
    const option = NAME_BOARD_OPTIONS.find((o) => o.value === selectedFormat);
    return option?.example || '';
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-[#FBF7F0] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sage" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FBF7F0]">
      <CorporateHeader
        userName={user.name}
        companyName={companyName}
        onLogout={logout}
        isAdmin={isAdmin}
      />

      <main className="flex-1 pt-28 pb-16">
        <div className="container mx-auto px-4 md:px-6 max-w-3xl">
          {/* Page Header */}
          <div className="mb-8">
            <Link
              href="/corporate/dashboard"
              className="inline-flex items-center text-sm text-navy-light/70 hover:text-sage transition-colors mb-3"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Dashboard
            </Link>
            <h1 className="text-2xl font-bold text-navy">Account Preferences</h1>
            <p className="text-navy-light/70 mt-1">
              Customise name boards, default refreshments, and driver instructions
            </p>
          </div>

          {isLoading ? (
            <div className="bg-white rounded-lg shadow-sm border border-sage/20 p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-sage/20 rounded w-1/3" />
                <div className="h-10 bg-sage/10 rounded" />
                <div className="h-4 bg-sage/20 rounded w-1/2" />
              </div>
            </div>
          ) : (
            <>
              {/* Logo Upload Section */}
              <div className="bg-white rounded-lg shadow-sm border border-sage/20 p-6 mb-6">
                <h2 className="text-lg font-semibold text-navy mb-4">Company Logo</h2>
                <p className="text-sm text-navy-light/70 mb-4">
                  Upload your company logo to display on driver name boards. Supported formats: PNG, JPEG, SVG (max 2MB).
                </p>

                <div className="flex items-start gap-6">
                  {/* Logo Preview */}
                  <div className="flex-shrink-0">
                    {preferences?.logoUrl ? (
                      <div className="relative w-32 h-32 border border-sage/20 rounded-lg overflow-hidden bg-white">
                        <Image
                          src={preferences.logoUrl}
                          alt="Company logo"
                          fill
                          className="object-contain p-2"
                        />
                      </div>
                    ) : (
                      <div className="w-32 h-32 border-2 border-dashed border-sage/30 rounded-lg flex items-center justify-center bg-sage/5">
                        <span className="text-sm text-navy-light/50">No logo</span>
                      </div>
                    )}
                  </div>

                  {/* Upload Controls */}
                  <div className="flex-1 space-y-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/svg+xml"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="inline-flex items-center px-4 py-2 border border-sage rounded-full text-sm font-medium text-sage hover:bg-sage/5 disabled:opacity-50 transition-colors"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {isUploading ? 'Uploading...' : preferences?.logoUrl ? 'Replace Logo' : 'Upload Logo'}
                    </button>

                    {preferences?.logoUrl && (
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        disabled={isDeleting}
                        className="inline-flex items-center px-4 py-2 ml-3 border border-red-300 rounded-full text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        {isDeleting ? 'Deleting...' : 'Delete Logo'}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Name Board Format Section */}
              <div className="bg-white rounded-lg shadow-sm border border-sage/20 p-6">
                <h2 className="text-lg font-semibold text-navy mb-4">Name Board Format</h2>
                <p className="text-sm text-navy-light/70 mb-4">
                  Choose how passenger names appear on the driver&apos;s name board when meeting passengers.
                </p>

                {/* Format Options */}
                <div className="space-y-3 mb-6">
                  {NAME_BOARD_OPTIONS.map((option) => (
                    <label
                      key={option.value}
                      className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedFormat === option.value
                          ? 'border-sage bg-sage/5'
                          : 'border-sage/20 hover:border-sage/40'
                      }`}
                    >
                      <input
                        type="radio"
                        name="nameBoardFormat"
                        value={option.value}
                        checked={selectedFormat === option.value}
                        onChange={(e) => setSelectedFormat(e.target.value as NameBoardFormat)}
                        className="h-4 w-4 text-sage border-sage/30 focus:ring-sage"
                      />
                      <div className="ml-3 flex-1">
                        <span className="text-sm font-medium text-navy">{option.label}</span>
                        <span className="ml-2 text-sm text-navy-light/50">— {option.example}</span>
                      </div>
                    </label>
                  ))}
                </div>

                {/* Custom Text Input */}
                {selectedFormat === 'custom' && (
                  <div className="mb-6">
                    <label htmlFor="customText" className="block text-sm font-medium text-navy mb-1">
                      Custom Text
                    </label>
                    <input
                      type="text"
                      id="customText"
                      value={customText}
                      onChange={(e) => setCustomText(e.target.value)}
                      maxLength={100}
                      placeholder="Enter custom name board text"
                      className="w-full px-3 py-2 border border-sage/30 rounded-lg shadow-sm focus:ring-2 focus:ring-sage focus:border-sage text-navy placeholder:text-navy-light/50"
                    />
                    <p className="mt-1 text-xs text-navy-light/50">{customText.length}/100 characters</p>
                  </div>
                )}

                {/* Preview */}
                <div className="bg-navy rounded-lg p-6 mb-6">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Eye className="w-4 h-4 text-white/60" />
                    <span className="text-xs text-white/60 uppercase tracking-wider">Preview</span>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-white">{getNameBoardPreview()}</p>
                    {preferences?.logoUrl && (
                      <p className="text-sm text-white/60 mt-2">Your logo will also be displayed</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Default Booking Preferences Section */}
              <div className="bg-white rounded-lg shadow-sm border border-sage/20 p-6 mt-6">
                <h2 className="text-lg font-semibold text-navy mb-4">Default Booking Preferences</h2>
                <p className="text-sm text-navy-light/70 mb-4">
                  Set default preferences that will be applied to all new bookings. Individual passenger preferences will override these defaults.
                </p>

                {/* Default Refreshments */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-navy mb-2">Default Refreshments</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                    {[
                      { key: 'stillWater', label: 'Still Water' },
                      { key: 'sparklingWater', label: 'Sparkling Water' },
                      { key: 'tea', label: 'Tea' },
                      { key: 'coffee', label: 'Coffee' },
                    ].map(({ key, label }) => (
                      <label
                        key={key}
                        className={`flex items-center justify-center px-3 py-2 border rounded-lg cursor-pointer transition-colors ${
                          defaultRefreshments[key as keyof typeof defaultRefreshments]
                            ? 'border-sage bg-sage/10 text-sage-dark'
                            : 'border-sage/30 hover:border-sage/50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={defaultRefreshments[key as keyof typeof defaultRefreshments] as boolean}
                          onChange={(e) => setDefaultRefreshments((prev) => ({ ...prev, [key]: e.target.checked }))}
                          className="sr-only"
                        />
                        <span className="text-sm">{label}</span>
                      </label>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={defaultRefreshments.other}
                    onChange={(e) => setDefaultRefreshments((prev) => ({ ...prev, other: e.target.value }))}
                    maxLength={100}
                    placeholder="Other refreshment preferences..."
                    className="w-full px-3 py-2 border border-sage/30 rounded-lg shadow-sm focus:ring-2 focus:ring-sage focus:border-sage text-navy placeholder:text-navy-light/50"
                  />
                </div>

                {/* Default Driver Instructions */}
                <div className="mb-6">
                  <label htmlFor="defaultDriverInstructions" className="block text-sm font-medium text-navy mb-1">
                    Default Driver Instructions
                  </label>
                  <textarea
                    id="defaultDriverInstructions"
                    value={defaultDriverInstructions}
                    onChange={(e) => setDefaultDriverInstructions(e.target.value)}
                    rows={3}
                    maxLength={500}
                    placeholder="e.g., Always use the main entrance, call upon arrival..."
                    className="w-full px-3 py-2 border border-sage/30 rounded-lg shadow-sm focus:ring-2 focus:ring-sage focus:border-sage text-navy placeholder:text-navy-light/50"
                  />
                  <p className="mt-1 text-xs text-navy-light/50">{defaultDriverInstructions.length}/500 characters - Visible to driver on all bookings</p>
                </div>

                {/* Save Button */}
                <div className="flex justify-end">
                  <button
                    onClick={handleSaveFormat}
                    disabled={isSaving}
                    className="inline-flex items-center px-6 py-2 border border-transparent rounded-full text-sm font-medium text-white bg-sage hover:bg-sage-dark disabled:opacity-50 transition-colors"
                  >
                    {isSaving ? 'Saving...' : 'Save Preferences'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      <Footer />

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div
              className="fixed inset-0 bg-navy/50 transition-opacity"
              onClick={() => setShowDeleteConfirm(false)}
            />
            <div className="relative bg-white rounded-lg shadow-xl max-w-sm w-full p-6">
              <div className="text-center mb-4">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-navy">Delete Logo?</h3>
                <p className="text-sm text-navy-light/70 mt-2">
                  Are you sure you want to delete your company logo? This cannot be undone.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-navy bg-white border border-sage/30 rounded-full hover:bg-sage/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteLogo}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-full hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
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
