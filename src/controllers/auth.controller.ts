import { Request, Response } from "express";
import passport from "@utils/passport";
import { LogInfo } from "@utils/logger";
import { config } from "../app.config";
import User from "../models/User";

const loginDiscord = (req: Request, res: Response, next: any) => {
	LogInfo("Discord OAuth: Initiating authentication");
	passport.authenticate("discord")(req, res, next);
};

const discordCallback = (req: Request, res: Response, next: any) => {
	// L'authentification a déjà été gérée par passport.authenticate() dans la route
	// On vérifie simplement si elle a réussi et on redirige
	if (req.user) {
		LogInfo(
			`Discord OAuth: Authentication callback successful for user ${(req.user as any).username}`,
		);
		return res.redirect(`${config.frontend.url}/auth/success`);
	} else {
		LogInfo("Discord OAuth: Authentication callback failed - no user found");
		return res.redirect(`${config.frontend.url}/auth/failure`);
	}
};

const authSuccess = (req: Request, res: Response) => {
	if (req.user) {
		const user = req.user as any;
		LogInfo(
			`Discord OAuth: Authentication successful for user ${user.username}`,
		);
		res.status(200).json({
			success: true,
			message: "Authentication successful",
			user: {
				id: user._id,
				userId: user.userId,
				username: user.username,
				discriminator: user.discriminator,
				email: user.email,
				avatar: user.imageUrl,
				voiceTime: user.voiceTime,
			},
		});
	} else {
		res.status(401).json({
			success: false,
			message: "Authentication failed",
		});
	}
};

const authFailure = (_req: Request, res: Response) => {
	LogInfo("Discord OAuth: Authentication failed");
	res.status(401).json({
		success: false,
		message: "Discord authentication failed",
	});
};

const logout = (req: Request, res: Response) => {
	const user = req.user as any;
	if (user) {
		LogInfo(`Discord OAuth: User ${user.username} logging out`);
	}

	req.logout((err) => {
		if (err) {
			return res.status(500).json({
				success: false,
				message: "Logout failed",
			});
		}
		res.status(200).json({
			success: true,
			message: "Logged out successfully",
		});
	});
};

const getProfile = (req: Request, res: Response) => {
	if (req.user) {
		const user = req.user as any;
		res.status(200).json({
			success: true,
			user: {
				id: user._id,
				userId: user.userId,
				username: user.username,
				discriminator: user.discriminator,
				email: user.email,
				avatar: user.imageUrl,
				voiceTime: user.voiceTime,
			},
		});
	} else {
		res.status(401).json({
			success: false,
			message: "Not authenticated",
		});
	}
};

const redirectToFrontend = (req: Request, res: Response) => {
	const path = (req.query.path as string) || "";
	const redirectUrl = `${config.frontend.url}${path}`;
	LogInfo(`Redirecting to frontend: ${redirectUrl}`);
	res.redirect(redirectUrl);
};

/**
 * Récupérer les guilds Discord d'un utilisateur via l'API Discord
 */
