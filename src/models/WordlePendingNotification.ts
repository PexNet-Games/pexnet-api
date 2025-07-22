import mongoose from "mongoose";

const WordlePendingNotificationSchema = new mongoose.Schema(
	{
		discordId: { type: String, required: true },
		wordId: { type: Number, required: true },
		username: { type: String, required: true },
		avatar: { type: String, required: false },
		grid: { type: String, required: true }, // Grille avec emojis
		image: { type: String, required: false }, // Image PNG en base64
		attempts: { type: Number, required: true, min: 0, max: 6 },
		time: { type: String, required: false }, // Format "2:34"
		streak: { type: Number, default: 0 },
		puzzle: { type: Number, required: true }, // wordId
		date: { type: String, required: true }, // Format "2025-07-22"
		solved: { type: Boolean, required: true },
		timeToComplete: { type: Number, required: false }, // en millisecondes
		isProcessed: { type: Boolean, default: false }, // Pour marquer comme traité
		processedAt: { type: Date, required: false },
		expiresAt: { type: Date, required: true }, // Expiration automatique après 24h
	},
	{
		timestamps: true,
	},
);

// Index pour les requêtes fréquentes
WordlePendingNotificationSchema.index({ discordId: 1, isProcessed: 1 });
WordlePendingNotificationSchema.index({ isProcessed: 1 });
WordlePendingNotificationSchema.index(
	{ expiresAt: 1 },
	{ expireAfterSeconds: 0 },
); // TTL index

export default mongoose.model(
	"WordlePendingNotification",
	WordlePendingNotificationSchema,
);
