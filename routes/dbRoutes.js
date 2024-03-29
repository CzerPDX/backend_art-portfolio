/*
  dbRoutes.js is responsible for GET requests to get information from the database.
  Routes for adding things into the database are less granual and are included in things like uploadDeleteRoutes and deleteRoutes
*/

const express = require(`express`);
const router = express.Router();
const ContentManagement = require('../utilities/contentManagement').ContentManagement;
const contentManagement = new ContentManagement();
const { handleError } = require('../utilities/customErrors');

require(`dotenv`).config();

// Get all art image information in the database.
router.get(`/all-art`, async (req, res) => {
  try {
    res.send(await contentManagement.getAllImages());
  } catch (err) {
    handleError(err, res);
  }
});

// Sends all tag names in portfolio_tags table as an array
router.get(`/all-tags`, async (req, res) => {
  try {
    res.send(await contentManagement.getAllTagNames());
  } catch (err) {
    handleError(err, res);
  }
});


// Get all images by tag name
// Dynamic route. Get all image data that has been tagged with tagName
router.get(`/art/:tagName`, async (req, res) => {
  try {
    res.send(await contentManagement.getAllImagesByTag(req.params.tagName));
  } catch (err) {
    handleError(err, res);
  }
});

// Get all images by tag name
// Dynamic route. Get all image data that has been tagged with tagName
router.get(`/all-filenames`, async (req, res) => {
  try {
    res.send(await contentManagement.getAllImageFilenames());
  } catch (err) {
    handleError(err, res);
  }
});

router.get(`/all-assocs`, async (req, res) => {
  try {
    res.send(await contentManagement.getAllImageTagAssocs());
  } catch (err) {
    handleError(err, res);
  }
});

module.exports = router;