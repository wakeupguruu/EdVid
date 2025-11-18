/**
 * Cloudinary Upload Utility
 * Handles uploading videos to Cloudinary and returning URLs
 */

import cloudinary from 'cloudinary';
import { logger } from './logger';

// Configure Cloudinary
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Upload video to Cloudinary
 *
 * @param videoPath - Local path to MP4 file
 * @param videoId - Unique video identifier
 * @returns Object with secure_url, public_id, etc
 */
export async function uploadToCloudinary(videoPath: string, videoId: string) {
  try {
    logger.info(`Uploading ${videoPath} to Cloudinary as ${videoId}`);

    const result = await cloudinary.v2.uploader.upload(videoPath, {
      resource_type: 'video',
      public_id: `edvid/${videoId}`,
      folder: 'edvid',
      overwrite: true,
      timeout: 300000 // 5 min timeout
    });

    logger.info(`Upload successful: ${result.secure_url}`);

    return {
      secure_url: result.secure_url,
      public_id: result.public_id,
      duration: result.duration,
      size: result.bytes
    };

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error('Cloudinary upload failed', { error: errorMsg });
    throw new Error(`Upload failed: ${errorMsg}`);
  }
}

/**
 * Delete video from Cloudinary
 */
export async function deleteFromCloudinary(publicId: string) {
  try {
    const result = await cloudinary.v2.uploader.destroy(publicId, {
      resource_type: 'video'
    });
    logger.info(`Deleted from Cloudinary: ${publicId}`);
    return result;
  } catch (error) {
    logger.error('Failed to delete from Cloudinary', { error });
    throw error;
  }
}
