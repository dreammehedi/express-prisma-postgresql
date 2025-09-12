import { configDotenv } from "dotenv";
import fs from "fs";
import path from "path";
import { cloudinary } from "../config/cloudinary.config.js";
configDotenv();

// Delete a file either from Cloudinary or locally based on your config
async function deleteFile({ url, publicId }) {
  if (process.env.FILE_STORE_TYPE === "cloudinary" && publicId) {
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      console.error("Cloudinary delete error:", error.message);
    }
  }

  if (process.env.FILE_STORE_TYPE === "locally" && url) {
    try {
      // Adjust path to your uploads folder and URL structure
      const fileName = url.split("/").pop();
      const localImagePath = path.resolve("uploads", fileName);

      if (fs.existsSync(localImagePath)) {
        fs.unlinkSync(localImagePath);
      }
    } catch (error) {
      console.error("Local file delete error:", error.message);
    }
  }
}

export { deleteFile };
