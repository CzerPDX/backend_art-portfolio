/*
  References:
  https://github.com/agebrock/tunnel-ssh#readme
  https://node-postgres.com/features/connecting
  https://node-postgres.com/features/queries
*/

const express = require(`express`);
const router = express.Router();
const DBHandler = require('../utilities/dbHandler');

require(`dotenv`).config();


// Dynamic route to return images based on tag name
router.get(`/tags/:tagName`, async (req, res) => {
  const dbHandler = new DBHandler();
  try {
    res.send(await dbHandler.getAllImgsByTag(req.params.tagName));
  } catch (err) {
    console.error(`Failed to connect to database`, err);
    res.status(500).send(`Failed to connect to database`);
  }
});

// Get all art image information in the database.
router.get(`/all-art`, async (req, res) => {
  const dbHandler = new DBHandler();
  try {
    res.send(await dbHandler.getAllImgs());
  } catch (err) {
    console.error(`Failed to connect to database`, err);
    res.status(500).send(`Failed to connect to database`);
  }
});


module.exports = router;