// Errors are logged and all http responses are sent at the route-handling level
// http codes are saved in each error in customErrors.js
// General server or unknown errors use 500

const express = require(`express`);
const router = express.Router();

require(`dotenv`).config();
const { ContentManagement } = require('../utilities/contentManagement'); 
const contentManagement = new ContentManagement();
const { getHttpCodeFromError } = require('../utilities/customErrors');


// Remove a file from the content directory
router.delete('/:filename', async (req, res) => {
  try {
    // Remove the file using the ContentManagement class' deleteFile method
    const successMsg = await contentManagement.deleteFile(req, res);

    // Send http response
    return res.send({ message: successMsg });

  } catch (err) {
    // Setup error message and log it
    const errMsg = `Error of type ${err.name} when deleting file: ${err.message}`;
    console.error(errMsg);

    // Send http response
    return res.status(getHttpCodeFromError(err)).send({ message: errMsg });
  }
});

// Upload a file to the content directory
router.put('/', async (req, res) => {
  try {
    await contentManagement.putFile(req, res);
    res.status(200).send({ message: `Successfully uploaded: ${process.env.FILE_BUCKET_ENDPOINT}/${req.file.originalname}` });
  } catch (err) {
    // Setup error message and log it
    const errMsg = `Error of type ${err.name} when uploading file to bucket: ${err.message}`;
    console.error(errMsg);

    // Send http response
    return res.status(getHttpCodeFromError(err)).send({ message: errMsg });
  }
  
});

module.exports = router;