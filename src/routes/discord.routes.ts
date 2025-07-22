import express from "express";
import {
	registerServer,
	leaveServer,
	updateServerUsers,
	getCommonServers,
	getAllServerNotifications,
	getActiveUsersWithNotifications,
	setWordleChannel,
	getActiveServers,
	notifyGameResult,
	markNotificationsAsProcessed,
	getWordleServers,
	getWordleNotificationStatus,
	forceWordleSyncServers,
	getWordleStats,
	testDiscordBotConnection,
} from "@controllers/discord.controller";
import { ensureAuthenticated } from "@middlewares/auth.middleware";

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     DiscordServer:
 *       type: object
 *       required:
 *         - serverId
 *         - serverName
 *         - ownerId
 *       properties:
 *         serverId:
 *           type: string
 *           description: ID Discord du serveur
 *         serverName:
 *           type: string
 *           description: Nom du serveur Discord
 *         iconUrl:
 *           type: string
 *           description: URL de l'icône du serveur
 *         ownerId:
 *           type: string
 *           description: ID Discord du propriétaire du serveur
 *         memberCount:
 *           type: number
 *           description: Nombre de membres approximatif
 *         wordleChannelId:
 *           type: string
 *           description: ID du canal dédié aux résultats Wordle
 *     DiscordUser:
 *       type: object
 *       required:
 *         - discordId
 *       properties:
 *         discordId:
 *           type: string
 *           description: ID Discord de l'utilisateur
 *         nickname:
 *           type: string
 *           description: Surnom sur ce serveur
 *         roles:
 *           type: array
 *           items:
 *             type: string
 *           description: Liste des rôles
 *         permissions:
 *           type: array
 *           items:
 *             type: string
 *           description: Permissions spéciales
 *     CommonServer:
 *       type: object
 *       properties:
 *         serverId:
 *           type: string
 *         serverName:
 *           type: string
 *         wordleChannelId:
 *           type: string
 *         autoNotify:
 *           type: boolean
 *     GameNotification:
 *       type: object
 *       required:
 *         - discordId
 *         - wordId
 *       properties:
 *         discordId:
 *           type: string
 *           description: ID Discord du joueur
 *         wordId:
 *           type: number
 *           description: ID du mot Wordle
 *         solved:
 *           type: boolean
 *           description: Partie réussie ou non
 *         attempts:
 *           type: number
 *           description: Nombre de tentatives (0-6)
 *         guesses:
 *           type: array
 *           items:
 *             type: string
 *           description: Liste des mots tentés
 */

/**
 * @swagger
 * /api/discord/servers:
 *   post:
 *     summary: Enregistrer ou mettre à jour un serveur Discord
 *     tags: [Discord]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DiscordServer'
 *     responses:
 *       200:
 *         description: Serveur enregistré avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 server:
 *                   type: object
 *       400:
 *         description: Données manquantes
 *       500:
 *         description: Erreur serveur
 */
router.post("/servers", registerServer);

/**
 * @swagger
 * /api/discord/servers/{serverId}/leave:
 *   delete:
 *     summary: Marquer un serveur comme inactif (bot retiré)
 *     tags: [Discord]
 *     parameters:
 *       - in: path
 *         name: serverId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID du serveur Discord
 *     responses:
 *       200:
 *         description: Serveur marqué comme inactif
 *       404:
 *         description: Serveur non trouvé
 *       500:
 *         description: Erreur serveur
 */
router.delete("/servers/:serverId/leave", leaveServer);

/**
 * @swagger
 * /api/discord/servers/{serverId}/users:
 *   put:
 *     summary: Mettre à jour les utilisateurs d'un serveur
 *     tags: [Discord]
 *     parameters:
 *       - in: path
 *         name: serverId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID du serveur Discord
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - users
 *             properties:
 *               users:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/DiscordUser'
 *     responses:
 *       200:
 *         description: Utilisateurs mis à jour avec succès
 *       400:
 *         description: Données manquantes
 *       404:
 *         description: Serveur non trouvé
 *       500:
 *         description: Erreur serveur
 */
router.put("/servers/:serverId/users", updateServerUsers);

