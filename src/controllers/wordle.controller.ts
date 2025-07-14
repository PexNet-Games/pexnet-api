import { Request, Response } from "express";
import WordleDailyWord from "@models/WordleDailyWord";
import WordleGameStats from "@models/WordleGameStats";
import WordleUserStats from "@models/WordleUserStats";
import User from "@models/User";
import {
	loadFrenchWords,
	getRecentWords,
	selectAvailableWord,
} from "@utils/wordSelection";

// Load French words on startup
const FRENCH_WORDS = loadFrenchWords();

// Fallback words in case French words can't be loaded
const FALLBACK_WORDS = [
	"ABOUT",
	"ABOVE",
	"ABUSE",
	"ACTOR",
	"ACUTE",
	"ADMIT",
	"ADOPT",
	"ADULT",
	"AFTER",
	"AGAIN",
	"AGENT",
	"AGREE",
	"AHEAD",
	"ALARM",
	"ALBUM",
	"ALERT",
	"ALIEN",
	"ALIGN",
	"ALIKE",
	"ALIVE",
	"ALLOW",
	"ALONE",
	"ALONG",
	"ALTER",
	"AMONG",
	"ANGER",
	"ANGLE",
	"ANGRY",
	"APART",
	"APPLE",
	"APPLY",
	"ARENA",
];

/**
 * Get or create the daily word for today
 */
export const getDailyWord = async (_req: Request, res: Response) => {
	try {
		const today = new Date();
		today.setUTCHours(0, 0, 0, 0); // Reset to start of day in UTC

		// Check if we already have a word for today
		let dailyWord = await WordleDailyWord.findOne({ date: today });

		if (!dailyWord) {
			// Generate a new daily word
			const latestWord = await WordleDailyWord.findOne().sort({ wordId: -1 });
			const nextWordId = latestWord ? latestWord.wordId + 1 : 1;

			// Get words used in the last 5 days to avoid repetition
			const recentWords = await getRecentWords(5);

			// Use French words as primary list, fallback to English if needed
			const availableWords =
				FRENCH_WORDS.length > 0 ? FRENCH_WORDS : FALLBACK_WORDS;

			// Select a word that hasn't been used in the last 5 days
			const selectedWord = selectAvailableWord(availableWords, recentWords);

			dailyWord = new WordleDailyWord({
				word: selectedWord,
				date: today,
				wordId: nextWordId,
			});

			await dailyWord.save();

			console.log(
				`📅 Generated new daily word: ${selectedWord} (ID: ${nextWordId})`,
			);
			console.log(`🔄 Avoided recent words: [${recentWords.join(", ")}]`);
		}

		res.json({
			word: dailyWord.word,
			date: dailyWord.date.toISOString().split("T")[0], // YYYY-MM-DD format
			wordId: dailyWord.wordId,
		});
	} catch (error) {
		console.error("Error getting daily word:", error);
		res.status(500).json({ success: false, error: "Failed to get daily word" });
	}
};

/**
 * Save game stats for a user
 */
export const saveGameStats = async (req: Request, res: Response) => {
	try {
		const { discordId, wordId, attempts, guesses, solved, timeToComplete } =
			req.body;

		// Validate required fields
		if (
			!discordId ||
			wordId === undefined ||
			attempts === undefined ||
			!Array.isArray(guesses)
		) {
			return res.status(400).json({
				success: false,
				error: "Missing required fields: discordId, wordId, attempts, guesses",
			});
		}

		// Validate attempts range
		if (attempts < 0 || attempts > 6) {
			return res.status(400).json({
				success: false,
				error: "Attempts must be between 0 and 6",
			});
		}

		// Get the daily word to validate wordId
		const dailyWord = await WordleDailyWord.findOne({ wordId });
		if (!dailyWord) {
			return res.status(400).json({
				success: false,
				error: "Invalid wordId",
			});
		}

		// Check if user already played this word
		const existingGame = await WordleGameStats.findOne({ discordId, wordId });
		if (existingGame) {
			return res.status(409).json({
				success: false,
				error: "User has already played this word",
			});
		}

		// Verify user exists
		const user = await User.findOne({ discordId });
		if (!user) {
			return res.status(404).json({
				success: false,
				error: "User not found",
			});
		}

		// Filter out empty guesses and validate
		const filteredGuesses = guesses.filter(
			(guess: string) => guess && guess.length === 5,
		);

		// Save game stats
		const gameStats = new WordleGameStats({
			discordId,
			wordId,
			date: dailyWord.date,
			attempts,
			guesses: filteredGuesses,
			solved: solved || false,
			timeToComplete,
		});

		await gameStats.save();

		// Update user aggregate stats
		await updateUserStats(discordId, attempts, solved || false, dailyWord.date);

		res.json({ success: true, message: "Game stats saved successfully" });
	} catch (error) {
		console.error("Error saving game stats:", error);
		res
			.status(500)
			.json({ success: false, error: "Failed to save game stats" });
	}
};

/**
 * Get user statistics
 */
