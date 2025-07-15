import { getFrenchDateString } from "../src/utils/frenchTime";

console.log("🕐 Testing Daily Word Reset at French Midnight");
console.log("===============================================");

// Current time
const now = new Date();
console.log(`🌍 Current UTC time: ${now.toISOString()}`);
console.log(`🇫🇷 French date: ${getFrenchDateString()}`);

// Test different times
const testTimes = [
	{ name: "11:59 PM French time (21:59 UTC)", utc: "2025-07-14T21:59:00Z" },
	{ name: "12:00 AM French time (22:00 UTC)", utc: "2025-07-14T22:00:00Z" },
	{ name: "12:01 AM French time (22:01 UTC)", utc: "2025-07-14T22:01:00Z" },
	{
		name: "11:59 PM Next Day French (21:59 UTC+1)",
		utc: "2025-07-15T21:59:00Z",
	},
	{
		name: "12:00 AM Next Day French (22:00 UTC+1)",
		utc: "2025-07-15T22:00:00Z",
	},
];

testTimes.forEach((test) => {
	const testDate = new Date(test.utc);
	const frenchTime = new Intl.DateTimeFormat("en-CA", {
		timeZone: "Europe/Paris",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).format(testDate);

	console.log(`⏰ ${test.name}`);
	console.log(`   UTC: ${test.utc}`);
	console.log(`   French Date: ${frenchTime}`);
	console.log("");
});

console.log(
	"✅ Daily word should reset at midnight Paris time (22:00 UTC in summer, 23:00 UTC in winter)",
);
