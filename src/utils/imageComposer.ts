import sharp from "sharp";

/**
 * Combine plusieurs images PNG côte à côte (de gauche à droite)
 * @param imageBuffers Array des images PNG en Buffer
 * @returns Buffer de l'image combinée
 */
export async function combineImagesSideBySide(
	imageBuffers: Buffer[],
): Promise<Buffer> {
	if (imageBuffers.length === 0) {
		throw new Error("Aucune image à combiner");
	}

	if (imageBuffers.length === 1) {
		return imageBuffers[0];
	}

	try {
		// Obtenir les dimensions de la première image pour référence
		const firstImage = sharp(imageBuffers[0]);
		const firstMetadata = await firstImage.metadata();

		if (!firstMetadata.width || !firstMetadata.height) {
			throw new Error("Impossible de lire les dimensions de l'image");
		}

		const imageWidth = firstMetadata.width;
		const imageHeight = firstMetadata.height;

		// Calculer la largeur totale
		const totalWidth = imageWidth * imageBuffers.length;

		// Préparer les images avec leurs positions, en préservant la transparence
		const imageInputs = await Promise.all(
			imageBuffers.map(async (buffer, index) => {
				return {
					input: await sharp(buffer)
						.resize(imageWidth, imageHeight, { fit: "contain" })
						.png()
						.toBuffer(),
					left: index * imageWidth,
					top: 0,
				};
			}),
		);

		// Créer l'image combinée avec fond transparent
		const combinedImage = sharp({
			create: {
				width: totalWidth,
				height: imageHeight,
				channels: 4,
				background: { r: 0, g: 0, b: 0, alpha: 0 }, // Fond transparent
			},
		});

		// Composer toutes les images en préservant la transparence
		const result = await combinedImage
			.composite(imageInputs)
			.png({
				compressionLevel: 6, // Compression PNG optimale
				palette: false, // Éviter la palette pour garder les vraies couleurs
			})
			.toBuffer();

		return result;
	} catch (error) {
		console.error("Erreur lors de la combinaison des images:", error);
		throw new Error("Échec de la combinaison des images");
	}
}

/**
 * Combine plusieurs images PNG base64 côte à côte
 * @param base64Images Array des images PNG en base64
 * @returns String base64 de l'image combinée
 */
export async function combineBase64ImagesSideBySide(
	base64Images: string[],
): Promise<string> {
	if (base64Images.length === 0) {
		throw new Error("Aucune image base64 à combiner");
	}

	if (base64Images.length === 1) {
		return base64Images[0];
	}

	try {
		// Convertir les base64 en Buffer
		const imageBuffers = base64Images.map((base64) =>
			Buffer.from(base64, "base64"),
		);

		// Combiner les images
		const combinedBuffer = await combineImagesSideBySide(imageBuffers);

		// Retourner en base64
		return combinedBuffer.toString("base64");
	} catch (error) {
		console.error("Erreur lors de la combinaison des images base64:", error);
		throw error;
	}
}
