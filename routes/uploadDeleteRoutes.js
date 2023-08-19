// Errors are logged and all http responses are sent at the route-handling level
// http codes are saved in each error in customErrors.js
// General server or unknown errors use 500

const express = require(`express`);
const router = express.Router();

require(`dotenv`).config();
const { ContentManagement } = require('../utilities/contentManagement'); 
const contentManagement = new ContentManagement();
const { handleError } = require('../utilities/customErrors');


// Remove a file from the content directory
router.delete('/:filename', async (req, res) => {
  try {
    // Remove the file using the ContentManagement class' deleteFile method
    const successMsg = await contentManagement.deleteFile(req);

    // Send http response
    return res.send({ message: successMsg });

  } catch (err) {
    handleError(err, res);
  }
});

// Upload a file to the content directory
router.put('/', async (req, res) => {
  try {
    const successMsg = await contentManagement.putFile(req, res);
    res.status(200).send({ message: successMsg });
  } catch (err) {
    handleError(err, res);
  }
  
});

module.exports = router;