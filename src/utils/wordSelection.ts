import fs from "fs";
import path from "path";

/**
 * Load French words from the popular words file
 */
export function loadFrenchWords(): string[] {
	try {
		const filePath = path.join(__dirname, "french_words_popular.txt");
		const content = fs.readFileSync(filePath, "utf-8");

		return content
			.split("\n")
			.map((word) => word.trim().toUpperCase())
			.filter((word) => word.length === 5) // Only 5-letter words for Wordle
			.filter((word) => /^[A-ZÁÀÂÄÉÈÊËÍÌÎÏÓÒÔÖÚÙÛÜÇÑ]+$/i.test(word)); // Only letters (including French accents)
	} catch (error) {
		console.error("Error loading French words:", error);
		// Fallback to a small set of French words
		return [
			"ABORD",
			"ACCES",
			"ACHAT",
			"ACIDE",
			"ACIER",
			"ACTIF",
			"ADIEU",
			"AGENT",
			"AIDER",
			"AIMER",
			"AINSI",
			"ALBUM",
			"ALLER",
			"ALLIE",
			"ALORS",
			"AMANT",
			"AMOUR",
			"ANGLE",
			"ANNEE",
			"APPEL",
			"APPUI",
			"APRES",
			"ARABE",
			"ARBRE",
			"ARMEE",
			"ARMER",
			"ARRET",
			"ASILE",
			"ASSEZ",
			"ATOUT",
			"AUCUN",
			"AUSSI",
			"AUTRE",
			"AVANT",
			"AVION",
			"AVOIR",
			"AVRIL",
			"BALLE",
			"BANAL",
			"BANDE",
			"BARRE",
			"BASER",
			"BATIR",
			"BATON",
			"BELGE",
			"BETON",
			"BIAIS",
			"BIERE",
		];
	}
}

/**
 * Get words used in the last N days
 */
export async function getRecentWords(days: number = 5): Promise<string[]> {
	const WordleDailyWord = (await import("@models/WordleDailyWord")).default;

	const startDate = new Date();
	startDate.setUTCHours(0, 0, 0, 0);
	startDate.setDate(startDate.getDate() - days);

	const recentWords = await WordleDailyWord.find({
		date: { $gte: startDate },
	}).sort({ date: -1 });

	return recentWords.map((wordDoc) => wordDoc.word);
}

/**
 * Select a random word that hasn't been used in the last N days
 */
export function selectAvailableWord(
	allWords: string[],
	recentWords: string[],
): string {
	// Filter out words used recently
	const availableWords = allWords.filter((word) => !recentWords.includes(word));

	// If all words have been used recently (unlikely), fall back to all words
	const wordsToChoose = availableWords.length > 0 ? availableWords : allWords;

	// Select a random word
	const randomIndex = Math.floor(Math.random() * wordsToChoose.length);
	return wordsToChoose[randomIndex];
}

/**
 * Deterministic word selection based on date (alternative to random)
 */
export function selectDeterministicWord(
	allWords: string[],
	recentWords: string[],
	wordId: number,
): string {
	// Filter out words used recently
	const availableWords = allWords.filter((word) => !recentWords.includes(word));

	// If all words have been used recently, fall back to all words
	const wordsToChoose = availableWords.length > 0 ? availableWords : allWords;

	// Use wordId to deterministically select a word
	const index = (wordId - 1) % wordsToChoose.length;
	return wordsToChoose[index];
}
