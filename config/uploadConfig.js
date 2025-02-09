import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";
import dotenv from "dotenv";

dotenv.config(); // Load variabel dari .env

// Konfigurasi Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

// Konfigurasi penyimpanan Cloudinary
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "uploads", // Folder di Cloudinary
    format: async () => "png",
    public_id: (req, file) => file.originalname.split(".")[0],
  },
});

const upload = multer({ storage });

// Middleware untuk upload multiple files
const uploadMultiple = upload.fields([
  { name: "image", maxCount: 1 },
  { name: "background", maxCount: 1 },
]);

export { uploadMultiple , upload };
