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
} as const;

// Validate required environment variables
if (!config.mongoUri) {
	const requiredVar = isDevelopment ? "MONGO_URI_DEV" : "MONGO_URI_PROD";
	throw new Error(`Missing required environment variable: ${requiredVar}`);
}
