const multer = require('multer');
const express = require(`express`);
const router = express.Router();
const FILE_BUCKET = require('../utilities/file-bucket-sdk');
const dbHandler = require('../utilities/dbHandler');

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

// Get file upload information
const getFileReadyForUpload = async (req, res) => {
  try {
    await uploadAsync(req, res);
    if (!req.file) {
      return res.status(400).send({ message: 'No file was included in the request to the backend.' });
    }

    // Validate that there is a description and alt text included in the req
    if (!req.body.description || !req.body.alt_text) {
      const errMsg = 'Description and alt text must be included in the request.';
      console.error(errMsg);
      return res.status(400).send({ message: errMsg });
    }

    // Validate the fileType is an allowed one (JPG, PNG, GIF)
    if (!validateFileType(req.file.buffer)) {
      const errMsg = 'Invalid file type.';
      console.error(errMsg);
      return res.status(400).send({ message: errMsg });
    }
  } catch (err) {
    // Another error occurred when uploading.
    const errMsg = `Error when uploading image to the bucket: ${err.message}`;
    console.error(errMsg);
    res.status(500).send({ message: errMsg });
  }
    
};

// Send a file to the file bucket
const uploadToBucket = async (req, res) => {
  try {
    
    // Upload the file to the image bucket
    const params = {
      Bucket: process.env.BUCKET_NAME,
      Key: req.file.originalname,
      Body: req.file.buffer,
    };

    return await easyStore.upload(params);

  } catch (err) {
    if (err instanceof multer.MulterError) {
      // A Multer error occurred when uploading.
      const errMsg = `Multer error when uploading image to the bucket: ${err.message}`;
      console.error(errMsg);
      res.status(500).send({ message: errMsg });
    } else {
      // Another error occurred when uploading.
      const errMsg = `Error when uploading image to the bucket: ${err.message}`;
      console.error(errMsg);
      res.status(500).send({ message: errMsg });
    }
  }
};

// Remove file from the image bucket
const removeFromBucket = async (req, res) => {
  try {
    // Delete the file from the image bucket
    const params = {
      Bucket: process.env.BUCKET_NAME,
      Key: req.file.originalname
    };

    return await easyStore.delete(params);
  } catch (err) {
    console.error(`Error removing file from bucket: ${err.message}`);
    throw err;
  }
};

const IMAGEBUCKETLOCATION = ''

const sendToDB = async (req, res) => {
  try {
    // Send image's metadata to the database
    console.log(req.file.originalname);
    const filename = req.file.originalname;
    const bucketUrl = `${process.env.FILE_BUCKET_ENDPOINT}/${req.file.originalname}`;
    const description = req.body.description;
    const altText = req.body.alt_text;
    return await dbHandler.addImageToDB(filename, bucketUrl, description, altText);
  } catch (err) {
    console.error(`Error sending to database: ${err.message}`);
    throw err;
  }
};

router.delete('/', async (req, res) => {
  console.log('Reached delete route.');
});

router.put('/', async (req, res) => {
  // Try to add the entry to the database
  try {
    await getFileReadyForUpload(req, res);
  } catch (err) {
    const errMsg = `Error when checking upload file: ${err.message}`;
    console.error(errMsg);
    res.status(500).send({ message: errMsg });
  }

  try {
    await sendToDB(req, res);
  } catch (err) {
    // Specific handling for constraint key issues
    if (err.code === 'DB_PKEY_FAILURE') {
      const errMsg = `Error: image already exists in the database. Remove existing database entry for this image or use a different filename. ${err.message}`;
      console.error(errMsg);
      return res.status(409).send({ message: errMsg });
    }
    // General failure sending to database
    else {
      const errMsg = `Error sending details to database: ${err.message}`;
      console.error(errMsg);
      return res.status(500).send({ message: errMsg });
    }
  }

  // Try to send the file to the image bucket
  try {
    await uploadToBucket(req, res);
  } catch (err) {
    // Remove the entry from the database if uploading to the bucket failed.
    try {
      await dbHandler.removeImageFromDB(req.file.originalname);
    } catch (err) {
      const errMsg = `Error. Failed to upload to file bucket. Additional error trying to remove from database during cleanup: ${err.message}`;
    }
    const errMsg = `Error uploading to image bucket: ${err.message}`;
    return res.status(500).send({ message: errMsg });
  }
  // If we get this far without throwing an error then it was successful
  res.status(200).send({ message: `Successfully uploaded: ${process.env.FILE_BUCKET_ENDPOINT}/${req.file.originalname}` });
});

module.exports = router;