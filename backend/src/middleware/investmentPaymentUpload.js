import fs from "fs";
import path from "path";
import multer from "multer";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/*
|--------------------------------------------------------------------------
| INVESTMENT PAYMENT PROOF UPLOAD DIRECTORY
|--------------------------------------------------------------------------
*/

const uploadDirectory = path.join(
  __dirname,
  "../../uploads/investment-payments",
);

fs.mkdirSync(uploadDirectory, {
  recursive: true,
});

/*
|--------------------------------------------------------------------------
| STORAGE
|--------------------------------------------------------------------------
*/

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, uploadDirectory);
  },

  filename: (req, file, callback) => {
    const extension = path
      .extname(file.originalname || "")
      .toLowerCase();

    const safeExtension = extension || ".jpg";

    callback(
      null,
      `${randomUUID()}${safeExtension}`,
    );
  },
});

/*
|--------------------------------------------------------------------------
| FILE FILTER
|--------------------------------------------------------------------------
*/

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

const upload = multer({
  storage,

  limits: {
    fileSize: 10 * 1024 * 1024,
  },

  fileFilter: (req, file, callback) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      return callback(
        new Error(
          "Payment proof must be a JPG, JPEG, PNG, WebP image, or PDF file.",
        ),
      );
    }

    callback(null, true);
  },
});

/*
|--------------------------------------------------------------------------
| PAYMENT PROOF UPLOAD MIDDLEWARE
|--------------------------------------------------------------------------
*/

export const uploadInvestmentPaymentProof =
  upload.single("paymentProof");

export default uploadInvestmentPaymentProof;
