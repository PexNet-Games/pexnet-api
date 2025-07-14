// User authentication context interfaces
export interface UserContext {
	discordId: string;
	username: string;
	discriminator?: string;
	avatar?: string;
}

// Daily word response interface
export interface DailyWordResponse {
	word: string;
	date: string; // YYYY-MM-DD format
	wordId: number; // sequential daily word ID
}

// Game stats request interface
export interface GameStatsRequest {
	discordId: string;
	wordId: number;
	date: string;
	attempts: number; // 1-6 or 0 for failed
	guesses: string[]; // array of 5-letter guesses
	solved: boolean;
	timeToComplete?: number; // milliseconds
}

// User stats response interface
export interface UserStatsResponse {
	totalGames: number;
	totalWins: number;
	winPercentage: number;
	currentStreak: number;
	maxStreak: number;
	guessDistribution: { [attempts: string]: number };
	lastPlayedDate?: string;
}

// Leaderboard user interface
export interface LeaderboardUser {
	discordId: string;
	username: string;
	winPercentage: number;
	currentStreak: number;
	totalGames: number;
}

// Leaderboard response interface
export interface LeaderboardResponse {
	users: LeaderboardUser[];
}

// Play status check response interface
export interface PlayStatusResponse {
	hasPlayed: boolean;
	gameResult?: {
		attempts: number;
		solved: boolean;
		guesses: string[];
	} | null;
}

// API Response wrapper interface
export interface ApiResponse<T = any> {
	success: boolean;
	data?: T;
	error?: string;
	message?: string;
}

// Extended Express Request interface for authenticated users
declare global {
	namespace Express {
		interface User {
			id: string;
			discordId: string;
			username: string;
			discriminator?: string;
			avatar?: string;
			email?: string;
		}
	}
}
