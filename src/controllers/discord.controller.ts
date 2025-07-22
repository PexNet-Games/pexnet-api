import { Request, Response } from "express";
import { config } from "../app.config";
import DiscordServer from "@models/DiscordServer";
import DiscordUserServer from "@models/DiscordUserServer";
import WordleGameStats from "@models/WordleGameStats";
import WordleDailyWord from "@models/WordleDailyWord";
import WordlePendingNotification from "@models/WordlePendingNotification";
import User from "@models/User";
import { generateWordleResultImage } from "@utils/wordleImageGenerator";

/**
 * Construire l'URL de base pour l'API du bot Discord
 */
const getDiscordBotApiUrl = (endpoint: string): string => {
	const baseUrl = config.discord.bot.apiUrl;
	return `${baseUrl}${endpoint.startsWith("/") ? endpoint : "/" + endpoint}`;
};

/**
 * Créer les en-têtes requis pour l'API du bot Discord
 */
const getDiscordBotApiHeaders = (): Record<string, string> => {
	return {
		Authorization: config.discord.bot.authToken,
		"Content-Type": "application/json",
		Accept: "application/json",
	};
};

/**
 * Gérer les erreurs de connexion avec l'API du bot Discord
 */
const handleDiscordBotApiError = (error: unknown, context: string) => {
	console.error(`[${context}] Erreur API Bot Discord:`, error);

	if (error instanceof TypeError && error.message === "fetch failed") {
		const cause = (error as any).cause;
		if (cause?.code === "ECONNREFUSED") {
			return {
				success: false,
				error: "Bot Discord indisponible",
				message: `L'API du bot Discord (${config.discord.bot.apiUrl}) n'est pas accessible. Vérifiez que le bot est démarré.`,
				details: {
					botApiUrl: config.discord.bot.apiUrl,
					environment: config.environment,
				},
			};
		}
	}

	return {
		success: false,
		error: "Erreur lors de la communication avec le bot Discord",
		message: error instanceof Error ? error.message : "Erreur inconnue",
		details: {
			botApiUrl: config.discord.bot.apiUrl,
			environment: config.environment,
		},
	};
};

/**
 * Gérer spécifiquement les erreurs de statut HTTP
 */
const handleHttpStatusError = (
	status: number,
	endpoint: string,
	context: string,
) => {
	console.error(`[${context}] Erreur HTTP ${status} sur ${endpoint}`);

	let message: string;
	let error: string;

	switch (status) {
		case 404:
			error = "Endpoint non trouvé";
			message = `L'endpoint '${endpoint}' n'existe pas sur l'API du bot Discord. Vérifiez que le bot implémente cette route.`;
			break;
		case 401:
			error = "Non autorisé";
			message = `Token d'autorisation invalide pour l'endpoint '${endpoint}'. Vérifiez DISCORD_BOT_AUTH_TOKEN.`;
			break;
		case 403:
			error = "Accès interdit";
			message = `Accès refusé à l'endpoint '${endpoint}'. Permissions insuffisantes.`;
			break;
		case 500:
			error = "Erreur serveur bot";
			message = `Erreur interne sur l'API du bot Discord (${endpoint}).`;
			break;
		case 503:
			// Cas spécial pour sync-servers : c'est attendu si le job n'est pas configuré
			if (endpoint.includes("sync-servers")) {
				error = "Service de synchronisation non configuré";
				message = `Le job de synchronisation n'est pas configuré sur le bot Discord. Ceci est normal si le service n'a pas été initialisé.`;
			} else {
				error = "Service indisponible";
				message = `Le service '${endpoint}' est temporairement indisponible sur l'API du bot Discord.`;
			}
			break;
		default:
			error = `Erreur HTTP ${status}`;
			message = `L'API du bot Discord a retourné le statut ${status} pour '${endpoint}'.`;
	}

	return {
		success: false,
		error,
		message,
		details: {
			endpoint,
			httpStatus: status,
			botApiUrl: config.discord.bot.apiUrl,
			environment: config.environment,
			suggestion:
				status === 404
					? "Vérifiez que l'API du bot Discord implémente bien cet endpoint"
					: status === 503 && endpoint.includes("sync-servers")
						? "Comportement normal si le job de synchronisation n'est pas configuré sur le bot"
						: "Consultez les logs de l'API du bot Discord pour plus d'informations",
		},
	};
};

/**
 * Enregistrer ou mettre à jour un serveur Discord
 */
