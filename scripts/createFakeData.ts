import mongoose from "mongoose";
import dotenv from "dotenv";
import { config } from "../src/app.config";
import User from "../src/models/User";
import WordleGameStats from "../src/models/WordleGameStats";
import WordleUserStats from "../src/models/WordleUserStats";
import WordleDailyWord from "../src/models/WordleDailyWord";

dotenv.config();

const fakeUsers = [
	{
		userId: "fake_user_001",
		discordId: "fake_user_001",
		username: "WordleMaster",
		email: "wordlemaster@example.com",
		avatar: "https://cdn.discordapp.com/avatars/1/avatar1.png",
	},
	{
		userId: "fake_user_002",
		discordId: "fake_user_002",
		username: "PuzzleQueen",
		email: "puzzlequeen@example.com",
		avatar: "https://cdn.discordapp.com/avatars/2/avatar2.png",
	},
	{
		userId: "fake_user_003",
		discordId: "fake_user_003",
		username: "GuessGuru",
		email: "guessguru@example.com",
		avatar: "https://cdn.discordapp.com/avatars/3/avatar3.png",
	},
	{
		userId: "fake_user_004",
		discordId: "fake_user_004",
		username: "LetterLord",
		email: "letterlord@example.com",
		avatar: "https://cdn.discordapp.com/avatars/4/avatar4.png",
	},
	{
		userId: "fake_user_005",
		discordId: "fake_user_005",
		username: "WordWizard",
		email: "wordwizard@example.com",
		avatar: "https://cdn.discordapp.com/avatars/5/avatar5.png",
	},
	{
		userId: "fake_user_006",
		discordId: "fake_user_006",
		username: "VocabViper",
		email: "vocabviper@example.com",
		avatar: "https://cdn.discordapp.com/avatars/6/avatar6.png",
	},
	{
		userId: "fake_user_007",
		discordId: "fake_user_007",
		username: "LinguistLegend",
		email: "linguistlegend@example.com",
		avatar: "https://cdn.discordapp.com/avatars/7/avatar7.png",
	},
	{
		userId: "fake_user_008",
		discordId: "fake_user_008",
		username: "SolveSeeker",
		email: "solveseeker@example.com",
		avatar: "https://cdn.discordapp.com/avatars/8/avatar8.png",
	},
	{
		userId: "fake_user_009",
		discordId: "fake_user_009",
		username: "AnagramAce",
		email: "anagramace@example.com",
		avatar: "https://cdn.discordapp.com/avatars/9/avatar9.png",
	},
	{
		userId: "fake_user_010",
		discordId: "fake_user_010",
		username: "LetterLucky",
		email: "letterlucky@example.com",
		avatar: "https://cdn.discordapp.com/avatars/10/avatar10.png",
	},
];

// Sample French 5-letter words for guesses
const sampleWords = [
	"ARBRE",
	"BLANC",
	"CHIEN",
	"DANSE",
	"ECOLE",
	"FLEUR",
	"GRAND",
	"HOTEL",
	"IMAGE",
	"JUSTE",
	"LIVRE",
	"MONDE",
	"NOIRE",
	"OCEAN",
	"PARIS",
	"QUEUE",
	"ROUGE",
	"SALON",
	"TABLE",
	"UNITY",
	"VERRE",
	"WAGON",
	"XENON",
	"YACHT",
	"ZEBRA",
	"AMOUR",
	"BEIGE",
	"CLAIR",
	"DROLE",
	"ETUDE",
	"FROID",
	"GRACE",
];

function getRandomWord(): string {
	return sampleWords[Math.floor(Math.random() * sampleWords.length)];
}

function generateGuesses(targetWord: string, attempts: number): string[] {
	const guesses: string[] = [];

	for (let i = 0; i < attempts; i++) {
		if (i === attempts - 1) {
			// Last guess is always the correct word if solved
			guesses.push(targetWord);
		} else {
			// Generate random guesses
			guesses.push(getRandomWord());
		}
	}

	return guesses;
}

function generateFailedGuesses(): string[] {
	const guesses: string[] = [];
	for (let i = 0; i < 6; i++) {
		guesses.push(getRandomWord());
	}
	return guesses;
}

