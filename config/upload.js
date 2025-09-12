import fs from "fs";
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import path from "path";
import { prisma } from "../lib/prisma.js";
import { cloudinary } from "./cloudinary.config.js";

// Ensure uploads folder exists (for local)
const ensureLocalUploadFolder = () => {
  const dir = "./uploads";
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);
};

let storage;

if (process.env.FILE_STORE_TYPE === "cloudinary") {
  storage = new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => {
      let resourceType = "auto";
      if (file.mimetype.startsWith("video/")) resourceType = "video";
      else if (file.mimetype.startsWith("image/")) resourceType = "image";

      return {
        folder: "ultra-ecommerce",
        resource_type: resourceType,
        allowed_formats: ["jpg", "png", "jpeg", "gif", "svg", "mp4", "pdf"],
        public_id: `${Date.now()}-${file.originalname}`,
      };
    },
  });
} else {
  ensureLocalUploadFolder();
  storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, "./uploads");
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const name = `${Date.now()}-${file.originalname}`;
      cb(null, name);
    },
  });
}

const upload = multer({
  storage,
  limits: { fileSize: 1 * 1024 * 1024 }, // 1MB
});

const handleUpload = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    let fileInfo;

    if (process.env.FILE_STORE_TYPE === "cloudinary") {
      fileInfo = {
        fileName: req.file.originalname,
        filePath: req.file.path,
        fileSize: req.file.size,
        provider: "cloudinary",
      };
    } else {
      fileInfo = {
        fileName: req.file.filename,
        filePath: req.file.path,
        fileSize: req.file.size,
        provider: "local",
      };
    }

    // Save file info to database
    const file = await prisma.fileModel.create({ data: fileInfo });

    res.status(200).json({ success: true, file });
  } catch (err) {
    console.error("File upload error:", err);
    res.status(500).json({ message: "File upload failed", error: err.message });
  }
};

export { handleUpload, upload };
