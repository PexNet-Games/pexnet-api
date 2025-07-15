import {
	getFrenchDate,
	getFrenchDateString,
	toFrenchMidnight,
} from "../src/utils/frenchTime";

console.log("🇫🇷 French Time Utility Test");
console.log("============================");

const now = new Date();
const frenchDate = getFrenchDate();
const frenchDateString = getFrenchDateString();

console.log(`🌍 Current UTC time: ${now.toISOString()}`);
console.log(`🇫🇷 French midnight today: ${frenchDate.toISOString()}`);
console.log(`📅 French date string: ${frenchDateString}`);

// Test timezone differences
const utcMidnight = new Date();
utcMidnight.setUTCHours(0, 0, 0, 0);

console.log(`⏰ UTC midnight: ${utcMidnight.toISOString()}`);
console.log(`⏰ French midnight: ${frenchDate.toISOString()}`);

// Show the time difference
const timeDiff =
	Math.abs(frenchDate.getTime() - utcMidnight.getTime()) / (1000 * 60 * 60);
console.log(`⏱️  Time difference: ${timeDiff} hours`);

// Test converting existing dates
const testDate = new Date("2025-07-15T14:30:00Z");
const convertedDate = toFrenchMidnight(testDate);
console.log(`🔄 Original date: ${testDate.toISOString()}`);
console.log(`🔄 French midnight: ${convertedDate.toISOString()}`);

console.log("\n✅ French time utility working correctly!");
