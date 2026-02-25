'use client';

import { Calendar, Clock, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useRef, useCallback, useState } from 'react';
import { DayPicker } from 'react-day-picker';
import { format, addMonths, isBefore } from 'date-fns';

interface DateTimePickerMobileProps {
  selectedDate: Date | null;
  onChange: (date: Date) => void;
  error?: string;
  label?: string;
  minDate?: Date;
}

// Generate hour options (1-12)
const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);

// Generate minute options in 5-minute intervals
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

export default function DateTimePickerMobile({
  selectedDate,
  onChange,
  error,
  label = 'Pickup Date & Time',
  minDate: propMinDate,
}: DateTimePickerMobileProps) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Default minimum is 24 hours from now
  const defaultMinDate = new Date();
  defaultMinDate.setHours(defaultMinDate.getHours() + 24);

  // Use prop minDate if provided, otherwise use default (24h from now)
  const minDate = propMinDate || defaultMinDate;

  const maxDate = addMonths(new Date(), 6);

  // Extract time components from selectedDate
  // Default to 9:00 AM when no date selected (typical pickup time)
  const getHour12 = () => {
    if (!selectedDate) return 9; // Default to 9 AM
    const h = selectedDate.getHours();
    if (h === 0) return 12;
    if (h > 12) return h - 12;
    return h;
  };

  const getMinute = () => {
    if (!selectedDate) return 0;
    return Math.floor(selectedDate.getMinutes() / 5) * 5;
  };

  const getAmPm = (): 'AM' | 'PM' => {
    if (!selectedDate) return 'AM'; // Always default to AM
    return selectedDate.getHours() >= 12 ? 'PM' : 'AM';
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      // Preserve existing time if set, otherwise default to 9 AM
      if (selectedDate) {
        date.setHours(selectedDate.getHours(), selectedDate.getMinutes(), 0, 0);
      } else {
        date.setHours(9, 0, 0, 0); // 9 AM - sensible default for pickup
      }
      onChange(date);
      setIsCalendarOpen(false);
    }
  };

  const handleTimeChange = (hour12: number, minute: number, ampm: 'AM' | 'PM') => {
    // If no date selected yet, create a new date starting from minDate but with 9 AM default
    let newDate: Date;
    if (selectedDate) {
      newDate = new Date(selectedDate);
    } else {
      // Use minDate for the date portion but default to 9 AM (not system time)
      newDate = new Date(minDate);
      newDate.setHours(9, 0, 0, 0); // Start with 9 AM, user's selection will override
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

  // Close modal
  const closeModal = useCallback(() => {
    setIsCalendarOpen(false);
    triggerRef.current?.focus();
  }, []);

  // Handle escape key and focus trap
  useEffect(() => {
    if (!isCalendarOpen) return;

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
  }, [isCalendarOpen, closeModal]);

  // Disable date if before minDate
  const isDateDisabled = (date: Date): boolean => {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const minDay = new Date(minDate);
    minDay.setHours(0, 0, 0, 0);
    return isBefore(startOfDay, minDay);
  };

  // Format the display value for the date button
  const displayValue = selectedDate
    ? format(selectedDate, 'EEEE, MMMM d, yyyy')
    : 'Tap to select date';

  return (
    <div className="space-y-4">
      {/* Date Picker - Button that opens calendar modal */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-foreground">
          {label.includes('Date') ? label : `${label} Date`} *
        </label>
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setIsCalendarOpen(true)}
          className={`w-full flex items-center gap-3 pl-4 pr-4 py-4 rounded-xl border ${
            error ? 'border-error' : 'border-border'
          } focus:outline-none focus:ring-2 focus:ring-sage-dark bg-background text-foreground text-base text-left cursor-pointer`}
        >
          <Calendar className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          <span className={selectedDate ? 'text-foreground' : 'text-muted-foreground'}>
            {displayValue}
          </span>
        </button>
      </div>

      {/* Calendar Modal */}
      {isCalendarOpen && (
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
            aria-label="Select date"
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
                root: 'w-full pt-6',
                months: 'flex flex-col',
                month: 'space-y-4',
                month_caption: 'flex justify-center pt-1 relative items-center mb-4',
                caption_label: 'text-base font-semibold text-foreground',
                nav: 'absolute inset-x-0 flex justify-between',
                button_previous: 'h-8 w-8 bg-transparent p-0 hover:bg-sage-lighter rounded-lg flex items-center justify-center transition-colors absolute left-0',
                button_next: 'h-8 w-8 bg-transparent p-0 hover:bg-sage-lighter rounded-lg flex items-center justify-center transition-colors absolute right-0',
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
        </div>
      )}

      {/* Time Picker - Hour / Minute / AM-PM (remains on page) */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-foreground">
          Time *
        </label>
        <div className="flex items-center gap-2">
          <div className="flex-shrink-0">
            <Clock className="w-5 h-5 text-muted-foreground" />
          </div>

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
      </div>

      {error && (
        <p className="text-sm text-error">{error}</p>
      )}
      <p className="text-xs text-muted-foreground">
        Bookings must be made at least 24 hours in advance
      </p>
    </div>
  );
}
