'use client';

import { Calendar } from 'lucide-react';
import { useEffect, useRef, useCallback, useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

interface DateTimePickerProps {
  selectedDate: Date | null;
  onChange: (date: Date) => void;
  error?: string;
}

export default function DateTimePicker({ selectedDate, onChange, error }: DateTimePickerProps) {
  const inputRef = useRef<DatePicker>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const minDate = new Date();
  minDate.setHours(minDate.getHours() + 24); // Minimum 24 hours from now

  const maxDate = new Date();
  maxDate.setMonth(maxDate.getMonth() + 6); // Maximum 6 months in advance

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile('ontouchstart' in window || navigator.maxTouchPoints > 0);
    };
    checkMobile();
  }, []);

  // Set inputMode to none on mount to prevent Android keyboard (mobile only)
  useEffect(() => {
    if (inputRef.current && isMobile) {
      const input = (inputRef.current as unknown as { input: HTMLInputElement }).input;
      if (input) {
        input.setAttribute('inputmode', 'none');
      }
    }
  }, [isMobile]);

  // Focus the calendar when it opens for keyboard navigation
  useEffect(() => {
    if (isOpen) {
      // Give the portal time to render, then focus the calendar
      const timer = setTimeout(() => {
        const calendar = document.querySelector('.react-datepicker__month-container');
        const selectedDay = document.querySelector('.react-datepicker__day--selected') as HTMLElement;
        const todayDay = document.querySelector('.react-datepicker__day--today') as HTMLElement;
        const firstSelectableDay = document.querySelector('.react-datepicker__day:not(.react-datepicker__day--disabled)') as HTMLElement;

        // Focus the selected day, or today, or the first available day
        const dayToFocus = selectedDay || todayDay || firstSelectableDay;
        if (dayToFocus) {
          dayToFocus.focus();
        } else if (calendar) {
          (calendar as HTMLElement).focus();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleChange = (date: Date | null) => {
    if (date) {
      onChange(date);
    }
  };

  // Filter out times that would be less than 24 hours from now
  const filterPassedTime = (time: Date) => {
    const now = new Date();
    const minDateTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now
    return time.getTime() >= minDateTime.getTime();
  };

  // Prevent mobile keyboard from appearing while still allowing picker to open
  // Only blur on mobile devices to preserve keyboard navigation on desktop
  const handleFocus = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    if (isMobile) {
      e.target.blur();
      e.target.setAttribute('inputmode', 'none');
    }
  }, [isMobile]);

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-foreground">
        Pickup Date & Time *
      </label>
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none z-10">
          <Calendar className="w-5 h-5 text-muted-foreground" />
        </div>
        <DatePicker
          ref={inputRef}
          selected={selectedDate}
          onChange={handleChange}
          showTimeSelect
          timeIntervals={30}
          timeCaption="Time"
          dateFormat="MMMM d, yyyy h:mm aa"
          minDate={minDate}
          maxDate={maxDate}
          filterTime={filterPassedTime}
          placeholderText="Select pickup date and time"
          onFocus={handleFocus}
          onCalendarOpen={() => setIsOpen(true)}
          onCalendarClose={() => setIsOpen(false)}
          autoComplete="off"
          className={`w-full pl-12 pr-4 py-3 rounded-xl border ${
            error ? 'border-error' : 'border-border'
          } focus:outline-none focus:ring-2 focus:ring-sage-dark bg-background text-foreground`}
          wrapperClassName="w-full"
          calendarClassName="shadow-2xl"
          calendarStartDay={1}
          withPortal
          portalId="date-picker-portal"
        />
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