async function createFakeGameData() {
	try {
		if (!config.mongoUri) {
			throw new Error("MongoDB URI is not configured");
		}
		await mongoose.connect(config.mongoUri);
		console.log("📚 Connected to MongoDB");

		// Get all daily words
		const dailyWords = await WordleDailyWord.find().sort({ wordId: 1 });
		console.log(`📅 Found ${dailyWords.length} daily words`);

		// Create fake users
		for (const userData of fakeUsers) {
			const existingUser = await User.findOne({
				discordId: userData.discordId,
			});
			if (!existingUser) {
				const user = new User(userData);
				await user.save();
				console.log(`👤 Created user: ${userData.username}`);
			}
		}

		// Generate game statistics for each user
		for (const userData of fakeUsers) {
			const { discordId, username } = userData;

			// Determine user skill level (affects win rate and guess distribution)
			const skillLevel = Math.random();
			const winRate =
				skillLevel > 0.8
					? 0.9
					: skillLevel > 0.6
						? 0.75
						: skillLevel > 0.3
							? 0.6
							: 0.4;

			let totalGames = 0;
			let totalWins = 0;
			let currentStreak = 0;
			let maxStreak = 0;
			const guessDistribution = new Map<number, number>();
			let tempStreak = 0;

			// Initialize guess distribution
			for (let i = 1; i <= 6; i++) {
				guessDistribution.set(i, 0);
			}

			// Generate games for random selection of daily words
			const numGamesToPlay = Math.floor(Math.random() * 20) + 10; // 10-30 games per user
			const shuffledWords = [...dailyWords].sort(() => Math.random() - 0.5);

			for (
				let gameIndex = 0;
				gameIndex < Math.min(numGamesToPlay, shuffledWords.length);
				gameIndex++
			) {
				const dailyWord = shuffledWords[gameIndex];

				// Check if user already played this word
				const existingGame = await WordleGameStats.findOne({
					discordId,
					wordId: dailyWord.wordId,
				});

				if (existingGame) continue;

				totalGames++;
				const willWin = Math.random() < winRate;

				let attempts: number;
				let guesses: string[];
				let solved: boolean;

				if (willWin) {
					// Determine number of attempts based on skill level
					if (skillLevel > 0.8) {
						attempts = Math.random() < 0.3 ? 2 : Math.random() < 0.7 ? 3 : 4;
					} else if (skillLevel > 0.6) {
						attempts = Math.random() < 0.2 ? 3 : Math.random() < 0.6 ? 4 : 5;
					} else {
						attempts = Math.random() < 0.3 ? 4 : Math.random() < 0.7 ? 5 : 6;
					}

					guesses = generateGuesses(dailyWord.word, attempts);
					solved = true;
					totalWins++;
					tempStreak++;
					currentStreak = tempStreak;
					maxStreak = Math.max(maxStreak, tempStreak);

					// Update guess distribution
					const currentCount = guessDistribution.get(attempts) || 0;
					guessDistribution.set(attempts, currentCount + 1);
				} else {
					attempts = 0; // Failed to solve
					guesses = generateFailedGuesses();
					solved = false;
					tempStreak = 0;
					currentStreak = 0;
				}

				// Create game stats
				const gameStats = new WordleGameStats({
					discordId,
					wordId: dailyWord.wordId,
					date: dailyWord.date,
					attempts,
					guesses,
					solved,
					timeToComplete: Math.floor(Math.random() * 300000) + 60000, // 1-5 minutes
				});

				await gameStats.save();
			}

			// Create or update user stats
			const userStats = new WordleUserStats({
				discordId,
				totalGames,
				totalWins,
				currentStreak,
				maxStreak,
				guessDistribution: Object.fromEntries(guessDistribution),
				lastPlayedDate: new Date(),
			});

			await userStats.save();

			const winPercentage =
				totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0;
			console.log(
				`🎮 Created ${totalGames} games for ${username} (${totalWins}/${totalGames} wins, ${winPercentage}% win rate)`,
			);
		}

		console.log("✅ Fake player data created successfully!");
		await mongoose.disconnect();
	} catch (error) {
		console.error("❌ Error creating fake data:", error);
		await mongoose.disconnect();
	}
}

createFakeGameData();
