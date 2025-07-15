import mongoose from "mongoose";
import WordleDailyWord from "@models/WordleDailyWord";
import { config } from "../app.config";
import { loadFrenchWords } from "./wordSelection";
import { getFrenchDate } from "./frenchTime";

// Load French words for seeding
const FRENCH_WORDS = loadFrenchWords();

// Extended English word list as fallback
const FALLBACK_SEED_WORDS = [
	"ADIEU",
	"AUDIO",
	"AROSE",
	"STEAM",
	"STERN",
	"SNORT",
	"SPORT",
	"STUDY",
	"SHOCK",
	"SHAKE",
	"SLICE",
	"SMILE",
	"SMOKE",
	"SOLID",
	"SOLVE",
	"SORRY",
	"SOUND",
	"SOUTH",
	"SPACE",
	"SPARE",
	"SPEAK",
	"SPEED",
	"SPEND",
	"SPENT",
	"SPLIT",
	"SPOKE",
	"STAGE",
	"STAKE",
	"STAND",
	"START",
	"STATE",
	"STEAM",
	"STEEL",
	"STEEP",
	"STEER",
	"STICK",
	"STILL",
	"STOCK",
	"STONE",
	"STOOD",
	"STORE",
	"STORM",
	"STORY",
	"STRIP",
	"STUCK",
	"STUDY",
	"STUFF",
	"STYLE",
	"SUGAR",
	"SUITE",
	"SUPER",
	"SWEET",
	"TABLE",
	"TAKEN",
	"TASTE",
	"TAXES",
	"TEACH",
	"TEETH",
	"TERRY",
	"TEXAS",
	"THANK",
	"THEFT",
	"THEIR",
	"THEME",
	"THERE",
	"THESE",
	"THICK",
	"THING",
	"THINK",
	"THIRD",
	"THOSE",
	"THREE",
	"THREW",
	"THROW",
	"THUMB",
	"TIGER",
	"TIGHT",
	"TIMER",
	"TIRED",
	"TITLE",
	"TODAY",
	"TOPIC",
	"TOTAL",
	"TOUCH",
	"TOUGH",
	"TOWER",
	"TRACK",
	"TRADE",
	"TRAIN",
	"TREAT",
	"TREND",
	"TRIAL",
	"TRIBE",
	"TRICK",
	"TRIED",
	"TRIES",
	"TRUCK",
	"TRULY",
	"TRUNK",
	"TRUST",
	"TRUTH",
	"TWICE",
	"TWIST",
	"TYLER",
	"UNDER",
	"UNDUE",
	"UNION",
	"UNITY",
	"UNTIL",
	"UPPER",
];

async function seedDailyWords() {
	try {
		console.log("🌱 Connecting to MongoDB...");
		await mongoose.connect(config.mongoUri);
		console.log("✅ Connected to MongoDB");

		// Clear existing words (optional - remove this in production)
		await WordleDailyWord.deleteMany({});
		console.log("🗑️  Cleared existing daily words");

		// Choose word list (prefer French, fallback to English)
		const wordsToSeed =
			FRENCH_WORDS.length > 0 ? FRENCH_WORDS : FALLBACK_SEED_WORDS;
		console.log(
			`📚 Using ${FRENCH_WORDS.length > 0 ? "French" : "English"} words for seeding`,
		);
		console.log(`📊 Total words available: ${wordsToSeed.length}`);

		const seedDate = getFrenchDate();
		seedDate.setDate(seedDate.getDate() - 30); // Start 30 days ago

		const wordsToInsert = [];

		// Seed up to 100 words or the available word count, whichever is smaller
		const seedCount = Math.min(100, wordsToSeed.length);

		for (let i = 0; i < seedCount; i++) {
			const currentDate = new Date(seedDate);
			currentDate.setDate(currentDate.getDate() + i);

			wordsToInsert.push({
				word: wordsToSeed[i],
				date: currentDate,
				wordId: i + 1,
			});
		}

		await WordleDailyWord.insertMany(wordsToInsert);
		console.log(`🎯 Seeded ${wordsToInsert.length} daily words`);

		// Show today's word (using French timezone)
		const today = getFrenchDate();
		const todayWord = await WordleDailyWord.findOne({ date: today });

		if (todayWord) {
			console.log(
				`📅 Today's word: ${todayWord.word} (ID: ${todayWord.wordId})`,
			);
		} else {
			console.log(
				"📅 No word set for today - will be generated on first request",
			);
		}

		console.log("✅ Seeding completed successfully");
	} catch (error) {
		console.error("❌ Error seeding daily words:", error);
	} finally {
		await mongoose.disconnect();
		console.log("👋 Disconnected from MongoDB");
	}
}

// Run the seeding script
if (require.main === module) {
	seedDailyWords().catch(console.error);
}

export { seedDailyWords };
