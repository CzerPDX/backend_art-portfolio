/*
  References:
  https://github.com/agebrock/tunnel-ssh#readme
  https://node-postgres.com/features/connecting
  https://node-postgres.com/features/queries
*/

const express = require(`express`);
const router = express.Router();
const { Pool } = require('pg')
const { createTunnel } = require(`tunnel-ssh`);

require(`dotenv`).config();


// Connect to webhost via SSH tunnel then return a database Pool to the art databse
// If SSH connection is successful, function resolves a Pool object. Otherwise rejects with an error.
const setupLocalPool = () => {
  return new Promise(async (resolve, reject) => {
    try {
      // Set up the SSH tunnel options
      const tunnelOptions = {
        autoClose:  true
      };
      const serverOptions = {
        port: process.env.DB_PORT
      };
      const sshOptions = {
        host:       process.env.SSH_HOST,
        port:       process.env.SSH_PORT,
        username:   process.env.SSH_UN,
        password:   process.env.SSH_PW
      };
      const forwardOptions = {
        srcAddr:    process.env.DB_HOST,
        srcPort:    process.env.DB_PORT,
        dstAddr:    process.env.DB_HOST,
        dstPort:    process.env.DB_PORT
      };

      // Create the SSH tunnel
      let [server, conn] = await createTunnel(tunnelOptions, serverOptions, sshOptions, forwardOptions);

      // If the server is in error, reject the promise and close the server
      server.on('error', (error) => {
        reject(error);
        server.close();
      });
      
      // Set up the database connection now that the SSH tunnel has been established
      const pool = new Pool({
        user:       process.env.DB_UN,
        password:   process.env.DB_PW,
        host:       process.env.DB_HOST,
        port:       process.env.DB_PORT,
        database:   process.env.ART_DB_NAME,
        ssl:        false
      });

      // Resovle the promise by providing the pool
      resolve(pool);

    } catch (error) {
      // Reject the promise if there's an error
      console.error('Error setting up local pool:', error);
      reject(error); 
    }
  });
};

// Return a database Pool to the art database
const setupProductionPool = () => {
  return new Pool({
    user:       process.env.DB_UN,
    password:   process.env.DB_PW,
    host:       process.env.DB_HOST,
    port:       process.env.DB_PORT,
    database:   process.env.ART_DB_NAME,
    ssl:        false
  });
}

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