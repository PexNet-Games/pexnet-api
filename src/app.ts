import express from "express";
import mongoose from "mongoose";
import swaggerUi from "swagger-ui-express";
import swaggerFile from "../swagger_output.json";
import cors from "cors";
import session from "express-session";
import { config } from "./app.config";
import passport from "@utils/passport";

import userRoutes from "@routes/user.routes";
import authRoutes from "@routes/auth.routes";

mongoose.set("strictQuery", false);
mongoose
	.connect(config.mongoUri)
	.then(() => console.log(`🍀 Connected to MongoDB (${config.environment})`))
	.catch((err) => console.log(`❌ Failed to connect to MongoDB: ${err}`));

const app = express();
app.use(express.json());
app.use(
	cors({
		origin: true, // Allow all origins in development, configure properly for production
		credentials: true, // Allow cookies to be sent
	}),
);

// Session configuration
app.use(
	session({
		secret: config.session.secret,
		resave: false,
		saveUninitialized: false,
		cookie: {
			secure: config.environment === "production", // Use secure cookies in production
			maxAge: 24 * 60 * 60 * 1000, // 24 hours
		},
	}),
);

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Serve static files
app.use(express.static("public"));

// Ping route
app.get("/api/ping", (_req, res) => {
	return res.status(200).send("🏓 Pong!");
});

// Routes
app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);

// Swagger
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerFile));

export default app;
