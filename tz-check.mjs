import { fromZonedTime } from "date-fns-tz";
function toUtc(year, month, day, minutesFromMidnight, timezone) {
    const hours = Math.floor(minutesFromMidnight / 60);
    const minutes = minutesFromMidnight % 60;
    const wallClock = new Date(year, month - 1, day, hours, minutes);
    return fromZonedTime(wallClock, timezone);
}
console.log("Halifax 9:00 AM, Aug 4 2026 (DST):", toUtc(2026, 8, 4, 540, "America/Halifax").toISOString());
console.log("Halifax 9:00 AM, Jan 4 2026 (standard):", toUtc(2026, 1, 4, 540, "America/Halifax").toISOString());