export const registerServer = async (req: Request, res: Response) => {
	try {
		const {
			serverId,
			serverName,
			iconUrl,
			ownerId,
			memberCount,
			wordleChannelId,
		} = req.body;

		// Validation
		if (!serverId || !serverName || !ownerId) {
			return res.status(400).json({
				success: false,
				error: "serverId, serverName et ownerId sont requis",
			});
		}

		// Vérifier si le serveur existe déjà
		let server = await DiscordServer.findOne({ serverId });

		if (server) {
			// Mettre à jour le serveur existant
			server.serverName = serverName;
			server.iconUrl = iconUrl || server.iconUrl;
			server.ownerId = ownerId;
			server.memberCount = memberCount || server.memberCount;
			server.wordleChannelId = wordleChannelId || server.wordleChannelId;
			server.isActive = true;
			server.leftAt = undefined;
			server.lastActivity = new Date();
		} else {
			// Créer un nouveau serveur
			server = new DiscordServer({
				serverId,
				serverName,
				iconUrl,
				ownerId,
				memberCount,
				wordleChannelId,
				joinedAt: new Date(),
			});
		}

		await server.save();

		res.json({
			success: true,
			message: "Serveur enregistré avec succès",
			server: {
				serverId: server.serverId,
				serverName: server.serverName,
				isActive: server.isActive,
				wordleChannelId: server.wordleChannelId,
			},
		});
	} catch (error) {
		console.error("Erreur lors de l'enregistrement du serveur:", error);
		res.status(500).json({
			success: false,
			error: "Erreur interne du serveur",
		});
	}
};

/**
 * Marquer un serveur comme inactif (bot retiré)
 */
export const leaveServer = async (req: Request, res: Response) => {
	try {
		const { serverId } = req.params;

		if (!serverId) {
			return res.status(400).json({
				success: false,
				error: "serverId est requis",
			});
		}

		const server = await DiscordServer.findOne({ serverId });
		if (!server) {
			return res.status(404).json({
				success: false,
				error: "Serveur non trouvé",
			});
		}

		// Marquer le serveur comme inactif
		server.isActive = false;
		server.leftAt = new Date();
		await server.save();

		// Marquer tous les utilisateurs du serveur comme inactifs
		await DiscordUserServer.updateMany(
			{ serverId, isActive: true },
			{ isActive: false, leftServerAt: new Date() },
		);

		res.json({
			success: true,
			message: "Serveur marqué comme inactif",
		});
	} catch (error) {
		console.error("Erreur lors de la sortie du serveur:", error);
		res.status(500).json({
			success: false,
			error: "Erreur interne du serveur",
		});
	}
};

/**
 * Enregistrer ou mettre à jour les utilisateurs d'un serveur
 */
export const updateServerUsers = async (req: Request, res: Response) => {
	try {
		const { serverId } = req.params;
		const { users } = req.body; // Array d'objets utilisateur

		if (!serverId || !Array.isArray(users)) {
			return res.status(400).json({
				success: false,
				error: "serverId et users (array) sont requis",
			});
		}

		// Vérifier que le serveur existe
		const server = await DiscordServer.findOne({ serverId, isActive: true });
		if (!server) {
			return res.status(404).json({
				success: false,
				error: "Serveur non trouvé ou inactif",
			});
		}

		let updatedCount = 0;
		let createdCount = 0;

		for (const userData of users) {
			const { discordId, nickname, roles = [], permissions = [] } = userData;

			if (!discordId) continue;

			// Chercher l'association existante
			let userServer = await DiscordUserServer.findOne({ discordId, serverId });

			if (userServer) {
				// Mettre à jour
				userServer.nickname = nickname || userServer.nickname;
				userServer.roles = roles;
				userServer.permissions = permissions;
				userServer.isActive = true;
				userServer.leftServerAt = undefined;
				userServer.lastSeen = new Date();
				updatedCount++;
			} else {
				// Créer
				userServer = new DiscordUserServer({
					discordId,
					serverId,
					serverName: server.serverName,
					nickname,
					roles,
					permissions,
				});
				createdCount++;
			}

			await userServer.save();
		}

		// Mettre à jour l'activité du serveur
		server.lastActivity = new Date();
		server.memberCount = users.length;
		await server.save();

		res.json({
			success: true,
			message: "Utilisateurs du serveur mis à jour",
			stats: {
				updated: updatedCount,
				created: createdCount,
				total: users.length,
			},
		});
	} catch (error) {
		console.error("Erreur lors de la mise à jour des utilisateurs:", error);
		res.status(500).json({
			success: false,
			error: "Erreur interne du serveur",
		});
	}
};

