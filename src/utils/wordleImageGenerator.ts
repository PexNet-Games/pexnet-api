import { createCanvas, loadImage } from "canvas";

export interface WordleResultData {
	guesses: string[];
	targetWord: string;
	solved: boolean;
	attempts: number;
	discordId: string;
	username: string;
	discriminator?: string;
	avatar?: string;
}

export interface LetterResult {
	letter: string;
	status: "correct" | "present" | "absent";
}

/**
 * Generate Wordle result image with colored squares and Discord profile picture
 */
export async function generateWordleResultImage(
	data: WordleResultData,
): Promise<Buffer> {
	// Calculate dynamic dimensions based on content
	const SQUARE_SIZE = 40;
	const SQUARE_GAP = 2;
	const AVATAR_SIZE = 180;
	const PADDING = 20;
	const VERTICAL_SPACING = 30;

	// Calculate grid dimensions
	const GRID_WIDTH = 5 * SQUARE_SIZE + 4 * SQUARE_GAP;
	const GRID_HEIGHT =
		data.guesses.length * SQUARE_SIZE + (data.guesses.length - 1) * SQUARE_GAP;

	// Calculate canvas dimensions to fit content
	const CANVAS_WIDTH = Math.max(GRID_WIDTH, AVATAR_SIZE) + 2 * PADDING;
	const CANVAS_HEIGHT =
		AVATAR_SIZE + VERTICAL_SPACING + GRID_HEIGHT + 2 * PADDING;

	// Calculate centered positions
	const AVATAR_X = (CANVAS_WIDTH - AVATAR_SIZE) / 2;
	const AVATAR_Y = PADDING;
	const GRID_START_X = (CANVAS_WIDTH - GRID_WIDTH) / 2;
	const GRID_START_Y = AVATAR_Y + AVATAR_SIZE + VERTICAL_SPACING;

	// Colors (custom Pexnet colors)
	const COLORS = {
		correct: "#00bc7d", // Green
		present: "#f0b100", // Yellow/Orange
		absent: "#6a7282", // Gray
		border: "#3a3a3c",
	};

	const canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
	const ctx = canvas.getContext("2d");

	// Leave background transparent (don't fill with any color)
	// This creates a transparent PNG

	// Load and draw Discord avatar at top center
	try {
		let avatarUrl = "";
		if (data.avatar) {
			avatarUrl = `https://cdn.discordapp.com/avatars/${data.discordId}/${data.avatar}.png?size=128`;
		} else {
			// Default Discord avatar
			const defaultAvatarId = parseInt(data.discriminator || "0") % 5;
			avatarUrl = `https://cdn.discordapp.com/embed/avatars/${defaultAvatarId}.png`;
		}

		const avatarImage = await loadImage(avatarUrl);

		// Draw circular avatar
		ctx.save();
		ctx.beginPath();
		ctx.arc(
			AVATAR_X + AVATAR_SIZE / 2,
			AVATAR_Y + AVATAR_SIZE / 2,
			AVATAR_SIZE / 2,
			0,
			Math.PI * 2,
		);
		ctx.closePath();
		ctx.clip();
		ctx.drawImage(avatarImage, AVATAR_X, AVATAR_Y, AVATAR_SIZE, AVATAR_SIZE);
		ctx.restore();
	} catch (error) {
		console.error("Failed to load Discord avatar:", error);
		// Draw default circle if avatar fails
		ctx.fillStyle = "#5865f2"; // Discord blurple
		ctx.beginPath();
		ctx.arc(
			AVATAR_X + AVATAR_SIZE / 2,
			AVATAR_Y + AVATAR_SIZE / 2,
			AVATAR_SIZE / 2,
			0,
			Math.PI * 2,
		);
		ctx.fill();
	}

	// Process guesses and generate letter results
	const letterResults: LetterResult[][] = data.guesses.map((guess) =>
		analyzeGuess(guess.toUpperCase(), data.targetWord.toUpperCase()),
	);

	// Helper function to draw rounded rectangle
	const drawRoundedRect = (
		x: number,
		y: number,
		width: number,
		height: number,
		radius: number,
	) => {
		ctx.beginPath();
		ctx.moveTo(x + radius, y);
		ctx.lineTo(x + width - radius, y);
		ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
		ctx.lineTo(x + width, y + height - radius);
		ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
		ctx.lineTo(x + radius, y + height);
		ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
		ctx.lineTo(x, y + radius);
		ctx.quadraticCurveTo(x, y, x + radius, y);
		ctx.closePath();
		ctx.fill();
	};

	// Draw Wordle grid with rounded squares (colors only, no letters)
	const BORDER_RADIUS = 4; // Small border radius for subtle rounded corners
	letterResults.forEach((guessResult, rowIndex) => {
		guessResult.forEach((letterResult, colIndex) => {
			const x = GRID_START_X + colIndex * (SQUARE_SIZE + SQUARE_GAP);
			const y = GRID_START_Y + rowIndex * (SQUARE_SIZE + SQUARE_GAP);

			// Draw rounded square background with color
			ctx.fillStyle = COLORS[letterResult.status];
			drawRoundedRect(x, y, SQUARE_SIZE, SQUARE_SIZE, BORDER_RADIUS);
		});
	});

	return canvas.toBuffer("image/png");
}

/**
 * Analyze a guess against the target word and return letter statuses
 */
function analyzeGuess(guess: string, targetWord: string): LetterResult[] {
	const result: LetterResult[] = [];
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
