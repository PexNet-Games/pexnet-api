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
import {
	getFrenchDate,
	getFrenchDateString,
	toFrenchMidnight,
} from "@utils/frenchTime";
import {
	generateWordleResultImage,
	WordleResultData,
} from "@utils/wordleImageGenerator";

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
		// Get today's date in French timezone (midnight Paris time)
		const today = getFrenchDate();

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
				`📅 Generated new daily word: ${selectedWord} (ID: ${nextWordId}) for French date: ${getFrenchDateString()}`,
			);
			console.log(`🔄 Avoided recent words: [${recentWords.join(", ")}]`);
		}

		res.json({
			word: dailyWord.word,
			date: getFrenchDateString(), // Always return French date format
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

		// Get today's word (using French timezone)
		const today = getFrenchDate();

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
 * Generate Wordle result image and shareable text
 */
export const generateResultImage = async (req: Request, res: Response) => {
	try {
		const { discordId, wordId, guesses, solved, attempts } = req.body;

		// Validate required fields
		if (
			!discordId ||
			!wordId ||
			!Array.isArray(guesses) ||
			solved === undefined ||
			attempts === undefined
		) {
			return res.status(400).json({
				success: false,
				error:
					"Missing required fields: discordId, wordId, guesses, solved, attempts",
			});
		}

		// Get the target word
		const dailyWord = await WordleDailyWord.findOne({ wordId });
		if (!dailyWord) {
			return res.status(400).json({
				success: false,
				error: "Invalid wordId",
			});
		}

		// Get user information
		const user = await User.findOne({ discordId });
		if (!user) {
			return res.status(404).json({
				success: false,
				error: "User not found",
			});
		}

		// Filter valid guesses
		const filteredGuesses = guesses.filter(
			(guess: string) => guess && guess.length === 5,
		);

		// Prepare data for image generation
		const resultData: WordleResultData = {
			guesses: filteredGuesses,
			targetWord: dailyWord.word,
			solved,
			attempts,
			discordId,
			username: user.username || "Unknown User",
			discriminator: user.discriminator ?? undefined,
			avatar: user.avatar ?? undefined,
		};

		// Generate image
		const imageBuffer = await generateWordleResultImage(resultData);

		// Generate shareable text with emojis
		const shareText = generateShareableText(
			filteredGuesses,
			dailyWord.word,
			dailyWord.wordId,
			solved,
			attempts,
		);

		// Return JSON with both image and text
		res.json({
			success: true,
			image: imageBuffer.toString("base64"),
			shareText,
			wordId: dailyWord.wordId,
			solved,
			attempts,
		});
	} catch (error) {
		console.error("Error generating result image:", error);
		res.status(500).json({
			success: false,
			error: "Failed to generate result image",
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
 * Analyze a guess for emoji generation (reusing image generator logic)
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

	// Update streak (using French timezone)
	const today = getFrenchDate();
	const yesterday = new Date(today);
	yesterday.setDate(yesterday.getDate() - 1);

	if (solved) {
		if (
			!userStats.lastPlayedDate ||
			toFrenchMidnight(userStats.lastPlayedDate).getTime() ===
				yesterday.getTime()
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
