#!/usr/bin/env node

/**
 * 🧪 Test de la synchronisation automatique des guilds Discord
 *
 * Ce script teste :
 * - Middleware automatique lors des sessions actives
 * - Middleware critique avant les actions Wordle
 * - Endpoint de synchronisation forcée
 * - Intégration complète frontend
 */

const API_BASE = process.argv[2] || "http://localhost:3000";
const SESSION_COOKIE = process.argv[3];

console.log("🧪 Test de la synchronisation automatique des guilds Discord");
console.log(`📍 Base URL: ${API_BASE}`);
console.log("");

// Simuler des données de partie Wordle
const SAMPLE_WORDLE_GAME = {
	word: "PIANO",
	attempts: [
		{ word: "ADIEU", result: ["⬛", "⬛", "🟨", "⬛", "⬛"] },
		{ word: "SALON", result: ["⬛", "🟩", "⬛", "⬛", "🟨"] },
		{ word: "PIANO", result: ["🟩", "🟩", "🟩", "🟩", "🟩"] },
	],
	dailyWordId: "daily-word-test-123",
	won: true,
	attemptsCount: 3,
};

/**
 * Faire une requête HTTP avec gestion d'erreurs
 */
const makeRequest = async (endpoint, options = {}) => {
	const startTime = Date.now();
	const url = `${API_BASE}${endpoint}`;

	const defaultOptions = {
		headers: {
			"Content-Type": "application/json",
			Accept: "application/json",
		},
	};

	if (SESSION_COOKIE) {
		defaultOptions.headers["Cookie"] = SESSION_COOKIE;
	}

	const requestOptions = {
		...defaultOptions,
		...options,
		headers: {
			...defaultOptions.headers,
			...(options.headers || {}),
		},
	};

	try {
		const response = await fetch(url, requestOptions);
		const responseTime = Date.now() - startTime;

		let data;
		try {
			data = await response.json();
		} catch (e) {
			data = { message: "Réponse non-JSON" };
		}

		return {
			status: response.status,
			statusText: response.statusText,
			ok: response.ok,
			data,
			responseTime,
		};
	} catch (error) {
		const responseTime = Date.now() - startTime;
		return {
			status: 0,
			statusText: "Network Error",
			ok: false,
			data: { error: error.message },
			responseTime,
		};
	}
};

/**
 * Test des middlewares automatiques
 */
const testAutomaticSyncMiddleware = async () => {
	console.log("🔄 Test du middleware de synchronisation automatique");
	console.log("============================================================");

	// Test 1: Ping simple qui devrait déclencher le middleware automatique
	console.log(
		"\n📡 Test: Requête ping (devrait déclencher sync auto en arrière-plan)",
	);
	const pingResult = await makeRequest("/api/ping");

	console.log(`⏱️  Temps de réponse: ${pingResult.responseTime}ms`);
	console.log(`📊 Statut HTTP: ${pingResult.status} ${pingResult.statusText}`);

	if (pingResult.ok) {
		console.log("✅ Ping réussi - le middleware automatique a pu s'exécuter");
		console.log(
			"💡 Si vous êtes connecté, la sync auto des guilds s'est déclenchée en arrière-plan",
		);
	} else {
		console.log("❌ Erreur ping:", pingResult.data);
	}

	return pingResult;
};

/**
 * Test de la synchronisation forcée
 */
const testForcedSync = async () => {
	console.log("\n⚡ Test de la synchronisation forcée");
	console.log("============================================================");

	const result = await makeRequest("/api/auth/guilds/sync/force", {
		method: "POST",
	});

	console.log(`⏱️  Temps de réponse: ${result.responseTime}ms`);
	console.log(`📊 Statut HTTP: ${result.status} ${result.statusText}`);

	if (result.ok && result.data.success) {
		console.log("✅ SUCCÈS - Synchronisation forcée réussie");
		console.log(`   Message: ${result.data.message}`);
		if (result.data.data) {
			console.log(`   Guilds synchronisées: ${result.data.data.guildsCount}`);
			console.log(`   Type de sync: ${result.data.data.syncType}`);
			console.log(
				`   Dernière sync: ${new Date(result.data.data.lastSync).toLocaleString()}`,
			);
		}
	} else if (result.status === 401) {
		console.log("🔐 AUTHENTIFICATION REQUISE");
		console.log(
			"   Vous devez être connecté via Discord pour forcer une synchronisation",
		);
	} else {
		console.log("❌ ÉCHEC");
		console.log(
			`   Erreur: ${result.data.message || result.data.error || result.statusText}`,
		);
	}

	return result;
};

