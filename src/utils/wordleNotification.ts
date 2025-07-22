/**
 * Formate le temps de completion en format MM:SS
 */
export function formatTimeToComplete(milliseconds: number | undefined): string {
	if (!milliseconds) return "0:00";

	const seconds = Math.floor(milliseconds / 1000);
	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = seconds % 60;

	return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

/**
 * Génère la grille d'emojis pour le résultat Wordle
 */
export function generateWordleGrid(
	guesses: string[],
	targetWord: string,
): string {
	const emojiLines = guesses.map((guess) => {
		const letterResults = analyzeGuessForEmoji(
			guess.toUpperCase(),
			targetWord.toUpperCase(),
		);
		return letterResults
			.map((result) => {
				switch (result.status) {
					case "correct":
						return "🟩"; // Green square
					case "present":
						return "🟨"; // Yellow square
					case "absent":
						return "⬜"; // White square (plus lisible que noir)
					default:
						return "⬜";
				}
			})
			.join("");
	});

	return emojiLines.join("\n");
}

/**
 * Analyse une tentative pour la génération d'emojis
 */
function analyzeGuessForEmoji(
	guess: string,
	targetWord: string,
): Array<{ letter: string; status: "correct" | "present" | "absent" }> {
	const result: Array<{
		letter: string;
		status: "correct" | "present" | "absent";
	}> = [];
	const targetLetters = targetWord.split("");
	const guessLetters = guess.split("");

	// First pass: mark correct letters (green)
	const used = new Array(5).fill(false);
	for (let i = 0; i < 5; i++) {
		if (guessLetters[i] === targetLetters[i]) {
			result[i] = { letter: guessLetters[i], status: "correct" };
			used[i] = true;
		} else {
			result[i] = { letter: guessLetters[i], status: "absent" };
		}
	}

	// Second pass: mark present letters (yellow)
	for (let i = 0; i < 5; i++) {
		if (result[i].status !== "correct") {
			for (let j = 0; j < 5; j++) {
				if (!used[j] && guessLetters[i] === targetLetters[j]) {
					result[i].status = "present";
					used[j] = true;
					break;
				}
			}
		}
	}

	return result;
}

/**
 * Formate la date au format YYYY-MM-DD
 */
export function formatGameDate(date: Date): string {
	return date.toISOString().split("T")[0];
}
