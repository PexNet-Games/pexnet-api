/**
 * Script pour tester tous les endpoints Discord et identifier lesquels sont disponibles
 */

const API_BASE = process.argv[2] || "http://localhost:3000";

// Liste des endpoints à tester sur NOTRE API (port 3000)
const ENDPOINTS = [
	// Tests de base de notre API
	{
		method: "GET",
		path: "/api/discord/bot-connection/test",
		name: "Test connexion bot Discord",
	},
	{ method: "GET", path: "/api/ping", name: "Ping notre API" },

	// Endpoints Wordle Discord de notre API (qui appellent le bot)
	{
		method: "GET",
		path: "/api/discord/wordle/servers",
		name: "Serveurs Wordle (via notre API)",
	},
	{
		method: "GET",
		path: "/api/discord/wordle/notifications/status",
		name: "Statut notifications (via notre API)",
	},
	{
		method: "PUT",
		path: "/api/discord/wordle/sync-servers",
		name: "Synchronisation forcée (via notre API)",
	},
	{
		method: "GET",
		path: "/api/discord/wordle/stats",
		name: "Statistiques Wordle (via notre API)",
	},

	// Endpoints Discord standards de notre API
	{
		method: "GET",
		path: "/api/discord/servers",
		name: "Liste serveurs actifs (notre API)",
	},
];

async function testEndpoint(endpoint) {
	const url = `${API_BASE}${endpoint.path}`;

	try {
		console.log(`\n🔍 Test: ${endpoint.name}`);
		console.log(`📡 ${endpoint.method} ${endpoint.path}`);

		const startTime = Date.now();
		const response = await fetch(url, {
			method: endpoint.method,
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
			},
		});

		const responseTime = Date.now() - startTime;

		console.log(`⏱️  Temps de réponse: ${responseTime}ms`);
		console.log(`📊 Statut HTTP: ${response.status} ${response.statusText}`);

		if (response.ok) {
			let data;
			try {
				data = await response.json();
				console.log(`✅ SUCCÈS`);

				// Afficher un aperçu de la réponse
				if (data.success !== undefined) {
					console.log(`   Success: ${data.success}`);
				}
				if (data.message) {
					console.log(`   Message: ${data.message}`);
				}
				if (data.error) {
					console.log(`   Erreur: ${data.error}`);
				}
				if (data.data && typeof data.data === "object") {
					console.log(
						`   Data: ${JSON.stringify(data.data).substring(0, 100)}...`,
					);
				}
			} catch (e) {
				console.log(`✅ SUCCÈS (réponse non-JSON)`);
			}

			return { status: "success", code: response.status, responseTime };
		} else {
			// Tenter de lire le message d'erreur
			let errorData;
			try {
				errorData = await response.json();
			} catch (e) {
				errorData = { message: "Aucun détail d'erreur disponible" };
			}

			console.log(`❌ ÉCHEC`);
			if (errorData.error) {
				console.log(`   Erreur: ${errorData.error}`);
			}
			if (errorData.message) {
				console.log(`   Message: ${errorData.message}`);
			}
			if (errorData.details) {
				console.log(`   Détails: ${JSON.stringify(errorData.details)}`);
			}

			return {
				status: response.status === 404 ? "not_found" : "error",
				code: response.status,
				responseTime,
				error: errorData.error || errorData.message,
			};
		}
	} catch (error) {
		console.log(`💥 ERREUR DE CONNEXION`);
		console.log(`   ${error.message}`);
		return { status: "connection_error", error: error.message };
	}
}

async function testAllEndpoints() {
	console.log("🚀 Test de tous les endpoints Discord de notre API");
	console.log(`📍 Base URL: ${API_BASE}\n`);
	console.log("=".repeat(60));

	const results = {};

	for (const endpoint of ENDPOINTS) {
		const result = await testEndpoint(endpoint);
		results[endpoint.path] = result;

		// Petite pause entre les tests
		await new Promise((resolve) => setTimeout(resolve, 100));
	}

	console.log("\n" + "=".repeat(60));
	console.log("📊 RÉSUMÉ DES RÉSULTATS");
	console.log("=".repeat(60));

	const successful = Object.entries(results).filter(
		([_, result]) => result.status === "success",
	);
	const notFound = Object.entries(results).filter(
		([_, result]) => result.status === "not_found",
	);
	const errors = Object.entries(results).filter(
		([_, result]) => result.status === "error",
	);
	const connectionErrors = Object.entries(results).filter(
		([_, result]) => result.status === "connection_error",
	);

	console.log(`\n✅ Endpoints disponibles (${successful.length}):`);
	successful.forEach(([path, result]) => {
		console.log(`   ${path} (${result.code}, ${result.responseTime}ms)`);
	});

	console.log(
		`\n❌ Endpoints avec problèmes (${notFound.length + errors.length}):`,
	);
	[...notFound, ...errors].forEach(([path, result]) => {
		console.log(
			`   ${path} (${result.code} - ${result.error || "Problème détecté"})`,
		);
	});

	if (connectionErrors.length > 0) {
		console.log(`\n💥 Erreurs de connexion (${connectionErrors.length}):`);
		connectionErrors.forEach(([path, result]) => {
			console.log(`   ${path} (${result.error})`);
		});
	}

	console.log(`\n📈 Total testé: ${ENDPOINTS.length}`);
	console.log(`   ✅ Succès: ${successful.length}`);
	console.log(`   ❌ Problèmes: ${notFound.length + errors.length}`);
	console.log(`   💥 Connexion: ${connectionErrors.length}`);

	if (notFound.length + errors.length > 0) {
		console.log("\n💡 ACTIONS SUGGÉRÉES:");
		console.log("   • Vérifiez que votre API (port 3000) est démarrée");
		console.log(
			"   • Vérifiez que l'API du bot Discord (port 3001) est démarrée",
		);
		console.log("   • Consultez les logs des deux APIs pour des erreurs");
	}

	if (successful.length === ENDPOINTS.length) {
		console.log(
			"\n🎉 PARFAIT ! Tous les endpoints fonctionnent correctement !",
		);
		console.log(
			"   Votre API peut maintenant communiquer avec le bot Discord.",
		);
	}
}

// Lancer les tests
testAllEndpoints().catch(console.error);
