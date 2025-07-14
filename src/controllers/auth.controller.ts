import { Request, Response } from "express";
import passport from "@utils/passport";
import { LogInfo } from "@utils/logger";
import { config } from "../app.config";

const loginDiscord = (req: Request, res: Response, next: any) => {
	LogInfo("Discord OAuth: Initiating authentication");
	passport.authenticate("discord")(req, res, next);
};

const discordCallback = (req: Request, res: Response, next: any) => {
	passport.authenticate("discord", {
		failureRedirect: `${config.frontend.url}/auth/failure`,
		successRedirect: `${config.frontend.url}/auth/success`,
	})(req, res, next);
};

const authSuccess = (req: Request, res: Response) => {
	if (req.user) {
		const user = req.user as any;
		LogInfo(
			`Discord OAuth: Authentication successful for user ${user.username}`,
		);
		res.status(200).json({
			success: true,
			message: "Authentication successful",
			user: {
				id: user._id,
				userId: user.userId,
				username: user.username,
				discriminator: user.discriminator,
				email: user.email,
				avatar: user.imageUrl,
				voiceTime: user.voiceTime,
			},
		});
	} else {
		res.status(401).json({
			success: false,
			message: "Authentication failed",
		});
	}
};

const authFailure = (_req: Request, res: Response) => {
	LogInfo("Discord OAuth: Authentication failed");
	res.status(401).json({
		success: false,
		message: "Discord authentication failed",
	});
};

const logout = (req: Request, res: Response) => {
	const user = req.user as any;
	if (user) {
		LogInfo(`Discord OAuth: User ${user.username} logging out`);
	}

	req.logout((err) => {
		if (err) {
			return res.status(500).json({
				success: false,
				message: "Logout failed",
			});
		}
		res.status(200).json({
			success: true,
			message: "Logged out successfully",
		});
	});
};

const getProfile = (req: Request, res: Response) => {
	if (req.user) {
		const user = req.user as any;
		res.status(200).json({
			success: true,
			user: {
				id: user._id,
				userId: user.userId,
				username: user.username,
				discriminator: user.discriminator,
				email: user.email,
				avatar: user.imageUrl,
				voiceTime: user.voiceTime,
			},
		});
	} else {
		res.status(401).json({
			success: false,
			message: "Not authenticated",
		});
	}
};

const redirectToFrontend = (req: Request, res: Response) => {
	const path = (req.query.path as string) || "";
	const redirectUrl = `${config.frontend.url}${path}`;
	LogInfo(`Redirecting to frontend: ${redirectUrl}`);
	res.redirect(redirectUrl);
};

export default {
	loginDiscord,
	discordCallback,
	authSuccess,
	authFailure,
	logout,
	getProfile,
	redirectToFrontend,
};
