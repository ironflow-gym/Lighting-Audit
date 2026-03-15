/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export async function processImage(file: File): Promise<{ data: string; thumbnail: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Full resolution (but compressed/resized to reasonable max)
        const maxDim = 1200;
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        const data = canvas.toDataURL('image/jpeg', 0.7);

        // Thumbnail
        const thumbDim = 200;
        const thumbScale = Math.min(1, thumbDim / Math.max(img.width, img.height));
        const thumbCanvas = document.createElement('canvas');
        thumbCanvas.width = img.width * thumbScale;
        thumbCanvas.height = img.height * thumbScale;
        const thumbCtx = thumbCanvas.getContext('2d');
        thumbCtx?.drawImage(img, 0, 0, thumbCanvas.width, thumbCanvas.height);
        const thumbnail = thumbCanvas.toDataURL('image/jpeg', 0.6);

        resolve({ data, thumbnail });
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
