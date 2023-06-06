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

  cleanupHandler = async () => {
    if (this.pool) {
      this.pool.end();
      console.log('Pool closed')
    }
  };


  // Public Methods

  // Add a new tag to the portfolio_tags table
  addTagToDB = async (tagName) => {
    try {
      // Setup query
      const addTagQueryText = `
      INSERT INTO portfolio_tags (tag_name)
      VALUES ($1)`;
      const addTagQueryParams = [tagName];
      const addTagQuery = new DBQuery(addTagQueryText, addTagQueryParams);

      // Exercute query
      await this.#executeQueries([addTagQuery]);

      // Send true if we get here without error
      return true;

    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  // Removes a tag from the portfolio_tags table
  // It will also remove related tag entries from the portfolio_image_tags_assoc table
  // If it succeeds it will return true. Failure will throw an error
  removeTagFromDB = async (tagName) => {
    try {
      // Setup Queries
      // First, remove tag entries from the portfolio_image_tags_assoc table associated with tagName
      const removeAssocsByTagQueryText = `
      DELETE FROM portfolio_image_tags_assoc assoc
      WHERE assoc.tag_id = (
        SELECT tags.tag_id
        FROM portfolio_tags tags
        WHERE tags.tag_name = $1
      )`;
      const removeAssocsByTagQueryParams = [tagName];
      const removeAssocsByTagQuery = new DBQuery(removeAssocsByTagQueryText, removeAssocsByTagQueryParams);

      // Next, remove the entry from the portfolio_tags database for the tag
      const removeTagQueryText = `
      DELETE FROM portfolio_tags tags
      WHERE tags.tag_name = $1`;
      const removeTagQueryParams = [tagName];
      const removeTagQuery = new DBQuery(removeTagQueryText, removeTagQueryParams);
      
      // Execute queries
      await this.#executeQueries([removeAssocsByTagQuery, removeTagQuery]);

      // Return true if this is reached without error
      return true;

    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  // Get all current tags from the database
  // Returns an array of tag_name from the database
  getAllTagNames = async () => {
    // Returns all the tags currently in the database
    try {
      // Set up query
      const allTagNamesQueryText = `
      SELECT tags.tag_name
      FROM portfolio_tags tags`;
      const allTagNamesQuery = new DBQuery(allTagNamesQueryText);

      // Execute query
      await this.#executeQueries([allTagNamesQuery]);

      // Pull tag names out of object and into an array to be sent to client
      const retArr = [];
      for (let tagName of  allTagNamesQuery.rows) {
        retArr.push(tagName.tag_name);
      }

      // Send the tag names back out to the calling function in an array
      return retArr;

    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  // Adds a filename-tag association tot eh assoc table
  addAssocToDB = async (tagName, filename) => {
    try {
      await this.#executeQueries([this.#addAssocQuery(filename, tagName)]);
      return true;

    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  // Removes a filename-tag association from the assoc table
  removeAssocFromDB = async (tagName, filename) => {
    try {
      // Set up query
      const removeAssocQueryText = `
      DELETE 
      FROM portfolio_image_tags_assoc assoc
      WHERE assoc.filename = $1
      AND assoc.tag_id = (
        SELECT tags.tag_id
        FROM portfolio_tags tags
        WHERE tags.tag_name = $2
      )`;
      const removeAssocQueryParams = [filename, tagName]
      const removeAssocQuery = new DBQuery(removeAssocQueryText, removeAssocQueryParams);

      // Execute query
      await this.#executeQueries([removeAssocQuery]);

      // Return true if this is reached without error
      return true;

    } catch (error) {
      console.error(error);
      throw error;
    }
  }


  // Add an image to the portfolio_images table
  // Also adds entries to assoc table for the filename any tags are provided
  addimageToDB = async (filename, bucketUrl, description, altText, tags = []) => {
    try {
      // Set up queries
      const queries = [];

      // Add a new row to the portfolio_images db with the parameter information
      const addImageQueryText = `
      INSERT INTO portfolio_images (filename, bucket_url, description, alt_text)
      VALUES ($1, $2, $3, $4)`;
      const addImageQueryParams = [filename, bucketUrl, description, altText];
      const addImageQuery = new DBQuery(addImageQueryText, addImageQueryParams);
      // Add the query to the queries list
      queries.push(addImageQuery(filename, bucketUrl, description, altText));

      // Add a query to the queries list for each the filename-tag associations for this image
      for (let tagName of tags) {
        queries.push(this.#addAssocQuery(filename, tagName));
      }

      // Execute the queries on the queries list
      await this.#executeQueries(queries);

      // Return true if this is reached without error
      return true; 

    } catch (error) {
      console.error(error);
      throw error;
    }
  }
  
  // Removes a row from the portfolio_images table based on filename.
  // All entries for that filename are also deleted from the assoc table
  removeImageFromDB = async (filename) => {
    try {
      // Setup queries

      // Remove all entries for the filename parameter from the assoc table
      const removeAssocByFilenameQueryText = `
      DELETE FROM portfolio_image_tag_assoc assoc
      WHERE assoc.filename = $1`;
      const removeAssocByFilenameQueryParams = [filename];
      const removeAssocByFilenameQuery = new DBQuery(removeAssocByFilenameQueryText, removeAssocByFilenameQueryParams);

      // Remove the row from portfolio_images table 
      const removeImageQueryText = `
      DELETE FROM portfolio_images image
      WHERE image.filename = $1`;
      const removeImageQueryParams = [filename];
      const removeImageQuery = new DBQuery(removeImageQueryText, removeImageQueryParams);

      // Execute queries
      await this.#executeQueries([removeAssocByFilenameQuery, removeImageQuery]);

      // Return true if this is reached without error
      return true;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  // Get all images in the db
  // Returns an array of all rows in the portfolio_images table
  getAllimages = async () => {
    try {
      // Set up query
      const allImagesQueryText = `SELECT * FROM portfolio_images`;
      const allImagesQuery = new DBQuery(allImagesQueryText);

      // Execute query
      await this.#executeQueries([allImagesQuery]);

      // Return true if this is reached without error
      return allImagesQuery.rows
    } catch (error) {
      console.error(error);
      throw error;
    }
  }


  // Get all images reated to a certain tag name in the db
  // Returns an array of portfolio_images rows matching the tagName parameter
  getAllimagesByTag = async (tagName) => {
    try {
      // Set up query text
      const imagesByTagNameQueryText = `
      SELECT images.*
      FROM portfolio_tags tag
      JOIN portfolio_image_tags_assoc assoc
        ON tag.tag_name = $1
      JOIN portfolio_images images
        ON images.filename = assoc.filename
      WHERE tag.tag_id = assoc.tag_id`;
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
  

  // Returns all entries in the filenames column from the portfolio_images table
  getAllFilenames = async () => {
    try {
      // Set up query text
      const allFilenamesQueryText = `
      SELECT images.filename
      FROM portfolio_images images`;
      const allFilenamesQuery = new DBQuery(allFilenamesQueryText);

      await this.#executeQueries([allFilenamesQuery]);

      // Pull tag names out of object and into an array to be sent to client
      const retArr = [];
      for (let filenameRow of  allFilenamesQuery.rows) {
        retArr.push(filenameRow.filename);
      }

      // Send the tag names back out to the calling function
      return retArr;

    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  getTaglessimages = async (tagName) => {
    // Get a list of all entries in portfolio_images that do not have any entries in portfolio_image_tags_assoc
  }


  // Private methods

  // Reused Queries
  // These methods return DBQuery objects so they can be used repeatedly throughout DBHandler as they are called
  // more than once. If new methods recreate existing queries they should be added here instead and called in both places

  // Add to association table
  #addAssocQuery = (filename, tagName) => {
    const addAssocQueryText = `
    INSERT INTO portfolio_image_tags_assoc (filename, tag_id)
      SELECT $1, tags.tag_id
      FROM portfolio_tags tags
      WHERE tags.tag_name = $2;`;
    const addAssocQueryParams = [filename, tagName];
    return new DBQuery(addAssocQueryText, addAssocQueryParams);
  }


  // Database connection and executeQuery functions
  // These methods handle the pool setup and connection to the database

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

  // Set up a database pool for production on webhost server
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

  // Setup the pool
  #setupHandler = async () => {
    if (!this.pool) {
      this.pool = process.env.NODE_ENV === 'production' ? this.#setupProductionPool() : await this.#setupLocalPool();
      console.log('Pool open');
    } else {
      console.error('Error: Pool already open');
    }
  };

  // Execute queries
  // On failure: rollback of all queries. On success updates DBQuery objects with returned rows.
  #executeQueries = async (dbQueries) => {
    let client;

    try {
      // Make sure the database connection pool is set up then set up the client
      if (!this.pool) {
        await this.#setupHandler();
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

        // Save the resulting rows as dbRes.rows
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

// Create the dbHanderInstance so it can be used in 
const dbHandlerInstance = new DBHandler();

module.exports = dbHandlerInstance;
