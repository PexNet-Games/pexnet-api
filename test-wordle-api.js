#!/usr/bin/env node

/**
 * Simple test script to validate Wordle API endpoints
 * Run with: npx ts-node test-wordle-api.ts
 */

import { config } from './src/app.config.js';
import { LogInfo, LogWarn, LogError } from './src/utils/logger.js';

const BASE_URL = `http://localhost:${config.port}/api`;

async function testEndpoint(endpoint: string, method: string = "GET", body: any = null) {
	try {
		const options = {
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

		console.log(`✅ ${method} ${endpoint}`);
		console.log(`   Status: ${response.status}`);
		console.log(`   Response:`, JSON.stringify(data, null, 2));
		console.log("");

		return data;
	} catch (error) {
		console.log(`❌ ${method} ${endpoint}`);
		console.log(`   Error: ${error.message}`);
		console.log("");
		return null;
	}
}

async function runTests() {
	console.log("🧪 Testing Wordle API Endpoints\n");
	console.log("⚠️  Make sure the API server is running on localhost:3000\n");

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

	console.log("🎯 Test Summary:");
	console.log("   - All endpoints should return valid JSON responses");
	console.log("   - Daily word should return a 5-letter word");
	console.log("   - User stats should return default values for new users");
	console.log(
		"   - Leaderboard should return empty array (no users with 5+ games)",
	);
	console.log("   - Play status should return hasPlayed: false");
	console.log("");
	console.log("💡 To fully test, run: npm run seed:wordle");
	console.log("   Then create some test game data via POST /wordle/stats");
}

// Check if fetch is available (Node.js 18+)
if (typeof fetch === "undefined") {
	console.log(
		"❌ This script requires Node.js 18+ or you can install node-fetch",
	);
	console.log("   Alternative: Test endpoints manually with curl or Postman");
	process.exit(1);
}

runTests().catch(console.error);
