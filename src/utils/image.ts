/**
 * Utility functions for image compression and upload
 */

export interface ImageCompressionOptions {
  maxSizeMB: number;
  maxWidthOrHeight: number;
  useWebWorker?: boolean;
  fileType?: string;
}

export interface ImageUploadResult {
  url: string;
  path: string;
  thumbnailUrl?: string;
}

/**
 * Compress an image file while maintaining aspect ratio
 */
export async function compressImage(
  file: File,
  options: ImageCompressionOptions = {
    maxSizeMB: 10,
    maxWidthOrHeight: 1920,
    useWebWorker: false,
    fileType: 'image/jpeg',
  },
): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // Calculate new dimensions while maintaining aspect ratio
        let { width, height } = img;
        const maxDimension = options.maxWidthOrHeight;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = (height / width) * maxDimension;
            width = maxDimension;
          } else {
            width = (width / height) * maxDimension;
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // Draw image on canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to blob with quality compression
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'));
              return;
            }

            // Check if compressed size is within limit
            const sizeMB = blob.size / 1024 / 1024;
            if (sizeMB > options.maxSizeMB) {
              reject(new Error(`Image size ${sizeMB.toFixed(2)}MB exceeds limit of ${options.maxSizeMB}MB`));
              return;
            }

            // Create new file from blob
            const compressedFile = new File([blob], file.name, {
              type: options.fileType || file.type,
              lastModified: Date.now(),
            });

            resolve(compressedFile);
          },
          options.fileType || file.type,
          0.85, // Quality (0-1, where 1 is highest)
        );
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Generate a thumbnail from an image file
 */
export async function generateThumbnail(file: File, maxSize: number = 400): Promise<File> {
  return compressImage(file, {
    maxSizeMB: 1,
    maxWidthOrHeight: maxSize,
    fileType: 'image/jpeg',
  });
}

/**
 * Validate image file before upload
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const maxSizeMB = 10;
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  // Check file type
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Nieprawidłowy format pliku. Dozwolone: JPG, PNG, WebP',
    };
  }

  // Check file size
  const sizeMB = file.size / 1024 / 1024;
  if (sizeMB > maxSizeMB) {
    return {
      valid: false,
      error: `Plik jest za duży (${sizeMB.toFixed(2)}MB). Maksymalny rozmiar: ${maxSizeMB}MB`,
    };
  }

  return { valid: true };
}

/**
 * Validate multiple image files before upload
 */
export function validateImageFiles(files: File[], maxFiles: number = 5): { valid: boolean; error?: string } {
  // Check number of files
  if (files.length === 0) {
    return {
      valid: false,
      error: 'Nie wybrano żadnych plików',
    };
  }

  if (files.length > maxFiles) {
    return {
      valid: false,
      error: `Można dodać maksymalnie ${maxFiles} zdjęć`,
    };
  }

  // Validate each file
  for (const file of files) {
    const validation = validateImageFile(file);
    if (!validation.valid) {
      return validation;
    }
  }

  return { valid: true };
}

/**
 * Upload image to Supabase Storage
 */
export async function uploadImageToStorage(
  file: File,
  userId: string,
  supabaseClient: any,
): Promise<ImageUploadResult> {
  // Validate file
  const validation = validateImageFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Compress original image
  const compressedFile = await compressImage(file);

  // Generate thumbnail
  const thumbnailFile = await generateThumbnail(compressedFile);

  // Generate unique filename with timestamp
  const timestamp = Date.now();
  const fileExtension = file.name.split('.').pop();
  const fileName = `${timestamp}-${Math.random().toString(36).substring(7)}.${fileExtension}`;
  const thumbnailFileName = `${timestamp}-thumb-${Math.random().toString(36).substring(7)}.jpg`;

  // Upload paths
  const filePath = `${userId}/${fileName}`;
  const thumbnailPath = `${userId}/${thumbnailFileName}`;

  // Upload original (compressed) image
  const { error: uploadError } = await supabaseClient.storage.from('offers').upload(filePath, compressedFile, {
    cacheControl: '3600',
    upsert: false,
  });

  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`);
  }

  // Upload thumbnail
  const { error: thumbnailError } = await supabaseClient.storage.from('offers').upload(thumbnailPath, thumbnailFile, {
    cacheControl: '3600',
    upsert: false,
  });

  if (thumbnailError) {
    console.warn('Thumbnail upload failed:', thumbnailError);
  }

  // Get public URLs
  const { data: urlData } = supabaseClient.storage.from('offers').getPublicUrl(filePath);

  const { data: thumbnailUrlData } = supabaseClient.storage.from('offers').getPublicUrl(thumbnailPath);

  return {
    url: urlData.publicUrl,
    path: filePath,
    thumbnailUrl: thumbnailUrlData?.publicUrl,
  };
}

/**
 * Upload multiple images to Supabase Storage in parallel
 */
export async function uploadMultipleImages(
  files: File[],
  userId: string,
  supabaseClient: any,
): Promise<ImageUploadResult[]> {
  // Validate files
  const validation = validateImageFiles(files);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Upload all files in parallel
  const uploadPromises = files.map((file) => uploadImageToStorage(file, userId, supabaseClient));

  try {
    const results = await Promise.all(uploadPromises);
    return results;
  } catch (error) {
    throw new Error(`Failed to upload images: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Delete image from Supabase Storage
 */
export async function deleteImageFromStorage(
  imagePath: string,
  supabaseClient: any,
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabaseClient.storage.from('offers').remove([imagePath]);

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  return { success: true };
}

/**
 * Delete multiple images from Supabase Storage
 */
export async function deleteMultipleImages(
  imagePaths: string[],
  supabaseClient: any,
): Promise<{ success: boolean; error?: string }> {
  if (imagePaths.length === 0) {
    return { success: true };
  }

  const { error } = await supabaseClient.storage.from('offers').remove(imagePaths);

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  return { success: true };
}
