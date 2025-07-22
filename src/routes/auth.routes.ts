import { Router } from "express";
import AuthController from "@controllers/auth.controller";
import { ensureAuthenticated } from "@middleware/auth.middleware";
import { forceGuildSync } from "@middleware/guildSync.middleware";
import passport from "@utils/passport";
import { LogInfo, LogError } from "@utils/logger";

const router = Router();

/**
 * @swagger
 * /api/auth/discord:
 *   get:
 *     summary: Initiate Discord OAuth2 authentication
 *     tags: [Auth]
 *     description: Redirects user to Discord OAuth2 authorization page
 *     responses:
 *       302:
 *         description: Redirect to Discord OAuth2
 */
router.get("/discord", AuthController.loginDiscord);

/**
 * @swagger
 * /api/auth/discord/callback:
 *   get:
 *     summary: Discord OAuth2 callback
 *     tags: [Auth]
 *     description: Handles callback from Discord OAuth2 and creates user session
 *     parameters:
 *       - in: query
 *         name: code
 *         schema:
 *           type: string
 *         description: Authorization code from Discord
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *         description: State parameter for security
 *     responses:
 *       302:
 *         description: Redirect to success or failure page
 */
router.get(
	"/discord/callback",
	passport.authenticate("discord", {
		failureRedirect: "/api/auth/failure",
	}),
	AuthController.discordCallback,
);

/**
 * @swagger
 * /api/auth/success:
 *   get:
 *     summary: Authentication success page
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Authentication successful
 */
router.get("/success", AuthController.authSuccess);

/**
 * @swagger
 * /api/auth/failure:
 *   get:
 *     summary: Authentication failure page
 *     tags: [Auth]
 *     responses:
 *       401:
 *         description: Authentication failed
 */
router.get("/failure", AuthController.authFailure);

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     summary: Get current user profile
 *     tags: [Auth]
 *     security:
 *       - sessionAuth: []
 *     description: Récupère le profil de l'utilisateur actuellement connecté
 *     responses:
 *       200:
 *         description: Profil utilisateur récupéré avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     userId:
 *                       type: string
 *                     username:
 *                       type: string
 *                     discriminator:
 *                       type: string
 *                     email:
 *                       type: string
 *                     avatar:
 *                       type: string
 *                     voiceTime:
 *                       type: number
 *       401:
 *         description: Utilisateur non authentifié
 */
router.get("/profile", AuthController.getProfile);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout current user
 *     tags: [Auth]
 *     security:
 *       - sessionAuth: []
 *     description: Déconnecte l'utilisateur actuellement connecté
 *     responses:
 *       200:
 *         description: Déconnexion réussie
 *       500:
 *         description: Erreur lors de la déconnexion
 */
router.post("/logout", AuthController.logout);

/**
 * @swagger
 * /api/auth/guilds:
 *   get:
 *     summary: Récupérer les serveurs Discord de l'utilisateur
 *     tags: [Auth - Guilds]
 *     security:
 *       - sessionAuth: []
 *     description: Récupère la liste des serveurs Discord stockée en base de données
 *     responses:
 *       200:
 *         description: Serveurs Discord récupérés avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     userId:
 *                       type: string
 *                     guildsCount:
 *                       type: number
 *                     guilds:
 *                       type: array
 *                       items:
 *                         type: string
 *                     lastSync:
 *                       type: string
 *                       format: date-time
 *                     needsSync:
 *                       type: boolean
 *       401:
 *         description: Utilisateur non authentifié
 *       500:
 *         description: Erreur lors de la récupération
 */
router.get("/guilds", ensureAuthenticated, AuthController.getUserGuilds);

/**
 * @swagger
 * /api/auth/guilds/sync:
 *   post:
 *     summary: Synchroniser les serveurs Discord de l'utilisateur
 *     tags: [Auth - Guilds]
 *     security:
 *       - sessionAuth: []
 *     description: Récupère la liste actuelle des serveurs Discord via l'API Discord et met à jour la base de données
 *     responses:
 *       200:
 *         description: Synchronisation réussie
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     userId:
 *                       type: string
 *                     guildsCount:
 *                       type: number
 *                     guilds:
 *                       type: array
 *                       items:
 *                         type: string
 *                     lastSync:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Token d'accès Discord manquant
 *       401:
 *         description: Utilisateur non authentifié
 *       500:
 *         description: Erreur lors de la synchronisation
 */
router.post("/guilds/sync", ensureAuthenticated, AuthController.syncUserGuilds);

/**
 * @swagger
 * /api/auth/guilds/sync/force:
 *   post:
 *     summary: Forcer une synchronisation immédiate des guilds
 *     tags: [Auth - Guilds]
 *     security:
 *       - sessionAuth: []
 *     description: Force une synchronisation immédiate des guilds Discord, utile pour le frontend
 *     responses:
 *       200:
 *         description: Synchronisation forcée réussie
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     userId:
 *                       type: string
 *                     guildsCount:
 *                       type: number
 *                     guilds:
 *                       type: array
 *                       items:
 *                         type: string
 *                     lastSync:
 *                       type: string
 *                       format: date-time
 *                     syncType:
 *                       type: string
 *                       enum: [force]
 *       400:
 *         description: Token d'accès Discord manquant
 *       401:
 *         description: Utilisateur non authentifié
 *       500:
 *         description: Erreur lors de la synchronisation forcée
 */
router.post("/guilds/sync/force", ensureAuthenticated, forceGuildSync);

/**
 * @swagger
 * /api/auth/discord/diagnose:
 *   get:
 *     summary: Diagnostiquer les permissions Discord de l'utilisateur
 *     tags: [Auth - Debug]
 *     security:
 *       - sessionAuth: []
 *     description: Teste les permissions Discord et fournit des recommandations pour résoudre les problèmes
 *     responses:
 *       200:
 *         description: Diagnostic effectué avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 user:
 *                   type: object
 *                   properties:
 *                     discordId:
 *                       type: string
 *                     username:
 *                       type: string
 *                     discriminator:
 *                       type: string
 *                 diagnosis:
 *                   type: object
 *                   properties:
 *                     authenticated:
 *                       type: boolean
 *                     hasDiscordId:
 *                       type: boolean
 *                     hasAccessToken:
 *                       type: boolean
 *                     hasRefreshToken:
 *                       type: boolean
 *                     canAccessGuilds:
 *                       type: boolean
 *                     needsReconnection:
 *                       type: boolean
 *                     apiTest:
 *                       type: object
 *                     recommendations:
 *                       type: array
 *                       items:
 *                         type: string
 *                 nextSteps:
 *                   type: array
 *                   items:
 *                     type: string
 *       401:
 *         description: Diagnostic pour utilisateur non authentifié (avec recommandations)
 *       500:
 *         description: Erreur lors du diagnostic
 */
router.get("/discord/diagnose", AuthController.diagnoseDiscordPermissions);

export default router;
