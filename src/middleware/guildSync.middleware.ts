import { Request, Response, NextFunction } from "express";
import User from "@models/User";
import { LogInfo, LogError } from "@utils/logger";

/**
 * Récupérer les guilds Discord d'un utilisateur via l'API Discord
 */
const fetchUserGuildsFromDiscord = async (
	accessToken: string,
): Promise<string[]> => {
	try {
		const response = await fetch("https://discord.com/api/users/@me/guilds", {
			headers: {
				Authorization: `Bearer ${accessToken}`,
				"Content-Type": "application/json",
			},
		});

		if (!response.ok) {
			// Ne pas lancer d'erreur pour ne pas casser le flux principal
			LogError(`[guildSync] Discord API error: ${response.status}`);
			return [];
		}

		const guilds = (await response.json()) as Array<{
			id: string;
			name: string;
			[key: string]: any;
		}>;

		return guilds.map((guild) => guild.id);
	} catch (error) {
		LogError(`[guildSync] Error fetching guilds: ${error}`);
		return [];
	}
};

/**
 * Vérifier si les guilds d'un utilisateur ont besoin d'être synchronisées
 */
const needsGuildSync = (user: any): boolean => {
	// Pas de guilds du tout
	if (!user.guilds || user.guilds.length === 0) {
		return true;
	}

	// Pas de dernière sync
	if (!user.guildsLastSync) {
		return true;
	}

	// Plus de 6 heures depuis la dernière sync
	const sixHoursAgo = Date.now() - 6 * 60 * 60 * 1000;
	return user.guildsLastSync.getTime() < sixHoursAgo;
};

/**
 * Synchroniser les guilds d'un utilisateur en arrière-plan
 */
const syncUserGuildsBackground = async (user: any): Promise<void> => {
	try {
		if (!user.accessToken) {
			LogInfo(
				`[guildSync] User ${user.discordId} has no access token, skipping sync`,
			);
			return;
		}

		LogInfo(`[guildSync] Starting background sync for user ${user.discordId}`);

		const guildIds = await fetchUserGuildsFromDiscord(user.accessToken);

		if (guildIds.length > 0) {
			await User.findByIdAndUpdate(user._id, {
				guilds: guildIds,
				guildsLastSync: new Date(),
			});

			LogInfo(
				`[guildSync] Successfully synced ${guildIds.length} guilds for user ${user.discordId}`,
			);
		} else {
			LogError(`[guildSync] No guilds retrieved for user ${user.discordId}`);
		}
	} catch (error) {
		LogError(
			`[guildSync] Background sync failed for user ${user.discordId}: ${error}`,
		);
	}
};

/**
 * Middleware pour détecter les sessions actives et synchroniser les guilds si nécessaire
 */
export const autoGuildSyncMiddleware = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	// Continuer même s'il y a des erreurs pour ne pas casser l'application
	try {
		// Vérifier si l'utilisateur est connecté
		if (!req.user) {
			return next();
		}

		const user = req.user as any;

		// Vérifier si l'utilisateur a un Discord ID et un token
		if (!user.discordId || !user.accessToken) {
			return next();
		}

		// Vérifier si une sync est nécessaire
		if (needsGuildSync(user)) {
			LogInfo(
				`[guildSync] User ${user.discordId} needs guild sync, starting background process`,
			);

			// Synchroniser en arrière-plan (non-bloquant)
			syncUserGuildsBackground(user).catch((error) => {
				LogError(`[guildSync] Background sync error: ${error}`);
			});
		}
	} catch (error) {
		LogError(`[guildSync] Middleware error: ${error}`);
	}

	// Toujours continuer vers le prochain middleware
	next();
};

/**
 * Middleware spécifique pour s'assurer que les guilds sont à jour avant les actions Wordle critiques
 */
export const ensureGuildsUpToDate = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	try {
		if (!req.user) {
			return next();
		}

		const user = req.user as any;

		if (!user.discordId || !user.accessToken) {
			return next();
		}

		// Pour les actions critiques, on force une sync si elle est ancienne
		const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
		const needsUrgentSync =
			!user.guildsLastSync || user.guildsLastSync.getTime() < twoHoursAgo;

		if (needsUrgentSync) {
			LogInfo(
				`[guildSync] Critical action detected, ensuring fresh guilds for user ${user.discordId}`,
			);

			const guildIds = await fetchUserGuildsFromDiscord(user.accessToken);

			if (guildIds.length > 0) {
				// Mettre à jour l'utilisateur en base ET dans la session
				await User.findByIdAndUpdate(user._id, {
					guilds: guildIds,
					guildsLastSync: new Date(),
				});

				// Mettre à jour l'objet user dans req.user pour les middlewares suivants
				user.guilds = guildIds;
				user.guildsLastSync = new Date();

				LogInfo(
					`[guildSync] Successfully updated ${guildIds.length} guilds for critical action`,
				);
			}
		}
	} catch (error) {
		LogError(`[guildSync] Critical sync error: ${error}`);
		// Continuer même en cas d'erreur pour ne pas bloquer l'action principale
	}

	next();
};

/**
 * Endpoint pour forcer une synchronisation immédiate (utile pour le frontend)
 */
export const forceGuildSync = async (req: Request, res: Response) => {
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
				message: "Token d'accès Discord manquant",
			});
		}

		LogInfo(`[guildSync] Force sync requested by user ${user.discordId}`);

		const guildIds = await fetchUserGuildsFromDiscord(user.accessToken);

		if (guildIds.length === 0) {
			return res.status(500).json({
				success: false,
				message: "Impossible de récupérer les guilds depuis Discord",
			});
		}

		const updatedUser = await User.findByIdAndUpdate(
			user._id,
			{ guilds: guildIds, guildsLastSync: new Date() },
			{ new: true },
		);

		res.json({
			success: true,
			message: `${guildIds.length} serveurs Discord synchronisés avec succès`,
			data: {
				userId: updatedUser?.discordId,
				guildsCount: guildIds.length,
				guilds: guildIds,
				lastSync: updatedUser?.guildsLastSync,
				syncType: "force",
			},
		});
	} catch (error) {
		LogError(`[guildSync] Force sync error: ${error}`);
		res.status(500).json({
			success: false,
			message: "Erreur lors de la synchronisation forcée des guilds",
			error: error instanceof Error ? error.message : "Erreur inconnue",
		});
	}
};

export default {
	autoGuildSyncMiddleware,
	ensureGuildsUpToDate,
	forceGuildSync,
};
