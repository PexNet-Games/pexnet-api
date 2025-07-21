#!/usr/bin/env npx ts-node

/**
 * Simple test script to validate Wordle API endpoints
 * Run with: npx ts-node test-wordle-api.ts
 */

import { config } from "./src/app.config";
import { LogInfo, LogWarn, LogError } from "./src/utils/logger";

const BASE_URL = `http://localhost:${config.port}/api`;

async function testEndpoint(
	endpoint: string,
	method: string = "GET",
	body: any = null,
) {
	try {
		const options: RequestInit = {
			method,
			headers: {
				"Content-Type": "application/json",
			},
		};

		if (body) {
			options.body = JSON.stringify(body);
		}

		const response = await fetch(`${BASE_URL}${endpoint}`, options);
		const data = await response.json();

		LogInfo(`${method} ${endpoint} - Status: ${response.status}`);
		console.log(`   Response:`, JSON.stringify(data, null, 2));
		console.log("");

		return data;
	} catch (error: any) {
		LogError(`${method} ${endpoint} - Error: ${error.message}`);
		console.log("");
		return null;
	}
}

async function runTests() {
	LogInfo("🧪 Testing Wordle API Endpoints");
	LogWarn("Make sure the API server is running on localhost:" + config.port);
	console.log("");

	// Test basic health check
	await testEndpoint("/ping");

	// Test daily word endpoint
	await testEndpoint("/wordle/daily-word");

	// Test user stats for a fake user
	await testEndpoint("/wordle/stats/test-discord-id-123");

	// Test leaderboard
	await testEndpoint("/wordle/leaderboard?limit=5");

	// Test play status check
	await testEndpoint("/wordle/played-today/test-discord-id-123");

	// Test result image generation
	const testResultData = {
		discordId: "test-discord-id-123",
		wordId: 1,
		guesses: ["ADIEU", "SALON", "PIANO"],
		solved: true,
		attempts: 3,
	};

	LogInfo("🎨 Testing result image generation...");
	await testEndpoint("/wordle/result-image", "POST", testResultData);

	LogInfo("🎯 Test Summary:");
	console.log("   - All endpoints should return valid JSON responses");
	console.log("   - Daily word should return a 5-letter word");
	console.log("   - User stats should return default values for new users");
	console.log(
		"   - Leaderboard should return empty array (no users with 5+ games)",
	);
	console.log("   - Play status should return hasPlayed: false");
	console.log("   - Result image should return base64 image and emoji text");
	console.log("");
	LogInfo("💡 To fully test, run: npm run seed:wordle");
	console.log("   Then create some test game data via POST /wordle/stats");
}

// Check if fetch is available (Node.js 18+)
if (typeof fetch === "undefined") {
	LogError("This script requires Node.js 18+ or you can install node-fetch");
	console.log("   Alternative: Test endpoints manually with curl or Postman");
	process.exit(1);
}

runTests().catch((error) => {
	LogError(`Test execution failed: ${error.message}`);
	console.error(error);
});
