// Time-based Pricing Configuration
// Contains pricing rules based on time factors (peak hours, weekends, holidays)

// Days of the week for easier reference
export enum DayOfWeek {
  SUNDAY = 0,
  MONDAY = 1,
  TUESDAY = 2,
  WEDNESDAY = 3,
  THURSDAY = 4,
  FRIDAY = 5,
  SATURDAY = 6,
}

// Time slot type for defining specific time periods
export interface TimeSlot {
  startHour: number; // 24-hour format (0-23)
  endHour: number; // 24-hour format (0-23)
}

// Day and time slot combination
export interface DayTimeSlot {
  days: DayOfWeek[];
  timeSlots: TimeSlot[];
}

// Holiday definition
export interface Holiday {
  name: string;
  month: number; // 1-12
  day: number; // 1-31
  fixedDate: boolean; // If true, the holiday is on the same date each year
  year?: number; // Optional specific year for non-fixed holidays
}

// Pricing multipliers for different time periods
export interface TimeMultipliers {
  standard: number; // Base multiplier (usually 1.0)
  weekdayPeak: number; // Weekday peak hours
  weekdayOffPeak: number; // Weekday off-peak hours
  weekendPeak: number; // Weekend peak hours
  weekendStandard: number; // Weekend standard hours
  holiday: number; // Holiday multiplier
}

// Pricing surcharges for different time periods
export interface TimeSurcharges {
  weekdayPeak: number; // Weekday peak hours surcharge
  weekdayOffPeak: number; // Weekday off-peak hours surcharge
  weekendPeak: number; // Weekend peak hours surcharge
  weekendStandard: number; // Weekend standard hours surcharge
  holiday: number; // Holiday surcharge
}

// Define peak hours for weekdays
export const WEEKDAY_PEAK_HOURS: TimeSlot[] = [
  { startHour: 7, endHour: 10 }, // Morning peak: 7am-10am
  { startHour: 16, endHour: 19 }, // Evening peak: 4pm-7pm
];

// Define peak hours for weekends
export const WEEKEND_PEAK_HOURS: TimeSlot[] = [
  { startHour: 10, endHour: 14 }, // Late morning: 10am-2pm
  { startHour: 17, endHour: 22 }, // Evening: 5pm-10pm
];

// Define weekday peak periods
export const WEEKDAY_PEAK: DayTimeSlot = {
  days: [
    DayOfWeek.MONDAY,
    DayOfWeek.TUESDAY,
    DayOfWeek.WEDNESDAY,
    DayOfWeek.THURSDAY,
    DayOfWeek.FRIDAY,
  ],
  timeSlots: WEEKDAY_PEAK_HOURS,
};

// Define weekend peak periods
export const WEEKEND_PEAK: DayTimeSlot = {
  days: [DayOfWeek.SATURDAY, DayOfWeek.SUNDAY],
  timeSlots: WEEKEND_PEAK_HOURS,
};

// Define weekend days (including Friday evening)
export const WEEKEND_DAYS: DayTimeSlot = {
  days: [DayOfWeek.FRIDAY, DayOfWeek.SATURDAY, DayOfWeek.SUNDAY],
  timeSlots: [
    { startHour: 18, endHour: 24 }, // Friday evening from 6pm
    { startHour: 0, endHour: 24 }, // All day Saturday and Sunday
  ],
};

// Define UK holidays for current year
export const UK_HOLIDAYS: Holiday[] = [
  // New Year's Day
  { name: "New Year's Day", month: 1, day: 1, fixedDate: true },

  // Easter holidays (approximate - these change each year)
  {
    name: "Good Friday",
    month: 4,
    day: 7,
    fixedDate: false,
    year: new Date().getFullYear(),
  },
  {
    name: "Easter Monday",
    month: 4,
    day: 10,
    fixedDate: false,
    year: new Date().getFullYear(),
  },

  // Early May Bank Holiday
  { name: "Early May Bank Holiday", month: 5, day: 1, fixedDate: true },

  // Spring Bank Holiday
  {
    name: "Spring Bank Holiday",
    month: 5,
    day: 29,
    fixedDate: false,
    year: new Date().getFullYear(),
  },

  // Summer Bank Holiday
  {
    name: "Summer Bank Holiday",
    month: 8,
    day: 28,
    fixedDate: false,
    year: new Date().getFullYear(),
  },

  // Christmas holidays
  { name: "Christmas Day", month: 12, day: 25, fixedDate: true },
  { name: "Boxing Day", month: 12, day: 26, fixedDate: true },
];

// Define pricing multipliers
export const DEFAULT_MULTIPLIERS: TimeMultipliers = {
  standard: 1.0, // Base rate (no multiplier)
  weekdayPeak: 1.5, // 50% increase during peak hours
  weekdayOffPeak: 1.0, // No increase during off-peak
  weekendPeak: 1.3, // 30% increase during weekend peaks
  weekendStandard: 1.2, // 20% increase on weekends
  holiday: 1.5, // 50% increase on holidays
};

