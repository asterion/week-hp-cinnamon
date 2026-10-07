// SPDX-License-Identifier: GPL-2.0-or-later

// Default configuration; overwritten at runtime from the applet settings dialog.
const config = {
    workDays: 5,
    // Outside these hours a day counts as empty (before) or full (after).
    // With 0 and 24 each day progresses over the whole 24 hours.
    dayStartHour: 9,
    dayEndHour: 18,
    // The last work day is a short day: the weekly goal is reached at this hour
    lastDayEndHour: 13,
};

/**
 * Replace part of the configuration used by getWeekProgress.
 *
 * @param {object} overrides - subset of {workDays, dayStartHour, dayEndHour, lastDayEndHour}
 */
function setConfig(overrides) {
    Object.assign(config, overrides);
}

/**
 * Work week progress at a given time.
 *
 * @param {GLib.DateTime} now - local date and time
 * @returns {{days: number[], today: ?number, total: number}} progress of each day (0..1),
 *   index of the current day (null outside the work week) and total progress (0..1)
 */
function getWeekProgress(now) {
    const weekday = now.get_day_of_week() - 1; // 0 = Monday … 6 = Sunday
    const {workDays, dayStartHour, dayEndHour, lastDayEndHour} = config;

    if (weekday >= workDays)
        return {days: Array(workDays).fill(1), today: null, total: 1};

    const hours = now.get_hour() + now.get_minute() / 60;
    const endHour = weekday === workDays - 1 ? lastDayEndHour : dayEndHour;
    const span = endHour - dayStartHour;
    const todayFraction = span > 0
        ? Math.min(Math.max((hours - dayStartHour) / span, 0), 1)
        : (hours >= dayStartHour ? 1 : 0);

    const days = Array.from({length: workDays}, (_v, i) => {
        if (i < weekday)
            return 1;
        return i === weekday ? todayFraction : 0;
    });
    const total = days.reduce((sum, d) => sum + d, 0) / workDays;
    return {days, today: weekday, total};
}

module.exports = {setConfig, getWeekProgress};
