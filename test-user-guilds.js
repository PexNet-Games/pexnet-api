/**
 * Script de test pour les fonctionnalités de guilds utilisateur
 */

const API_BASE = process.argv[2] || "http://localhost:3000";

// Test endpoints pour les guilds utilisateur
const GUILD_ENDPOINTS = [
	{
		method: "GET",
		path: "/api/auth/discord/diagnose",
		name: "Diagnostic permissions Discord",
		needsAuth: false, // Fonctionne même sans auth pour donner des recommendations
	},
	{
		method: "GET",
		path: "/api/auth/guilds",
		name: "Récupérer guilds utilisateur",
		needsAuth: true,
	},
	{
		method: "POST",
		path: "/api/auth/guilds/sync",
		name: "Synchroniser guilds utilisateur",
		needsAuth: true,
	},
];

async function testEndpoint(endpoint, sessionCookie = null) {
	const url = `${API_BASE}${endpoint.path}`;

	try {
		console.log(`\n🔍 Test: ${endpoint.name}`);
		console.log(`📡 ${endpoint.method} ${endpoint.path}`);

		const headers = {
			"Content-Type": "application/json",
			Accept: "application/json",
		};

		// Ajouter le cookie de session si fourni
		if (sessionCookie && endpoint.needsAuth) {
			headers["Cookie"] = sessionCookie;
			console.log(`🔐 Avec authentification`);
		}

		const startTime = Date.now();
		const response = await fetch(url, {
			method: endpoint.method,
			headers,
		});

		const responseTime = Date.now() - startTime;

		console.log(`⏱️  Temps de réponse: ${responseTime}ms`);
		console.log(`📊 Statut HTTP: ${response.status} ${response.statusText}`);

		let data;
		try {
			data = await response.json();
		} catch (e) {
			data = { message: "Réponse non-JSON" };
		}

		if (response.ok) {
			console.log(`✅ SUCCÈS`);

			if (data.success !== undefined) {
				console.log(`   Success: ${data.success}`);
			}
			if (data.message) {
				console.log(`   Message: ${data.message}`);
			}
			if (data.data) {
				if (data.data.guildsCount !== undefined) {
					console.log(`   Serveurs trouvés: ${data.data.guildsCount}`);
				}
				if (data.data.guilds && Array.isArray(data.data.guilds)) {
					console.log(
						`   IDs serveurs: ${data.data.guilds.slice(0, 3).join(", ")}${data.data.guilds.length > 3 ? "..." : ""}`,
					);
				}
				if (data.data.lastSync) {
					console.log(
						`   Dernière sync: ${new Date(data.data.lastSync).toLocaleString()}`,
					);
				}
				if (data.data.needsSync !== undefined) {
					console.log(`   Besoin de sync: ${data.data.needsSync}`);
				}
			}

			// Affichage spécial pour le diagnostic Discord
			if (endpoint.path.includes("diagnose") && data.diagnosis) {
				console.log(`   🔍 DIAGNOSTIC:`);
				console.log(
					`     Authentifié: ${data.diagnosis.authenticated || false}`,
				);
				console.log(
					`     Token Discord: ${data.diagnosis.hasAccessToken || false}`,
				);
				console.log(
					`     Accès guilds: ${data.diagnosis.canAccessGuilds || false}`,
				);
				console.log(
					`     Reconnexion requise: ${data.diagnosis.needsReconnection || false}`,
				);

				if (data.diagnosis.apiTest) {
					console.log(
						`     Test API Discord: ${data.diagnosis.apiTest.accessible ? "✅" : "❌"} (${data.diagnosis.apiTest.status || "N/A"})`,
					);
				}

				if (
					data.diagnosis.recommendations &&
					data.diagnosis.recommendations.length > 0
				) {
					console.log(`   📋 RECOMMANDATIONS:`);
					data.diagnosis.recommendations.forEach((rec) =>
						console.log(`     - ${rec}`),
					);
				}
			}

			return { status: "success", code: response.status, responseTime, data };
		} else {
			console.log(`❌ ÉCHEC`);
			if (data.error || data.message) {
				console.log(`   Erreur: ${data.error || data.message}`);
			}
			if (data.suggestion) {
				console.log(`   Suggestion: ${data.suggestion}`);
			}

			return {
				status: response.status === 401 ? "auth_required" : "error",
				code: response.status,
				responseTime,
				error: data.error || data.message,
			};
		}
	} catch (error) {
		console.log(`💥 ERREUR DE CONNEXION`);
		console.log(`   ${error.message}`);
		return { status: "connection_error", error: error.message };
	}
}

