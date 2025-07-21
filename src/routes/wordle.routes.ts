import express from "express";
import {
	getDailyWord,
	saveGameStats,
	getUserStats,
	getLeaderboard,
	hasPlayedToday,
	generateResultImage,
} from "@controllers/wordle.controller";
import { ensureAuthenticated } from "@middlewares/auth.middleware";

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     DailyWord:
 *       type: object
 *       properties:
 *         word:
 *           type: string
 *           description: The 5-letter word for today
 *         date:
 *           type: string
 *           format: date
 *           description: The date for this word (YYYY-MM-DD)
 *         wordId:
 *           type: number
 *           description: Sequential ID for the daily word
 *     GameStats:
 *       type: object
 *       required:
 *         - discordId
 *         - wordId
 *         - attempts
 *         - guesses
 *       properties:
 *         discordId:
 *           type: string
 *           description: Discord user ID
 *         wordId:
 *           type: number
 *           description: ID of the word being played
 *         attempts:
 *           type: number
 *           minimum: 0
 *           maximum: 6
 *           description: Number of attempts (0 = failed, 1-6 = solved)
 *         guesses:
 *           type: array
 *           items:
 *             type: string
 *           description: Array of 5-letter guesses
 *         solved:
 *           type: boolean
 *           description: Whether the puzzle was solved
 *         timeToComplete:
 *           type: number
 *           description: Time to complete in milliseconds
 *     UserStats:
 *       type: object
 *       properties:
 *         totalGames:
 *           type: number
 *         totalWins:
 *           type: number
 *         winPercentage:
 *           type: number
 *         currentStreak:
 *           type: number
 *         maxStreak:
 *           type: number
 *         guessDistribution:
 *           type: object
 *         lastPlayedDate:
 *           type: string
 *           format: date
 */

/**
 * @swagger
 * /api/wordle/daily-word:
 *   get:
 *     summary: Get today's Wordle word
 *     tags: [Wordle]
 *     responses:
 *       200:
 *         description: Today's word
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DailyWord'
 *       500:
 *         description: Server error
 */
router.get("/daily-word", getDailyWord);

/**
 * @swagger
 * /api/wordle/stats:
 *   post:
 *     summary: Save game statistics
 *     tags: [Wordle]
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GameStats'
 *     responses:
 *       200:
 *         description: Stats saved successfully
 *       400:
 *         description: Invalid request data
 *       409:
 *         description: User already played this word
 *       500:
 *         description: Server error
 */
router.post("/stats", ensureAuthenticated, saveGameStats);

/**
 * @swagger
 * /api/wordle/stats/{discordId}:
 *   get:
 *     summary: Get user statistics
 *     tags: [Wordle]
 *     parameters:
 *       - in: path
 *         name: discordId
 *         required: true
 *         schema:
 *           type: string
 *         description: Discord user ID
 *     responses:
 *       200:
 *         description: User statistics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserStats'
 *       400:
 *         description: Invalid Discord ID
 *       500:
 *         description: Server error
 */
router.get("/stats/:discordId", getUserStats);

/**
 * @swagger
 * /api/wordle/leaderboard:
 *   get:
 *     summary: Get global leaderboard
 *     tags: [Wordle]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 10
 *         description: Number of top users to return
 *     responses:
 *       200:
 *         description: Global leaderboard
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       discordId:
 *                         type: string
 *                       username:
 *                         type: string
 *                       winPercentage:
 *                         type: number
 *                       currentStreak:
 *                         type: number
 *                       totalGames:
 *                         type: number
 *       500:
 *         description: Server error
 */
router.get("/leaderboard", getLeaderboard);

/**
 * @swagger
 * /api/wordle/played-today/{discordId}:
 *   get:
 *     summary: Check if user has played today
 *     tags: [Wordle]
 *     parameters:
 *       - in: path
 *         name: discordId
 *         required: true
 *         schema:
 *           type: string
 *         description: Discord user ID
 *     responses:
 *       200:
 *         description: Play status for today
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 hasPlayed:
 *                   type: boolean
 *                 gameResult:
 *                   type: object
 *                   nullable: true
 *                   properties:
 *                     attempts:
 *                       type: number
 *                     solved:
 *                       type: boolean
 *                     guesses:
 *                       type: array
 *                       items:
 *                         type: string
 *       400:
 *         description: Invalid Discord ID
 *       500:
 *         description: Server error
 */
router.get("/played-today/:discordId", hasPlayedToday);

/**
 * @swagger
 * /api/wordle/result-image:
 *   post:
 *     summary: Generate Wordle result image
 *     tags: [Wordle]
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
 *                 description: Discord user ID
 *                 example: "123456789012345678"
 *               wordId:
 *                 type: number
 *                 description: ID of the word that was played
 *                 example: 42
 *               guesses:
 *                 type: array
 *                 items:
 *                   type: string
 *                   minLength: 5
 *                   maxLength: 5
 *                 description: Array of 5-letter guesses made by the user
 *                 example: ["ADIEU", "SALON", "PIANO"]
 *               solved:
 *                 type: boolean
 *                 description: Whether the puzzle was solved
 *                 example: true
 *               attempts:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 6
 *                 description: Number of attempts (0 = failed, 1-6 = solved)
 *                 example: 3
 *     responses:
 *       200:
 *         description: Generated Wordle result with image and shareable text
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 image:
 *                   type: string
 *                   format: base64
 *                   description: Base64 encoded PNG image
 *                 shareText:
 *                   type: string
 *                   description: Formatted text with emoji squares for sharing
 *                   example: |
 *                     Pexnet Wordle #42 3/6
 *
 *                     🟨⬛🟩⬛⬛
 *                     🟩🟩🟩⬛⬛
 *                     🟩🟩🟩🟩🟩
 *
 *                     🎮 https://pexnet.fr/wordle
 *                 wordId:
 *                   type: number
 *                   description: ID of the daily word
 *                   example: 42
 *                 solved:
 *                   type: boolean
 *                   description: Whether the puzzle was solved
 *                   example: true
 *                 attempts:
 *                   type: number
 *                   description: Number of attempts used
 *                   example: 3
 *       400:
 *         description: Invalid request data
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.post("/result-image", generateResultImage);

export default router;
