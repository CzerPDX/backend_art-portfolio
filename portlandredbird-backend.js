require('dotenv').config();
const express = require('express');
const { validateAPI, apiLimiter } = require('./utilities/security');

const app = express();

// Figure out the port
// In live environment the NODE_ENV will be set to "production"
const port = process.env.NODE_ENV === 'production' ? null : process.env.PORTFOLIO_API_PORT;

//  Validate request's api key before proceeding
app.use(validateAPI);

// Use rate IP-based rate limiting
app.use(apiLimiter);

// Serve the Routes
// Art Portfolio Routes
const artRoutes = require('./routes/artRoutes');
app.use('/art', artRoutes);

// Art Upload Routes
const uploadRoutes = require('./routes/uploadRoutes');
app.use('/upload', uploadRoutes);


// Start the server
app.listen(port, () => {
  console.log(`Server started on port ${port ? port : 'assigned by A2 Hosting'}...`);
});
