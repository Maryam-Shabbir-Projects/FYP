
const express = require("express");
const multer = require("multer");
const cloudinary = require("../config/cloudinary");

const router = express.Router();

// ======================================================
// MULTER CONFIGURATION
// ======================================================

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  },

  fileFilter: (req, file, cb) => {
    console.log("Received file:", {
      originalname: file.originalname,
      mimetype: file.mimetype,
    });

    // Accept the file
    cb(null, true);
  },
});

// ======================================================
// UPLOAD HOSTEL IMAGES
// ======================================================

router.post(
  "/hostel-images",
  upload.array("images", 3),

  async (req, res) => {
    try {
      console.log(
        "Number of files received:",
        req.files ? req.files.length : 0
      );

      // ==================================================
      // CHECK FILES
      // ==================================================

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: "No images uploaded",
        });
      }

      // ==================================================
      // MAXIMUM 3 IMAGES
      // ==================================================

      if (req.files.length > 3) {
        return res.status(400).json({
          success: false,
          message: "Maximum 3 images are allowed",
        });
      }

      // ==================================================
      // UPLOAD TO CLOUDINARY
      // ==================================================

      const uploadPromises = req.files.map((file) => {
        return new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            {
              folder: "hostels",
              resource_type: "image",
            },

            (error, result) => {
              if (error) {
                console.error(
                  "Cloudinary upload error:",
                  error
                );

                reject(error);
              } else {
                console.log(
                  "Cloudinary upload successful:",
                  result.secure_url
                );

                resolve(result.secure_url);
              }
            }
          );

          // Send image buffer to Cloudinary
          stream.end(file.buffer);
        });
      });

      // Wait for all images
      const imageUrls = await Promise.all(uploadPromises);

      // ==================================================
      // SEND URLs TO FLUTTER
      // ==================================================

      return res.status(200).json({
        success: true,
        message: "Images uploaded successfully",
        images: imageUrls,
      });
    } catch (err) {
      console.error(
        "Cloudinary upload error:",
        err
      );

      return res.status(500).json({
        success: false,
        message: err.message || "Image upload failed",
      });
    }
  }
);

// ======================================================
// EXPORT ROUTER
// ======================================================

module.exports = router;
