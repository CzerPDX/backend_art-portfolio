/*
  References:
  https://www.npmjs.com/package/tunnel-ssh
  https://node-postgres.com/apis/pool
  https://node-postgres.com/apis/client
  https://node-postgres.com/features/transactions
*/

const { Pool } = require('pg')
const { createTunnel } = require(`tunnel-ssh`);

// DBQuery functions as a struct to hold queryText, query parameters, and query responses
class DBQuery {
  constructor(queryText, params = []) {
    this.queryText = queryText;
    this.params = params;
    this.rows = [];
  }
}


// DBHandler provides an interface for setting up and executing database queries based on environment.
class DBHandler {

  // Public Methods

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
    try {
      // Set up query text
      const allTagsQueryText = `SELECT * FROM portfolio_tags`;

      // Create a new DBQuery object and execute it
      const allTagsQuery = new DBQuery(allTagsQueryText);
      await this.#executeQueries([allTagsQuery]);

      // Send the response back out to the calling function
      return allImagesQuery.dbResRows.rows

    } catch (error) {
      console.error(error);
      throw error;
    }
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
  // Returns an array of portfolio_images rows matching the tagName parameter
  async getAllImgsByTag(tagName) {
    try {
      // Set up query text
      const imagesByTagNameQueryText = `
        SELECT portfolioImages.* 
        FROM portfolio_images portfolioImages 
        JOIN portfolio_image_tags_assoc portfolioImagesta ON portfolioImages.filename = portfolioImagesta.filename
        JOIN portfolio_tags pt ON pt.tag_id = portfolioImagesta.tag_id
        WHERE pt.tag_name = $1;
      `;

      // Create a new DBQuery object and execute it
      const imagesByTagNameQuery = new DBQuery(imagesByTagNameQueryText, [tagName]);
      const dbRes = await this.#executeQueries([imagesByTagNameQuery]);

      // Send the response back out to the calling function
      return imagesByTagNameQuery.rows;

    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  // Get all images in the db
  // Returns an array of rows from the portfolio_images table
  async getAllImgs() {
    try {
      // Set up query text
      const allImagesQueryText = `SELECT * FROM portfolio_images`;

      // Create a new DBQuery object and execute it
      const allImagesQuery = new DBQuery(allImagesQueryText);
      await this.#executeQueries([allImagesQuery]);

      // Send the response back out to the calling function
      return allImagesQuery.rows

    } catch (error) {
      console.error(error);
      throw error;
    }
  }


  // private methods

  // Set up a local database pool using SSH into webhosting server
  #setupLocalPool = () => {
    return new Promise(async (resolve, reject) => {
      
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

      try {
      
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
        console.error('Error setting up local pool: ', error);
        reject(error); 
      }
    });
  };

  // Set up a production database pool for production on webhost server
  #setupProductionPool = () => {
    try {
      return new Pool({
        user:       process.env.DB_UN,
        password:   process.env.DB_PW,
        host:       process.env.DB_HOST,
        port:       process.env.DB_PORT,
        database:   process.env.ART_DB_NAME,
        ssl:        false
      });
    } catch (error) {
      console.error(error);
      throw error;
    }   
  };

  // Execute queries
  // If failure is encountered the query will be rolled back.
  // Expects an array of DBQuery objects
  // Adds the response to each dbQuery
  #executeQueries = async (dbQueries) => {
    let pool;
    let client;

    try {
      // Set up the database connection pool and the client
      pool = process.env.NODE_ENV === 'production' ? this.#setupProductionPool() : await this.#setupLocalPool();
      client = await pool.connect();
    } catch (error) {
      console.error(error);
      throw error;
    } 

    try {
      // Send the query and set the response rows in the DBQuery objects

      // Start a transaction
      await client.query('BEGIN');
      console.log('executing queries');

      // Go through the list of queries and execute each one
      for(let dbQuery of dbQueries) {
        // Log the query and send it to the database
        console.log(dbQuery.queryText);
        const dbRes = await client.query(dbQuery.queryText, dbQuery.params);

        // Log the result and save it in in the dbQuery object
        console.log(dbRes.rows);
        dbQuery.rows = dbRes.rows;
      }

      // Commit the transaction if arrived here without error
      await client.query('COMMIT');

    } catch (error) {
      // If an error has occurred, roll back the transaction to undo all changes
      await client.query('ROLLBACK');
      console.error(error);
      throw error;

    } finally {
      // Close out connections
      client.release();
      pool.end();
    }
  };
}

module.exports = DBHandler;
