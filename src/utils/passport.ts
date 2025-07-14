import passport from "passport";
import { Strategy as DiscordStrategy } from "passport-discord";
import { config } from "../app.config";
import User from "@models/User";
import { LogInfo, LogError } from "./logger";

// Configure Discord OAuth2 strategy
passport.use(
	new DiscordStrategy(
		{
			clientID: config.discord.clientId,
			clientSecret: config.discord.clientSecret,
			callbackURL: config.discord.callbackUrl,
			scope: ["identify", "email"],
		},
		async (
			accessToken: string,
			refreshToken: string,
			profile: any,
			done: any,
		) => {
			try {
				LogInfo(
					`Discord OAuth: User ${profile.username}#${profile.discriminator} attempting to authenticate`,
				);

				// Check if user already exists with this Discord ID
				let user = await User.findOne({ discordId: profile.id });

				if (user) {
					// Update existing user with latest Discord info and tokens
					user.username = profile.username;
					user.discriminator = profile.discriminator;
					user.email = profile.email;
					user.avatar = profile.avatar;
					user.accessToken = accessToken;
					user.refreshToken = refreshToken;
					user.imageUrl = profile.avatar
						? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`
						: null;

					await user.save();
					LogInfo(
						`Discord OAuth: Updated existing user ${profile.username}#${profile.discriminator}`,
					);
				} else {
					// Create new user
					user = new User({
						userId: profile.id, // Use Discord ID as userId for consistency
						discordId: profile.id,
						username: profile.username,
						discriminator: profile.discriminator,
						email: profile.email,
						avatar: profile.avatar,
						accessToken: accessToken,
						refreshToken: refreshToken,
						imageUrl: profile.avatar
							? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`
							: null,
						voiceTime: 0,
					});

					await user.save();
					LogInfo(
						`Discord OAuth: Created new user ${profile.username}#${profile.discriminator}`,
					);
				}

				return done(null, user);
			} catch (error) {
				LogError(`Discord OAuth error: ${error}`);
				return done(error, null);
			}
		},
	),
);

// Serialize user for session
passport.serializeUser((user: any, done) => {
	done(null, user._id);
});

// Deserialize user from session
passport.deserializeUser(async (id: string, done) => {
	try {
		const user = await User.findById(id);
		done(null, user);
	} catch (error) {
		done(error, null);
	}
});

export default passport;
