'use client';

import { useState, useEffect, useCallback } from 'react';
import { CheckCircle, AlertTriangle, User, Mail, MessageSquare, Phone } from 'lucide-react';
import { useRequireCorporateAuth } from '@/lib/hooks/useCorporateAuth';
import {
  getProfile,
  updateNotifications,
  type CommunicationChannels,
} from '@/lib/services/corporateApi';
import CorporateLayout from '@/components/corporate/CorporateLayout';

export default function ProfilePage() {
  const { user } = useRequireCorporateAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Profile data from API
  const [profileData, setProfileData] = useState<{
    name: string;
    email: string;
    role: string;
    linkedPassengerId?: string | null;
  } | null>(null);

  // Form state for communication preferences
  const [channels, setChannels] = useState<CommunicationChannels>({
    email: true,
    sms: false,
    whatsapp: false,
  });
  const [phone, setPhone] = useState('');

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => {
    if (user) {
      getProfile()
        .then((data) => {
          setProfileData({
            name: data.user.name,
            email: data.user.email,
            role: data.user.role,
            linkedPassengerId: data.user.linkedPassengerId,
          });
          // Load channels from profile
          setChannels({
            email: data.user.channels?.email ?? true,
            sms: data.user.channels?.sms ?? false,
            whatsapp: data.user.channels?.whatsapp ?? false,
          });
          setPhone(data.user.phone || '');
        })
        .catch((err) => {
          console.error('Failed to load profile:', err);
          showToast('Failed to load profile', 'error');
        })
        .finally(() => setIsLoading(false));
    }
  }, [user, showToast]);

  const handleSaveChannels = async () => {
    // Validate phone if SMS/WhatsApp enabled
    if ((channels.sms || channels.whatsapp) && !phone.trim()) {
      setError('Phone number required when SMS or WhatsApp is enabled');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await updateNotifications({
        channels,
        phone: phone.trim() || null,
      });
      showToast('Communication preferences saved successfully');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save preferences';
      showToast(message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <CorporateLayout pageTitle="My Profile">
      <div className="max-w-2xl mx-auto">

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
            {/* Profile Information Section */}
            <div className="corp-card rounded-lg p-6 mb-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="corp-user-avatar h-16 w-16 rounded-full flex items-center justify-center">
                  <User className="h-8 w-8" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">{profileData?.name}</h2>
                  <p className="corp-page-subtitle text-sm">{profileData?.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm font-medium opacity-70">Role</dt>
                  <dd className="mt-1 text-sm capitalize">{profileData?.role}</dd>
                </div>
                {profileData?.linkedPassengerId && (
                  <div>
                    <dt className="text-sm font-medium opacity-70">Linked Passenger</dt>
                    <dd className="mt-1">
                      <span className="corp-badge corp-badge-success text-xs">
                        <CheckCircle className="w-3 h-3 inline mr-1" />
                        Linked
                      </span>
                    </dd>
                  </div>
                )}
              </div>
            </div>

            {/* Communication Channels Section */}
            <div className="corp-card rounded-lg p-6">
              <h2 className="corp-section-title text-lg font-semibold mb-4">Communication Preferences</h2>
              <p className="corp-page-subtitle text-sm mb-4">
                Choose how you&apos;d like to receive booking confirmations and notifications.
              </p>

              <div className="space-y-4 mb-6">
                {/* Email Channel */}
                <label
                  className={`corp-checkbox-card flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                    channels.email ? 'corp-checkbox-card-selected' : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={channels.email}
                    onChange={(e) => setChannels(prev => ({ ...prev, email: e.target.checked }))}
                    className="sr-only"
                  />
                  <Mail className="w-5 h-5 mr-3 opacity-70" />
                  <div className="flex-1">
                    <span className="text-sm font-medium">Email</span>
                    <p className="text-xs opacity-60 mt-0.5">Receive notifications via email</p>
                  </div>
                  <div className={`w-10 h-6 rounded-full transition-colors ${channels.email ? 'bg-sage' : 'bg-gray-300'} relative`}>
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${channels.email ? 'translate-x-5' : 'translate-x-1'}`} />
                  </div>
                </label>

                {/* SMS Channel */}
                <label
                  className={`corp-checkbox-card flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                    channels.sms ? 'corp-checkbox-card-selected' : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={channels.sms}
                    onChange={(e) => setChannels(prev => ({ ...prev, sms: e.target.checked }))}
                    className="sr-only"
                  />
                  <MessageSquare className="w-5 h-5 mr-3 opacity-70" />
                  <div className="flex-1">
                    <span className="text-sm font-medium">SMS</span>
                    <p className="text-xs opacity-60 mt-0.5">Receive text message notifications</p>
                  </div>
                  <div className={`w-10 h-6 rounded-full transition-colors ${channels.sms ? 'bg-sage' : 'bg-gray-300'} relative`}>
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${channels.sms ? 'translate-x-5' : 'translate-x-1'}`} />
                  </div>
                </label>

                {/* WhatsApp Channel */}
                <label
                  className={`corp-checkbox-card flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                    channels.whatsapp ? 'corp-checkbox-card-selected' : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={channels.whatsapp}
                    onChange={(e) => setChannels(prev => ({ ...prev, whatsapp: e.target.checked }))}
                    className="sr-only"
                  />
                  <MessageSquare className="w-5 h-5 mr-3 opacity-70" />
                  <div className="flex-1">
                    <span className="text-sm font-medium">WhatsApp</span>
                    <p className="text-xs opacity-60 mt-0.5">Receive WhatsApp message notifications</p>
                  </div>
                  <div className={`w-10 h-6 rounded-full transition-colors ${channels.whatsapp ? 'bg-sage' : 'bg-gray-300'} relative`}>
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${channels.whatsapp ? 'translate-x-5' : 'translate-x-1'}`} />
                  </div>
                </label>
              </div>

              {/* Phone Number Input - shown when SMS or WhatsApp enabled */}
              {(channels.sms || channels.whatsapp) && (
                <div className="mb-6">
                  <label htmlFor="phone" className="block text-sm font-medium mb-1">
                    <Phone className="w-4 h-4 inline mr-1" />
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="+44 7700 900123"
                    className={`corp-input w-full px-3 py-2 rounded-lg ${error ? 'border-red-500' : ''}`}
                  />
                  <p className="mt-1 text-xs opacity-50">Required for SMS and WhatsApp notifications</p>
                  {error && (
                    <p className="mt-1 text-xs text-red-500">{error}</p>
                  )}
                </div>
              )}

              <div className="flex justify-end">
                <button
                  onClick={handleSaveChannels}
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