/**
 * Obtenir les serveurs communs avec notifications en attente pour un utilisateur
 * Format attendu par le bot Discord pour le WordleNotificationJob
 */
export const getCommonServers = async (req: Request, res: Response) => {
	try {
		const { discordId } = req.params;

		if (!discordId) {
			return res.status(400).json({
				success: false,
				error: "discordId est requis",
			});
		}

		// Récupérer l'utilisateur et vérifier ses guilds
		const user = await User.findOne({ discordId }).select(
			"guilds guildsLastSync username",
		);

		if (!user || !user.guilds || user.guilds.length === 0) {
			return res.json({
				servers: [], // Format attendu par le bot Discord
			});
		}

		// Récupérer les notifications en attente pour cet utilisateur
		const pendingNotifications = await WordlePendingNotification.find({
			discordId,
			isProcessed: false,
		});

		if (pendingNotifications.length === 0) {
			return res.json({
				servers: [],
			});
		}

		// Récupérer les serveurs communs avec canal Wordle configuré
		const commonServers = await DiscordServer.find({
			serverId: { $in: user.guilds },
			isActive: true,
			wordleChannelId: { $exists: true, $ne: null },
			"settings.autoNotify": { $ne: false },
		}).select("serverId wordleChannelId");

		if (commonServers.length === 0) {
			return res.json({
				servers: [],
			});
		}

		// Construire la réponse dans le format attendu par le bot Discord
		const servers = [];

		for (const server of commonServers) {
			for (const notification of pendingNotifications) {
				servers.push({
					serverId: server.serverId,
					channelId: server.wordleChannelId,
					notificationData: {
						username: notification.username,
						avatar: notification.avatar || undefined,
						grid: notification.grid,
						image: notification.image, // Image PNG en base64
						attempts: notification.attempts,
						time: notification.time || "0:00",
						streak: notification.streak,
						puzzle: notification.puzzle,
						date: notification.date,
						solved: notification.solved,
						timeToComplete: notification.timeToComplete,
						// ID de la notification pour la marquer comme traitée
						notificationId: notification._id.toString(),
					},
				});
			}
		}

		console.log(
			`📤 ${servers.length} notifications envoyées pour ${user.username || discordId} vers ${commonServers.length} serveurs`,
		);

		res.json({
			servers,
		});
	} catch (error) {
		console.error(
			"Erreur lors de la récupération des serveurs avec notifications:",
			error,
		);
		res.status(500).json({
			servers: [],
			error: "Erreur interne du serveur",
		});
	}
};

/**
 * Configurer le canal Wordle d'un serveur
 */
export const setWordleChannel = async (req: Request, res: Response) => {
	try {
		const { serverId } = req.params;
		const { channelId, channelName } = req.body;

		if (!serverId || !channelId) {
			return res.status(400).json({
				success: false,
				error: "serverId et channelId sont requis",
			});
		}

		const server = await DiscordServer.findOne({ serverId, isActive: true });
		if (!server) {
			return res.status(404).json({
				success: false,
				error: "Serveur non trouvé ou inactif",
			});
		}

		server.wordleChannelId = channelId;
		server.lastActivity = new Date();
		await server.save();

		res.json({
			success: true,
			message: `Canal Wordle configuré : ${channelName || channelId}`,
			wordleChannelId: channelId,
		});
	} catch (error) {
		console.error("Erreur lors de la configuration du canal:", error);
		res.status(500).json({
			success: false,
			error: "Erreur interne du serveur",
		});
	}
};

/**
 * Obtenir la liste de tous les serveurs actifs
 */
export const getActiveServers = async (req: Request, res: Response) => {
	try {
		const servers = await DiscordServer.find({ isActive: true })
			.select("serverId serverName memberCount wordleChannelId lastActivity")
			.sort({ lastActivity: -1 });

		res.json({
			success: true,
			servers,
			totalActive: servers.length,
		});
	} catch (error) {
		console.error("Erreur lors de la récupération des serveurs:", error);
		res.status(500).json({
			success: false,
			error: "Erreur interne du serveur",
		});
	}
};

/**
 * Notifier la fin d'une partie Wordle
 * Cette fonction sera appelée automatiquement quand un utilisateur termine une partie
 */