/**
 * Test du middleware critique sur soumission Wordle
 */
const testCriticalSyncMiddleware = async () => {
	console.log("\n🎯 Test du middleware critique (soumission Wordle)");
	console.log("============================================================");

	const result = await makeRequest("/api/wordle/submit-game", {
		method: "POST",
		body: JSON.stringify(SAMPLE_WORDLE_GAME),
	});

	console.log(`⏱️  Temps de réponse: ${result.responseTime}ms`);
	console.log(`📊 Statut HTTP: ${result.status} ${result.statusText}`);

	if (result.ok) {
		console.log("✅ SUCCÈS - Soumission Wordle avec sync critique");
		console.log(
			"   💡 Le middleware a vérifié que les guilds sont à jour avant traitement",
		);
		if (result.data.success) {
			console.log(`   Message: ${result.data.message || "Partie enregistrée"}`);
		}
	} else if (result.status === 401) {
		console.log("🔐 AUTHENTIFICATION REQUISE");
		console.log(
			"   Connectez-vous via Discord pour tester les soumissions Wordle",
		);
	} else {
		console.log("❌ ÉCHEC");
		console.log(
			`   Erreur: ${result.data.message || result.data.error || result.statusText}`,
		);
	}

	return result;
};

/**
 * Test de l'état des guilds après synchronisation
 */
const testGuildState = async () => {
	console.log("\n📋 Test de l'état des guilds après synchronisation");
	console.log("============================================================");

	const result = await makeRequest("/api/auth/guilds");

	console.log(`⏱️  Temps de réponse: ${result.responseTime}ms`);
	console.log(`📊 Statut HTTP: ${result.status} ${result.statusText}`);

	if (result.ok && result.data.success) {
		console.log("✅ SUCCÈS - État des guilds récupéré");
		if (result.data.data) {
			console.log(`   Guilds stockées: ${result.data.data.guildsCount}`);
			console.log(
				`   Besoin de sync: ${result.data.data.needsSync ? "⚠️  Oui" : "✅ Non"}`,
			);
			if (result.data.data.lastSync) {
				console.log(
					`   Dernière sync: ${new Date(result.data.data.lastSync).toLocaleString()}`,
				);
			} else {
				console.log("   Dernière sync: ❌ Jamais synchronisé");
			}
		}
	} else if (result.status === 401) {
		console.log("🔐 AUTHENTIFICATION REQUISE");
		console.log("   Connectez-vous via Discord pour voir l'état des guilds");
	} else {
		console.log("❌ ÉCHEC");
		console.log(
			`   Erreur: ${result.data.message || result.data.error || result.statusText}`,
		);
	}

	return result;
};

/**
 * Test des serveurs communs enrichis
 */
const testEnrichedCommonServers = async () => {
	console.log("\n🌐 Test des serveurs communs enrichis");
	console.log("============================================================");

	// Utiliser un ID Discord d'exemple
	const testDiscordId = "224537059308732416"; // Votre ID Discord de test

	const result = await makeRequest(
		`/api/discord/users/${testDiscordId}/common-servers`,
	);

	console.log(`⏱️  Temps de réponse: ${result.responseTime}ms`);
	console.log(`📊 Statut HTTP: ${result.status} ${result.statusText}`);

	if (result.ok && result.data.success) {
		console.log("✅ SUCCÈS - Serveurs communs enrichis");
		console.log(`   Utilisateur: ${result.data.username || "N/A"}`);
		console.log(`   Serveurs communs: ${result.data.totalCommon}`);

		if (result.data.syncInfo) {
			console.log(`   🔄 Informations de synchronisation:`);
			console.log(
				`     - Dernière sync: ${result.data.syncInfo.lastSync ? new Date(result.data.syncInfo.lastSync).toLocaleString() : "Jamais"}`,
			);
			console.log(
				`     - Sync nécessaire: ${result.data.syncInfo.needsSync ? "⚠️  Oui" : "✅ Non"}`,
			);
			console.log(
				`     - Guilds utilisateur: ${result.data.syncInfo.userGuildsCount}`,
			);
		}

		if (result.data.commonServers && result.data.commonServers.length > 0) {
			console.log(`   🎮 Serveurs Wordle disponibles:`);
			result.data.commonServers.forEach((server) => {
				const wordleStatus = server.wordleChannelId
					? "✅ Configuré"
					: "⚠️  Non configuré";
				console.log(`     - ${server.serverName}: ${wordleStatus}`);
			});
		}
	} else {
		console.log("❌ ÉCHEC");
		console.log(
			`   Erreur: ${result.data.message || result.data.error || result.statusText}`,
		);
	}

	return result;
};

