require('dotenv').config();
const express = require('express');
const { validateAPI, apiLimiter } = require('./utilities/security');
const dbHandler = require('./utilities/dbHandler');   // Database handler singleton
const app = express();   

// Used to gracefully shut down the server
const cleanupAndExit = async () => {
  try {
    await dbHandler.cleanupHandler();
    // Exit with success code
    process.exit(0); 
  } catch (error) {
    console.error(`Error cleaning up dbHandler: ${error}`);
    // Exit with failure code
    process.exit(1); 
  }
};

// Setup port
// In live environment the NODE_ENV will be set to "production"
const port = process.env.NODE_ENV === 'production' ? null : process.env.PORTFOLIO_API_PORT;

// Log all requests
app.all('*', (req, res, next) => {
  console.log(`${new Date().toString()}: Received ${req.method} request on ${req.path}`);
  next();
});

// Middleware
//  Validate request's api key before proceeding
app.use(validateAPI);
// Use rate IP-based rate limiting
app.use(apiLimiter);

// Routes
// Upload & Delete Routes
const uploadDeleteRoutes = require('./routes/uploadDeleteRoutes');
app.use('/upload', uploadDeleteRoutes);
app.use('/delete', uploadDeleteRoutes);

// DB Routes
const dbRoutes = require('./routes/dbRoutes');
app.use('/db', dbRoutes);

// User Routes
const userRoutes = require('./routes/userRoutes');
app.use('/user', userRoutes);

// Start the server
app.listen(port, async () => {
  try {
    await dbHandler.setupHandler();
    console.log(`Server started on port ${port ? port : 'assigned by A2 Hosting'}...`);
  } catch (error) {
    console.error(`Error setting up dbHandler: ${error}`)
    console.log(`Shutting down server...`)
    await cleanupAndExit();
  }
});

// Run cleanup on SIGINT and SIGTERM
process.on('SIGINT', cleanupAndExit);
process.on('SIGTERM', cleanupAndExit);
