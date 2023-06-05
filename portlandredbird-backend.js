require('dotenv').config();
const express = require('express');
const { validateAPI, apiLimiter } = require('./utilities/security');

// Singleton for the database handler
const dbHandler = require('./utilities/dbHandler'); 

const app = express();

// Figure out the port
// In live environment the NODE_ENV will be set to "production"
const port = process.env.NODE_ENV === 'production' ? null : process.env.PORTFOLIO_API_PORT;

// Log all requests
app.all('*', (req, res, next) => {
  console.log(`${new Date().toString()}: Received ${req.method} request on ${req.path}`);
  next();
});

//  Validate request's api key before proceeding
app.use(validateAPI);

// Use rate IP-based rate limiting
app.use(apiLimiter);

// Serve routes

// Upload Routes
const uploadRoutes = require('./routes/uploadRoutes');
app.use('/upload', uploadRoutes);

// DB Routes
const dbRoutes = require('./routes/dbRoutes');
app.use('/db', dbRoutes);


// Start the server
app.listen(port, () => {
  console.log(`Server started on port ${port ? port : 'assigned by A2 Hosting'}...`);
});


process.on('SIGTERM', async () => {
  await dbHandler.cleanupHandler();
  console.log('SIGTERM REACHED.');
});