import { UploadApiResponse } from "cloudinary";
const cloudinary = require("cloudinary").v2;
import logger from "./logger";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const uploadToCloudinary = async (
  file: Express.Multer.File,
  folder: string = "cirvee"
): Promise<UploadApiResponse> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "auto",
      },
      (error: any, result: UploadApiResponse | undefined) => {
        if (error) {
          logger.error("Cloudinary upload failed:", error);
          return reject(error);
        }
        if (!result) {
          return reject(new Error("Cloudinary upload failed: No result"));
        }
        resolve(result);
      }
    );

    uploadStream.end(file.buffer);
  });
};

export const removeFromCloudinary = async (publicId: string): Promise<any> => {
  try {
    return await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    logger.error("Cloudinary deletion failed:", error);
    throw error;
  }
};

export default cloudinary;