export const notifyGameResult = async (req: Request, res: Response) => {
	try {
		const { discordId, wordId, solved, attempts, guesses } = req.body;

		if (!discordId || wordId === undefined) {
			return res.status(400).json({
				success: false,
				error: "discordId et wordId sont requis",
			});
		}

		// Récupérer l'utilisateur et ses guilds Discord
		const user = await User.findOne({ discordId });
		if (!user || !user.guilds || user.guilds.length === 0) {
			return res.json({
				success: true,
				message: "Utilisateur non trouvé ou aucun serveur Discord",
				serversToNotify: 0,
			});
		}

		// Récupérer les serveurs communs directement depuis User.guilds et DiscordServer
		const commonServers = await DiscordServer.find({
			serverId: { $in: user.guilds },
			isActive: true,
			wordleChannelId: { $exists: true, $ne: null },
			"settings.autoNotify": { $ne: false }, // Autorise true ou undefined (par défaut)
		});

		if (commonServers.length === 0) {
			return res.json({
				success: true,
				message: "Aucun serveur commun avec canal Wordle configuré",
				notified: 0,
			});
		}

		// Récupérer le mot du jour pour la génération d'image
		const dailyWord = await WordleDailyWord.findOne({ wordId });
		if (!dailyWord) {
			return res.status(404).json({
				success: false,
				error: "Mot du jour non trouvé",
			});
		}

		// Préparer les données pour les guesses
		const filteredGuesses = (guesses || []).filter(
			(guess: string) => guess && guess.length === 5,
		);

		try {
			// Préparer les données pour l'image avec toutes les propriétés requises
			const resultData = {
				discordId,
				guesses: filteredGuesses,
				targetWord: dailyWord.word,
				solved: solved || false,
				attempts: attempts || 0,
				username: user?.username || `User#${discordId.slice(-4)}`,
				discriminator: user?.discriminator || undefined,
				avatar: user?.avatar || undefined,
			};

			// Générer l'image
			const imageBuffer = await generateWordleResultImage(resultData);

			// Générer le texte partageable avec emojis
			const shareText = generateShareableText(
				filteredGuesses,
				dailyWord.word,
				wordId,
				solved || false,
				attempts || 0,
			);

			// Préparer les données de notification pour le bot Discord
			const notificationData = {
				discordId,
				word: dailyWord.word,
				wordId,
				solved,
				attempts,
				guesses: filteredGuesses,
				image: imageBuffer.toString("base64"), // Base64
				shareText,
				servers: commonServers.map((server) => ({
					serverId: server.serverId,
					serverName: server.serverName,
					channelId: server.wordleChannelId,
				})),
			};

			res.json({
				success: true,
				message: "Résultat prêt pour notification",
				notificationData,
				serversToNotify: commonServers.length,
			});
		} catch (imageError) {
			console.error("Erreur génération image:", imageError);

			// Générer au moins le texte partageable en fallback
			const shareText = generateShareableText(
				filteredGuesses,
				dailyWord.word,
				wordId,
				solved || false,
				attempts || 0,
			);

			// Fallback sans image
			const notificationData = {
				discordId,
				word: dailyWord.word,
				wordId,
				solved,
				attempts,
				guesses: filteredGuesses,
				shareText,
				servers: commonServers.map((server) => ({
					serverId: server.serverId,
					serverName: server.serverName,
					channelId: server.wordleChannelId,
				})),
			};

			res.json({
				success: true,
				message: "Résultat prêt pour notification (sans image)",
				notificationData,
				serversToNotify: commonServers.length,
			});
		}
	} catch (error) {
		console.error("Erreur lors de la notification de résultat:", error);
		res.status(500).json({
			success: false,
			error: "Erreur interne du serveur",
		});
	}
};

/**
 * Generate shareable text with emoji squares (like original Wordle)
 */
function generateShareableText(
	guesses: string[],
	targetWord: string,
	wordId: number,
	solved: boolean,
	attempts: number,
): string {
	const header = `Pexnet Wordle #${wordId} ${solved ? attempts : "X"}/6`;

	// Generate emoji lines for each guess
	const emojiLines = guesses.map((guess) => {
		const letterResults = analyzeGuessForEmoji(
			guess.toUpperCase(),
			targetWord.toUpperCase(),
		);
		return letterResults
			.map((result) => {
				switch (result.status) {
					case "correct":
						return "🟩"; // Green square
					case "present":
						return "🟨"; // Yellow square
					case "absent":
						return "⬛"; // Black square
					default:
						return "⬛";
				}
			})
			.join("");
	});

	// Add website link
	const footer = "\n🎮 https://pexnet.fr/wordle";

	return [header, "", ...emojiLines, footer].join("\n");
}

