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
	},
	{
		timestamps: true,
	},
);

export default mongoose.model("User", User);
