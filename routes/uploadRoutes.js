const multer = require('multer');
const express = require(`express`);
const router = express.Router();
const FILE_BUCKET = require('../utilities/file-bucket-sdk');

require(`dotenv`).config();

const easyStore = new FILE_BUCKET.EasyStore();

const { validateFileType } = require('../utilities/security');

// Set up where multer will be saving the file (in memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // limit file size to 5MB
}).single('file');

// Wrap multer's upload in a promise-based function
const uploadAsync = (req, res) => {
  return new Promise((resolve, reject) => {
    upload(req, res, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};


// Handle the upload
router.put('/', async (req, res) => {
  try {
    await uploadAsync(req, res);
    if (req.file) {
      // Validate that there is a description and alt text included in the req
      if ((!req.body.description) || (!req.body.alt_text) || (!req.body.tags)) {
        const errMsg = `Description, alt text, and tags must be included in the request.`;
        console.error(errMsg);
        return res.status(400).send({ message: errMsg });
      }

      // If there is, then send the data to the image bucket and the database
      try {
        // Validate the fileType is an allowed one (JPG, PNG, GIF)
        if (!validateFileType(req.file.buffer)) {
          const errMsg = `Invalid file type.`;
          console.error(errMsg);
          return res.status(400).send({ message: errMsg });
        }
        
        // Once validated, upload the file to the file bucket
        // Set parameters
        const params = {
          Bucket: process.env.BUCKET_NAME,
          Key: req.file.originalname,
          Body: req.file.buffer,
        };
        // Send the fileBucketResponse 
        const fileBucketResponse = await easyStore.upload(params);


        // Set up query
        const query = `
        SELECT pi.* 
        FROM portfolio_images pi 
        JOIN portfolio_image_tags_assoc pita ON pi.filename = pita.filename
        JOIN portfolio_tags pt ON pt.tag_id = pita.tag_id
        WHERE pt.tag_name = $1;
        `;

        // Send query and forward the response
        res.send(await executeQuery(query, [req.params.tagName]));

        res.status(200).send({ message: `Successfully uploaded: ${fileBucketResponse.data.Location}`});

      } catch (err) {
        const errMsg = `Error uploading the file: ${err.Message}`;
        console.error(errMsg);
        res.status(500).send({ message: errMsg });
      }
    } else {
      res.status(400).send({ message: 'No file was included in the request to the backend.' });
    }
  } catch (err) {
    if (err instanceof multer.MulterError) {
      // A Multer error occurred when uploading.
      const errMsg = `Multer error: ${err.message}`;
      console.error(errMsg);
      res.status(500).send({ message: errMsg });
    } else {
      // An unknown error occurred when uploading.
      const errMsg = `Unknown error: ${err.message}`;
      console.error(errMsg);
      res.status(500).send({ message: errMsg });
    }
  }
});

module.exports = router;