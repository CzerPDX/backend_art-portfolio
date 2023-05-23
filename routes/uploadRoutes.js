const axios = require('axios');
const multer = require('multer');
const express = require(`express`);
const router = express.Router();
const FormData = require('form-data');

require(`dotenv`).config();

const { validateFileType, rateLimit } = require('../utilities/security');

// Set up where multer will be saving the file (in memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // limit file size to 5MB
}).single('file');

// Wrap multer's upload in a promise-based function
function uploadAsync(req, res) {
  return new Promise((resolve, reject) => {
    upload(req, res, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

// Handle the upload
router.put('/', async (req, res) => {
  try {
    await uploadAsync(req, res);
    if (req.file) {
      try {
        // Validate the fileType is an allowed one (JPG, PNG, GIF)
        if (!validateFileType(req.file.buffer)) {
          return res.status(400).send({ message: 'Invalid file type.' });
        }

        // Once validated, upload the file
        let form_data = new FormData();
        form_data.append('file', req.file.buffer, req.file.originalname);

        const response = await axios.put(process.env.ART_IMAGE_BUCKET_URL, form_data, {
          headers: {
            'Content-Type': `multipart/form-data; boundary=${form_data._boundary}`,
            'x-api-key': process.env.ART_IMAGE_BUCKET_API_KEY,
            ...form_data.getHeaders(),
          },
        });

        res.send(response.data);
      } catch (err) {
        console.error('Error uploading the file:', err.message);
        res.status(500).send({ message: 'An error occurred while uploading the file.' });
      }
    } else {
      res.status(400).send({ message: 'No file was uploaded to the backend.' });
    }
  } catch (err) {
    if (err instanceof multer.MulterError) {
      // A Multer error occurred when uploading.
      res.status(500).send({ message: `Multer error: ${err.message}` });
    } else {
      // An unknown error occurred when uploading.
      res.status(500).send({ message: `Unknown error: ${err.message}` });
    }
  }
});

module.exports = router;
