'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ChatMessage,
  initializeSession,
  sendMessage,
  clearStoredSessionId,
  VehicleOption,
} from '@/lib/services/chatApi';

interface Message extends ChatMessage {
  id: string;
  vehicleOptions?: VehicleOption[];
  addressOptions?: string[];
  showContactForm?: boolean;
  showQuoteActions?: boolean;
  showDatePicker?: boolean;
  showTimePicker?: boolean;
  showPassengerStepper?: boolean;
}

// Parse vehicle options from AI response text
function parseVehicleOptions(text: string): VehicleOption[] | null {
  const vehicles: VehicleOption[] = [];

  // Split into lines and look for vehicle patterns
  const lines = text.split('\n');

  for (const line of lines) {
    // Skip empty lines
    if (!line.trim()) continue;

    // Look for lines with vehicle names and prices
    // Match patterns like:
    // - "Saloon (up to 4 passengers): £153"
    // - "- Standard Saloon: £153"
    // - "- Executive (4 passengers): £180"
    // - "* MPV - £220"
    // - "8-Seater Minibus (up to 8): £250"

    // Check if line contains a price (£ followed by number)
    const priceMatch = line.match(/[£](\d+(?:\.\d{2})?)/);
    if (!priceMatch) continue;

    const price = parseFloat(priceMatch[1]) * 100; // Convert to pence

    // Check if line mentions a vehicle type
    // Order matters - check more specific patterns first (e.g., "Executive Minibus" before "Executive")
    const vehiclePatterns = [
      { pattern: /\b(executive\s*minibus)\b/i, label: 'Executive Minibus', capacity: 8 },
      { pattern: /\b(minibus|8[- ]?seater)\b/i, label: 'Minibus', capacity: 8 },
      { pattern: /\b(standard\s*(saloon|sedan)|(saloon|sedan))\b/i, label: 'Standard', capacity: 4 },
      { pattern: /\b(executive\s*(saloon|sedan)|executive)\b/i, label: 'Executive', capacity: 4 },
      { pattern: /\b(mpv|people\s*carrier)\b/i, label: 'MPV', capacity: 6 },
      { pattern: /\b(estate)\b/i, label: 'Estate', capacity: 4 },
      { pattern: /\b(luxury)\b/i, label: 'Luxury', capacity: 4 },
    ];

    for (const { pattern, label, capacity: defaultCapacity } of vehiclePatterns) {
      if (pattern.test(line)) {
        // Try to extract capacity from the line
        const capacityMatch = line.match(/(?:up to\s*)?(\d+)\s*(?:passengers?|seats?)/i);
        const capacity = capacityMatch ? parseInt(capacityMatch[1], 10) : defaultCapacity;

        // Avoid duplicates
        if (!vehicles.find(v => v.label === label)) {
          vehicles.push({
            id: label.toLowerCase(),
            label,
            price,
            capacity,
          });
        }
        break; // Found vehicle for this line, move to next line
      }
    }
  }

  return vehicles.length > 0 ? vehicles : null;
}

// Parse address options from AI response (bullet points)
function parseAddressOptions(text: string): string[] | null {
  const lines = text.split('\n');
  const options: string[] = [];

  for (const line of lines) {
    // Match lines starting with - or * followed by an address
    const match = line.match(/^\s*[-*]\s*(.+)$/);
    if (match && match[1].length > 10) {
      // Filter out non-address options (like vehicle types)
      const option = match[1].trim();
      if (!option.match(/^\w+\s*\(up to \d+ passengers?\)/i) &&
          !option.match(/^(Saloon|Executive|MPV|Estate|Minibus)/i)) {
        options.push(option);
      }
    }
  }

  return options.length > 1 ? options : null;
}

// Check if message is asking for contact details
function isAskingForContact(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes('lead passenger name') ||
    lower.includes('passenger name') ||
    lower.includes('phone number') ||
    lower.includes('email address') ||
    (lower.includes('contact') && lower.includes('details'))
  );
}

// Check if message is asking for date
function isAskingForDate(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes('what date') ||
    lower.includes('which date') ||
    lower.includes('when would you like') ||
    lower.includes('date would you like')
  );
}

