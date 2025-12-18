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
  showContactForm?: boolean;
  showQuoteActions?: boolean;
  showDatePicker?: boolean;
  showTimePicker?: boolean;
  showPassengerStepper?: boolean;
}

// Parse vehicle options from AI response text
function parseVehicleOptions(text: string): VehicleOption[] | null {
  const vehicles: VehicleOption[] = [];

  // Match patterns like "Saloon (up to 4 passengers): £153" or "- Saloon - £153"
  const patterns = [
    /(?:^|\n)\s*[-*]?\s*(Saloon|Executive|MPV|Estate|Minibus|Luxury).*?(?:\(up to (\d+) passengers?\)|(?:up to (\d+))).*?[£:]?\s*[£]?(\d+(?:\.\d{2})?)/gi,
    /(?:^|\n)\s*[-*]?\s*(Saloon|Executive|MPV|Estate|Minibus|Luxury)[^£\n]*[£](\d+(?:\.\d{2})?)/gi,
  ];

  for (const pattern of patterns) {
    const regex = new RegExp(pattern);
    let match;
    while ((match = regex.exec(text)) !== null) {
      const label = match[1];
      const capacity = parseInt(match[2] || match[3] || '4', 10);
      const price = parseFloat(match[4] || match[2]) * 100; // Convert to pence

      // Avoid duplicates
      if (!vehicles.find(v => v.label.toLowerCase() === label.toLowerCase())) {
        vehicles.push({
          id: label.toLowerCase(),
          label,
          price,
          capacity,
        });
      }
    }
  }

  return vehicles.length > 0 ? vehicles : null;
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
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showPassengerStepper, setShowPassengerStepper] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Generate date options for next 90 days
  const getDateOptions = () => {
    const options: { value: string; label: string }[] = [];
    const today = new Date();
    for (let i = 0; i < 90; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      const value = date.toISOString().split('T')[0];
      const dayName = date.toLocaleDateString('en-GB', { weekday: 'short' });
      const dateStr = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      let label = `${dayName} ${dateStr}`;
      if (i === 0) label = `Today (${dateStr})`;
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
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

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
        // Parse vehicle options from response text
        const vehicleOptions = parseVehicleOptions(response.response);
        const askingForContact = isAskingForContact(response.response);
        const askingForDate = isAskingForDate(response.response);
        const askingForTime = isAskingForTime(response.response);
        const askingForPassengers = isAskingForPassengers(response.response);

        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: response.response,
          timestamp: new Date().toISOString(),
          vehicleOptions: vehicleOptions || undefined,
          showContactForm: askingForContact,
          showDatePicker: askingForDate,
          showTimePicker: askingForTime,
          showPassengerStepper: askingForPassengers,
        };
        setMessages((prev) => [...prev, assistantMessage]);

        // Show appropriate interactive controls
        if (askingForContact) setShowContactForm(true);
        if (askingForDate) setShowDatePicker(true);
        if (askingForTime) setShowTimePicker(true);
        if (askingForPassengers) setShowPassengerStepper(true);
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

  // Handle quick action buttons
  const handleQuickAction = (action: string) => {
    setInputValue(action);
    setTimeout(() => {
      handleSend();
    }, 50);
  };

  // Handle date selection
  const handleDateSelect = async (dateValue: string) => {
    if (!sessionId) return;
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
        const askingForDate = isAskingForDate(res.response);
        const askingForTime = isAskingForTime(res.response);
        const askingForPassengers = isAskingForPassengers(res.response);
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
        if (askingForTime) setShowTimePicker(true);
        if (askingForPassengers) setShowPassengerStepper(true);
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
        const askingForDate = isAskingForDate(res.response);
        const askingForTime = isAskingForTime(res.response);
        const askingForPassengers = isAskingForPassengers(res.response);
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
        if (askingForDate) setShowDatePicker(true);
        if (askingForPassengers) setShowPassengerStepper(true);
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
        if (askingForDate) setShowDatePicker(true);
        if (askingForTime) setShowTimePicker(true);
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

                {/* Date Picker */}
                {showDatePicker && !isLoading && (
                  <div className="bg-white rounded-xl p-4 shadow-soft space-y-3">
                    <h4 className="font-medium text-navy text-sm">Select Date</h4>
                    <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto">
                      {getDateOptions().slice(0, 14).map((option) => (
                        <button
                          key={option.value}
                          onClick={() => handleDateSelect(option.value)}
                          className="rounded-lg border border-gray-light px-3 py-2 text-sm text-navy text-left transition-all hover:border-sage hover:bg-sage/10 focus:outline-none focus:ring-2 focus:ring-sage"
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                    <div className="pt-2 border-t border-gray-light">
                      <label className="text-xs text-gray mb-1 block">Or pick a specific date:</label>
                      <input
                        type="date"
                        min={new Date().toISOString().split('T')[0]}
                        max={new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                        onChange={(e) => e.target.value && handleDateSelect(e.target.value)}
                        className="w-full rounded-lg border border-gray-light px-3 py-2 text-sm text-navy focus:border-sage focus:outline-none focus:ring-1 focus:ring-sage"
                      />
                    </div>
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

                {/* Quick Action Buttons for Extras */}
                {messages.length > 0 &&
                  messages[messages.length - 1].role === 'assistant' &&
                  messages[messages.length - 1].content.toLowerCase().includes('extras') &&
                  !isLoading && (
                    <div className="flex flex-wrap gap-2 pl-2">
                      <button
                        onClick={() => handleQuickAction('No extras needed, thanks')}
                        className="rounded-full border border-sage px-4 py-1.5 text-sm text-sage transition-all hover:bg-sage hover:text-white"
                      >
                        No extras needed
                      </button>
                      <button
                        onClick={() => handleQuickAction('Yes, I need a child seat')}
                        className="rounded-full border border-sage px-4 py-1.5 text-sm text-sage transition-all hover:bg-sage hover:text-white"
                      >
                        Child seat
                      </button>
                      <button
                        onClick={() => handleQuickAction('Meet and greet please')}
                        className="rounded-full border border-sage px-4 py-1.5 text-sm text-sage transition-all hover:bg-sage hover:text-white"
                      >
                        Meet & Greet
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
                onKeyPress={handleKeyPress}
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
