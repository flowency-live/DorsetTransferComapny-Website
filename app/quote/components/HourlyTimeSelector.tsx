'use client';

import { Calendar, Clock } from 'lucide-react';
import { useEffect, useRef } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

interface HourlyTimeSelectorProps {
  startTime: Date | null;
  duration: number;
  onStartTimeChange: (date: Date) => void;
  onDurationChange: (hours: number) => void;
}

export const MIN_HOURS = 4;
export const MAX_HOURS = 12;

// Generate hour options (1-12) for time picker
const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);

// Generate minute options in 15-minute intervals
const MINUTES = [0, 15, 30, 45];

// Format time for display (e.g., "2:30 PM")
function formatEndTime(startTime: Date, durationHours: number): string {
  const endTime = new Date(startTime);
  endTime.setHours(endTime.getHours() + durationHours);

  const hours = endTime.getHours();
  const minutes = endTime.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  const minuteStr = minutes.toString().padStart(2, '0');

  return `${hour12}:${minuteStr} ${ampm}`;
}

export default function HourlyTimeSelector({
  startTime,
  duration,
  onStartTimeChange,
  onDurationChange,
}: HourlyTimeSelectorProps) {
  const startInputRef = useRef<DatePicker>(null);

  // Default minimum is 24 hours from now for start time
  const minStartDate = new Date();
  minStartDate.setHours(minStartDate.getHours() + 24);

  // Max booking 6 months out
  const maxDate = new Date();
  maxDate.setMonth(maxDate.getMonth() + 6);

  // Set inputMode to none on mount to prevent Android keyboard
  useEffect(() => {
    if (startInputRef.current) {
      const input = (startInputRef.current as unknown as { input: HTMLInputElement }).input;
      if (input) {
        input.setAttribute('inputmode', 'none');
      }
    }
  }, []);

  // Time extraction helpers
  const getHour12 = (date: Date | null) => {
    if (!date) return 9;
    const h = date.getHours();
    if (h === 0) return 12;
    if (h > 12) return h - 12;
    return h;
  };

  const getMinute = (date: Date | null) => {
    if (!date) return 0;
    // Round to nearest 15
    return Math.round(date.getMinutes() / 15) * 15;
  };

  const getAmPm = (date: Date | null): 'AM' | 'PM' => {
    if (!date) return 'AM';
    return date.getHours() >= 12 ? 'PM' : 'AM';
  };

  const handleStartDateChange = (date: Date | null) => {
    if (date) {
      if (startTime) {
        date.setHours(startTime.getHours(), startTime.getMinutes(), 0, 0);
      } else {
        date.setHours(9, 0, 0, 0);
      }
      onStartTimeChange(date);
    }
  };

  const handleStartTimeChange = (hour12: number, minute: number, ampm: 'AM' | 'PM') => {
    const newDate = startTime ? new Date(startTime) : new Date(minStartDate);
    let hour24 = hour12;
    if (ampm === 'AM') {
      hour24 = hour12 === 12 ? 0 : hour12;
    } else {
      hour24 = hour12 === 12 ? 12 : hour12 + 12;
    }
    newDate.setHours(hour24, minute, 0, 0);
    onStartTimeChange(newDate);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.blur();
    e.target.setAttribute('inputmode', 'none');
  };

  return (
    <div className="space-y-5">
      {/* Start Date */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-foreground">Date</h4>
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none z-10">
            <Calendar className="w-5 h-5 text-muted-foreground" />
          </div>
          <DatePicker
            ref={startInputRef}
            selected={startTime}
            onChange={handleStartDateChange}
            dateFormat="EEEE, MMMM d, yyyy"
            minDate={minStartDate}
            maxDate={maxDate}
            placeholderText="Select date"
            onFocus={handleFocus}
            autoComplete="off"
            className="w-full pl-12 pr-4 py-4 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-sage-dark bg-background text-foreground text-base cursor-pointer"
            wrapperClassName="w-full"
            calendarClassName="shadow-2xl"
            calendarStartDay={1}
            withPortal
            portalId="date-picker-portal"
          />
        </div>
      </div>

      {/* Start Time */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-foreground">Start Time</h4>
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          <select
            value={getHour12(startTime)}
            onChange={(e) => handleStartTimeChange(parseInt(e.target.value), getMinute(startTime), getAmPm(startTime))}
            className="flex-1 px-3 py-3 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-sage-dark bg-background text-foreground text-base cursor-pointer appearance-none text-center"
          >
            {HOURS.map((h) => (
              <option key={h} value={h}>{h}</option>
            ))}
          </select>
          <span className="text-lg font-medium text-muted-foreground">:</span>
          <select
            value={getMinute(startTime)}
            onChange={(e) => handleStartTimeChange(getHour12(startTime), parseInt(e.target.value), getAmPm(startTime))}
            className="flex-1 px-3 py-3 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-sage-dark bg-background text-foreground text-base cursor-pointer appearance-none text-center"
          >
            {MINUTES.map((m) => (
              <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>
            ))}
          </select>
          <div className="flex rounded-xl border border-border overflow-hidden">
            <button
              type="button"
              onClick={() => handleStartTimeChange(getHour12(startTime), getMinute(startTime), 'AM')}
              className={`px-3 py-3 text-sm font-medium transition-colors ${
                getAmPm(startTime) === 'AM' ? 'bg-sage-dark text-white' : 'bg-background text-foreground hover:bg-muted'
              }`}
            >
              AM
            </button>
            <button
              type="button"
              onClick={() => handleStartTimeChange(getHour12(startTime), getMinute(startTime), 'PM')}
              className={`px-3 py-3 text-sm font-medium transition-colors ${
                getAmPm(startTime) === 'PM' ? 'bg-sage-dark text-white' : 'bg-background text-foreground hover:bg-muted'
              }`}
            >
              PM
            </button>
          </div>
        </div>
      </div>

      {/* Duration Slider with End Time Display */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-foreground">Duration</h4>
          {startTime && (
            <span className="text-sm text-muted-foreground">
              Ends at <span className="font-semibold text-sage-dark">{formatEndTime(startTime, duration)}</span>
            </span>
          )}
        </div>

        {/* Duration display and slider */}
        <div className="bg-sage-dark/5 rounded-xl p-4 border border-sage-dark/10">
          <div className="flex items-center justify-between mb-3">
            <span className="text-2xl font-bold text-sage-dark">{duration} hours</span>
            <div className="flex gap-1">
              {[4, 6, 8, 10, 12].map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => onDurationChange(h)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                    duration === h
                      ? 'bg-sage-dark text-white'
                      : 'bg-white text-foreground hover:bg-sage-dark/10 border border-border'
                  }`}
                >
                  {h}h
                </button>
              ))}
            </div>
          </div>

          {/* Slider */}
          <div className="relative">
            <input
              type="range"
              min={MIN_HOURS}
              max={MAX_HOURS}
              value={duration}
              onChange={(e) => onDurationChange(parseInt(e.target.value))}
              className="w-full h-3 rounded-full appearance-none cursor-pointer bg-sage-dark/20
                [&::-webkit-slider-thumb]:appearance-none
                [&::-webkit-slider-thumb]:w-6
                [&::-webkit-slider-thumb]:h-6
                [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:bg-sage-dark
                [&::-webkit-slider-thumb]:shadow-lg
                [&::-webkit-slider-thumb]:cursor-pointer
                [&::-moz-range-thumb]:w-6
                [&::-moz-range-thumb]:h-6
                [&::-moz-range-thumb]:rounded-full
                [&::-moz-range-thumb]:bg-sage-dark
                [&::-moz-range-thumb]:border-0
                [&::-moz-range-thumb]:cursor-pointer"
              style={{
                background: `linear-gradient(to right, #8fb894 0%, #8fb894 ${((duration - MIN_HOURS) / (MAX_HOURS - MIN_HOURS)) * 100}%, rgba(143, 184, 148, 0.2) ${((duration - MIN_HOURS) / (MAX_HOURS - MIN_HOURS)) * 100}%, rgba(143, 184, 148, 0.2) 100%)`
              }}
            />
            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
              <span>{MIN_HOURS}h</span>
              <span>{MAX_HOURS}h</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
