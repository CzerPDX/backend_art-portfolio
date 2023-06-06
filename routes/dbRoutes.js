/*
  dbRoutes.js is responsible for GET requests to get information from the database.
  Routes for adding things into the database are less granual and are included in things like uploadRoutes and deleteRoutes
*/

const express = require(`express`);
const router = express.Router();
const dbHandler = require('../utilities/dbHandler');

require(`dotenv`).config();

// Get all art image information in the database.
router.get(`/all-art`, async (req, res) => {
  try {
    res.send(await dbHandler.getAllimages());
  } catch (err) {
    console.error(`Failed to connect to database`, err);
    res.status(500).send(`Failed to connect to database`);
  }
});

// Sends all tag names in portfolio_tags table as an array
router.get(`/all-tags`, async (req, res) => {
  try {
    res.send(await dbHandler.getAllTagNames());
  } catch (err) {
    console.error(`Failed to connect to database`, err);
    res.status(500).send(`Failed to connect to database`);
  }
});


// Get all images by tag name
// Dynamic route. Get all image data that has been tagged with tagName
router.get(`/art/:tagName`, async (req, res) => {
  try {
    res.send(await dbHandler.getAllimagesByTag(req.params.tagName));
  } catch (err) {
    console.error(`Failed to connect to database`, err);
    res.status(500).send(`Failed to connect to database`);
  }
});

// Get all images by tag name
// Dynamic route. Get all image data that has been tagged with tagName
router.get(`/all-filenames`, async (req, res) => {
  try {
    res.send(await dbHandler.getAllFilenames());
  } catch (err) {
    console.error(`Failed to connect to database`, err);
    res.status(500).send(`Failed to connect to database`);
  }
});

module.exports = router;