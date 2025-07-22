import mongoose from "mongoose";

const User = new mongoose.Schema(
	{
		userId: { type: String, required: true, unique: true },
		username: { type: String, required: false },
		imageUrl: { type: String, required: false },
		voiceTime: { type: Number, default: 0 },
		// Discord OAuth2 fields
		discordId: { type: String, required: false, unique: true },
		email: { type: String, required: false },
		discriminator: { type: String, required: false },
		avatar: { type: String, required: false },
		accessToken: { type: String, required: false },
		refreshToken: { type: String, required: false },
		// Discord guilds (servers) where the user is a member
		guilds: [
			{
				type: String, // Guild ID
				required: false,
			},
		],
		guildsLastSync: { type: Date, required: false }, // Timestamp of last guild sync
	},
	{
		timestamps: true,
	},
);

export default mongoose.model("User", User);
