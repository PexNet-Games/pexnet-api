import mongoose from "mongoose";

const WordleDailyWordSchema = new mongoose.Schema(
	{
		word: { type: String, required: true, maxlength: 5, minlength: 5 },
		date: { type: Date, required: true, unique: true },
		wordId: { type: Number, required: true, unique: true },
	},
	{
		timestamps: true,
	},
);

// Create index for efficient date queries
WordleDailyWordSchema.index({ date: 1 });
WordleDailyWordSchema.index({ wordId: 1 });

export default mongoose.model("WordleDailyWord", WordleDailyWordSchema);