/**
 * Analyze a guess for emoji generation
 */
function analyzeGuessForEmoji(
	guess: string,
	targetWord: string,
): Array<{ letter: string; status: "correct" | "present" | "absent" }> {
	const result: Array<{
		letter: string;
		status: "correct" | "present" | "absent";
	}> = [];
	const targetLetters = targetWord.split("");
	const guessLetters = guess.split("");

	// First pass: mark correct letters (green)
	const used = new Array(5).fill(false);
	for (let i = 0; i < 5; i++) {
		if (guessLetters[i] === targetLetters[i]) {
			result[i] = { letter: guessLetters[i], status: "correct" };
			used[i] = true;
		} else {
			result[i] = { letter: guessLetters[i], status: "absent" };
		}
	}

	// Second pass: mark present letters (yellow)
	for (let i = 0; i < 5; i++) {
		if (result[i].status !== "correct") {
			for (let j = 0; j < 5; j++) {
				if (!used[j] && guessLetters[i] === targetLetters[j]) {
					result[i].status = "present";
					used[j] = true;
					break;
				}
			}
		}
	}

	return result;
}

/**
 * Récupérer les statistiques des serveurs avec Wordle configuré depuis l'API du bot
 */
export const getWordleServers = async (req: Request, res: Response) => {
	try {
		const apiUrl = getDiscordBotApiUrl("/wordle/servers");
		const response = await fetch(apiUrl, {
			method: "GET",
			headers: getDiscordBotApiHeaders(),
		});

		if (!response.ok) {
			const errorResponse = handleHttpStatusError(
				response.status,
				"/wordle/servers",
				"getWordleServers",
			);
			return res
				.status(response.status === 404 ? 404 : 500)
				.json(errorResponse);
		}

		const data = await response.json();

		res.status(200).json({
			success: true,
			data,
		});
	} catch (error) {
		const errorResponse = handleDiscordBotApiError(error, "getWordleServers");
		res.status(500).json(errorResponse);
	}
};

/**
 * Récupérer le statut du système de notifications Wordle depuis l'API du bot
 */
export const getWordleNotificationStatus = async (
	req: Request,
	res: Response,
) => {
	try {
		const apiUrl = getDiscordBotApiUrl("/wordle/notifications/status");
		const response = await fetch(apiUrl, {
			method: "GET",
			headers: getDiscordBotApiHeaders(),
		});

		if (!response.ok) {
			const errorResponse = handleHttpStatusError(
				response.status,
				"/wordle/notifications/status",
				"getWordleNotificationStatus",
			);
			return res
				.status(response.status === 404 ? 404 : 500)
				.json(errorResponse);
		}

		const data = await response.json();

		res.status(200).json({
			success: true,
			data,
		});
	} catch (error) {
		const errorResponse = handleDiscordBotApiError(
			error,
			"getWordleNotificationStatus",
		);
		res.status(500).json(errorResponse);
	}
};

/**
 * Forcer la synchronisation de tous les serveurs via l'API du bot
 */
export const forceWordleSyncServers = async (req: Request, res: Response) => {
	try {
		const apiUrl = getDiscordBotApiUrl("/wordle/sync-servers");
		const response = await fetch(apiUrl, {
			method: "PUT",
			headers: getDiscordBotApiHeaders(),
		});

		if (!response.ok) {
			const errorResponse = handleHttpStatusError(
				response.status,
				"/wordle/sync-servers",
				"forceWordleSyncServers",
			);
			// 503 pour sync-servers est acceptable (service non configuré)
			const httpStatus =
				response.status === 404 ? 404 : response.status === 503 ? 503 : 500;
			return res.status(httpStatus).json(errorResponse);
		}

		const data = await response.json();

		res.status(200).json({
			success: true,
			data,
		});
	} catch (error) {
		const errorResponse = handleDiscordBotApiError(
			error,
			"forceWordleSyncServers",
		);
		res.status(500).json(errorResponse);
	}
};

/**
 * Récupérer les statistiques générales Wordle depuis l'API du bot
 */
