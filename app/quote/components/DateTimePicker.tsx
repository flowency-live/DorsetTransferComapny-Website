'use client';

import { Calendar, Clock, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useRef, useCallback, useState } from 'react';
import { DayPicker } from 'react-day-picker';
import { format, addMonths, addHours, isBefore } from 'date-fns';

interface DateTimePickerProps {
  selectedDate: Date | null;
  onChange: (date: Date) => void;
  error?: string;
  label?: string;
  minDate?: Date;
}

// Generate hour options (1-12)
const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);

// Generate minute options in 30-minute intervals
const MINUTES = [0, 30];

export default function DateTimePicker({
  selectedDate,
  onChange,
  error,
  label = 'Pickup Date & Time',
  minDate: propMinDate,
}: DateTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Default minimum is 24 hours from now
  const defaultMinDate = new Date();
  defaultMinDate.setHours(defaultMinDate.getHours() + 24);

  // Use prop minDate if provided, otherwise use default (24h from now)
  const minDate = propMinDate || defaultMinDate;

  const maxDate = addMonths(new Date(), 6); // Maximum 6 months in advance

  // Extract time components from selectedDate
  const getHour12 = () => {
    if (!selectedDate) return 9;
    const h = selectedDate.getHours();
    if (h === 0) return 12;
    if (h > 12) return h - 12;
    return h;
  };

  const getMinute = () => {
    if (!selectedDate) return 0;
    return selectedDate.getMinutes() >= 30 ? 30 : 0;
  };

  const getAmPm = (): 'AM' | 'PM' => {
    if (!selectedDate) return 'AM';
    return selectedDate.getHours() >= 12 ? 'PM' : 'AM';
  };

  // Handle date selection from calendar
  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      const newDate = new Date(date);
      // Preserve existing time if set, otherwise default to 9 AM
      if (selectedDate) {
        newDate.setHours(selectedDate.getHours(), selectedDate.getMinutes(), 0, 0);
      } else {
        newDate.setHours(9, 0, 0, 0);
      }
      onChange(newDate);
    }
  };

  // Handle time changes
  const handleTimeChange = (hour12: number, minute: number, ampm: 'AM' | 'PM') => {
    let newDate: Date;
    if (selectedDate) {
      newDate = new Date(selectedDate);
    } else {
      newDate = new Date(minDate);
    }

    // Convert 12-hour to 24-hour
    let hour24 = hour12;
    if (ampm === 'AM') {
      hour24 = hour12 === 12 ? 0 : hour12;
    } else {
      hour24 = hour12 === 12 ? 12 : hour12 + 12;
    }

    newDate.setHours(hour24, minute, 0, 0);
    onChange(newDate);
  };

  // Check if a time slot is valid (at least 24 hours from now)
  const isTimeValid = (hour12: number, minute: number, ampm: 'AM' | 'PM'): boolean => {
    if (!selectedDate) return true;

    const testDate = new Date(selectedDate);
    let hour24 = hour12;
    if (ampm === 'AM') {
      hour24 = hour12 === 12 ? 0 : hour12;
    } else {
      hour24 = hour12 === 12 ? 12 : hour12 + 12;
    }
    testDate.setHours(hour24, minute, 0, 0);

    const minDateTime = addHours(new Date(), 24);
    return !isBefore(testDate, minDateTime);
  };

  // Close modal
  const closeModal = useCallback(() => {
    setIsOpen(false);
    triggerRef.current?.focus();
  }, []);

  // Handle escape key and focus trap
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeModal();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    // Focus the modal when it opens
    modalRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, closeModal]);

  // Disable date if before minDate
  const isDateDisabled = (date: Date): boolean => {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const minDay = new Date(minDate);
    minDay.setHours(0, 0, 0, 0);
    return isBefore(startOfDay, minDay);
  };

  // Format the display value
  const displayValue = selectedDate
    ? format(selectedDate, "MMMM d, yyyy 'at' h:mm a")
    : 'Select pickup date and time';

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-foreground">
        {label} *
      </label>

      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(true)}
        className={`w-full flex items-center gap-3 pl-4 pr-4 py-3 rounded-xl border ${
          error ? 'border-error' : 'border-border'
        } focus:outline-none focus:ring-2 focus:ring-sage-dark bg-background text-foreground text-left`}
      >
        <Calendar className="w-5 h-5 text-muted-foreground flex-shrink-0" />
        <span className={selectedDate ? 'text-foreground' : 'text-muted-foreground'}>
          {displayValue}
        </span>
      </button>

      {error && (
        <p className="text-sm text-error">{error}</p>
      )}
      <p className="text-xs text-muted-foreground">
        Bookings must be made at least 24 hours in advance
      </p>

      {/* Modal Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div
            ref={modalRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label="Select date and time"
            className="relative bg-card rounded-2xl shadow-floating w-full max-w-sm mx-4 p-4 max-h-[90vh] overflow-y-auto focus:outline-none"
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={closeModal}
              className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-muted transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>

            {/* Calendar */}
            <div className="mb-4">
              <DayPicker
                mode="single"
                selected={selectedDate || undefined}
                onSelect={handleDateSelect}
                disabled={isDateDisabled}
                startMonth={minDate}
                endMonth={maxDate}
                weekStartsOn={1}
                showOutsideDays
                classNames={{
                  root: 'w-full',
                  months: 'flex flex-col',
                  month: 'space-y-4',
                  month_caption: 'flex justify-center pt-1 relative items-center mb-4',
                  caption_label: 'text-base font-semibold text-foreground',
                  nav: 'absolute inset-x-0 flex justify-between',
                  button_previous: 'h-8 w-8 bg-transparent p-0 hover:bg-sage-lighter rounded-lg flex items-center justify-center transition-colors absolute left-1',
                  button_next: 'h-8 w-8 bg-transparent p-0 hover:bg-sage-lighter rounded-lg flex items-center justify-center transition-colors absolute right-1',
                  month_grid: 'w-full border-collapse',
                  weekdays: 'flex justify-between',
                  weekday: 'text-muted-foreground font-medium text-xs w-10 text-center',
                  week: 'flex w-full mt-1 justify-between',
                  day: 'text-center text-sm relative p-0',
                  day_button: 'h-10 w-10 p-0 font-normal rounded-lg hover:bg-sage-lighter transition-colors flex items-center justify-center cursor-pointer',
                  selected: 'bg-sage-dark text-white hover:bg-sage-dark',
                  today: 'font-bold text-sage-dark',
                  outside: 'text-muted-foreground opacity-50',
                  disabled: 'text-muted-foreground opacity-40 cursor-not-allowed hover:bg-transparent',
                  hidden: 'invisible',
                }}
                components={{
                  Chevron: ({ orientation }) => (
                    orientation === 'left'
                      ? <ChevronLeft className="h-5 w-5" />
                      : <ChevronRight className="h-5 w-5" />
                  ),
                }}
              />
            </div>

            {/* Time Selector */}
            <div className="border-t border-border pt-4">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Time</span>
              </div>

              <div className="flex items-center gap-2">
                {/* Hour */}
                <select
                  value={getHour12()}
                  onChange={(e) => handleTimeChange(parseInt(e.target.value), getMinute(), getAmPm())}
                  className="flex-1 px-3 py-3 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-sage-dark bg-background text-foreground text-base cursor-pointer appearance-none text-center"
                >
                  {HOURS.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>

                <span className="text-lg font-medium text-muted-foreground">:</span>

                {/* Minute */}
                <select
                  value={getMinute()}
                  onChange={(e) => handleTimeChange(getHour12(), parseInt(e.target.value), getAmPm())}
                  className="flex-1 px-3 py-3 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-sage-dark bg-background text-foreground text-base cursor-pointer appearance-none text-center"
                >
                  {MINUTES.map((m) => (
                    <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>
                  ))}
                </select>

                {/* AM/PM */}
                <div className="flex rounded-xl border border-border overflow-hidden">
                  <button
                    type="button"
                    onClick={() => handleTimeChange(getHour12(), getMinute(), 'AM')}
                    className={`px-4 py-3 text-sm font-medium transition-colors ${
                      getAmPm() === 'AM'
                        ? 'bg-sage-dark text-white'
                        : 'bg-background text-foreground hover:bg-muted'
                    }`}
                  >
                    AM
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTimeChange(getHour12(), getMinute(), 'PM')}
                    className={`px-4 py-3 text-sm font-medium transition-colors ${
                      getAmPm() === 'PM'
                        ? 'bg-sage-dark text-white'
                        : 'bg-background text-foreground hover:bg-muted'
                    }`}
                  >
                    PM
                  </button>
                </div>
              </div>

              {/* Time validation warning */}
              {selectedDate && !isTimeValid(getHour12(), getMinute(), getAmPm()) && (
                <p className="text-xs text-error mt-2">
                  Selected time must be at least 24 hours from now
                </p>
              )}
            </div>

            {/* Confirm Button */}
            <button
              type="button"
              onClick={closeModal}
              className="w-full mt-4 py-3 bg-sage-dark text-white font-medium rounded-xl hover:bg-sage transition-colors focus:outline-none focus:ring-2 focus:ring-sage-dark focus:ring-offset-2"
            >
              Confirm
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
