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

// Les index sur date et wordId sont automatiquement créés par unique: true
// Pas besoin de les redéfinir ici

export default mongoose.model("WordleDailyWord", WordleDailyWordSchema);