export const getUserStats = async (req: Request, res: Response) => {
	try {
		const { discordId } = req.params;

		if (!discordId) {
			return res.status(400).json({
				success: false,
				error: "Discord ID is required",
			});
		}

		// Get or create user stats
		let userStats = await WordleUserStats.findOne({ discordId });

		if (!userStats) {
			userStats = new WordleUserStats({ discordId });
			await userStats.save();
		}

		// Calculate win percentage
		const winPercentage =
			userStats.totalGames > 0
				? Math.round((userStats.totalWins / userStats.totalGames) * 100)
				: 0;

		// Convert guess distribution Map to object
		const guessDistribution: { [key: string]: number } = {};
		userStats.guessDistribution.forEach((value, key) => {
			guessDistribution[key] = value;
		});

		res.json({
			totalGames: userStats.totalGames,
			totalWins: userStats.totalWins,
			winPercentage,
			currentStreak: userStats.currentStreak,
			maxStreak: userStats.maxStreak,
			guessDistribution,
			lastPlayedDate: userStats.lastPlayedDate?.toISOString().split("T")[0],
		});
	} catch (error) {
		console.error("Error getting user stats:", error);
		res.status(500).json({ success: false, error: "Failed to get user stats" });
	}
};

/**
 * Get global leaderboard
 */
export const getLeaderboard = async (req: Request, res: Response) => {
	try {
		const limit = parseInt(req.query.limit as string) || 10;

		// Get top users by win percentage (minimum 5 games played)
		const topUsers = await WordleUserStats.aggregate([
			{ $match: { totalGames: { $gte: 5 } } },
			{
				$addFields: {
					winPercentage: {
						$cond: [
							{ $gt: ["$totalGames", 0] },
							{
								$round: [
									{
										$multiply: [
											{ $divide: ["$totalWins", "$totalGames"] },
											100,
										],
									},
									0,
								],
							},
							0,
						],
					},
				},
			},
			{ $sort: { winPercentage: -1, currentStreak: -1, totalGames: -1 } },
			{ $limit: limit },
		]);

		// Get user details for each top user
		const leaderboard = await Promise.all(
			topUsers.map(async (userStats) => {
				const user = await User.findOne({ discordId: userStats.discordId });
				return {
					discordId: userStats.discordId,
					username: user?.username || "Unknown User",
					winPercentage: Math.round(userStats.winPercentage),
					currentStreak: userStats.currentStreak,
					totalGames: userStats.totalGames,
				};
			}),
		);

		res.json({ users: leaderboard });
	} catch (error) {
		console.error("Error getting leaderboard:", error);
		res
			.status(500)
			.json({ success: false, error: "Failed to get leaderboard" });
	}
};

/**
 * Check if user has played today
 */
export const hasPlayedToday = async (req: Request, res: Response) => {
	try {
		const { discordId } = req.params;

		if (!discordId) {
			return res.status(400).json({
				success: false,
				error: "Discord ID is required",
			});
		}

		// Get today's word
		const today = new Date();
		today.setUTCHours(0, 0, 0, 0);

		const todayWord = await WordleDailyWord.findOne({ date: today });
		if (!todayWord) {
			return res.json({ hasPlayed: false });
		}

		// Check if user played today's word
		const todayGame = await WordleGameStats.findOne({
			discordId,
			wordId: todayWord.wordId,
		});

		res.json({
			hasPlayed: !!todayGame,
			gameResult: todayGame
				? {
						attempts: todayGame.attempts,
						solved: todayGame.solved,
						guesses: todayGame.guesses,
					}
				: null,
		});
	} catch (error) {
		console.error("Error checking if user played today:", error);
		res
			.status(500)
			.json({ success: false, error: "Failed to check play status" });
	}
};

/**
 * Helper function to update user aggregate stats
 */
async function updateUserStats(
	discordId: string,
	attempts: number,
	solved: boolean,
	gameDate: Date,
) {
	let userStats = await WordleUserStats.findOne({ discordId });

	if (!userStats) {
		userStats = new WordleUserStats({ discordId });
	}

	// Update basic stats
	userStats.totalGames += 1;
	if (solved) {
		userStats.totalWins += 1;
	}

	// Update streak
	const today = new Date();
	today.setUTCHours(0, 0, 0, 0);
	const yesterday = new Date(today);
	yesterday.setDate(yesterday.getDate() - 1);

	if (solved) {
		if (
			!userStats.lastPlayedDate ||
			userStats.lastPlayedDate.getTime() === yesterday.getTime()
		) {
			userStats.currentStreak += 1;
		} else {
			userStats.currentStreak = 1;
		}

		if (userStats.currentStreak > userStats.maxStreak) {
			userStats.maxStreak = userStats.currentStreak;
		}
	} else {
		userStats.currentStreak = 0;
	}

	// Update guess distribution
	if (solved && attempts > 0 && attempts <= 6) {
		const currentCount =
			userStats.guessDistribution.get(attempts.toString()) || 0;
		userStats.guessDistribution.set(attempts.toString(), currentCount + 1);
	}

	userStats.lastPlayedDate = gameDate;

	await userStats.save();
}
