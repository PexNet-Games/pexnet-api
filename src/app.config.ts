import dotenv from "dotenv";

dotenv.config();

const isDevelopment = process.env.NODE_ENV === "development";
const isProduction = process.env.NODE_ENV === "production";

export const config = {
	mongoUri: isDevelopment
		? process.env.MONGO_URI_DEV || ""
		: process.env.MONGO_URI_PROD || "",
	environment: process.env.NODE_ENV || "development",
	port: process.env.PORT || 3000,
	frontend: {
		url: isDevelopment
			? process.env.FRONTEND_URL_DEV || "http://localhost:3001"
			: process.env.FRONTEND_URL_PROD || "https://yourfrontend.com",
	},
	discord: {
		clientId: process.env.DISCORD_CLIENT_ID || "",
		clientSecret: process.env.DISCORD_CLIENT_SECRET || "",
		callbackUrl:
			process.env.DISCORD_CALLBACK_URL ||
			"http://localhost:3000/api/auth/discord/callback",
	},
	session: {
		secret: process.env.SESSION_SECRET || "your-session-secret-change-this",
	},
} as const;

// Validate required environment variables
if (!config.mongoUri) {
	const requiredVar = isDevelopment ? "MONGO_URI_DEV" : "MONGO_URI_PROD";
	throw new Error(`Missing required environment variable: ${requiredVar}`);
}

if (!config.discord.clientId || !config.discord.clientSecret) {
	console.warn(
		"⚠️  Discord OAuth2 credentials not found. Discord authentication will not work.",
	);
}
