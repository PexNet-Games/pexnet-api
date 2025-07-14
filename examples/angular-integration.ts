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
}

/**
 * Example component integration
 */
/*
@Component({
  selector: 'app-wordle',
  template: `
    <div class="wordle-game">
      <h1>Wordle - {{ currentDate }}</h1>
      
      <!-- Game board would go here -->
      
      <div class="stats" *ngIf="userStats">
        <h3>Your Stats</h3>
        <p>Games Played: {{ userStats.totalGames }}</p>
        <p>Win Rate: {{ userStats.winPercentage }}%</p>
        <p>Current Streak: {{ userStats.currentStreak }}</p>
      </div>
    </div>
  `
})
export class WordleComponent implements OnInit {
  currentWord: string = '';
  wordId: number = 0;
  currentDate: string = '';
  userStats: UserStatsResponse | null = null;
  discordId: string = '';

  constructor(private wordleApi: WordleApiService) {}

  ngOnInit() {
    // Get Discord ID from parent window or query params
    this.getDiscordId();
    
    // Load today's word and check play status
    this.loadTodaysWord();
    this.loadUserStats();
    this.checkPlayStatus();
  }

  private getDiscordId() {
    // Option 1: From query parameters
    const params = new URLSearchParams(window.location.search);
    this.discordId = params.get('discordId') || '';

    // Option 2: Request from parent window via postMessage
    if (!this.discordId && window.parent !== window) {
      window.parent.postMessage({ type: 'REQUEST_USER_DATA' }, '*');
      
      window.addEventListener('message', (event) => {
        if (event.data.type === 'USER_DATA') {
          this.discordId = event.data.discordId;
          this.loadUserStats();
          this.checkPlayStatus();
        }
      });
    }
  }

  private loadTodaysWord() {
    this.wordleApi.getDailyWord().subscribe({
      next: (response) => {
        this.currentWord = response.word;
        this.wordId = response.wordId;
        this.currentDate = response.date;
      },
      error: (error) => console.error('Failed to load daily word:', error)
    });
  }

  private loadUserStats() {
    if (!this.discordId) return;

    this.wordleApi.getUserStats(this.discordId).subscribe({
      next: (stats) => this.userStats = stats,
      error: (error) => console.error('Failed to load user stats:', error)
    });
  }

  private checkPlayStatus() {
    if (!this.discordId) return;

    this.wordleApi.hasPlayedToday(this.discordId).subscribe({
      next: (status) => {
        if (status.hasPlayed) {
          // Show previous game result
          console.log('User already played today:', status.gameResult);
        }
      },
      error: (error) => console.error('Failed to check play status:', error)
    });
  }

  onGameComplete(guesses: string[], solved: boolean, timeToComplete: number) {
    if (!this.discordId) {
      console.error('No Discord ID available - cannot save stats');
      return;
    }

    const gameStats: GameStatsRequest = {
      discordId: this.discordId,
      wordId: this.wordId,
      attempts: solved ? guesses.length : 0,
      guesses: guesses,
      solved: solved,
      timeToComplete: timeToComplete
    };

    this.wordleApi.saveGameStats(gameStats).subscribe({
      next: () => {
        console.log('Game stats saved successfully');
        this.loadUserStats(); // Refresh stats
      },
      error: (error) => console.error('Failed to save game stats:', error)
    });
  }
}
*/