/**
 * @swagger
 * /api/discord/users/{discordId}/common-servers:
 *   get:
 *     summary: Obtenir les serveurs avec notifications Wordle en attente
 *     tags: [Discord - Notifications]
 *     description: Récupère les serveurs communs avec leurs notifications Wordle en attente pour l'utilisateur spécifié. Format utilisé par le WordleNotificationJob du bot Discord.
 *     parameters:
 *       - in: path
 *         name: discordId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID Discord de l'utilisateur
 *     responses:
 *       200:
 *         description: Serveurs avec notifications en attente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 servers:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       serverId:
 *                         type: string
 *                         description: ID du serveur Discord
 *                       channelId:
 *                         type: string
 *                         description: ID du canal Wordle configuré
 *                       notificationData:
 *                         type: object
 *                         properties:
 *                           username:
 *                             type: string
 *                           avatar:
 *                             type: string
 *                             description: URL de l'avatar utilisateur
 *                           grid:
 *                             type: string
 *                             description: Grille d'emojis du résultat Wordle
 *                           image:
 *                             type: string
 *                             description: Image PNG du résultat Wordle en base64
 *                           attempts:
 *                             type: number
 *                             description: Nombre de tentatives utilisées
 *                           time:
 *                             type: string
 *                             description: Temps de completion (format MM:SS)
 *                           streak:
 *                             type: number
 *                             description: Série actuelle du joueur
 *                           puzzle:
 *                             type: number
 *                             description: Numéro du puzzle Wordle
 *                           date:
 *                             type: string
 *                             description: Date du jeu (format YYYY-MM-DD)
 *                           solved:
 *                             type: boolean
 *                             description: Partie réussie ou non
 *                           timeToComplete:
 *                             type: number
 *                             description: Temps en millisecondes
 *                           notificationId:
 *                             type: string
 *                             description: ID de la notification à marquer comme traitée (notification unique)
 *                           isGrouped:
 *                             type: boolean
 *                             description: Indique si cette notification regroupe plusieurs jeux
 *                           gamesCount:
 *                             type: number
 *                             description: Nombre de jeux groupés (si isGrouped=true)
 *                           playersCount:
 *                             type: number
 *                             description: Nombre de joueurs différents (si isGrouped=true)
 *                           solvedCount:
 *                             type: number
 *                             description: Nombre de jeux résolus (si isGrouped=true)
 *                           avgAttempts:
 *                             type: number
 *                             description: Moyenne des tentatives (si isGrouped=true)
 *                           notificationIds:
 *                             type: array
 *                             items:
 *                               type: string
 *                             description: IDs des notifications pour marquage (notification groupée)
 *       400:
 *         description: discordId manquant
 *       500:
 *         description: Erreur serveur
 */
router.get("/users/:discordId/common-servers", getCommonServers);

/**
 * @swagger
 * /api/discord/servers/notifications:
 *   get:
 *     summary: Obtenir toutes les notifications groupées par serveur
 *     tags: [Discord - Notifications]
 *     description: Récupère toutes les notifications Wordle groupées par serveur. Évite la duplication lors des appels multiples.
 *     responses:
 *       200:
 *         description: Notifications groupées par serveur
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 servers:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       serverId:
 *                         type: string
 *                         description: ID du serveur Discord
 *                       channelId:
 *                         type: string
 *                         description: ID du canal de notification
 *                       notificationData:
 *                         $ref: '#/components/schemas/NotificationData'
 *       500:
 *         description: Erreur serveur
 */
router.get("/servers/notifications", getAllServerNotifications);

/**
 * @swagger
 * /api/discord/users/active-with-notifications:
 *   get:
 *     summary: Obtenir les utilisateurs avec notifications Wordle en attente
 *     tags: [Discord - Notifications]
 *     description: Récupère la liste des IDs Discord des utilisateurs qui ont des notifications Wordle non traitées. Utilisé par le bot Discord pour savoir quels utilisateurs traiter.
 *     responses:
 *       200:
 *         description: Liste des utilisateurs avec notifications en attente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 users:
 *                   type: array
 *                   items:
 *                     type: string
 *                   description: Liste des Discord IDs avec notifications en attente
 *                 count:
 *                   type: number
 *                   description: Nombre d'utilisateurs avec notifications
 *       500:
 *         description: Erreur serveur
 */
