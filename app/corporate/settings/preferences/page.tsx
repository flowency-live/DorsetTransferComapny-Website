'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { Upload, Trash2, CheckCircle, AlertTriangle, Eye } from 'lucide-react';
import { useRequireCorporateAuth } from '@/lib/hooks/useCorporateAuth';
import {
  getPreferences,
  updatePreferences,
  getLogoUploadUrl,
  uploadLogoToS3,
  confirmLogoUpload,
  deleteLogo,
  type NameBoardFormat,
  type AccountPreferences,
} from '@/lib/services/corporateApi';
import CorporateLayout from '@/components/corporate/CorporateLayout';

interface NameBoardOption {
  value: NameBoardFormat;
  label: string;
  getExample: (firstName: string, lastName: string, companyName: string) => string;
}

const NAME_BOARD_OPTIONS: NameBoardOption[] = [
  {
    value: 'title-initial-surname',
    label: 'Title + Initial + Surname',
    getExample: (firstName, lastName) => `Mr ${firstName.charAt(0)} ${lastName}`,
  },
  {
    value: 'firstname-lastname',
    label: 'First Name + Last Name',
    getExample: (firstName, lastName) => `${firstName} ${lastName}`,
  },
  {
    value: 'company-only',
    label: 'Company Name Only',
    getExample: (_firstName, _lastName, companyName) => companyName,
  },
  {
    value: 'passenger-alias',
    label: 'Passenger Alias',
    getExample: (firstName) => `${firstName} (if set)`,
  },
  {
    value: 'title-initial-surname-company',
    label: 'Name + Company (2 lines)',
    getExample: (firstName, lastName, companyName) => `Mr ${firstName.charAt(0)} ${lastName} / ${companyName}`,
  },
  {
    value: 'custom',
    label: 'Custom Text',
    getExample: () => 'Enter your own text',
  },
];

