#!/usr/bin/env npx ts-node

/**
 * Script de test pour valider les endpoints Discord
 * Run avec: npx ts-node test-discord-api.ts
 */

import { config } from "./src/app.config";

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

		console.log(
			`${response.status >= 400 ? "❌" : "✅"} ${method} ${endpoint} - Status: ${response.status}`,
		);
		if (response.status >= 400) {
			console.log(
				`   Error: ${data.error || data.message || "Erreur inconnue"}`,
			);
		} else {
			console.log(
				`   Response: ${JSON.stringify(data, null, 2).substring(0, 200)}...`,
			);
		}
		console.log("");

		return { response, data };
	} catch (error: any) {
		console.log(`❌ ${method} ${endpoint} - Error: ${error.message}`);
		console.log("");
		return null;
	}
}

async function runDiscordTests() {
	console.log("🤖 Test des endpoints Discord API");
	console.log(
		"⚠️  Assurez-vous que l'API soit démarrée sur localhost:" + config.port,
	);
	console.log("");

	// Test des données fictives
	const testServerId = "123456789012345678";
	const testDiscordId = "987654321098765432";
	const testChannelId = "111222333444555666";

	// 1. Test d'enregistrement d'un serveur
	console.log("🔹 Test 1: Enregistrement d'un serveur Discord");
	const serverData = {
		serverId: testServerId,
		serverName: "Test Server Wordle",
		iconUrl: "https://cdn.discordapp.com/icons/123456789/test.png",
		ownerId: testDiscordId,
		memberCount: 42,
	};
	await testEndpoint("/discord/servers", "POST", serverData);

	// 2. Test de récupération des serveurs actifs
	console.log("🔹 Test 2: Récupération des serveurs actifs");
	await testEndpoint("/discord/servers", "GET");

	// 3. Test de configuration du canal Wordle
	console.log("🔹 Test 3: Configuration du canal Wordle");
	const channelData = {
		channelId: testChannelId,
		channelName: "#wordle-results",
	};
	await testEndpoint(
		`/discord/servers/${testServerId}/wordle-channel`,
		"PUT",
		channelData,
	);

	// 4. Test de mise à jour des utilisateurs du serveur
	console.log("🔹 Test 4: Mise à jour des utilisateurs du serveur");
	const usersData = {
		users: [
			{
				discordId: testDiscordId,
				nickname: "TestUser#1234",
				roles: ["@everyone", "Member"],
				permissions: ["SEND_MESSAGES", "VIEW_CHANNEL"],
			},
			{
				discordId: "111111111111111111",
				nickname: "AnotherUser#5678",
				roles: ["@everyone", "Wordle Player"],
				permissions: ["SEND_MESSAGES", "VIEW_CHANNEL"],
			},
		],
	};
	await testEndpoint(
		`/discord/servers/${testServerId}/users`,
		"PUT",
		usersData,
	);

	// 5. Test de récupération des serveurs communs
	console.log("🔹 Test 5: Récupération des serveurs communs");
	await testEndpoint(`/discord/users/${testDiscordId}/common-servers`, "GET");

	// 6. Test de notification de résultat de jeu
	console.log("🔹 Test 6: Notification de fin de partie");
	const gameResultData = {
		discordId: testDiscordId,
		wordId: 1,
		solved: true,
		attempts: 4,
		guesses: ["ADIEU", "SALON", "PIANO", "CLOVE"],
	};
	await testEndpoint("/discord/game-result", "POST", gameResultData);

	// 7. Test de départ du serveur
	console.log("🔹 Test 7: Marquer le serveur comme inactif");
	await testEndpoint(`/discord/servers/${testServerId}/leave`, "DELETE");

	// 8. Vérification que le serveur est maintenant inactif
	console.log("🔹 Test 8: Vérification serveur inactif");
	await testEndpoint("/discord/servers", "GET");

	// 9. Re-test des serveurs communs (devrait être vide maintenant)
	console.log("🔹 Test 9: Serveurs communs après départ");
	await testEndpoint(`/discord/users/${testDiscordId}/common-servers`, "GET");

	console.log("🎯 Tests terminés !");
	console.log("");
	console.log("📝 Résumé des tests:");
	console.log(
		"   - Les endpoints Discord devraient tous répondre avec du JSON",
	);
	console.log(
		"   - L'enregistrement de serveur devrait créer un nouveau serveur",
	);
	console.log(
		"   - La configuration de canal devrait mettre à jour le serveur",
	);
	console.log(
		"   - La mise à jour d'utilisateurs devrait créer des associations",
	);
	console.log(
		"   - Les serveurs communs devraient retourner le serveur configuré",
	);
	console.log("   - La notification devrait préparer les données pour Discord");
	console.log("   - Le départ devrait marquer le serveur comme inactif");
	console.log("");
	console.log("💡 Pour tester avec de vraies données Discord:");
	console.log("   - Remplacez les IDs de test par de vrais IDs Discord");
	console.log("   - Intégrez un vrai bot Discord utilisant ces endpoints");
	console.log("   - Testez les notifications en conditions réelles");
}

// Exécuter les tests si le script est appelé directement
if (require.main === module) {
	runDiscordTests().catch(console.error);
}

export { testEndpoint, runDiscordTests };