router.get("/users/active-with-notifications", getActiveUsersWithNotifications);

/**
 * @swagger
 * /api/discord/notifications/processed:
 *   post:
 *     summary: Marquer des notifications comme traitées
 *     tags: [Discord - Notifications]
 *     description: Marque les notifications spécifiées comme traitées après leur envoi par le bot Discord
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - notificationIds
 *             properties:
 *               notificationIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Liste des IDs de notifications à marquer comme traitées
 *     responses:
 *       200:
 *         description: Notifications marquées comme traitées avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 processed:
 *                   type: number
 *                   description: Nombre de notifications réellement traitées
 *                 requested:
 *                   type: number
 *                   description: Nombre de notifications demandées
 *                 message:
 *                   type: string
 *       400:
 *         description: Données manquantes ou invalides
 *       500:
 *         description: Erreur serveur
 */
router.post("/notifications/processed", markNotificationsAsProcessed);

/**
 * @swagger
 * /api/discord/servers/{serverId}/wordle-channel:
 *   put:
 *     summary: Configurer le canal Wordle d'un serveur
 *     tags: [Discord]
 *     parameters:
 *       - in: path
 *         name: serverId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID du serveur Discord
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - channelId
 *             properties:
 *               channelId:
 *                 type: string
 *                 description: ID du canal Discord
 *               channelName:
 *                 type: string
 *                 description: Nom du canal (optionnel)
 *     responses:
 *       200:
 *         description: Canal Wordle configuré
 *       400:
 *         description: Données manquantes
 *       404:
 *         description: Serveur non trouvé
 *       500:
 *         description: Erreur serveur
 */
router.put("/servers/:serverId/wordle-channel", setWordleChannel);

/**
 * @swagger
 * /api/discord/servers:
 *   get:
 *     summary: Obtenir la liste des serveurs actifs
 *     tags: [Discord]
 *     responses:
 *       200:
 *         description: Liste des serveurs actifs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 servers:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       serverId:
 *                         type: string
 *                       serverName:
 *                         type: string
 *                       memberCount:
 *                         type: number
 *                       wordleChannelId:
 *                         type: string
 *                       lastActivity:
 *                         type: string
 *                         format: date-time
 *                 totalActive:
 *                   type: number
 *       500:
 *         description: Erreur serveur
 */
router.get("/servers", getActiveServers);

/**
 * @swagger
 * /api/discord/game-result:
 *   post:
 *     summary: Notifier la fin d'une partie Wordle
 *     tags: [Discord]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GameNotification'
 *     responses:
 *       200:
 *         description: Notification préparée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 notificationData:
 *                   type: object
 *                   properties:
 *                     discordId:
 *                       type: string
 *                     word:
 *                       type: string
 *                     wordId:
 *                       type: number
 *                     solved:
 *                       type: boolean
 *                     attempts:
 *                       type: number
 *                     guesses:
 *                       type: array
 *                       items:
 *                         type: string
 *                     image:
 *                       type: string
 *                       description: Image base64 (optionnel)
 *                     shareText:
 *                       type: string
 *                       description: Texte formaté avec emojis
 *                     servers:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           serverId:
 *                             type: string
 *                           serverName:
 *                             type: string
 *                           channelId:
 *                             type: string
 *                 serversToNotify:
 *                   type: number
 *       400:
 *         description: Données manquantes
 *       404:
 *         description: Mot du jour non trouvé
 *       500:
 *         description: Erreur serveur
 */
router.post("/game-result", notifyGameResult);

/**
 * @swagger
 * /api/discord/wordle/servers:
 *   get:
 *     summary: Récupérer les statistiques des serveurs avec Wordle configuré
 *     tags: [Discord - Wordle]
 *     description: Récupère les informations sur les serveurs Discord avec le bot et ceux avec Wordle configuré via l'API du bot
 *     responses:
 *       200:
 *         description: Statistiques des serveurs récupérées avec succès
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
 *                     totalServers:
 *                       type: number
 *                       description: Nombre total de serveurs
 *                     configuredServers:
 *                       type: number
 *                       description: Nombre de serveurs avec Wordle configuré
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *       500:
 *         description: Erreur lors de la communication avec le bot Discord
 */