const fetchUserGuildsFromDiscord = async (
	accessToken: string,
): Promise<string[]> => {
	try {
		console.log(
			"[fetchUserGuildsFromDiscord] Récupération des guilds depuis Discord API...",
		);

		const response = await fetch("https://discord.com/api/users/@me/guilds", {
			headers: {
				Authorization: `Bearer ${accessToken}`,
				"Content-Type": "application/json",
			},
		});

		console.log(
			`[fetchUserGuildsFromDiscord] Réponse Discord API: ${response.status} ${response.statusText}`,
		);

		if (!response.ok) {
			// Lire le corps de la réponse pour plus de détails
			let errorDetails: any = {};
			try {
				errorDetails = await response.json();
			} catch (e) {
				errorDetails = {
					message: "Impossible de lire les détails de l'erreur",
				};
			}

			console.error(`[fetchUserGuildsFromDiscord] Erreur Discord API:`, {
				status: response.status,
				statusText: response.statusText,
				details: errorDetails,
			});

			// Messages d'erreur spécifiques selon le code de statut
			switch (response.status) {
				case 401:
					throw new Error(
						"Token Discord invalide ou expiré. L'utilisateur doit se reconnecter.",
					);
				case 403:
					throw new Error(
						'Permissions insuffisantes. Le scope "guilds" est requis.',
					);
				case 429:
					throw new Error(
						"Trop de requêtes vers l'API Discord. Réessayez plus tard.",
					);
				default:
					throw new Error(
						`Erreur API Discord (${response.status}): ${errorDetails.message || response.statusText}`,
					);
			}
		}

		const guilds = (await response.json()) as Array<{
			id: string;
			name: string;
			[key: string]: any;
		}>;

		console.log(
			`[fetchUserGuildsFromDiscord] ${guilds.length} guilds récupérées avec succès`,
		);

		// Extraire seulement les IDs des guilds
		return guilds.map((guild) => guild.id);
	} catch (error) {
		console.error("Erreur lors de la récupération des guilds Discord:", error);
		throw error;
	}
};

/**
 * Synchroniser les guilds d'un utilisateur
 */
const syncUserGuilds = async (req: Request, res: Response) => {
	try {
		if (!req.user) {
			return res.status(401).json({
				success: false,
				message: "Utilisateur non authentifié",
			});
		}

		const user = req.user as any;

		if (!user.accessToken) {
			return res.status(400).json({
				success: false,
				message: "Token d'accès Discord non disponible",
			});
		}

		// Récupérer les guilds depuis Discord
		const guildIds = await fetchUserGuildsFromDiscord(user.accessToken);

		// Mettre à jour l'utilisateur dans la base de données
		const updatedUser = await User.findByIdAndUpdate(
			user._id,
			{
				guilds: guildIds,
				guildsLastSync: new Date(),
			},
			{ new: true },
		);

		if (!updatedUser) {
			return res.status(404).json({
				success: false,
				message: "Utilisateur non trouvé",
			});
		}

		LogInfo(
			`Guilds synchronisés pour l'utilisateur ${user.username}: ${guildIds.length} serveurs`,
		);

		res.status(200).json({
			success: true,
			message: `${guildIds.length} serveurs Discord synchronisés`,
			data: {
				userId: user.discordId,
				guildsCount: guildIds.length,
				guilds: guildIds,
				lastSync: updatedUser.guildsLastSync,
			},
		});
	} catch (error) {
		console.error("Erreur lors de la synchronisation des guilds:", error);
		res.status(500).json({
			success: false,
			message: "Erreur lors de la synchronisation des serveurs Discord",
			error: error instanceof Error ? error.message : "Erreur inconnue",
		});
	}
};

/**
 * Obtenir les guilds d'un utilisateur depuis la base de données
 */
const getUserGuilds = async (req: Request, res: Response) => {
	try {
		if (!req.user) {
			return res.status(401).json({
				success: false,
				message: "Utilisateur non authentifié",
			});
		}

		const user = req.user as any;
		const dbUser = await User.findById(user._id).select(
			"guilds guildsLastSync discordId username",
		);

		if (!dbUser) {
			return res.status(404).json({
				success: false,
				message: "Utilisateur non trouvé",
			});
		}

		const userGuilds = (dbUser.guilds as string[]) || [];

		res.status(200).json({
			success: true,
			data: {
				userId: dbUser.discordId,
				username: dbUser.username,
				guildsCount: userGuilds.length,
				guilds: userGuilds,
				lastSync: dbUser.guildsLastSync,
				needsSync:
					!dbUser.guildsLastSync ||
					Date.now() - dbUser.guildsLastSync.getTime() > 24 * 60 * 60 * 1000, // 24h
			},
		});
	} catch (error) {
		console.error(
			"Erreur lors de la récupération des guilds utilisateur:",
			error,
		);
		res.status(500).json({
			success: false,
			message: "Erreur lors de la récupération des serveurs Discord",
		});
	}
};

/**
 * Diagnostiquer l'état des permissions Discord d'un utilisateur
 */
