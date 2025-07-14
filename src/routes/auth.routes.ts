import express from "express";
import AuthController from "@controllers/auth.controller";

const router = express.Router();

// Discord OAuth2 routes
router.get("/discord", AuthController.loginDiscord);
router.get("/discord/callback", AuthController.discordCallback);

// Auth status routes
router.get("/success", AuthController.authSuccess);
router.get("/failure", AuthController.authFailure);
router.get("/profile", AuthController.getProfile);
router.post("/logout", AuthController.logout);

// Frontend redirect utility
router.get("/redirect", AuthController.redirectToFrontend);

export default router;