// Check if message is asking for time
function isAskingForTime(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes('what time') ||
    lower.includes('which time') ||
    lower.includes('time would you like') ||
    lower.includes('time for pickup')
  );
}

// Check if message is asking for passengers
function isAskingForPassengers(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes('how many passengers') ||
    lower.includes('number of passengers') ||
    lower.includes('many people')
  );
}

// Check if message is asking for extras
function isAskingForExtras(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    (lower.includes('child seat') || lower.includes('booster seat') || lower.includes('baby seat')) &&
    (lower.includes('luggage') || lower.includes('need any'))
  );
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: '',
    phone: '',
    email: '',
  });
  const [showContactForm, setShowContactForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [passengerCount, setPassengerCount] = useState(1);
  const [showDateButton, setShowDateButton] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimeButton, setShowTimeButton] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showPassengerStepper, setShowPassengerStepper] = useState(false);
  const [showExtrasSelector, setShowExtrasSelector] = useState(false);
  const [babySeats, setBabySeats] = useState(0);
  const [childSeats, setChildSeats] = useState(0);
  const [hasLargeLuggage, setHasLargeLuggage] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Generate date options for next 90 days (starting from tomorrow - no same day bookings)
  const getDateOptions = () => {
    const options: { value: string; label: string }[] = [];
    const today = new Date();
    for (let i = 1; i <= 90; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      const value = date.toISOString().split('T')[0];
      const dayName = date.toLocaleDateString('en-GB', { weekday: 'short' });
      const dateStr = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      let label = `${dayName} ${dateStr}`;
      if (i === 1) label = `Tomorrow (${dateStr})`;
      options.push({ value, label });
    }
    return options;
  };

  // Generate time options in 15-min increments
  const getTimeOptions = () => {
    const options: { value: string; label: string }[] = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let min = 0; min < 60; min += 15) {
        const hourStr = hour.toString().padStart(2, '0');
        const minStr = min.toString().padStart(2, '0');
        const value = `${hourStr}:${minStr}`;
        const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
        const ampm = hour < 12 ? 'am' : 'pm';
        const label = `${hour12}:${minStr}${ampm}`;
        options.push({ value, label });
      }
    }
    return options;
  };

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (isOpen && !isInitializing && inputRef.current) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, isInitializing]);

  const initChat = useCallback(async () => {
    if (sessionId || isInitializing) return;

    setIsInitializing(true);
    setError(null);

    try {
      const session = await initializeSession();
      setSessionId(session.sessionId);

      if (session.messages.length > 0) {
        setMessages(
          session.messages.map((msg, i) => ({
            ...msg,
            id: `restored-${i}`,
          }))
        );
      } else {
        // Add welcome message for new sessions
        setMessages([
          {
            id: 'welcome',
            role: 'assistant',
            content:
              "Hi! I'm your booking assistant. I can help you arrange a transfer. Where would you like to go?",
            timestamp: new Date().toISOString(),
          },
        ]);
      }
    } catch (err) {
      console.error('Failed to initialize chat:', err);
      setError('Failed to connect. Please try again.');
    } finally {
      setIsInitializing(false);
    }
  }, [sessionId, isInitializing]);

  const handleOpen = () => {
    setIsOpen(true);
    if (!sessionId) {
      initChat();
    }
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleSend = async () => {
    if (!inputValue.trim() || !sessionId || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setError(null);

    try {
      const response = await sendMessage(sessionId, userMessage.content);

      if (response.success && response.response) {
        // Parse options from response text
        const vehicleOptions = parseVehicleOptions(response.response);
        const addressOptions = parseAddressOptions(response.response);
        const askingForContact = isAskingForContact(response.response);
        const askingForDate = isAskingForDate(response.response);
        const askingForTime = isAskingForTime(response.response);
        const askingForPassengers = isAskingForPassengers(response.response);
        const askingForExtras = isAskingForExtras(response.response);

        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: response.response,
          timestamp: new Date().toISOString(),
          vehicleOptions: vehicleOptions || undefined,
          addressOptions: addressOptions || undefined,
          showContactForm: askingForContact,
          showDatePicker: askingForDate,
          showTimePicker: askingForTime,
          showPassengerStepper: askingForPassengers,
        };
        setMessages((prev) => [...prev, assistantMessage]);

        // Show appropriate interactive controls
        if (askingForContact) setShowContactForm(true);
        if (askingForDate) setShowDateButton(true);
        if (askingForTime) setShowTimeButton(true);
        if (askingForPassengers) setShowPassengerStepper(true);
        if (askingForExtras) setShowExtrasSelector(true);
      } else {
        setError(response.error || 'Failed to get response. Please try again.');
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      setError('Connection error. Please try again.');
    } finally {
      setIsLoading(false);
      // Refocus input after response
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNewChat = () => {
    clearStoredSessionId();
    setSessionId(null);
    setMessages([]);
    setError(null);
    initChat();
  };

  // Handle vehicle selection
  const handleVehicleSelect = (vehicle: VehicleOption) => {
    const response = `I'd like the ${vehicle.label} please`;
    setInputValue(response);
    // Auto-send after brief delay
    setTimeout(() => {
      setInputValue('');
      const userMessage: Message = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: response,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);
      setError(null);

      sendMessage(sessionId!, response).then((res) => {
        if (res.success && res.response) {
          const vehicleOptions = parseVehicleOptions(res.response);
          const showContactForm = isAskingForContact(res.response);
          setMessages((prev) => [
            ...prev,
            {
              id: `assistant-${Date.now()}`,
              role: 'assistant',
              content: res.response,
              timestamp: new Date().toISOString(),
              vehicleOptions: vehicleOptions || undefined,
              showContactForm,
            },
          ]);
        } else {
          setError(res.error || 'Failed to get response.');
        }
        setIsLoading(false);
        setTimeout(() => inputRef.current?.focus(), 100);
      }).catch(() => {
        setError('Connection error. Please try again.');
        setIsLoading(false);
      });
    }, 100);
  };

  // Handle contact form submission
  const handleContactSubmit = async () => {
    if (!sessionId || !contactForm.name || !contactForm.phone) return;

    setShowContactForm(false);
    const response = `My name is ${contactForm.name}, phone number is ${contactForm.phone}${contactForm.email ? `, and email is ${contactForm.email}` : ''}`;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: response,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    try {
      const res = await sendMessage(sessionId, response);
      if (res.success && res.response) {
        const vehicleOptions = parseVehicleOptions(res.response);
        const showContact = isAskingForContact(res.response);
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: res.response,
            timestamp: new Date().toISOString(),
            vehicleOptions: vehicleOptions || undefined,
            showContactForm: showContact,
          },
        ]);
        if (showContact) setShowContactForm(true);
      } else {
        setError(res.error || 'Failed to get response.');
      }
    } catch {
      setError('Connection error. Please try again.');
    }
    setIsLoading(false);
    setContactForm({ name: '', phone: '', email: '' });
  };

  // Handle address option selection
  const handleAddressSelect = async (address: string) => {
    if (!sessionId || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: address,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    try {
      const res = await sendMessage(sessionId, address);
      if (res.success && res.response) {
        const vehicleOptions = parseVehicleOptions(res.response);
        const addressOptions = parseAddressOptions(res.response);
        const askingForContact = isAskingForContact(res.response);
        const askingForDate = isAskingForDate(res.response);
        const askingForTime = isAskingForTime(res.response);
        const askingForPassengers = isAskingForPassengers(res.response);
        const askingForExtras = isAskingForExtras(res.response);
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: res.response,
            timestamp: new Date().toISOString(),
            vehicleOptions: vehicleOptions || undefined,
            addressOptions: addressOptions || undefined,
            showContactForm: askingForContact,
            showDatePicker: askingForDate,
            showTimePicker: askingForTime,
            showPassengerStepper: askingForPassengers,
          },
        ]);
        if (askingForContact) setShowContactForm(true);
        if (askingForDate) setShowDateButton(true);
        if (askingForTime) setShowTimeButton(true);
        if (askingForPassengers) setShowPassengerStepper(true);
        if (askingForExtras) setShowExtrasSelector(true);
      } else {
        setError(res.error || 'Failed to get response.');
      }
    } catch {
      setError('Connection error. Please try again.');
    }
    setIsLoading(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  // Handle date selection
  const handleDateSelect = async (dateValue: string) => {
    if (!sessionId) return;
    setShowDateButton(false);
    setShowDatePicker(false);
    setSelectedDate(dateValue);

    // Format date for human-readable message
    const date = new Date(dateValue);
    const formatted = date.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: formatted,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    try {
      const res = await sendMessage(sessionId, formatted);
      if (res.success && res.response) {
        const vehicleOptions = parseVehicleOptions(res.response);
        const askingForContact = isAskingForContact(res.response);
        const askingForTime = isAskingForTime(res.response);
        const askingForPassengers = isAskingForPassengers(res.response);
        const askingForExtras = isAskingForExtras(res.response);
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: res.response,
            timestamp: new Date().toISOString(),
            vehicleOptions: vehicleOptions || undefined,
            showContactForm: askingForContact,
            showTimePicker: askingForTime,
            showPassengerStepper: askingForPassengers,
          },
        ]);
        if (askingForContact) setShowContactForm(true);
        if (askingForTime) setShowTimeButton(true);
        if (askingForPassengers) setShowPassengerStepper(true);
        if (askingForExtras) setShowExtrasSelector(true);
      } else {
        setError(res.error || 'Failed to get response.');
      }
    } catch {
      setError('Connection error. Please try again.');
    }
    setIsLoading(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  // Handle time selection
  const handleTimeSelect = async (timeValue: string) => {
    if (!sessionId) return;
    setShowTimeButton(false);
    setShowTimePicker(false);
    setSelectedTime(timeValue);

    // Format time for human-readable message
    const [hourStr, minStr] = timeValue.split(':');
    const hour = parseInt(hourStr, 10);
    const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    const ampm = hour < 12 ? 'am' : 'pm';
    const formatted = `${hour12}:${minStr}${ampm}`;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: formatted,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    try {
      const res = await sendMessage(sessionId, formatted);
      if (res.success && res.response) {
        const vehicleOptions = parseVehicleOptions(res.response);
        const askingForContact = isAskingForContact(res.response);
        const askingForPassengers = isAskingForPassengers(res.response);
        const askingForExtras = isAskingForExtras(res.response);
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: res.response,
            timestamp: new Date().toISOString(),
            vehicleOptions: vehicleOptions || undefined,
            showContactForm: askingForContact,
            showPassengerStepper: askingForPassengers,
          },
        ]);
        if (askingForContact) setShowContactForm(true);
        if (askingForPassengers) setShowPassengerStepper(true);
        if (askingForExtras) setShowExtrasSelector(true);
      } else {
        setError(res.error || 'Failed to get response.');
      }
    } catch {
      setError('Connection error. Please try again.');
    }
    setIsLoading(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  // Handle passenger count submit
  const handlePassengerSubmit = async () => {
    if (!sessionId) return;
    setShowPassengerStepper(false);

    const message = `${passengerCount} passenger${passengerCount > 1 ? 's' : ''}`;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    try {
      const res = await sendMessage(sessionId, message);
      if (res.success && res.response) {
        const vehicleOptions = parseVehicleOptions(res.response);
        const askingForContact = isAskingForContact(res.response);
        const askingForDate = isAskingForDate(res.response);
        const askingForTime = isAskingForTime(res.response);
        const askingForPassengers = isAskingForPassengers(res.response);
        const askingForExtras = isAskingForExtras(res.response);
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: res.response,
            timestamp: new Date().toISOString(),
            vehicleOptions: vehicleOptions || undefined,
            showContactForm: askingForContact,
            showDatePicker: askingForDate,
            showTimePicker: askingForTime,
            showPassengerStepper: askingForPassengers,
          },
        ]);
        if (askingForContact) setShowContactForm(true);
        if (askingForDate) setShowDateButton(true);
        if (askingForTime) setShowTimeButton(true);
        if (askingForExtras) setShowExtrasSelector(true);
      } else {
        setError(res.error || 'Failed to get response.');
      }
    } catch {
      setError('Connection error. Please try again.');
    }
    setIsLoading(false);
    setPassengerCount(1); // Reset for next time
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  // Handle extras submit
  const handleExtrasSubmit = async () => {
    if (!sessionId) return;
    setShowExtrasSelector(false);

    // Build message based on selections
    const extras: string[] = [];
    if (babySeats > 0) extras.push(`${babySeats} baby seat${babySeats > 1 ? 's' : ''}`);
    if (childSeats > 0) extras.push(`${childSeats} booster seat${childSeats > 1 ? 's' : ''}`);
    if (hasLargeLuggage) extras.push('large luggage');

    const message = extras.length > 0
      ? `I need ${extras.join(' and ')}`
      : 'No extras needed';

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    try {
      const res = await sendMessage(sessionId, message);
      if (res.success && res.response) {
        const vehicleOptions = parseVehicleOptions(res.response);
        const askingForContact = isAskingForContact(res.response);
        const askingForExtras = isAskingForExtras(res.response);
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: res.response,
            timestamp: new Date().toISOString(),
            vehicleOptions: vehicleOptions || undefined,
            showContactForm: askingForContact,
          },
        ]);
        if (askingForContact) setShowContactForm(true);
        if (askingForExtras) setShowExtrasSelector(true);
      } else {
        setError(res.error || 'Failed to get response.');
      }
    } catch {
      setError('Connection error. Please try again.');
    }
    setIsLoading(false);
    // Reset extras state for next time
    setBabySeats(0);
    setChildSeats(0);
    setHasLargeLuggage(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  return (
    <>
      {/* Chat Bubble Button */}
      {!isOpen && (
        <button
          onClick={handleOpen}
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-sage text-white shadow-floating transition-all hover:bg-sage-dark hover:scale-105 focus:outline-none focus:ring-2 focus:ring-sage focus:ring-offset-2"
          aria-label="Open chat"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="h-6 w-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z"
            />
          </svg>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 flex h-[500px] w-[380px] max-w-[calc(100vw-48px)] flex-col rounded-2xl bg-white shadow-floating sm:h-[550px]">
          {/* Header */}
          <div className="flex items-center justify-between rounded-t-2xl bg-navy px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sage">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="h-5 w-5 text-white"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8.625 9.75a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 0 1 .778-.332 48.294 48.294 0 0 0 5.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-white">Booking Assistant</h3>
                <p className="text-xs text-sage-light">
                  {isLoading ? 'Typing...' : 'Online'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleNewChat}
                className="rounded-lg p-2 text-gray-light transition-colors hover:bg-navy-light hover:text-white"
                title="New chat"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="h-5 w-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
                  />
                </svg>
              </button>
              <button
                onClick={handleClose}
                className="rounded-lg p-2 text-gray-light transition-colors hover:bg-navy-light hover:text-white"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="h-5 w-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18 18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto bg-cream/50 p-4">
            {isInitializing ? (
              <div className="flex h-full items-center justify-center">
                <div className="flex items-center gap-2 text-gray-dark">
                  <svg
                    className="h-5 w-5 animate-spin"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>Connecting...</span>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div key={message.id} className="space-y-2">
                    <div
                      className={`flex ${
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                          message.role === 'user'
                            ? 'bg-sage text-white rounded-br-sm'
                            : 'bg-white text-navy shadow-soft rounded-bl-sm'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      </div>
                    </div>

                    {/* Vehicle Selection Buttons */}
                    {message.vehicleOptions && message.vehicleOptions.length > 0 && (
                      <div className="flex flex-col gap-2 pl-2">
                        {message.vehicleOptions.map((vehicle) => (
                          <button
                            key={vehicle.id}
                            onClick={() => handleVehicleSelect(vehicle)}
                            disabled={isLoading}
                            className="flex items-center justify-between w-full max-w-[280px] rounded-xl border-2 border-sage bg-white px-4 py-3 text-left transition-all hover:bg-sage hover:text-white hover:border-sage-dark focus:outline-none focus:ring-2 focus:ring-sage focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed group"
                          >
                            <div>
                              <span className="font-medium text-navy group-hover:text-white">
                                {vehicle.label}
                              </span>
                              <span className="ml-2 text-xs text-gray group-hover:text-sage-light">
                                up to {vehicle.capacity} passengers
                              </span>
                            </div>
                            <span className="font-bold text-sage group-hover:text-white">
                              {'\u00A3'}{(vehicle.price / 100).toFixed(0)}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Address Selection Buttons */}
                    {message.addressOptions && message.addressOptions.length > 0 && (
                      <div className="flex flex-col gap-2 pl-2">
                        {message.addressOptions.map((address, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleAddressSelect(address)}
                            disabled={isLoading}
                            className="w-full max-w-[320px] rounded-xl border-2 border-sage bg-white px-4 py-3 text-left text-sm text-navy transition-all hover:bg-sage hover:text-white hover:border-sage-dark focus:outline-none focus:ring-2 focus:ring-sage focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {address}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {isLoading && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl rounded-bl-sm bg-white px-4 py-3 shadow-soft">
                      <div className="flex gap-1">
                        <span className="h-2 w-2 animate-bounce rounded-full bg-gray [animation-delay:-0.3s]" />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-gray [animation-delay:-0.15s]" />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-gray" />
                      </div>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="flex justify-center">
                    <div className="rounded-lg bg-error/10 px-3 py-2 text-center text-sm text-error">
                      {error}
                    </div>
                  </div>
                )}

                {/* Contact Form */}
                {showContactForm && !isLoading && (
                  <div className="bg-white rounded-xl p-4 shadow-soft space-y-3">
                    <h4 className="font-medium text-navy text-sm">Contact Details</h4>
                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="Lead passenger name *"
                        value={contactForm.name}
                        onChange={(e) =>
                          setContactForm((f) => ({ ...f, name: e.target.value }))
                        }
                        className="w-full rounded-lg border border-gray-light px-3 py-2 text-sm text-navy placeholder-gray focus:border-sage focus:outline-none focus:ring-1 focus:ring-sage"
                      />
                      <input
                        type="tel"
                        placeholder="Phone number *"
                        value={contactForm.phone}
                        onChange={(e) =>
                          setContactForm((f) => ({ ...f, phone: e.target.value }))
                        }
                        className="w-full rounded-lg border border-gray-light px-3 py-2 text-sm text-navy placeholder-gray focus:border-sage focus:outline-none focus:ring-1 focus:ring-sage"
                      />
                      <input
                        type="email"
                        placeholder="Email (optional)"
                        value={contactForm.email}
                        onChange={(e) =>
                          setContactForm((f) => ({ ...f, email: e.target.value }))
                        }
                        className="w-full rounded-lg border border-gray-light px-3 py-2 text-sm text-navy placeholder-gray focus:border-sage focus:outline-none focus:ring-1 focus:ring-sage"
                      />
                    </div>
                    <button
                      onClick={handleContactSubmit}
                      disabled={!contactForm.name || !contactForm.phone}
                      className="w-full rounded-lg bg-sage py-2.5 text-sm font-medium text-white transition-all hover:bg-sage-dark focus:outline-none focus:ring-2 focus:ring-sage focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Submit Details
                    </button>
                  </div>
                )}

                {/* Select Date Button */}
                {showDateButton && !showDatePicker && !isLoading && (
                  <div className="pl-2">
                    <button
                      onClick={() => {
                        setShowDateButton(false);
                        setShowDatePicker(true);
                      }}
                      className="flex items-center gap-2 rounded-xl border-2 border-sage bg-white px-4 py-3 text-sm font-medium text-sage transition-all hover:bg-sage hover:text-white focus:outline-none focus:ring-2 focus:ring-sage focus:ring-offset-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                      </svg>
                      Select Date
                    </button>
                  </div>
                )}

                {/* Date Picker */}
                {showDatePicker && !isLoading && (
                  <div className="bg-white rounded-xl p-4 shadow-soft space-y-3">
                    <h4 className="font-medium text-navy text-sm">Select Date</h4>
                    {/* Quick date options */}
                    <div className="grid grid-cols-2 gap-2">
                      {getDateOptions().slice(0, 6).map((option) => (
                        <button
                          key={option.value}
                          onClick={() => handleDateSelect(option.value)}
                          className="rounded-lg border border-gray-light px-3 py-2 text-sm text-navy text-left transition-all hover:border-sage hover:bg-sage/10 focus:outline-none focus:ring-2 focus:ring-sage"
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                    {/* Custom Calendar */}
                    <div className="pt-2 border-t border-gray-light">
                      <div className="flex items-center justify-between mb-2">
                        <button
                          onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
                          disabled={calendarMonth.getMonth() === new Date().getMonth() && calendarMonth.getFullYear() === new Date().getFullYear()}
                          className="p-1 rounded hover:bg-gray-light/50 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-navy">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                          </svg>
                        </button>
                        <span className="text-sm font-medium text-navy">
                          {calendarMonth.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                        </span>
                        <button
                          onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
                          disabled={calendarMonth > new Date(Date.now() + 80 * 24 * 60 * 60 * 1000)}
                          className="p-1 rounded hover:bg-gray-light/50 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-navy">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                          </svg>
                        </button>
                      </div>
                      <div className="grid grid-cols-7 gap-1 text-center">
                        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                          <div key={day} className="text-xs text-gray font-medium py-1">{day}</div>
                        ))}
                        {(() => {
                          const firstDay = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
                          const lastDay = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0);
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          const tomorrow = new Date(today);
                          tomorrow.setDate(tomorrow.getDate() + 1);
                          const maxDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
                          const days = [];
                          // Padding for first week
                          for (let i = 0; i < firstDay.getDay(); i++) {
                            days.push(<div key={`empty-${i}`} />);
                          }
                          // Days of month
                          for (let d = 1; d <= lastDay.getDate(); d++) {
                            const date = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), d);
                            const dateStr = date.toISOString().split('T')[0];
                            const isPast = date < tomorrow; // No same day bookings
                            const isTooFar = date > maxDate;
                            const isDisabled = isPast || isTooFar;
                            days.push(
                              <button
                                key={d}
                                onClick={() => !isDisabled && handleDateSelect(dateStr)}
                                disabled={isDisabled}
                                className={`p-1.5 text-xs rounded transition-all ${
                                  isDisabled
                                    ? 'text-gray-light cursor-not-allowed'
                                    : 'text-navy hover:bg-sage hover:text-white'
                                }`}
                              >
                                {d}
                              </button>
                            );
                          }
                          return days;
                        })()}
                      </div>
                    </div>
                  </div>
                )}

                {/* Select Time Button */}
                {showTimeButton && !showTimePicker && !isLoading && (
                  <div className="pl-2">
                    <button
                      onClick={() => {
                        setShowTimeButton(false);
                        setShowTimePicker(true);
                      }}
                      className="flex items-center gap-2 rounded-xl border-2 border-sage bg-white px-4 py-3 text-sm font-medium text-sage transition-all hover:bg-sage hover:text-white focus:outline-none focus:ring-2 focus:ring-sage focus:ring-offset-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                      </svg>
                      Select Time
                    </button>
                  </div>
                )}

                {/* Time Picker */}
                {showTimePicker && !isLoading && (
                  <div className="bg-white rounded-xl p-4 shadow-soft space-y-3">
                    <h4 className="font-medium text-navy text-sm">Select Time</h4>
                    <div className="grid grid-cols-4 gap-1 max-h-[200px] overflow-y-auto">
                      {getTimeOptions().map((option) => (
                        <button
                          key={option.value}
                          onClick={() => handleTimeSelect(option.value)}
                          className="rounded-lg border border-gray-light px-2 py-1.5 text-xs text-navy transition-all hover:border-sage hover:bg-sage/10 focus:outline-none focus:ring-2 focus:ring-sage"
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Passenger Stepper */}
                {showPassengerStepper && !isLoading && (
                  <div className="bg-white rounded-xl p-4 shadow-soft space-y-3">
                    <h4 className="font-medium text-navy text-sm">Number of Passengers</h4>
                    <div className="flex items-center justify-center gap-4">
                      <button
                        onClick={() => setPassengerCount((c) => Math.max(1, c - 1))}
                        disabled={passengerCount <= 1}
                        className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-sage text-sage transition-all hover:bg-sage hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-5 w-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
                        </svg>
                      </button>
                      <span className="text-3xl font-bold text-navy w-12 text-center">{passengerCount}</span>
                      <button
                        onClick={() => setPassengerCount((c) => Math.min(16, c + 1))}
                        disabled={passengerCount >= 16}
                        className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-sage text-sage transition-all hover:bg-sage hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-5 w-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                      </button>
                    </div>
                    <button
                      onClick={handlePassengerSubmit}
                      className="w-full rounded-lg bg-sage py-2.5 text-sm font-medium text-white transition-all hover:bg-sage-dark focus:outline-none focus:ring-2 focus:ring-sage focus:ring-offset-2"
                    >
                      Confirm {passengerCount} passenger{passengerCount > 1 ? 's' : ''}
                    </button>
                  </div>
                )}

                {/* Extras Selector */}
                {showExtrasSelector && !isLoading && (
                  <div className="bg-white rounded-xl p-4 shadow-soft space-y-4">
                    <h4 className="font-medium text-navy text-sm">Optional Extras</h4>

                    {/* Baby Seats (ages 0-4) */}
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm text-navy">Baby seats</span>
                        <span className="text-xs text-gray ml-1">(ages 0-4)</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setBabySeats((c) => Math.max(0, c - 1))}
                          disabled={babySeats <= 0}
                          className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-sage text-sage transition-all hover:bg-sage hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
                          </svg>
                        </button>
                        <span className="text-lg font-bold text-navy w-6 text-center">{babySeats}</span>
                        <button
                          onClick={() => setBabySeats((c) => Math.min(3, c + 1))}
                          disabled={babySeats >= 3}
                          className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-sage text-sage transition-all hover:bg-sage hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Child/Booster Seats (ages 5-12) */}
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm text-navy">Booster seats</span>
                        <span className="text-xs text-gray ml-1">(ages 5-12)</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setChildSeats((c) => Math.max(0, c - 1))}
                          disabled={childSeats <= 0}
                          className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-sage text-sage transition-all hover:bg-sage hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
                          </svg>
                        </button>
                        <span className="text-lg font-bold text-navy w-6 text-center">{childSeats}</span>
                        <button
                          onClick={() => setChildSeats((c) => Math.min(3, c + 1))}
                          disabled={childSeats >= 3}
                          className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-sage text-sage transition-all hover:bg-sage hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Large Luggage */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-navy">Large luggage</span>
                      <button
                        onClick={() => setHasLargeLuggage(!hasLargeLuggage)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          hasLargeLuggage ? 'bg-sage' : 'bg-gray-light'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            hasLargeLuggage ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    <button
                      onClick={handleExtrasSubmit}
                      className="w-full rounded-lg bg-sage py-2.5 text-sm font-medium text-white transition-all hover:bg-sage-dark focus:outline-none focus:ring-2 focus:ring-sage focus:ring-offset-2"
                    >
                      {babySeats === 0 && childSeats === 0 && !hasLargeLuggage
                        ? 'No extras needed'
                        : 'Confirm extras'}
                    </button>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-gray-light bg-white p-3 rounded-b-2xl">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Type your message..."
                disabled={isLoading || isInitializing}
                className="flex-1 rounded-full border border-gray-light bg-cream/30 px-4 py-2.5 text-sm text-navy placeholder-gray focus:border-sage focus:outline-none focus:ring-1 focus:ring-sage disabled:opacity-50"
              />
              <button
                onClick={handleSend}
                disabled={!inputValue.trim() || isLoading || isInitializing}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-sage text-white transition-all hover:bg-sage-dark focus:outline-none focus:ring-2 focus:ring-sage focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="h-5 w-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
