const { Pool } = require('pg')
const { createTunnel } = require(`tunnel-ssh`);

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
};

module.exports = {
  setupLocalPool,
  setupProductionPool,
};
