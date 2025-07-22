import mongoose from "mongoose";

const DiscordUserServerSchema = new mongoose.Schema(
	{
		discordId: { type: String, required: true }, // ID Discord de l'utilisateur
		serverId: { type: String, required: true }, // ID Discord du serveur
		serverName: { type: String, required: true }, // Nom du serveur (pour les logs)
		nickname: { type: String, required: false }, // Surnom sur ce serveur
		roles: [{ type: String }], // Liste des rôles sur ce serveur
		permissions: [{ type: String }], // Permissions spéciales
		joinedServerAt: { type: Date, default: Date.now }, // Quand l'utilisateur a rejoint le serveur
		leftServerAt: { type: Date, required: false }, // Quand l'utilisateur a quitté (null si toujours présent)
		isActive: { type: Boolean, default: true }, // Si l'utilisateur est toujours sur le serveur
		lastSeen: { type: Date, default: Date.now }, // Dernière activité détectée
		hasWordleAccess: { type: Boolean, default: true }, // Si l'utilisateur peut utiliser les fonctions Wordle
	},
	{
		timestamps: true,
	},
);

// Index composé pour éviter les doublons et optimiser les requêtes
DiscordUserServerSchema.index({ discordId: 1, serverId: 1 }, { unique: true });
DiscordUserServerSchema.index({ discordId: 1, isActive: 1 });
DiscordUserServerSchema.index({ serverId: 1, isActive: 1 });
DiscordUserServerSchema.index({ discordId: 1 });

export default mongoose.model("DiscordUserServer", DiscordUserServerSchema);
