/*
  References:
  https://www.npmjs.com/package/tunnel-ssh
  https://node-postgres.com/apis/pool
  https://node-postgres.com/apis/client
  https://node-postgres.com/features/transactions

  NOTE:
  The portfolio_tags table uses an internal sequence function to iterate its id (it assigns it itself)
  With postgres I had to grant usage to my database user like in the following stack overflow post to be able to add to that table:
  https://stackoverflow.com/questions/9325017/err-permission-denied-for-sequence-cities-id-seq-using-postgres
*/

const { Pool } = require('pg')
const { createTunnel } = require(`tunnel-ssh`);

const { 
  ConflictErr, 
  ClientReleaseErr, 
  DBConnectionErr, 
  TransactionErr 
} = require('./customErrors');


// Error codes for database
const duplicateDBErrCode = '23505';   // Violates unique entry constraint

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
  //
  // Constructor
  constructor() {
    this.pool = null;
  };

  // Setup the pool when called on. This is not in the constructor because the it needs to be async in the local dev environment.
  setupHandler = async () => {
    try {
      if (!this.pool) {
        this.pool = process.env.NODE_ENV === 'production' ? this.#setupProductionPool() : await this.#setupLocalPool();
        console.log('Pool open');
      } else {
        console.error('err: Tried to open pool, but pool was already open.');
      }
    } catch (err) {
      console.error(err.message);
      throw err;
    }
  };

  // Close the pool and clean up the singleton when (ideally when shutting down the server)
  cleanupHandler = async () => {
    if (this.pool) {
      try {
        this.pool.end();
        console.log('Pool closed')
      } catch (err) {
        console.error(`err closing pool: ${err.message}`);
        throw err;
      }
    }
  };

  // Execute queries
  // Provide an array of DBQuery objects and each one will be run in that order.
  // On failure: rollback of all queries. On success updates DBQuery objects with returned rows.
  executeQueries = async (dbQueries) => {
    let client;

    // Verify that dbQueries: exists, is an array, and that the array consists of DBQuery objects
    if ((!dbQueries) || (!Array.isArray(dbQueries)) || (!dbQueries.every(query => query instanceof DBQuery))) {
      console.error('Error: executeQueries requires an array of DBQuery objects as input');
      throw new Error('Invalid query format.');
    }    

    // Get a new client so it can use the db pool
    try {
      client = await this.pool.connect();
    } catch (err) {
      console.error(err.message);
      throw new DBConnectionErr(err.message);
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
      // Commit the transaction if arrived here without err
      await client.query('COMMIT');

    } catch (err) {

      // If an err has occurred, roll back the transaction to undo all changes
      console.error(err.detail);
      console.log('Rolling back commit...');
      try {
        await client.query('ROLLBACK');
        console.log('Commit rollback');
      } catch (err) {
        throw new TransactionErr(`Failed to rollback transaction: ${err.message}`);
      }

      // Check if the error is a unique key constraint
      if (err.code === duplicateDBErrCode) {
        throw new ConflictErr(`Constraint error: ${err.constraint}`);
      }

      // Otherwise throw a generic transaction error
      throw new TransactionErr(`Database error: ${err.message}`);

    } finally {
      if (client) {
        try {
          // Release the clien tback into the pool
          await client.release();
        } catch (err) {
          throw new ClientReleaseErr(`Failed to release client: ${err.message}`);
        }
      }
    }    
  };

  
  // Private Methods

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

      // If the server is in err, reject the promise and close the server
      server.on('err', (err) => {
        reject(err);
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
          ssl:        false,
          idleTimeoutMillis: 0
        });
  
        // Resovle the promise by providing the pool
        resolve(pool);
  
      } catch (err) {
        // Reject the promise if there's an err
        console.error('err setting up local pool: ', err.message);
        reject(err); 
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
        ssl:        false,
        idleTimeoutMillis: 0
      });
    } catch (err) {
      console.error(err.message);
      throw err;
    }   
  };

}

// Create the dbHanderInstance so it can be used as a singleton
const dbHandlerInstance = new DBHandler();

module.exports = { dbHandlerInstance, DBQuery };
