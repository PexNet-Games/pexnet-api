/**
 * Example TypeScript service for integrating with Wordle API from Angular frontend
 * This would go in your Angular Wordle project
 */

import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";

export interface DailyWordResponse {
	word: string;
	date: string;
	wordId: number;
}

export interface GameStatsRequest {
	discordId: string;
	wordId: number;
	attempts: number;
	guesses: string[];
	solved: boolean;
	timeToComplete?: number;
}

export interface UserStatsResponse {
	totalGames: number;
	totalWins: number;
	winPercentage: number;
	currentStreak: number;
	maxStreak: number;
	guessDistribution: { [key: string]: number };
	lastPlayedDate?: string;
}

export interface PlayStatusResponse {
	hasPlayed: boolean;
	gameResult?: {
		attempts: number;
		solved: boolean;
		guesses: string[];
	} | null;
}

@Injectable({
	providedIn: "root",
})
export class WordleApiService {
	private readonly API_BASE = "http://localhost:3000/api/wordle";

	constructor(private http: HttpClient) {}

	/**
	 * Get today's daily word
	 */
	getDailyWord(): Observable<DailyWordResponse> {
		return this.http.get<DailyWordResponse>(`${this.API_BASE}/daily-word`);
	}

	/**
	 * Save completed game statistics
	 */
	saveGameStats(stats: GameStatsRequest): Observable<any> {
		return this.http.post(`${this.API_BASE}/stats`, stats, {
			withCredentials: true, // Important for Discord authentication
		});
	}

	/**
	 * Get user's aggregate statistics
	 */
	getUserStats(discordId: string): Observable<UserStatsResponse> {
		return this.http.get<UserStatsResponse>(
			`${this.API_BASE}/stats/${discordId}`,
		);
	}

	/**
	 * Check if user has played today
	 */
	hasPlayedToday(discordId: string): Observable<PlayStatusResponse> {
		return this.http.get<PlayStatusResponse>(
			`${this.API_BASE}/played-today/${discordId}`,
		);
	}

	/**
	 * Get global leaderboard
	 */
	getLeaderboard(limit = 10): Observable<any> {
		return this.http.get(`${this.API_BASE}/leaderboard?limit=${limit}`);
	}

	/**
	 * Generate result image and shareable text
	 */
	generateResultImage(data: {
		discordId: string;
		wordId: number;
		guesses: string[];
		solved: boolean;
		attempts: number;
	}): Observable<{
		success: boolean;
		image: string; // base64 encoded PNG
		shareText: string; // formatted text with emojis
		wordId: number;
		solved: boolean;
		attempts: number;
	}> {
		return this.http.post<any>(`${this.API_BASE}/result-image`, data);
	}
}

/**
 * Example component integration
 */
import { Component, OnInit } from "@angular/core";

@Component({
	selector: "app-wordle-game",
	template: `
		<div class="wordle-game">
			<!-- Game grid here -->
			
			<!-- Result screen -->
			<div *ngIf="gameCompleted" class="result-screen">
				<img [src]="'data:image/png;base64,' + resultImage" alt="Wordle Result" />
				<button class="share-btn" (click)="shareResult()">
					Share 📱
				</button>
				<button class="copy-btn" (click)="copyToClipboard()">
					Copy Text 📋
				</button>
			</div>
		</div>
	`,
})
export class WordleGameComponent implements OnInit {
	gameCompleted = false;
	resultImage = "";
	shareText = "";

	constructor(private wordleService: WordleApiService) {}

	ngOnInit() {
		// Initialize game
	}

	// Call this when game is completed
	onGameComplete(gameData: any) {
		this.wordleService
			.generateResultImage({
				discordId: gameData.discordId,
				wordId: gameData.wordId,
				guesses: gameData.guesses,
				solved: gameData.solved,
				attempts: gameData.attempts,
			})
			.subscribe({
				next: (response) => {
					this.resultImage = response.image;
					this.shareText = response.shareText;
					this.gameCompleted = true;
				},
				error: (error) => {
					console.error("Error generating result:", error);
				},
			});
	}

	// Share using Web Share API (mobile-friendly)
	async shareResult() {
		if (navigator.share) {
			try {
				await navigator.share({
					title: "Mon résultat Pexnet Wordle",
					text: this.shareText,
				});
			} catch (error) {
				console.log("Share canceled or failed:", error);
				this.copyToClipboard(); // Fallback
			}
		} else {
			this.copyToClipboard(); // Fallback for desktop
		}
	}

	// Copy text to clipboard
	async copyToClipboard() {
		try {
			await navigator.clipboard.writeText(this.shareText);
			// Show toast: "Copié !"
			alert("Résultat copié dans le presse-papier !");
		} catch (error) {
			console.error("Failed to copy:", error);
			// Fallback: show text in a modal for manual copy
			this.showCopyModal();
		}
	}

	// Fallback modal for manual copy
	showCopyModal() {
		const modal = prompt(
			"Copiez ce texte pour partager votre résultat:",
			this.shareText,
		);
	}

	// Save game stats (called when user completes a word)
	saveGame(gameStats: GameStatsRequest) {
		this.wordleService.saveGameStats(gameStats).subscribe({
			next: (response) => {
				console.log("Game saved successfully");
				// Generate result image after successful save
				this.onGameComplete(gameStats);
			},
			error: (error) => {
				console.error("Error saving game:", error);
			},
		});
	}

	// Check daily status on component init
	checkDailyStatus(discordId: string) {
		this.wordleService.hasPlayedToday(discordId).subscribe({
			next: (status) => {
				if (status.hasPlayed && status.gameResult) {
					// User already played today, show results
					this.onGameComplete({
						discordId,
						wordId: 0, // Will be fetched from daily word
						...status.gameResult,
					});
				}
			},
		});
	}
}
