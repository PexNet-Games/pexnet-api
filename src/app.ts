import express from "express";
import mongoose from "mongoose";
import swaggerUi from "swagger-ui-express";
import swaggerFile from "../swagger_output.json";
import cors from "cors";
import { config } from "./app.config";

import userRoutes from "@routes/user.routes";

mongoose.set("strictQuery", false);
mongoose
  .connect(config.mongoUri)
  .then(() => console.log(`🍀 Connected to MongoDB (${config.environment})`))
  .catch((err) => console.log("❌ Failed to connect to MongoDB: " + err));

const app = express();
app.use(express.json());
app.use(cors());

// Ping route
app.get("/api/ping", (_req, res) => {
  return res.status(200).send("🏓 Pong!");
});

// Routes
app.use("/api/users", userRoutes);

// Swagger
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerFile));


export default app;
