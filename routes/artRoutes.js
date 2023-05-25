/*
  References:
  https://github.com/agebrock/tunnel-ssh#readme
  https://node-postgres.com/features/connecting
  https://node-postgres.com/features/queries
*/

const express = require(`express`);
const router = express.Router();

const { setupLocalPool, setupProductionPool } = require('../utilities/databaseUtils');

require(`dotenv`).config();


const getImagesByTagName = async (tagName) => {
  // Connect to the database
  const pool = process.env.NODE_ENV === 'production' ? setupProductionPool() : await setupLocalPool();
  
  // Set up query
  const query = `
    SELECT pi.* 
    FROM portfolio_images pi 
    JOIN portfolio_image_tags_assoc pita ON pi.filename = pita.filename
    JOIN portfolio_tags pt ON pt.tag_id = pita.tag_id
    WHERE pt.tag_name = $1;
  `;
  
  let responseObject;
  try {
    // Send the query to the database using the pool
    const dbResponse = await pool.query(query, [tagName]);
    responseObject = dbResponse.rows;
    pool.end();
  } catch (err) {
    console.error(err);
    throw err;
  }

  return responseObject;
}


// Dynamic route to return images based on tag name
router.get(`/tags/:tagName`, async (req, res) => {
  try {
    res.send(await getImagesByTagName(req.params.tagName));
  } catch (err) {
    console.error(err);
    res.status(500).send('An error occurred while retrieving the images.');
  }
});


// Get all art image information in the database.
router.get(`/all-art`, async (req, res) => {
  try {
    // Connect to the database
    const pool = process.env.NODE_ENV === 'production' ? setupProductionPool() : await setupLocalPool();
    
    // Send a query to the database and return all rows
    const dbResponse = await pool.query('SELECT * FROM portfolio_images');
    const responseObject = dbResponse.rows;

    // Close the connection to the database
    await pool.end();

    // Send the success status
    res.send(responseObject);
  } catch (err) {
    console.error(`Failed to connect to database`, err);
    res.status(500).send(`Failed to connect to database`);
  }
});

module.exports = router;