async function testCommonServers(discordId) {
	console.log(`\n🔍 Test: Serveurs communs pour utilisateur ${discordId}`);
	console.log(`📡 GET /api/discord/users/${discordId}/common-servers`);

	try {
		const url = `${API_BASE}/api/discord/users/${discordId}/common-servers`;
		const response = await fetch(url);
		const data = await response.json();

		console.log(`📊 Statut HTTP: ${response.status}`);

		if (response.ok && data.success) {
			console.log(`✅ SUCCÈS`);
			console.log(`   Utilisateur: ${data.username || "Non défini"}`);
			console.log(`   Serveurs communs: ${data.totalCommon}`);
			if (data.syncInfo) {
				console.log(
					`   Dernière sync: ${data.syncInfo.lastSync ? new Date(data.syncInfo.lastSync).toLocaleString() : "Jamais"}`,
				);
				console.log(`   Besoin de sync: ${data.syncInfo.needsSync}`);
				console.log(
					`   Total guilds utilisateur: ${data.syncInfo.userGuildsCount}`,
				);
			}
			if (data.commonServers && data.commonServers.length > 0) {
				console.log(`   Serveurs communs détail:`);
				data.commonServers.forEach((server) => {
					console.log(`     - ${server.serverName} (${server.serverId})`);
				});
			}
		} else {
			console.log(`❌ ÉCHEC: ${data.error || data.message}`);
			if (data.suggestion) {
				console.log(`   Suggestion: ${data.suggestion}`);
			}
		}

		return data;
	} catch (error) {
		console.log(`💥 ERREUR: ${error.message}`);
		return null;
	}
}

async function testUserGuilds(sessionCookie = null) {
	console.log("🚀 Test des fonctionnalités de guilds utilisateur");
	console.log(`📍 Base URL: ${API_BASE}\n`);
	console.log("=".repeat(60));

	if (!sessionCookie) {
		console.log("⚠️  ATTENTION: Pas de session fournie");
		console.log(
			"   Pour tester avec authentification, connectez-vous via Discord OAuth2 et",
		);
		console.log("   copiez le cookie de session depuis votre navigateur.");
		console.log(
			"   Usage: node test-user-guilds.js [API_URL] [SESSION_COOKIE]",
		);
		console.log("");
	}

	const results = {};

	// Tester les endpoints de guilds
	for (const endpoint of GUILD_ENDPOINTS) {
		const result = await testEndpoint(endpoint, sessionCookie);
		results[endpoint.path] = result;
		await new Promise((resolve) => setTimeout(resolve, 100));
	}

	// Si on a un cookie de session, tester les serveurs communs avec un exemple d'ID
	if (sessionCookie) {
		console.log("\n" + "=".repeat(60));
		console.log("🔍 Test des serveurs communs");
		console.log("=".repeat(60));

		// Utiliser un ID d'exemple - vous pouvez le changer
		const exampleDiscordId = "224537059308732416"; // Remplacez par un vrai ID Discord
		await testCommonServers(exampleDiscordId);
	}

	console.log("\n" + "=".repeat(60));
	console.log("📊 RÉSUMÉ DES RÉSULTATS");
	console.log("=".repeat(60));

	const successful = Object.entries(results).filter(
		([_, result]) => result.status === "success",
	);
	const authRequired = Object.entries(results).filter(
		([_, result]) => result.status === "auth_required",
	);
	const errors = Object.entries(results).filter(
		([_, result]) => result.status === "error",
	);
	const connectionErrors = Object.entries(results).filter(
		([_, result]) => result.status === "connection_error",
	);

	if (successful.length > 0) {
		console.log(`\n✅ Endpoints fonctionnels (${successful.length}):`);
		successful.forEach(([path, result]) => {
			console.log(`   ${path} (${result.code}, ${result.responseTime}ms)`);
		});
	}

	if (authRequired.length > 0) {
		console.log(
			`\n🔐 Endpoints nécessitant l'authentification (${authRequired.length}):`,
		);
		authRequired.forEach(([path, result]) => {
			console.log(`   ${path} (401 - Authentification requise)`);
		});
	}

	if (errors.length > 0 || connectionErrors.length > 0) {
		console.log(
			`\n❌ Endpoints avec erreurs (${errors.length + connectionErrors.length}):`,
		);
		[...errors, ...connectionErrors].forEach(([path, result]) => {
			console.log(`   ${path} (${result.error})`);
		});
	}

	console.log(`\n📈 Total testé: ${GUILD_ENDPOINTS.length}`);
	console.log(`   ✅ Succès: ${successful.length}`);
	console.log(`   🔐 Auth requis: ${authRequired.length}`);
	console.log(`   ❌ Erreurs: ${errors.length + connectionErrors.length}`);

	// Conseil spécial si le diagnostic est disponible
	const diagnosisResult = Object.entries(results).find(([path]) =>
		path.includes("diagnose"),
	);
	if (
		diagnosisResult &&
		diagnosisResult[1].status === "success" &&
		diagnosisResult[1].data?.diagnosis?.needsReconnection
	) {
		console.log("\n🚨 PROBLÈME DÉTECTÉ:");
		console.log(
			"   Le diagnostic indique qu'une reconnexion Discord est nécessaire.",
		);
		console.log("   Suivez le guide dans GUILD_SYNC_TROUBLESHOOTING.md");
	}

	if (authRequired.length > 0 && !sessionCookie) {
		console.log("\n💡 POUR TESTER AVEC AUTHENTIFICATION:");
		console.log(
			"   1. Connectez-vous via http://localhost:3000/api/auth/discord",
		);
		console.log("   2. Ouvrez les outils de développeur (F12)");
		console.log("   3. Aller dans Application/Storage > Cookies");
		console.log("   4. Copiez la valeur du cookie de session");
		console.log(
			'   5. Relancez: node test-user-guilds.js http://localhost:3000 "connect.sid=s%3A..."',
		);
	}
}

// Récupérer le cookie de session depuis les arguments
const sessionCookie = process.argv[3];

// Lancer les tests
testUserGuilds(sessionCookie).catch(console.error);
