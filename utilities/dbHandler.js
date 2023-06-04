/*
  References:
  https://www.npmjs.com/package/tunnel-ssh
  https://node-postgres.com/apis/pool
  https://node-postgres.com/apis/client
  https://node-postgres.com/features/transactions

  NOTE:
  The portfolio_tags table uses an internal sequence function to iterate its id (it assigns it itself)
  With postgres I had to grant usage to my database user like in the following stack overflow post to be able to add to that table:
  https://stackoverflow.com/questions/9325017/error-permission-denied-for-sequence-cities-id-seq-using-postgres
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
  constructor() {
    this.pool = null;
  }

  // Public Methods

  // Add a new tag to the portfolio_tags table
  async addTagToDB(tagName) {
    try {
      // Set up query text
      const addTagQueryText = `
      INSERT INTO portfolio_tags (tag_name)
      VALUES ($1)
      RETURNING *
      `;
      const addTagQueryParams = [tagName];
      const addTagQuery = new DBQuery(addTagQueryText, addTagQueryParams);

      await this.#executeQueries([addTagQuery]);

      // Send the response back out to the calling function
      return true;

    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  // Adds a tag association to the portfolio_image_tags_assoc table
  async addAssocToDB(tagName, filename) {
    try {
      // Set up query text
      const addAssocQueryText = `
      INSERT INTO portfolio_image_tags_assoc (filename, tag_id)
        SELECT $1, tags.tag_id
        FROM portfolio_tags tags
        WHERE tags.tag_name = $2
        RETURNING *
      `;
      const addAssocQueryParams = [filename, tagName];
      const addAssocQuery = new DBQuery(addAssocQueryText, addAssocQueryParams);


      await this.#executeQueries([addAssocQuery]);

      return true;

    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  // Removes a tag association from the 
  async removeAssocFromDB(tagName, filename) {
    try {
      // Set up query text
      const removeAssocQueryText = `
      DELETE 
      FROM portfolio_image_tags_assoc assoc
      WHERE assoc.filename = $1
      AND assoc.tag_id = (
        SELECT tags.tag_id
        FROM portfolio_tags tags
        WHERE tags.tag_name = $2
      )
      `;
      const removeAssocQueryParams = [filename, tagName]
      const removeAssocQuery = new DBQuery(removeAssocQueryText, removeAssocQueryParams);

      await this.#executeQueries([removeAssocQuery]);

      // Return true if this is reached without error
      return true;

    } catch (error) {
      console.error(error);
      throw error;
    }
  }


  // Removes a tag from the portfolio_tags table
  // It will also remove related tag entries from the portfolio_image_tags_assoc table
  // If it succeeds it will return true
  // If it fails it will throw an error
  async removeTagFromDB(tagName) {
    try {
      // Set up query text and parameters for both required queries

      // First, remove tag entries from the portfolio_image_tags_assoc table associated with tagName
      const removeAssocsQueryText = `
      DELETE FROM portfolio_image_tags_assoc assoc
      WHERE assoc.tag_id = (
        SELECT tags.tag_id
        FROM portfolio_tags tags
        WHERE tags.tag_name = $1
      )
      `;
      const removeAssocsQueryParams = [tagName];
      const removeAssocsQuery = new DBQuery(removeAssocsQueryText, removeAssocsQueryParams);

      // Next, remove the entry from the portfolio_tags database for the tag
      const removeTagQueryText = `
      DELETE FROM portfolio_tags tags
      WHERE tags.tag_name = $1
      `;
      const removeTagQueryParams = [tagName];
      const removeTagQuery = new DBQuery(removeTagQueryText, removeTagQueryParams);
      
      await this.#executeQueries([removeAssocsQuery, removeTagQuery]);

      // Return true if this is reached without error
      return true;

    } catch (error) {
      console.error(error);
      throw error;
    }
  }


  // Get all current tags from the database
  // Returns an array of tag_name from the database
  async getAllTagNames() {
    // Returns all the tags currently in the database
    try {
      // Set up query text
      const allTagNamesQueryText = `
      SELECT tags.tag_name
      FROM portfolio_tags tags
      `;
      const allTagNamesQuery = new DBQuery(allTagNamesQueryText);

      await this.#executeQueries([allTagNamesQuery]);

      // Pull tag names out of object and into an array to be sent to client
      const retArr = [];
      for (let tagName of  allTagNamesQuery.rows) {
        retArr.push(tagName.tag_name);
      }

      // Send the tag names back out to the calling function
      return retArr;

    } catch (error) {
      console.error(error);
      throw error;
    }
  }


  async addImgToDB(url, filename, description, altText, tags) {
    try {
      // Make sure the values in the tags parameter exist in the portfolio_tags table. If not, send error
      const tagsInDB = await this.getAllTagNames();

      // For each tag in the tags parameter, check to see if it exists in the database
      for (let tagName in tags) {
        if (!tagsInDB.includes(tagName)) {
          const errMsg = `Error: ${tagName} is not in the database. Remove it from tags list or add it to the database and try your upload again.`;
          console.error(errMsg);
          throw (errMsg);
        }
      }


      // Add the send the url, filename, description, and altText to the portfolio_images table
      // Add the tag associations to portfolio_image_tags_assoc
    } catch (error) {
      console.error(error);
      throw error;
    }
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
      SELECT images.*
      FROM portfolio_tags tag
      JOIN portfolio_image_tags_assoc assoc
        ON tag.tag_name = $1
      JOIN portfolio_images images
        ON images.filename = assoc.filename
      WHERE tag.tag_id = assoc.tag_id
      `;
      const imagesByTagNameQueryParams = [tagName];
      const imagesByTagNameQuery = new DBQuery(imagesByTagNameQueryText, imagesByTagNameQueryParams);

      await this.#executeQueries([imagesByTagNameQuery]);

      // Send the response back out to the calling function
      return imagesByTagNameQuery.rows;

    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  // Get all images in the db
  // Returns an array of all rows in the portfolio_images table
  async getAllImgs() {
    try {
      // Set up query text
      const allImagesQueryText = `SELECT * FROM portfolio_images`;
      const allImagesQuery = new DBQuery(allImagesQueryText);

      await this.#executeQueries([allImagesQuery]);

      // Send the response back out to the calling function
      return allImagesQuery.rows

    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async getTaglessImgs(tagName) {
    // Get a list of all entries in portfolio_images that do not have any entries in portfolio_image_tags_assoc
  }



  // Private methods

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

  #init = async () => {
    this.pool = process.env.NODE_ENV === 'production' ? this.#setupProductionPool() : await this.#setupLocalPool();
  };

  // Execute queries
  // If failure is encountered the query will be rolled back.
  // Expects an array of DBQuery objects
  // Adds the rows from response to each dbQuery object given to it
  #executeQueries = async (dbQueries) => {
    let client;

    try {
      // Make sure the database connection pool is set up then set up the client
      if (!this.pool) {
        await this.#init();
      }
      client = await this.pool.connect();
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
      console.log('Query completed successfully');

    } catch (error) {
      // If an error has occurred, roll back the transaction to undo all changes
      console.error(error);
      console.log('Rolling back commit...')
      await client.query('ROLLBACK');
      console.log('Commit rollback')
      throw error;

    } finally {
      // Close out client
      client.release();
    }
  };
}

module.exports = DBHandler;
