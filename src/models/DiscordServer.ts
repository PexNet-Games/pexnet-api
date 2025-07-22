import mongoose from "mongoose";

const DiscordServerSchema = new mongoose.Schema(
	{
		serverId: { type: String, required: true, unique: true }, // Discord guild ID
		serverName: { type: String, required: true },
		iconUrl: { type: String, required: false },
		ownerId: { type: String, required: true }, // Discord user ID of server owner
		wordleChannelId: { type: String, required: false }, // Canal dédié aux résultats Wordle
		isActive: { type: Boolean, default: true }, // Si le bot est toujours présent
		joinedAt: { type: Date, default: Date.now },
		leftAt: { type: Date, required: false },
		settings: {
			autoNotify: { type: Boolean, default: true }, // Notifications automatiques des résultats
			language: { type: String, default: "fr" }, // Langue pour les messages
			timezone: { type: String, default: "Europe/Paris" },
		},
		memberCount: { type: Number, default: 0 }, // Nombre de membres approximatif
		lastActivity: { type: Date, default: Date.now },
	},
	{
		timestamps: true,
	},
);

// Index pour les requêtes fréquentes
// L'index sur serverId est automatiquement créé par unique: true
DiscordServerSchema.index({ isActive: 1 });
DiscordServerSchema.index({ wordleChannelId: 1 });

export default mongoose.model("DiscordServer", DiscordServerSchema);
