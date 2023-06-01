/*
  References:
  https://github.com/agebrock/tunnel-ssh#readme
  https://node-postgres.com/features/connecting
  https://node-postgres.com/features/queries
*/

const express = require(`express`);
const router = express.Router();

const { executeQuery } = require('../utilities/databaseUtils');
const DBHandler = require('../utilities/dbHandler');

require(`dotenv`).config();



// Dynamic route to return images based on tag name
router.get(`/tags/:tagName`, async (req, res) => {
  const dbHandler = new DBHandler();
  try {
    res.send(await dbHandler.getAllImgsByTag(req.params.tagName));
  } catch (err) {
    console.error(err);
    res.status(500).send('An error occurred while retrieving the images.');
  }
});


// Get all art image information in the database.
router.get(`/all-art`, async (req, res) => {
  try {
    // Set up query
    const query = `SELECT * FROM portfolio_images`;
    const dbResponse = await executeQuery(query);

    // Send query and forward the response
    res.send(dbResponse);
  } catch (err) {
    console.error(`Failed to connect to database`, err);
    res.status(500).send(`Failed to connect to database`);
  }
});


module.exports = router;