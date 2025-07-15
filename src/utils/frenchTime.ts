/**
 * Utility functions for handling French timezone dates
 */

/**
 * Get the current date in French timezone (Europe/Paris)
 * Reset to start of day (midnight)
 */
export function getFrenchDate(): Date {
	const now = new Date();

	// Get the current time in French timezone
	const frenchTime = new Intl.DateTimeFormat("en-CA", {
		timeZone: "Europe/Paris",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).format(now);

	// Create a new date object for midnight French time
	const [year, month, day] = frenchTime
		.split("-")
		.map((num) => parseInt(num, 10));
	const frenchMidnight = new Date(year, month - 1, day, 0, 0, 0, 0);

	return frenchMidnight;
}

/**
 * Get a date string in YYYY-MM-DD format for French timezone
 */
export function getFrenchDateString(): string {
	const frenchDate = getFrenchDate();
	return frenchDate.toISOString().split("T")[0];
}

/**
 * Convert a date to French timezone midnight
 */
export function toFrenchMidnight(date: Date): Date {
	const frenchTime = new Intl.DateTimeFormat("en-CA", {
		timeZone: "Europe/Paris",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).format(date);

	const [year, month, day] = frenchTime
		.split("-")
		.map((num) => parseInt(num, 10));
	return new Date(year, month - 1, day, 0, 0, 0, 0);
}

/**
 * Check if a date is today in French timezone
 */
export function isTodayInFrenchTime(date: Date): boolean {
	const today = getFrenchDate();
	const targetDate = toFrenchMidnight(date);

	return today.getTime() === targetDate.getTime();
}
