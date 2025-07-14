import mongoose from "mongoose";

const WordleUserStatsSchema = new mongoose.Schema(
	{
		discordId: { type: String, required: true, unique: true },
		totalGames: { type: Number, default: 0 },
		totalWins: { type: Number, default: 0 },
		currentStreak: { type: Number, default: 0 },
		maxStreak: { type: Number, default: 0 },
		guessDistribution: {
			type: Map,
			of: Number,
			default: new Map([
				["1", 0],
				["2", 0],
				["3", 0],
				["4", 0],
				["5", 0],
				["6", 0],
			]),
		},
		lastPlayedDate: { type: Date, required: false },
	},
	{
		timestamps: true,
	},
);

WordleUserStatsSchema.index({ discordId: 1 });

export default mongoose.model("WordleUserStats", WordleUserStatsSchema);