router.get("/wordle/servers", getWordleServers);

/**
 * @swagger
 * /api/discord/wordle/notifications/status:
 *   get:
 *     summary: Récupérer le statut du système de notifications Wordle
 *     tags: [Discord - Wordle]
 *     description: Récupère le statut des notifications automatiques et des synchronisations via l'API du bot
 *     responses:
 *       200:
 *         description: Statut des notifications récupéré avec succès
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
 *                     lastRun:
 *                       type: string
 *                       format: date-time
 *                     totalNotifications:
 *                       type: number
 *                     schedule:
 *                       type: string
 *                     syncJob:
 *                       type: object
 *                       properties:
 *                         lastRun:
 *                           type: string
 *                           format: date-time
 *                         totalSynced:
 *                           type: number
 *                         lastSyncedServers:
 *                           type: array
 *                           items:
 *                             type: string
 *                         needsSync:
 *                           type: boolean
 *       500:
 *         description: Erreur lors de la communication avec le bot Discord
 */
router.get("/wordle/notifications/status", getWordleNotificationStatus);

/**
 * @swagger
 * /api/discord/wordle/sync-servers:
 *   put:
 *     summary: Forcer la synchronisation de tous les serveurs
 *     tags: [Discord - Wordle]
 *     description: Déclenche une synchronisation forcée de tous les serveurs Discord via l'API du bot
 *     responses:
 *       200:
 *         description: Synchronisation déclenchée avec succès
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
 *                     success:
 *                       type: boolean
 *                     message:
 *                       type: string
 *                     totalServers:
 *                       type: number
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *       500:
 *         description: Erreur lors de la communication avec le bot Discord
 *       503:
 *         description: Service de synchronisation indisponible
 */
router.put("/wordle/sync-servers", forceWordleSyncServers);

/**
 * @swagger
 * /api/discord/wordle/stats:
 *   get:
 *     summary: Récupérer les statistiques générales Wordle
 *     tags: [Discord - Wordle]
 *     description: Récupère toutes les statistiques du système Wordle Discord via l'API du bot
 *     responses:
 *       200:
 *         description: Statistiques récupérées avec succès
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
 *                     notifications:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: number
 *                         lastRun:
 *                           type: string
 *                           format: date-time
 *                     servers:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: number
 *                         configured:
 *                           type: number
 *                     sync:
 *                       type: object
 *                       properties:
 *                         lastRun:
 *                           type: string
 *                           format: date-time
 *                         totalSynced:
 *                           type: number
 *                         lastSyncedServers:
 *                           type: array
 *                           items:
 *                             type: string
 *                     system:
 *                       type: object
 *                       properties:
 *                         uptime:
 *                           type: number
 *                         memory:
 *                           type: object
 *                         timestamp:
 *                           type: string
 *                           format: date-time
 *       500:
 *         description: Erreur lors de la communication avec le bot Discord
 */
router.get("/wordle/stats", getWordleStats);

/**
 * @swagger
 * /api/discord/bot-connection/test:
 *   get:
 *     summary: Tester la connectivité avec l'API du bot Discord
 *     tags: [Discord - Debug]
 *     description: Teste la connexion avec l'API du bot Discord pour diagnostiquer les problèmes de connectivité
 *     responses:
 *       200:
 *         description: Test de connectivité effectué (succès ou échec)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 status:
 *                   type: string
 *                   enum: [connected, unreachable, disconnected]
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   description: Réponse de l'API du bot (si accessible)
 *                 details:
 *                   type: object
 *                   properties:
 *                     botApiUrl:
 *                       type: string
 *                     environment:
 *                       type: string
 *                     httpStatus:
 *                       type: number
 *                     responseTime:
 *                       type: string
 */
router.get("/bot-connection/test", testDiscordBotConnection);

export default router;
