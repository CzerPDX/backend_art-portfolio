const rateLimit = require('express-rate-limit');

// Compare API keys with constant time to mitigate timing attacks
const constantTimeComparison = (comp1, comp2) => {
  try {
    let comparisonResult = true;
    if (comp1.length === comp2.length) {
      for (let i = 0; i < comp1.length; i++) {
        if (comp1[i] !== comp2[i]) {
          comparisonResult = false;
        }
      }
    } else {
      comparisonResult = false;
    }
    return comparisonResult;
  } catch (err) {
    throw err;
  }
};

//  Validate request's api key before proceeding
const validateAPI = (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];
    // If there is no api key or the key doesn't match the expected one, kick them out
    if (!apiKey) {
      return res.status(403).json({message: 'Forbidden: No backend API key provided.'});
    } else if (!constantTimeComparison(apiKey, process.env.BACKEND_API_KEY)) {
      return res.status(403).json({message: 'Forbidden: invalid backend API key.'});
    }
    next();
  } catch (err) {
    throw err;
  }
};

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests created from this IP, please try again after 15 minutes."
});

module.exports = {
  apiLimiter,
  validateAPI,
  constantTimeComparison
};
