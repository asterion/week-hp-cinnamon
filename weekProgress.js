// SPDX-License-Identifier: GPL-2.0-or-later

const WORK_DAYS = 5;

// Outside these hours a day counts as empty (before) or full (after).
// With 0 and 24 each day progresses over the whole 24 hours.
const DAY_START_HOUR = 9;
const DAY_END_HOUR = 18;
// Friday is a short day: the weekly goal is reached at this hour
const FRIDAY_END_HOUR = 13;

/**
 * Work week progress at a given time.
 *
 * @param {GLib.DateTime} now - local date and time
 * @returns {{days: number[], today: ?number, total: number}} progress of each day (0..1),
 *   index of the current day (null on weekends) and total progress (0..1)
 */
function getWeekProgress(now) {
    const weekday = now.get_day_of_week() - 1; // 0 = Monday … 6 = Sunday

    if (weekday >= WORK_DAYS)
        return {days: Array(WORK_DAYS).fill(1), today: null, total: 1};

    const hours = now.get_hour() + now.get_minute() / 60;
    const endHour = weekday === WORK_DAYS - 1 ? FRIDAY_END_HOUR : DAY_END_HOUR;
    const todayFraction = Math.min(Math.max(
        (hours - DAY_START_HOUR) / (endHour - DAY_START_HOUR), 0), 1);

    const days = Array.from({length: WORK_DAYS}, (_v, i) => {
        if (i < weekday)
            return 1;
        return i === weekday ? todayFraction : 0;
    });
    const total = days.reduce((sum, d) => sum + d, 0) / WORK_DAYS;
    return {days, today: weekday, total};
}

module.exports = {WORK_DAYS, getWeekProgress};
