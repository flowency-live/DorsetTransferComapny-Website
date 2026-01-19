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

  // Focus trap and keyboard navigation when calendar opens
  useEffect(() => {
    if (!isOpen) return;

    const setupFocusTrap = () => {
      const portal = document.getElementById('date-picker-portal');
      if (!portal) return;

      // Find the calendar container within the portal
      const calendarContainer = portal.querySelector('.react-datepicker') as HTMLElement;
      if (!calendarContainer) return;

      // Make the calendar container focusable and focus it
      calendarContainer.setAttribute('tabindex', '-1');
      calendarContainer.focus();

      // Add tabindex to all day buttons so they're focusable
      const dayButtons = portal.querySelectorAll('.react-datepicker__day:not(.react-datepicker__day--disabled)');
      dayButtons.forEach((day) => {
        day.setAttribute('tabindex', '0');
      });

      // Add tabindex to time list items
      const timeItems = portal.querySelectorAll('.react-datepicker__time-list-item:not(.react-datepicker__time-list-item--disabled)');
      timeItems.forEach((item) => {
        item.setAttribute('tabindex', '0');
      });

      // Add tabindex to navigation buttons
      const navButtons = portal.querySelectorAll('.react-datepicker__navigation');
      navButtons.forEach((btn) => {
        btn.setAttribute('tabindex', '0');
      });

      // Focus the selected day, today, or first available day
      const selectedDay = portal.querySelector('.react-datepicker__day--selected') as HTMLElement;
      const todayDay = portal.querySelector('.react-datepicker__day--today:not(.react-datepicker__day--disabled)') as HTMLElement;
      const firstDay = portal.querySelector('.react-datepicker__day:not(.react-datepicker__day--disabled)') as HTMLElement;

      const dayToFocus = selectedDay || todayDay || firstDay;
      if (dayToFocus) {
        dayToFocus.focus();
      }
    };

    // Wait for portal to render
    const timer = setTimeout(setupFocusTrap, 50);

    // Also set up a mutation observer to handle month changes
    const portal = document.getElementById('date-picker-portal');
    let observer: MutationObserver | null = null;

    if (portal) {
      observer = new MutationObserver(() => {
        // Re-apply tabindex when calendar content changes (e.g., month navigation)
        const dayButtons = portal.querySelectorAll('.react-datepicker__day:not(.react-datepicker__day--disabled)');
        dayButtons.forEach((day) => {
          if (!day.hasAttribute('tabindex')) {
            day.setAttribute('tabindex', '0');
          }
        });
      });

      observer.observe(portal, { childList: true, subtree: true });
    }

    return () => {
      clearTimeout(timer);
      if (observer) observer.disconnect();
    };
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
