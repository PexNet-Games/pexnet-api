import { Router } from "express";
import * as WordleController from "@controllers/wordle.controller";
import { ensureAuthenticated } from "@middleware/auth.middleware";
import { ensureGuildsUpToDate } from "@middleware/guildSync.middleware";

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     WordleGameSubmission:
 *       type: object
 *       required:
 *         - discordId
 *         - word
 *         - attempts
 *         - dailyWordId
 *       properties:
 *         discordId:
 *           type: string
 *           description: Discord ID de l'utilisateur
 *         word:
 *           type: string
 *           description: Mot deviné par l'utilisateur
 *         attempts:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               word:
 *                 type: string
 *               result:
 *                 type: array
 *                 items:
 *                   type: string
 *           description: Historique des tentatives
 *         dailyWordId:
 *           type: string
 *           description: ID du mot du jour
 *         won:
 *           type: boolean
 *           description: Si l'utilisateur a gagné
 *         attemptsCount:
 *           type: number
 *           description: Nombre de tentatives utilisées
 */

/**
 * @swagger
 * /api/wordle/daily-word:
 *   get:
 *     summary: Obtenir le mot du jour
 *     tags: [Wordle]
 *     responses:
 *       200:
 *         description: Mot du jour récupéré avec succès
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
 *                     id:
 *                       type: string
 *                     word:
 *                       type: string
 *                     date:
 *                       type: string
 *                       format: date
 */
router.get("/daily-word", WordleController.getDailyWord);

/**
 * @swagger
 * /api/wordle/submit-game:
 *   post:
 *     summary: Soumettre un résultat de partie Wordle
 *     tags: [Wordle]
 *     security:
 *       - sessionAuth: []
 *     description: Soumet les résultats d'une partie Wordle et synchronise automatiquement les guilds Discord pour l'envoi des flux
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/WordleGameSubmission'
 *     responses:
 *       200:
 *         description: Partie soumise avec succès
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
 *       400:
 *         description: Données invalides
 *       401:
 *         description: Utilisateur non authentifié
 *       500:
 *         description: Erreur serveur
 */
router.post(
	"/submit-game",
	ensureAuthenticated,
	ensureGuildsUpToDate,
	WordleController.saveGameStats,
);

/**
 * @swagger
 * /api/wordle/result-image:
 *   post:
 *     summary: Générer une image de résultat Wordle
 *     tags: [Wordle]
 *     description: Génère une image de résultat Wordle avec le texte partageable
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - discordId
 *               - wordId
 *               - guesses
 *               - solved
 *               - attempts
 *             properties:
 *               discordId:
 *                 type: string
 *                 description: Discord ID de l'utilisateur
 *               wordId:
 *                 type: number
 *                 description: ID du mot Wordle
 *               guesses:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Liste des mots tentés
 *               solved:
 *                 type: boolean
 *                 description: Partie réussie ou non
 *               attempts:
 *                 type: number
 *                 description: Nombre de tentatives utilisées
 *     responses:
 *       200:
 *         description: Image et texte générés avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 image:
 *                   type: string
 *                   description: Image encodée en base64
 *                 shareText:
 *                   type: string
 *                   description: Texte partageable avec emojis
 *                 wordId:
 *                   type: number
 *                 solved:
 *                   type: boolean
 *                 attempts:
 *                   type: number
 *       400:
 *         description: Données manquantes ou invalides
 *       404:
 *         description: Utilisateur ou mot non trouvé
 *       500:
 *         description: Erreur lors de la génération de l'image
 */
router.post("/result-image", WordleController.generateResultImage);

/**
 * @swagger
 * /api/wordle/user-stats/{discordId}:
 *   get:
 *     summary: Obtenir les statistiques d'un utilisateur
 *     tags: [Wordle]
 *     parameters:
 *       - in: path
 *         name: discordId
 *         required: true
 *         schema:
 *           type: string
 *         description: Discord ID de l'utilisateur
 *     responses:
 *       200:
 *         description: Statistiques récupérées avec succès
 *       404:
 *         description: Utilisateur non trouvé
 */
router.get("/user-stats/:discordId", WordleController.getUserStats);

/**
 * @swagger
 * /api/wordle/leaderboard:
 *   get:
 *     summary: Obtenir le classement général ou par serveur
 *     tags: [Wordle]
 *     parameters:
 *       - in: query
 *         name: serverId
 *         schema:
 *           type: string
 *         description: ID du serveur Discord (optionnel)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Nombre d'utilisateurs à retourner
 *     responses:
 *       200:
 *         description: Classement récupéré avec succès
 */
router.get("/leaderboard", WordleController.getLeaderboard);

export default router;
