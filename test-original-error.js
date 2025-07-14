// Test the exact failing scenario from the original error
async function testOriginalError() {
	try {
		const response = await fetch(
			"http://localhost:3000/api/wordle/test-stats",
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					discordId: "224537059308732416",
					wordId: 1,
					attempts: 6,
					guesses: ["morts", "boive", "tombe", "", "", ""],
					solved: true,
				}),
			},
		);

		const data = await response.text();
		console.log("Original error test:");
		console.log("Status:", response.status);
		console.log("Response:", data);
	} catch (error) {
		console.error("Error:", error);
	}
}

testOriginalError();
