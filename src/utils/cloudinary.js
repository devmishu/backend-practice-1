
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
    cloud_name: process.env.CLOUDINERY_NAME,
    api_key: process.env.CLOUDINERY_API_KEY,
    api_secret: process.env.CLOUDINERY_API_SECRET,
    secure: true,
});

// Check Cloudinary configuration without exposing credentials

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) {
            return null;
        }

        // Upload the file to Cloudinary
        const response = await cloudinary.uploader.upload(
            localFilePath,
            {
                resource_type: "auto",
            }
        );

        console.log("File uploaded successfully:", response.url);

        return response;
    } catch (error) {
        console.error("Cloudinary upload error:", error.message);

        return null;
    } finally {
        // Remove the local temporary file after success or failure
        if (localFilePath && fs.existsSync(localFilePath)) {
            try {
                fs.unlinkSync(localFilePath);
            } catch (fileError) {
                console.error(
                    "Local file cleanup error:",
                    fileError.message
                );
            }
        }
    }
};

export { uploadOnCloudinary };