/**
 * Fonction principale de test
 */
const runAutoSyncTests = async () => {
	try {
		console.log("🚀 Démarrage des tests de synchronisation automatique\n");

		if (!SESSION_COOKIE) {
			console.log("⚠️  ATTENTION: Pas de session fournie");
			console.log("   Certains tests nécessitent une authentification Discord");
			console.log(
				"   Usage: node test-auto-guild-sync.js [API_URL] [SESSION_COOKIE]\n",
			);
		}

		const results = {};

		// Test 1: Middleware automatique
		results.autoMiddleware = await testAutomaticSyncMiddleware();

		// Test 2: Synchronisation forcée
		results.forceSync = await testForcedSync();

		// Test 3: État des guilds
		results.guildState = await testGuildState();

		// Test 4: Middleware critique
		results.criticalMiddleware = await testCriticalSyncMiddleware();

		// Test 5: Serveurs communs enrichis
		results.commonServers = await testEnrichedCommonServers();

		// Résumé final
		console.log(
			"\n============================================================",
		);
		console.log("📊 RÉSUMÉ DES TESTS DE SYNCHRONISATION AUTOMATIQUE");
		console.log("============================================================");

		const testSummary = [
			{ name: "Middleware automatique", result: results.autoMiddleware },
			{ name: "Synchronisation forcée", result: results.forceSync },
			{ name: "État des guilds", result: results.guildState },
			{
				name: "Middleware critique Wordle",
				result: results.criticalMiddleware,
			},
			{ name: "Serveurs communs enrichis", result: results.commonServers },
		];

		const successful = testSummary.filter(
			(t) => t.result.ok && t.result.data?.success !== false,
		);
		const authRequired = testSummary.filter((t) => t.result.status === 401);
		const errors = testSummary.filter(
			(t) => !t.result.ok && t.result.status !== 401,
		);

		console.log(`\n✅ Tests réussis (${successful.length}):`);
		successful.forEach((t) =>
			console.log(
				`   ${t.name} (${t.result.status}, ${t.result.responseTime}ms)`,
			),
		);

		if (authRequired.length > 0) {
			console.log(
				`\n🔐 Tests nécessitant l'authentification (${authRequired.length}):`,
			);
			authRequired.forEach((t) => console.log(`   ${t.name} (401)`));
		}

		if (errors.length > 0) {
			console.log(`\n❌ Tests en erreur (${errors.length}):`);
			errors.forEach((t) =>
				console.log(
					`   ${t.name} (${t.result.status}, ${t.result.responseTime}ms)`,
				),
			);
		}

		// Conseils d'utilisation
		console.log("\n💡 CONSEILS D'UTILISATION:");
		console.log(
			"   1. Les guilds se synchronisent automatiquement toutes les 6h",
		);
		console.log(
			"   2. Avant chaque action Wordle critique, une vérification est faite (2h)",
		);
		console.log(
			"   3. Utilisez la sync forcée si vous rejoignez/quittez des serveurs",
		);
		console.log(
			"   4. Le frontend peut utiliser les exemples d'intégration fournis",
		);

		if (authRequired.length > 0 && !SESSION_COOKIE) {
			console.log("\n🔄 POUR TESTER AVEC AUTHENTIFICATION:");
			console.log(
				"   1. Connectez-vous via http://localhost:3000/api/auth/discord",
			);
			console.log("   2. Copiez le cookie de session depuis les DevTools");
			console.log(
				'   3. Relancez: node test-auto-guild-sync.js http://localhost:3000 "connect.sid=s%3A..."',
			);
		}
	} catch (error) {
		console.error("\n❌ ERREUR CRITIQUE lors des tests:", error);
		process.exit(1);
	}
};

// Exécution des tests
runAutoSyncTests();
