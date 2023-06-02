const { Pool } = require('pg')
const { createTunnel } = require(`tunnel-ssh`);

class DBHandler {
  
  // public methods

  // Add a new tag to the database
  async addTagToDB(tagName) {
    // Add a new entry to portfolio_tags table
  }

  async removeTagFromDB(tagName) {
    // First remove entries from portfolio_image_tags_assoc for that tag
    // Then remove the entry from the 
    // When deleting a tag from the database it will not delete images that no longer have a tag associaterd
  }

  // Get all current tags from the database
  async listTagsInDB() {
    // Returns all the tags currently in the database
  }

  async getTaglessImgs(tagName) {
    // Get a list of all entries in portfolio_images that do not have any entries in portfolio_image_tags_assoc
  }


  async addImgToDB(url, filename, description, altText, tags) {
    // Make sure the tags requested exist in the portfolio_tags table. If not, send error

    // Add the send the url, filename, description, and altText to the portfolio_images table
    // Add the tag associations to portfolio_image_tags_assoc
  }

  async removeImgFromDB(filename) {
    // Remove the entry from portfolio_images table 
    // Remove any entries in the portfolio_image_tags_assoc table
  }

  // Get all images reated to a certain tag name in the db
  async getAllImgsByTag(tagName) {
    try {
      // Set up query
      const query = `
        SELECT portfolioImages.* 
        FROM portfolio_images portfolioImages 
        JOIN portfolio_image_tags_assoc portfolioImagesta ON portfolioImages.filename = portfolioImagesta.filename
        JOIN portfolio_tags pt ON pt.tag_id = portfolioImagesta.tag_id
        WHERE pt.tag_name = $1;
      `;
  
      // Send query and forward the response
      return this.#executeQuery(query, [tagName]);
    } catch (err) {
      console.error(err);
      return res.status(500).send('An error occurred while retrieving the images.');
    }
  }

  // Get all images in the db
  async getAllImgs() {
    try {
    // Set up query
    const query = `SELECT * FROM portfolio_images`;
  
      // Send query and forward the response
      return this.#executeQuery(query);
    } catch (err) {
      console.error(err);
      return res.status(500).send('An error occurred while retrieving the images.');
    }
  }


  // private methods
  #setupLocalPool = () => {
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

  #setupProductionPool = () => {
    return new Pool({
      user:       process.env.DB_UN,
      password:   process.env.DB_PW,
      host:       process.env.DB_HOST,
      port:       process.env.DB_PORT,
      database:   process.env.ART_DB_NAME,
      ssl:        false
    });
  };

  #executeQuery = async (sqlQuery, params = []) => {
    // Connect to the database
    const pool = process.env.NODE_ENV === 'production' ? this.#setupProductionPool() : await this.#setupLocalPool();
    
    let responseObject;
    try {
      // Send the query to the database using the pool
      const dbResponse = await pool.query(sqlQuery, params);
      responseObject = dbResponse.rows;
      pool.end();
    } catch (err) {
      console.error(err);
      throw err;
    }

    return responseObject;
  };

  
}

module.exports = DBHandler;
