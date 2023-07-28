const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');

const { BadRequestErr } = require('./customErrors');

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

// Sanitize input to go into database. Returns sanitized input. To be used with parameterized queries such as what is used in the pg library
// Remove leading and trailing whitespaces
// Check to make sure characters are valid
// Escape special characters (will be replaced with HTML versions using express-validator)
const sanitizeInput = (input) => {

  // Verify that input is a string
  if (typeof input !== "string") {
    throw new BadRequestErr('Please only provide a string as input.');
  }

  // Allowed characters: 
  // alphanumeric uppercase and lowercase, space, and the following symbols: . , ; : ? ! ( ) \ / | ' " - _ @ # $ % ^ & * [ ] + = ~ `
  const allowedCharsRegex = /^[a-zA-Z0-9 .,;:?!()<>\\\/'"\-_@#$%^&*|\[\]\~+`=]*$/; // A regular expression of allowed characters for input

  // Verify that the input only contains valid characters
  if (!allowedCharsRegex.test(input)) {
    throw new BadRequestErr('Input contains invalid characters.');
  }

  // Strip whitespace
  let sanitizedInput = input.trim();

  // Escape the HTML-sensitive special characters into their HTML forms
  // Define HTML definitions of characters that need to be encoded.
  const htmlEscapeSymbols = {
    '&':    "&amp;",
    '\"':  "&quot;",
    '\'':  "&#39;",
    '\\': "&#x2F;",
    '<':     "&lt;",
    '>':  "&gt;"
  }

  // For each entry in htmlEscapeSymbols, replace the key with the value
  for (symbol in htmlEscapeSymbols) {
    // const regex = new RegExp(symbol, 'g');  // Matches all occurrences instead of just the first one
    sanitizedInput = sanitizedInput.replaceAll(symbol, htmlEscapeSymbols[symbol]);
  }

  return sanitizedInput;
}; 

module.exports = {
  apiLimiter,
  validateAPI,
  constantTimeComparison,
  sanitizeInput,
};