const diagnoseDiscordPermissions = async (req: Request, res: Response) => {
	try {
		if (!req.user) {
			return res.status(401).json({
				success: false,
				message: "Utilisateur non authentifié",
				diagnosis: {
					authenticated: false,
					hasDiscordToken: false,
					canAccessGuilds: false,
					needsReconnection: true,
					recommendations: [
						"Se connecter via Discord OAuth2",
						"Aller à /api/auth/discord",
					],
				},
			});
		}

		const user = req.user as any;

		// Vérifications de base
		const hasDiscordId = !!user.discordId;
		const hasAccessToken = !!user.accessToken;
		const hasRefreshToken = !!user.refreshToken;

		let canAccessGuilds = false;
		let apiTestResult: any = null;

		// Test de l'API Discord si on a un token
		if (hasAccessToken) {
			try {
				const response = await fetch(
					"https://discord.com/api/users/@me/guilds?limit=1",
					{
						headers: {
							Authorization: `Bearer ${user.accessToken}`,
							"Content-Type": "application/json",
						},
					},
				);

				canAccessGuilds = response.ok;
				apiTestResult = {
					status: response.status,
					statusText: response.statusText,
					accessible: response.ok,
				};

				if (response.ok) {
					// Compter les guilds rapidement
					const guilds = await response.json();
					apiTestResult.sampleGuildsCount = Array.isArray(guilds)
						? guilds.length
						: 0;
				}
			} catch (error) {
				apiTestResult = {
					error: error instanceof Error ? error.message : "Erreur inconnue",
					accessible: false,
				};
			}
		}

		// Analyse des permissions et recommandations
		const diagnosis = {
			authenticated: true,
			hasDiscordId,
			hasAccessToken,
			hasRefreshToken,
			canAccessGuilds,
			needsReconnection: !canAccessGuilds && hasAccessToken, // A un token mais ne peut pas accéder aux guilds
			apiTest: apiTestResult,
			recommendations: [] as string[],
		};

		// Génération des recommandations
		if (!hasDiscordId) {
			diagnosis.recommendations.push("Connexion Discord OAuth2 requise");
		} else if (!hasAccessToken) {
			diagnosis.recommendations.push(
				"Token d'accès Discord manquant - reconnexion requise",
			);
		} else if (!canAccessGuilds) {
			diagnosis.recommendations.push(
				'Le scope "guilds" n\'est pas autorisé - reconnexion requise avec les nouvelles permissions',
			);
			diagnosis.recommendations.push("Se déconnecter : POST /api/auth/logout");
			diagnosis.recommendations.push("Se reconnecter : GET /api/auth/discord");
		} else {
			diagnosis.recommendations.push(
				"Tout semble correct ! Vous pouvez synchroniser vos guilds avec POST /api/auth/guilds/sync",
			);
		}

		res.status(200).json({
			success: true,
			user: {
				discordId: user.discordId,
				username: user.username,
				discriminator: user.discriminator,
			},
			diagnosis,
			nextSteps: canAccessGuilds
				? [
						"Synchroniser les guilds : POST /api/auth/guilds/sync",
						"Voir les serveurs communs : GET /api/discord/users/{discordId}/common-servers",
					]
				: [
						"Se déconnecter : POST /api/auth/logout",
						"Se reconnecter : GET /api/auth/discord",
						'Autoriser le scope "guilds" lors de l\'autorisation',
						"Retester : GET /api/auth/discord/diagnose",
					],
		});
	} catch (error) {
		console.error("Erreur lors du diagnostic des permissions Discord:", error);
		res.status(500).json({
			success: false,
			message: "Erreur lors du diagnostic des permissions Discord",
			error: error instanceof Error ? error.message : "Erreur inconnue",
		});
	}
};

export default {
	loginDiscord,
	discordCallback,
	authSuccess,
	authFailure,
	logout,
	getProfile,
	redirectToFrontend,
	syncUserGuilds,
	getUserGuilds,
	diagnoseDiscordPermissions,
};