export default function PreferencesPage() {
  const { user } = useRequireCorporateAuth();
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
      getPreferences()
        .then((prefsData) => {
          setPreferences(prefsData.preferences);
          setSelectedFormat(prefsData.preferences.nameBoardFormat || 'title-initial-surname');
          setCustomText(prefsData.preferences.nameBoardCustomText || '');
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

    const allowedTypes = ['image/png', 'image/jpeg', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      showToast('Please upload a PNG, JPEG, or SVG file', 'error');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      showToast('File size must be 2MB or less', 'error');
      return;
    }

    setIsUploading(true);
    try {
      const uploadData = await getLogoUploadUrl({
        contentType: file.type,
        fileName: file.name,
        fileSize: file.size,
      });

      await uploadLogoToS3(uploadData.uploadUrl, file);
      const result = await confirmLogoUpload(uploadData.logoKey);

      setPreferences((prev) =>
        prev ? { ...prev, logoUrl: result.logoUrl, logoS3Key: result.logoKey } : null
      );

      showToast('Logo uploaded successfully');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to upload logo', 'error');
    } finally {
      setIsUploading(false);
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

  // Extract user name parts for examples
  const nameParts = user?.name?.split(' ') || ['Guest'];
  const firstName = nameParts[0] || 'Guest';
  const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : 'User';
  const companyName = user?.companyName || 'Your Company';

  const getExample = (option: NameBoardOption): string => {
    return option.getExample(firstName, lastName, companyName);
  };

  const getNameBoardPreview = (): string => {
    if (selectedFormat === 'custom') {
      return customText || 'Custom text will appear here';
    }
    const option = NAME_BOARD_OPTIONS.find((o) => o.value === selectedFormat);
    return option ? getExample(option) : '';
  };

  return (
    <CorporateLayout pageTitle="Account Preferences">
      <div className="max-w-3xl mx-auto">

        {isLoading ? (
          <div className="corp-card rounded-lg p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-sage/20 rounded w-1/3" />
              <div className="h-10 bg-sage/10 rounded" />
              <div className="h-4 bg-sage/20 rounded w-1/2" />
            </div>
          </div>
        ) : (
          <>
            {/* Logo Upload Section */}
            <div className="corp-card rounded-lg p-6 mb-6">
              <h2 className="corp-section-title text-lg font-semibold mb-4">Company Logo</h2>
              <p className="corp-page-subtitle text-sm mb-4">
                Upload your company logo to display on driver name boards. Supported formats: PNG, JPEG, SVG (max 2MB).
              </p>

              <div className="flex items-start gap-6">
                <div className="flex-shrink-0">
                  {preferences?.logoUrl ? (
                    <div className="relative w-32 h-32 border corp-border rounded-lg overflow-hidden">
                      {/* Use unoptimized for S3 URLs with special characters in path */}
                      <Image
                        src={preferences.logoUrl}
                        alt="Company logo"
                        fill
                        className="object-contain p-2"
                        unoptimized
                      />
                    </div>
                  ) : (
                    <div className="w-32 h-32 border-2 border-dashed corp-border rounded-lg flex items-center justify-center">
                      <span className="text-sm opacity-50">No logo</span>
                    </div>
                  )}
                </div>

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
                    className="corp-btn corp-btn-secondary inline-flex items-center px-4 py-2 rounded-full text-sm font-medium disabled:opacity-50"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {isUploading ? 'Uploading...' : preferences?.logoUrl ? 'Replace Logo' : 'Upload Logo'}
                  </button>

                  {preferences?.logoUrl && (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      disabled={isDeleting}
                      className="corp-btn corp-btn-danger-ghost inline-flex items-center px-4 py-2 ml-3 rounded-full text-sm font-medium disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      {isDeleting ? 'Deleting...' : 'Delete Logo'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Name Board Format Section */}
            <div className="corp-card rounded-lg p-6">
              <h2 className="corp-section-title text-lg font-semibold mb-4">Name Board Format</h2>
              <p className="corp-page-subtitle text-sm mb-4">
                Choose how passenger names appear on the driver&apos;s name board when meeting passengers.
              </p>

              <div className="space-y-3 mb-6">
                {NAME_BOARD_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className={`corp-radio-card flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedFormat === option.value ? 'corp-radio-card-selected' : ''
                    }`}
                  >
                    <input
                      type="radio"
                      name="nameBoardFormat"
                      value={option.value}
                      checked={selectedFormat === option.value}
                      onChange={(e) => setSelectedFormat(e.target.value as NameBoardFormat)}
                      className="h-4 w-4"
                    />
                    <div className="ml-3 flex-1">
                      <span className="text-sm font-medium">{option.label}</span>
                      <span className="ml-2 text-sm opacity-50">— {getExample(option)}</span>
                    </div>
                  </label>
                ))}
              </div>

              {selectedFormat === 'custom' && (
                <div className="mb-6">
                  <label htmlFor="customText" className="block text-sm font-medium mb-1">
                    Custom Text
                  </label>
                  <input
                    type="text"
                    id="customText"
                    value={customText}
                    onChange={(e) => setCustomText(e.target.value)}
                    maxLength={100}
                    placeholder="Enter custom name board text"
                    className="corp-input w-full px-3 py-2 rounded-lg"
                  />
                  <p className="mt-1 text-xs opacity-50">{customText.length}/100 characters</p>
                </div>
              )}

              {/* Preview */}
              <div className="corp-preview-dark rounded-lg p-6 mb-6">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Eye className="w-4 h-4 opacity-60" />
                  <span className="text-xs opacity-60 uppercase tracking-wider">Preview</span>
                </div>
                <div className="text-center">
                  {preferences?.logoUrl && (
                    <div className="flex justify-center mb-3">
                      <div className="relative w-16 h-16">
                        <Image
                          src={preferences.logoUrl}
                          alt="Company logo"
                          fill
                          className="object-contain"
                          unoptimized
                        />
                      </div>
                    </div>
                  )}
                  <p className="text-2xl font-bold">{getNameBoardPreview()}</p>
                </div>
              </div>
            </div>

            {/* Default Booking Preferences Section */}
            <div className="corp-card rounded-lg p-6 mt-6">
              <h2 className="corp-section-title text-lg font-semibold mb-4">Default Booking Preferences</h2>
              <p className="corp-page-subtitle text-sm mb-4">
                Set default preferences that will be applied to all new bookings. Individual passenger preferences will override these defaults.
              </p>

              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Default Refreshments</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                  {[
                    { key: 'stillWater', label: 'Still Water' },
                    { key: 'sparklingWater', label: 'Sparkling Water' },
                    { key: 'tea', label: 'Tea' },
                    { key: 'coffee', label: 'Coffee' },
                  ].map(({ key, label }) => (
                    <label
                      key={key}
                      className={`corp-checkbox-card flex items-center justify-center px-3 py-2 border rounded-lg cursor-pointer transition-colors ${
                        defaultRefreshments[key as keyof typeof defaultRefreshments]
                          ? 'corp-checkbox-card-selected'
                          : ''
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
                  className="corp-input w-full px-3 py-2 rounded-lg"
                />
              </div>

              <div className="mb-6">
                <label htmlFor="defaultDriverInstructions" className="block text-sm font-medium mb-1">
                  Default Driver Instructions
                </label>
                <textarea
                  id="defaultDriverInstructions"
                  value={defaultDriverInstructions}
                  onChange={(e) => setDefaultDriverInstructions(e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="e.g., Always use the main entrance, call upon arrival..."
                  className="corp-input w-full px-3 py-2 rounded-lg"
                />
                <p className="mt-1 text-xs opacity-50">{defaultDriverInstructions.length}/500 characters - Visible to driver on all bookings</p>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleSaveFormat}
                  disabled={isSaving}
                  className="corp-btn corp-btn-primary inline-flex items-center px-6 py-2 rounded-full text-sm font-medium disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save Preferences'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div
              className="fixed inset-0 bg-black/50 transition-opacity"
              onClick={() => setShowDeleteConfirm(false)}
            />
            <div className="corp-modal relative bg-white rounded-lg shadow-xl max-w-sm w-full p-6">
              <div className="text-center mb-4">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold">Delete Logo?</h3>
                <p className="text-sm opacity-70 mt-2">
                  Are you sure you want to delete your company logo? This cannot be undone.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="corp-btn corp-btn-secondary flex-1 px-4 py-2 text-sm font-medium rounded-full"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteLogo}
                  disabled={isDeleting}
                  className="corp-btn corp-btn-danger flex-1 px-4 py-2 text-sm font-medium rounded-full disabled:opacity-50"
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
    </CorporateLayout>
  );
}
