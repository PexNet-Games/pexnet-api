/**
 * Script de test pour vérifier la connectivité avec l'API du bot Discord
 */

const apiUrl = process.argv[2] || "http://localhost:3001";
const defaultAuthToken =
	process.env.DISCORD_BOT_AUTH_TOKEN || "00000000-0000-0000-0000-000000000000";

async function testConnection() {
	console.log("🔍 Test de connectivité avec l'API Discord...\n");

	try {
		const response = await fetch(`${apiUrl}/api/discord/bot-connection/test`);
		const result = await response.json();

		console.log(`📡 Statut: ${result.status}`);
		console.log(`✅ Succès: ${result.success}`);
		console.log(`💬 Message: ${result.message}`);

		if (result.details) {
			console.log("\n📋 Détails:");
			console.log(`   • URL Bot: ${result.details.botApiUrl}`);
			console.log(`   • Environnement: ${result.details.environment}`);
			if (result.details.httpStatus) {
				console.log(`   • Statut HTTP: ${result.details.httpStatus}`);
			}
			if (result.details.responseTime) {
				console.log(`   • Temps de réponse: ${result.details.responseTime}`);
			}
		}

		// Afficher les en-têtes requis
		console.log("\n📤 En-têtes envoyés vers l'API du bot:");
		console.log(`   • Authorization: ${defaultAuthToken}`);
		console.log("   • Content-Type: application/json");
		console.log("   • Accept: application/json");

		if (result.data) {
			console.log("\n📄 Réponse du bot:");
			console.log(JSON.stringify(result.data, null, 2));
		}

		console.log(
			`\n${result.success ? "🟢" : "🔴"} Test ${result.success ? "réussi" : "échoué"}`,
		);
	} catch (error) {
		console.error("❌ Erreur lors du test:", error.message);
		process.exit(1);
	}
}

testConnection();
