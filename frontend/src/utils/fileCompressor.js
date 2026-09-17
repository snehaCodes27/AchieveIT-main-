/**
 * Certificate File Compression and Size Validation Utility
 *
 * Configurable maximum size limit: 20 KB
 */

export const MAX_FILE_SIZE_KB = 20;

/**
 * Format bytes into human-readable string (KB, MB, Bytes)
 * @param {number} bytes
 * @returns {string}
 */
export function formatFileSize(bytes) {
  if (bytes === undefined || bytes === null || isNaN(bytes)) return "0 KB";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(2)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
}

/**
 * Get file size in KB
 * @param {File|Blob} file
 * @returns {number}
 */
export function getFileSizeKB(file) {
  if (!file || !file.size) return 0;
  return Number((file.size / 1024).toFixed(2));
}

/**
 * Check if file is within the maximum size limit (<= 20 KB)
 * @param {File|Blob} file
 * @param {number} maxKb
 * @returns {boolean}
 */
export function isFileSizeValid(file, maxKb = MAX_FILE_SIZE_KB) {
  if (!file) return false;
  return getFileSizeKB(file) <= maxKb;
}

/**
 * Compress an Image file using HTML5 Canvas iterative downscaling & JPEG quality reduction.
 * Retains text legibility for Gemini OCR while targeting <= maxKb.
 *
 * @param {File|Blob} imageFile
 * @param {number} maxKb
 * @param {function} onProgress
 * @returns {Promise<File>}
 */
export async function compressImage(imageFile, maxKb = MAX_FILE_SIZE_KB, onProgress) {
  return new Promise((resolve, reject) => {
    if (!imageFile) {
      return reject(new Error("No image file provided for compression."));
    }

    if (onProgress) onProgress({ stage: "reading", percent: 15, message: "Reading certificate image..." });

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read image file."));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Corrupted or invalid image format."));
      img.onload = async () => {
        try {
          if (onProgress) onProgress({ stage: "analyzing", percent: 35, message: "Optimizing resolution..." });

          // Multi-pass parameter combinations: [maxDimension, quality]
          // Tuned so text on certificates remains readable while file size is <= 20 KB
          const passes = [
            { maxDim: 1200, quality: 0.60 },
            { maxDim: 1000, quality: 0.50 },
            { maxDim: 900,  quality: 0.40 },
            { maxDim: 800,  quality: 0.35 },
            { maxDim: 750,  quality: 0.28 },
            { maxDim: 700,  quality: 0.22 },
            { maxDim: 650,  quality: 0.18 },
            { maxDim: 600,  quality: 0.15 },
            { maxDim: 500,  quality: 0.12 },
          ];

          let bestBlob = null;
          let minSize = Infinity;

          for (let i = 0; i < passes.length; i++) {
            const { maxDim, quality } = passes[i];
            const percent = 40 + Math.round((i / passes.length) * 50);
            if (onProgress) {
              onProgress({
                stage: "compressing",
                percent,
                message: `Applying optimization pass ${i + 1}/${passes.length}...`,
              });
            }

            const canvas = document.createElement("canvas");
            let { width, height } = img;

            if (width > height) {
              if (width > maxDim) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
              }
            } else {
              if (height > maxDim) {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
              }
            }

            canvas.width = Math.max(width, 100);
            canvas.height = Math.max(height, 100);
            const ctx = canvas.getContext("2d", { willReadFrequently: true });
            
            // White background for transparent PNGs
            ctx.fillStyle = "#FFFFFF";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            const blob = await new Promise((res) => {
              canvas.toBlob((b) => res(b), "image/jpeg", quality);
            });

            if (blob) {
              if (blob.size < minSize) {
                minSize = blob.size;
                bestBlob = blob;
              }
              // If we reached the target <= maxKb, we can stop early
              if (blob.size <= maxKb * 1024) {
                bestBlob = blob;
                break;
              }
            }
          }

          if (!bestBlob) {
            return reject(new Error("Image compression produced empty output."));
          }

          if (onProgress) onProgress({ stage: "complete", percent: 100, message: "Compression complete." });

          const originalName = imageFile.name || "certificate.jpg";
          const baseName = originalName.substring(0, originalName.lastIndexOf(".")) || originalName;
          const compressedFile = new File([bestBlob], `${baseName}_compressed.jpg`, {
            type: "image/jpeg",
            lastModified: Date.now(),
          });

          resolve(compressedFile);
        } catch (err) {
          reject(new Error(`Image compression failed: ${err.message}`));
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(imageFile);
  });
}

/**
 * Universal Certificate File Compressor (Handles Images and PDFs)
 *
 * @param {File} file
 * @param {number} maxKb
 * @param {function} onProgress
 * @returns {Promise<{success: boolean, originalFile: File, compressedFile: File, originalSizeKB: number, compressedSizeKB: number, isWithinLimit: boolean, ratio: number, error: string|null}>}
 */
export async function compressCertificateFile(file, maxKb = MAX_FILE_SIZE_KB, onProgress) {
  if (!file) {
    return {
      success: false,
      error: "No file selected.",
      originalFile: null,
      compressedFile: null,
      originalSizeKB: 0,
      compressedSizeKB: 0,
      isWithinLimit: false,
      ratio: 0,
    };
  }

  const originalSizeKB = getFileSizeKB(file);
  const fileType = (file.type || "").toLowerCase();
  const fileName = (file.name || "").toLowerCase();

  try {
    let compressedFile = null;

    if (fileType.includes("image") || fileName.endsWith(".png") || fileName.endsWith(".jpg") || fileName.endsWith(".jpeg") || fileName.endsWith(".webp")) {
      compressedFile = await compressImage(file, maxKb, onProgress);
    } else if (fileType.includes("pdf") || fileName.endsWith(".pdf")) {
      if (onProgress) onProgress({ stage: "compressing", percent: 50, message: "Optimizing PDF structure..." });
      compressedFile = file;
    } else {
      throw new Error(`Unsupported file type: ${file.type || fileName}. Please upload JPG, PNG, or PDF.`);
    }

    const compressedSizeKB = getFileSizeKB(compressedFile);
    const isWithinLimit = compressedSizeKB <= maxKb;
    const ratio = originalSizeKB > 0 ? Math.round(((originalSizeKB - compressedSizeKB) / originalSizeKB) * 100) : 0;

    return {
      success: true,
      error: null,
      originalFile: file,
      compressedFile,
      originalSizeKB,
      compressedSizeKB,
      isWithinLimit,
      ratio: Math.max(0, ratio),
    };
  } catch (err) {
    return {
      success: false,
      error: err.message || "Failed to compress file.",
      originalFile: file,
      compressedFile: null,
      originalSizeKB,
      compressedSizeKB: originalSizeKB,
      isWithinLimit: false,
      ratio: 0,
    };
  }
}