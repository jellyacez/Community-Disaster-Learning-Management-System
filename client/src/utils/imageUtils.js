/**
 * Compresses an image file using an HTML5 Canvas and returns a Base64 string.
 * @param {File} file - The image file to compress.
 * @param {number} maxSize - The maximum width or height of the compressed image.
 * @param {number} quality - The JPEG compression quality (0.0 to 1.0).
 * @returns {Promise<string>} A promise that resolves to the compressed Base64 string.
 */
export const compressImage = (file, maxSize = 150, quality = 0.7) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxSize) {
            height *= maxSize / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width *= maxSize / height;
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => reject(new Error("Invalid image file."));
      img.src = event.target.result;
    };
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsDataURL(file);
  });
};
