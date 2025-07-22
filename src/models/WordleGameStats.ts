import mongoose from "mongoose";

const WordleGameStatsSchema = new mongoose.Schema(
	{
		discordId: { type: String, required: true },
		wordId: { type: Number, required: true },
		date: { type: Date, required: true },
		attempts: { type: Number, required: true, min: 0, max: 6 }, // 0 = failed, 1-6 = number of attempts
		guesses: [
			{
				type: String,
				maxlength: 5,
				minlength: 1,
				validate: {
					validator: (v: string) => {
						// Allow only valid 5-letter words (no empty strings)
						return v.length === 5;
					},
					message: "Each guess must be exactly 5 characters long",
				},
			},
		],
		solved: { type: Boolean, default: false },
		timeToComplete: { type: Number, required: false }, // milliseconds
	},
	{
		timestamps: true,
	},
);

// Ensure one game per user per day
WordleGameStatsSchema.index({ discordId: 1, wordId: 1 }, { unique: true });
// L'index sur discordId seul est redondant car l'index composé peut être utilisé
WordleGameStatsSchema.index({ date: 1 });

export default mongoose.model("WordleGameStats", WordleGameStatsSchema);
