'use client';

import { X, Copy, Mail, MessageCircle, Share2, Check, Loader2, Send } from 'lucide-react';
import { useState, useEffect, useCallback, useRef } from 'react';

import { Button } from '@/components/ui/button';
import { API_BASE_URL, API_ENDPOINTS } from '@/lib/config/api';
import { shareQuoteByEmail } from '../lib/api';

import { QuoteResponse, MultiVehicleQuoteResponse, VehiclePricing } from '../lib/types';

interface ShareQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  quoteData: QuoteResponse | MultiVehicleQuoteResponse;
  selectedVehicle?: string;
  savedToken?: string;
}

interface SaveQuoteResponse {
  quoteId: string;
  token: string;
  shareUrl: string;
  quote: object;
}

export default function ShareQuoteModal({
  isOpen,
  onClose,
  quoteData,
  selectedVehicle = 'standard',
  savedToken,
}: ShareQuoteModalProps) {
  const [saving, setSaving] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [quoteId, setQuoteId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  // Track if we've already initiated a save for this modal open
  const saveInitiatedRef = useRef(false);

  // Memoized prepare quote data for saving
  const prepareQuoteForSave = useCallback(() => {
    // Check if it's a multi-vehicle response
    if ('compareMode' in quoteData && quoteData.compareMode) {
      const vehicleData = quoteData.vehicles[selectedVehicle as keyof typeof quoteData.vehicles] as VehiclePricing;
      return {
        journey: quoteData.journey,
        pricing: vehicleData.oneWay,
        vehicleType: selectedVehicle,
        pickupLocation: quoteData.pickupLocation,
        dropoffLocation: quoteData.dropoffLocation,
        pickupTime: quoteData.pickupTime,
        passengers: quoteData.passengers,
        luggage: quoteData.luggage,
        waypoints: quoteData.waypoints,
        journeyType: quoteData.journeyType,
        durationHours: quoteData.durationHours,
      };
    }

    // Single vehicle response - cast to QuoteResponse since compareMode check failed
    const singleQuote = quoteData as QuoteResponse;
    return {
      journey: singleQuote.journey,
      pricing: singleQuote.pricing,
      vehicleType: singleQuote.vehicleType,
      pickupLocation: singleQuote.pickupLocation,
      dropoffLocation: singleQuote.dropoffLocation,
      pickupTime: singleQuote.pickupTime,
      passengers: singleQuote.passengers,
      luggage: singleQuote.luggage,
      waypoints: singleQuote.waypoints,
      returnJourney: singleQuote.returnJourney,
    };
  }, [quoteData, selectedVehicle]);

  // Memoized save quote handler
  const handleSaveQuote = useCallback(async () => {
    setSaving(true);
    setError(null);

    try {
      const quoteToSave = prepareQuoteForSave();

      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.quotesSave}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ quote: quoteToSave }),
      });

      if (!response.ok) {
        throw new Error('Failed to save quote');
      }

      const data: SaveQuoteResponse = await response.json();
      setShareUrl(data.shareUrl);
      setQuoteId(data.quoteId);
      setToken(data.token);
    } catch (err) {
      console.error('Error saving quote:', err);
      setError('Failed to generate share link. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [prepareQuoteForSave]);

  // Auto-generate share link when modal opens (only once per open)
  // If quote was already saved (has quoteId and savedToken), use existing data
  useEffect(() => {
    if (isOpen && !saveInitiatedRef.current) {
      saveInitiatedRef.current = true;

      // Check if quote already has a valid quoteId and token (was saved earlier)
      const existingQuoteId = 'quoteId' in quoteData ? quoteData.quoteId : null;
      const hasValidExistingQuote = existingQuoteId &&
        !existingQuoteId.startsWith('temp-') &&
        savedToken;

      if (hasValidExistingQuote) {
        // Use existing quote data - construct shareUrl directly
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
        setShareUrl(`${baseUrl}/quote/${existingQuoteId}?token=${savedToken}`);
        setQuoteId(existingQuoteId);
        setToken(savedToken);
      } else {
        // No existing quote, need to save
        handleSaveQuote();
      }
    }
  }, [isOpen, handleSaveQuote, quoteData, savedToken]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      // Reset the save initiated flag when modal closes
      saveInitiatedRef.current = false;
      setShareUrl(null);
      setQuoteId(null);
      setToken(null);
      setCopied(false);
      setError(null);
      setEmailInput('');
      setEmailSent(false);
      setEmailError(null);
    }
  }, [isOpen]);

  const handleCopyLink = async () => {
    if (!shareUrl) return;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleShareEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quoteId || !token || !emailInput.trim()) return;

    setSendingEmail(true);
    setEmailError(null);

    try {
      await shareQuoteByEmail(quoteId, token, emailInput.trim());
      setEmailSent(true);
      setEmailInput('');
    } catch (err) {
      console.error('Error sending email:', err);
      setEmailError(err instanceof Error ? err.message : 'Failed to send email');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleShareWhatsApp = () => {
    if (!shareUrl) return;
    const text = encodeURIComponent(
      `Check out this transfer quote from Dorset Transfer Company: ${shareUrl}`
    );
    window.open(`https://wa.me/?text=${text}`);
  };

  const handleShareNative = async () => {
    if (!shareUrl || !navigator.share) return;

    try {
      await navigator.share({
        title: 'Transfer Quote - Dorset Transfer Company',
        text: 'Check out this transfer quote',
        url: shareUrl,
      });
    } catch (err) {
      // User cancelled or share failed
      console.error('Share failed:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-card rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-xl font-semibold text-foreground">Share Quote</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {saving ? (
            // Loading state
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-sage-dark mx-auto mb-4" />
              <p className="text-muted-foreground">Generating share link...</p>
            </div>
          ) : error ? (
            // Error state
            <div className="text-center py-4">
              <p className="text-red-500 mb-4">{error}</p>
              <Button
                onClick={handleSaveQuote}
                className="bg-sage-dark hover:bg-sage-dark/90 text-white"
              >
                Try Again
              </Button>
            </div>
          ) : shareUrl ? (
            // Share options
            <div>
              {/* Link display */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-foreground mb-2">
                  Share Link
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={shareUrl}
                    className="flex-1 px-3 py-2 bg-muted rounded-lg text-sm text-foreground border border-border"
                  />
                  <Button
                    onClick={handleCopyLink}
                    className="px-3 bg-sage-dark hover:bg-sage-dark/90 text-white"
                  >
                    {copied ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                {copied && (
                  <p className="text-sm text-green-600 mt-1">Link copied!</p>
                )}
              </div>

              {/* Email share form */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-foreground mb-2">
                  <Mail className="w-4 h-4 inline mr-2" />
                  Send via Email
                </label>
                {emailSent ? (
                  <div className="flex items-center gap-2 text-green-600 py-2">
                    <Check className="w-5 h-5" />
                    <span>Quote sent successfully!</span>
                    <button
                      onClick={() => setEmailSent(false)}
                      className="ml-auto text-sm text-muted-foreground hover:text-foreground"
                    >
                      Send another
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleShareEmail} className="flex gap-2">
                    <input
                      type="email"
                      placeholder="recipient@example.com"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      className="flex-1 px-3 py-2 bg-muted rounded-lg text-sm text-foreground border border-border"
                      disabled={sendingEmail}
                      required
                    />
                    <Button
                      type="submit"
                      disabled={sendingEmail || !emailInput.trim()}
                      className="px-4 bg-navy-dark hover:bg-navy-dark/90 text-white disabled:opacity-50"
                    >
                      {sendingEmail ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </Button>
                  </form>
                )}
                {emailError && (
                  <p className="text-sm text-red-500 mt-1">{emailError}</p>
                )}
              </div>

              {/* Other share options */}
              <div className="space-y-3">
                <p className="text-sm font-medium text-foreground">Other ways to share</p>

                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={handleShareWhatsApp}
                    className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white"
                  >
                    <MessageCircle className="w-4 h-4" />
                    WhatsApp
                  </Button>

                  {typeof navigator !== 'undefined' && 'share' in navigator && (
                    <Button
                      onClick={handleShareNative}
                      className="flex items-center justify-center gap-2 bg-gray-600 hover:bg-gray-700 text-white"
                    >
                      <Share2 className="w-4 h-4" />
                      More Options
                    </Button>
                  )}
                </div>
              </div>

              {/* Done button */}
              <Button
                onClick={onClose}
                className="w-full mt-6 bg-sage-dark hover:bg-sage-dark/90 text-white"
              >
                Done
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