// Define pricing surcharges
export const DEFAULT_SURCHARGES: TimeSurcharges = {
  weekdayPeak: 3.54, // £3.54 additional during peak weekday
  weekdayOffPeak: 0, // No additional charge
  weekendPeak: 5.0, // £5.00 additional during peak weekend hours
  weekendStandard: 3.0, // £3.00 additional on standard weekend hours
  holiday: 5.0, // £5.00 additional on holidays
};

/**
 * Checks if a given date is a holiday
 * @param date The date to check
 * @returns Boolean indicating if the date is a holiday
 */
export function isHoliday(date: Date): boolean {
  const day = date.getDate();
  const month = date.getMonth() + 1; // JavaScript months are 0-indexed
  const year = date.getFullYear();

  for (const holiday of UK_HOLIDAYS) {
    if (holiday.month === month && holiday.day === day) {
      // For fixed date holidays
      if (holiday.fixedDate) {
        return true;
      }
      // For non-fixed holidays, check the year too
      else if (holiday.year === year) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Checks if a given date falls on a weekend
 * @param date The date to check
 * @returns Boolean indicating if the date is a weekend
 */
export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  const hour = date.getHours();

  // Saturday or Sunday
  if (day === DayOfWeek.SATURDAY || day === DayOfWeek.SUNDAY) {
    return true;
  }

  // Friday evening (after 6pm)
  if (day === DayOfWeek.FRIDAY && hour >= 18) {
    return true;
  }

  return false;
}

/**
 * Checks if a given date falls within peak hours
 * @param date The date to check
 * @returns Boolean indicating if the date is during peak hours
 */
export function isPeakHour(date: Date): boolean {
  const day = date.getDay();
  const hour = date.getHours();

  // Check weekday peak hours
  if (
    [
      DayOfWeek.MONDAY,
      DayOfWeek.TUESDAY,
      DayOfWeek.WEDNESDAY,
      DayOfWeek.THURSDAY,
      DayOfWeek.FRIDAY,
    ].includes(day)
  ) {
    for (const slot of WEEKDAY_PEAK_HOURS) {
      if (hour >= slot.startHour && hour < slot.endHour) {
        return true;
      }
    }
  }

  // Check weekend peak hours
  if (day === DayOfWeek.SATURDAY || day === DayOfWeek.SUNDAY) {
    for (const slot of WEEKEND_PEAK_HOURS) {
      if (hour >= slot.startHour && hour < slot.endHour) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Gets the time-based multiplier for a given date
 * @param date The date to get the multiplier for
 * @returns The applicable multiplier for the given date and time
 */
export function getTimeMultiplier(date: Date): number {
  // Check holidays first
  if (isHoliday(date)) {
    return DEFAULT_MULTIPLIERS.holiday;
  }

  // Check weekend status
  const weekend = isWeekend(date);
  const peak = isPeakHour(date);

  if (weekend) {
    return peak
      ? DEFAULT_MULTIPLIERS.weekendPeak
      : DEFAULT_MULTIPLIERS.weekendStandard;
  }

  return peak
    ? DEFAULT_MULTIPLIERS.weekdayPeak
    : DEFAULT_MULTIPLIERS.weekdayOffPeak;
}

/**
 * Gets the time-based surcharge for a given date
 * @param date The date to get the surcharge for
 * @returns The applicable surcharge for the given date and time
 */
export function getTimeSurcharge(date: Date): number {
  // Check holidays first
  if (isHoliday(date)) {
    return DEFAULT_SURCHARGES.holiday;
  }

  // Check weekend status
  const weekend = isWeekend(date);
  const peak = isPeakHour(date);

  if (weekend) {
    return peak
      ? DEFAULT_SURCHARGES.weekendPeak
      : DEFAULT_SURCHARGES.weekendStandard;
  }

  return peak
    ? DEFAULT_SURCHARGES.weekdayPeak
    : DEFAULT_SURCHARGES.weekdayOffPeak;
}

/**
 * Updates the holiday list for a specific year
 * @param year The year to update holidays for
 * @param holidayUpdates The updated holiday list
 */
export function updateHolidays(year: number, holidayUpdates: Holiday[]): void {
  // Filter out non-fixed holidays from the current year
  const fixedHolidays = UK_HOLIDAYS.filter((h) => h.fixedDate);

  // Add the updated holidays for the specified year
  const yearSpecificHolidays = holidayUpdates.map((h) => ({
    ...h,
    year: year,
  }));

  // Combine fixed and year-specific holidays
  UK_HOLIDAYS.length = 0; // Clear the array
  UK_HOLIDAYS.push(...fixedHolidays, ...yearSpecificHolidays);
}
