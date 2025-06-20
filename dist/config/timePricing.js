"use strict";
// Time-based Pricing Configuration
// Contains pricing rules based on time factors (peak hours, weekends, holidays)
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_SURCHARGES = exports.DEFAULT_MULTIPLIERS = exports.UK_HOLIDAYS = exports.WEEKEND_DAYS = exports.WEEKEND_PEAK = exports.WEEKDAY_PEAK = exports.WEEKEND_PEAK_HOURS = exports.WEEKDAY_PEAK_HOURS = exports.DayOfWeek = void 0;
exports.isHoliday = isHoliday;
exports.isWeekend = isWeekend;
exports.isPeakHour = isPeakHour;
exports.getTimeMultiplier = getTimeMultiplier;
exports.getTimeSurcharge = getTimeSurcharge;
exports.updateHolidays = updateHolidays;
// Days of the week for easier reference
var DayOfWeek;
(function (DayOfWeek) {
    DayOfWeek[DayOfWeek["SUNDAY"] = 0] = "SUNDAY";
    DayOfWeek[DayOfWeek["MONDAY"] = 1] = "MONDAY";
    DayOfWeek[DayOfWeek["TUESDAY"] = 2] = "TUESDAY";
    DayOfWeek[DayOfWeek["WEDNESDAY"] = 3] = "WEDNESDAY";
    DayOfWeek[DayOfWeek["THURSDAY"] = 4] = "THURSDAY";
    DayOfWeek[DayOfWeek["FRIDAY"] = 5] = "FRIDAY";
    DayOfWeek[DayOfWeek["SATURDAY"] = 6] = "SATURDAY";
})(DayOfWeek || (exports.DayOfWeek = DayOfWeek = {}));
// Define peak hours for weekdays
exports.WEEKDAY_PEAK_HOURS = [
    { startHour: 7, endHour: 10 }, // Morning peak: 7am-10am
    { startHour: 16, endHour: 19 }, // Evening peak: 4pm-7pm
];
// Define peak hours for weekends
exports.WEEKEND_PEAK_HOURS = [
    { startHour: 10, endHour: 14 }, // Late morning: 10am-2pm
    { startHour: 17, endHour: 22 }, // Evening: 5pm-10pm
];
// Define weekday peak periods
exports.WEEKDAY_PEAK = {
    days: [
        DayOfWeek.MONDAY,
        DayOfWeek.TUESDAY,
        DayOfWeek.WEDNESDAY,
        DayOfWeek.THURSDAY,
        DayOfWeek.FRIDAY,
    ],
    timeSlots: exports.WEEKDAY_PEAK_HOURS,
};
// Define weekend peak periods
exports.WEEKEND_PEAK = {
    days: [DayOfWeek.SATURDAY, DayOfWeek.SUNDAY],
    timeSlots: exports.WEEKEND_PEAK_HOURS,
};
// Define weekend days (including Friday evening)
exports.WEEKEND_DAYS = {
    days: [DayOfWeek.FRIDAY, DayOfWeek.SATURDAY, DayOfWeek.SUNDAY],
    timeSlots: [
        { startHour: 18, endHour: 24 }, // Friday evening from 6pm
        { startHour: 0, endHour: 24 }, // All day Saturday and Sunday
    ],
};
// Define UK holidays for current year
exports.UK_HOLIDAYS = [
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
exports.DEFAULT_MULTIPLIERS = {
    standard: 1.0, // Base rate (no multiplier)
    weekdayPeak: 1.5, // 50% increase during peak hours
    weekdayOffPeak: 1.0, // No increase during off-peak
    weekendPeak: 1.3, // 30% increase during weekend peaks
    weekendStandard: 1.2, // 20% increase on weekends
    holiday: 1.5, // 50% increase on holidays
};
// Define pricing surcharges
exports.DEFAULT_SURCHARGES = {
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
function isHoliday(date) {
    const day = date.getDate();
    const month = date.getMonth() + 1; // JavaScript months are 0-indexed
    const year = date.getFullYear();
    for (const holiday of exports.UK_HOLIDAYS) {
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
function isWeekend(date) {
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
function isPeakHour(date) {
    const day = date.getDay();
    const hour = date.getHours();
    // Check weekday peak hours
    if ([
        DayOfWeek.MONDAY,
        DayOfWeek.TUESDAY,
        DayOfWeek.WEDNESDAY,
        DayOfWeek.THURSDAY,
        DayOfWeek.FRIDAY,
    ].includes(day)) {
        for (const slot of exports.WEEKDAY_PEAK_HOURS) {
            if (hour >= slot.startHour && hour < slot.endHour) {
                return true;
            }
        }
    }
    // Check weekend peak hours
    if (day === DayOfWeek.SATURDAY || day === DayOfWeek.SUNDAY) {
        for (const slot of exports.WEEKEND_PEAK_HOURS) {
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
function getTimeMultiplier(date) {
    // Check holidays first
    if (isHoliday(date)) {
        return exports.DEFAULT_MULTIPLIERS.holiday;
    }
    // Check weekend status
    const weekend = isWeekend(date);
    const peak = isPeakHour(date);
    if (weekend) {
        return peak
            ? exports.DEFAULT_MULTIPLIERS.weekendPeak
            : exports.DEFAULT_MULTIPLIERS.weekendStandard;
    }
    return peak
        ? exports.DEFAULT_MULTIPLIERS.weekdayPeak
        : exports.DEFAULT_MULTIPLIERS.weekdayOffPeak;
}
/**
 * Gets the time-based surcharge for a given date
 * @param date The date to get the surcharge for
 * @returns The applicable surcharge for the given date and time
 */
function getTimeSurcharge(date) {
    // Check holidays first
    if (isHoliday(date)) {
        return exports.DEFAULT_SURCHARGES.holiday;
    }
    // Check weekend status
    const weekend = isWeekend(date);
    const peak = isPeakHour(date);
    if (weekend) {
        return peak
            ? exports.DEFAULT_SURCHARGES.weekendPeak
            : exports.DEFAULT_SURCHARGES.weekendStandard;
    }
    return peak
        ? exports.DEFAULT_SURCHARGES.weekdayPeak
        : exports.DEFAULT_SURCHARGES.weekdayOffPeak;
}
/**
 * Updates the holiday list for a specific year
 * @param year The year to update holidays for
 * @param holidayUpdates The updated holiday list
 */
function updateHolidays(year, holidayUpdates) {
    // Filter out non-fixed holidays from the current year
    const fixedHolidays = exports.UK_HOLIDAYS.filter((h) => h.fixedDate);
    // Add the updated holidays for the specified year
    const yearSpecificHolidays = holidayUpdates.map((h) => ({
        ...h,
        year: year,
    }));
    // Combine fixed and year-specific holidays
    exports.UK_HOLIDAYS.length = 0; // Clear the array
    exports.UK_HOLIDAYS.push(...fixedHolidays, ...yearSpecificHolidays);
}