export const getWordleStats = async (req: Request, res: Response) => {
	try {
		const apiUrl = getDiscordBotApiUrl("/wordle/stats");
		const response = await fetch(apiUrl, {
			method: "GET",
			headers: getDiscordBotApiHeaders(),
		});

		if (!response.ok) {
			const errorResponse = handleHttpStatusError(
				response.status,
				"/wordle/stats",
				"getWordleStats",
			);
			return res
				.status(response.status === 404 ? 404 : 500)
				.json(errorResponse);
		}

		const data = await response.json();

		res.status(200).json({
			success: true,
			data,
		});
	} catch (error) {
		const errorResponse = handleDiscordBotApiError(error, "getWordleStats");
		res.status(500).json(errorResponse);
	}
};

/**
 * Tester la connectivité avec l'API du bot Discord
 */
export const testDiscordBotConnection = async (req: Request, res: Response) => {
	try {
		const apiUrl = getDiscordBotApiUrl("/");
		const startTime = Date.now();

		console.log(
			`[testDiscordBotConnection] Tentative de connexion à: ${apiUrl}`,
		);

		const response = await fetch(apiUrl, {
			method: "GET",
			headers: getDiscordBotApiHeaders(),
		});

		const responseTime = Date.now() - startTime;

		if (!response.ok) {
			return res.status(200).json({
				success: false,
				status: "unreachable",
				message: `API du bot Discord répond avec le statut ${response.status}`,
				details: {
					botApiUrl: config.discord.bot.apiUrl,
					environment: config.environment,
					httpStatus: response.status,
					responseTime: `${responseTime}ms`,
				},
			});
		}

		let data: any;
		try {
			data = await response.json();
		} catch {
			data = { message: "Réponse non-JSON reçue" };
		}

		res.status(200).json({
			success: true,
			status: "connected",
			message: "API du bot Discord accessible",
			data,
			details: {
				botApiUrl: config.discord.bot.apiUrl,
				environment: config.environment,
				httpStatus: response.status,
				responseTime: `${responseTime}ms`,
			},
		});
	} catch (error) {
		const errorResponse = handleDiscordBotApiError(
			error,
			"testDiscordBotConnection",
		);
		res.status(200).json({
			...errorResponse,
			status: "disconnected",
		});
	}
};

/**
 * Marquer des notifications comme traitées
 * Appelé par le bot Discord après l'envoi des notifications
 */
export const markNotificationsAsProcessed = async (
	req: Request,
	res: Response,
) => {
	try {
		const { notificationIds } = req.body;

		if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
			return res.status(400).json({
				success: false,
				error: "notificationIds (array) est requis et ne doit pas être vide",
			});
		}

		// Marquer les notifications comme traitées
		const result = await WordlePendingNotification.updateMany(
			{
				_id: { $in: notificationIds },
				isProcessed: false,
			},
			{
				$set: {
					isProcessed: true,
					processedAt: new Date(),
				},
			},
		);

		console.log(
			`✅ ${result.modifiedCount}/${notificationIds.length} notifications marquées comme traitées`,
		);

		res.json({
			success: true,
			processed: result.modifiedCount,
			requested: notificationIds.length,
			message: `${result.modifiedCount} notifications traitées avec succès`,
		});
	} catch (error) {
		console.error("Erreur lors du marquage des notifications:", error);
		res.status(500).json({
			success: false,
			error: "Erreur interne du serveur",
		});
	}
};

/**
 * Obtenir la liste des utilisateurs avec des notifications en attente
 * Utilisé par le bot Discord pour savoir quels utilisateurs traiter
 */
export const getActiveUsersWithNotifications = async (
	req: Request,
	res: Response,
) => {
	try {
		// Récupérer tous les discordId qui ont des notifications non traitées
		const activeUsers = await WordlePendingNotification.distinct("discordId", {
			isProcessed: false,
			expiresAt: { $gt: new Date() }, // Pas expirées
		});

		// Ne logger que s'il y a des utilisateurs avec notifications
		if (activeUsers.length > 0) {
			console.log(
				`📋 ${activeUsers.length} utilisateur(s) avec notifications en attente`,
			);
		}

		res.json({
			success: true,
			users: activeUsers,
			count: activeUsers.length,
		});
	} catch (error) {
		console.error(
			"Erreur lors de la récupération des utilisateurs actifs:",
			error,
		);
		res.status(500).json({
			success: false,
			users: [],
			count: 0,
			error: "Erreur interne du serveur",
		});
	}
};
