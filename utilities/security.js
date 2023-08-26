const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');

const { 
  handleError,
  InvalidAPIKey,
  InvalidAuthTokenErr,
  InvalidDataErr, 
  InvalidFiletypeErr,
  MissingAuthTokenErr,
  MissingFieldErr,
} = require('./customErrors');

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests created from this IP, please try again after 15 minutes."
});

// If JWT is invalid it will throw an error
const validateAndDecodeJWT = (req, res, next) => {
  try {
    // Verify that both req.headers and req.headers['authorization'] exist
    if (!req.headers) {
      throw new MissingFieldErr('headers');
    }
    if (!req.headers['authorization']) {
      throw new MissingFieldErr('headers.authorization');
    }

    // Get the authorization field from the header
    const authHeader = req.headers['authorization'];
    let token;
    try {
      // Split the token from the word "Bearer" in the authorization header
      token = authHeader && authHeader.split(' ')[1];

      // If the token is empty throw a missing auth token error
      if (!token) {
        throw new MissingAuthTokenErr();
      }
    } catch (err) {
      throw getErrToThrow(err, 'Failed to get token from authorization field in header')
    }

    // Finally, validate the token or throw an error
    try {
      jwt.verify(token, process.env.JWT_PRIVATE_KEY);
      next();
    } catch (err) {
      throw new InvalidAuthTokenErr();
    }
  } catch (err) {
    handleError(err, res);
  }
};

// Create a JWT for the user
const createJWT = (userID) => {
  // Payload is empty in this iteration but will hold info like role in the future
  const payload = {};

  // Private key for signing JWT
  const privateKey = process.env.JWT_PRIVATE_KEY;
  console.log(`Key length: ${privateKey.length}`);

  // Options for the JWT through the jsonwebtoken library
  const options = {
    algorithm:  'RS256',
    issuer:     'Redbird Art Portfolio Backend',
    subject:    userID,
    expiresIn:  '20m',
  };

  return jwt.sign(payload, privateKey, options);
};

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
    throw new ErrWrapper(err, err.message);
  }
};


// Returns true if no errors are thrown when validating
// Tag names must be all lowercase and only include alphanumeric symbols and dashes
// Sanitization is not required for valid tag names due to the above restrictions
const validateTagName = (tagName) => {

  // Verify that input is a string
  if (typeof tagName !== "string") {
    throw new ErrWrapper(err, 'Please only provide a string for tag names.');
  }

  // Verify that tagName is not undefined
  if (!tagName) {
    throw new InvalidDataErr('No tag name provided.');
  }

  const allowedCharsRegex = /^[a-z0-9\-]+$/;    // A regex that defines the allowed characters as lowercase alphanumeric with dashes

  // Check the tag name against the regex pattern and throw an error if it doesn't match
  if (!allowedCharsRegex.test(tagName)) {
    throw new InvalidDataErr('Invalid characters in tag name. Tag names may only include lowercase alphanumeric characters and dashes.');
  }

  // If this return statement is reached then the tag name is valid
  return true;
};

// Validate email format for database and html
// Returns nothing if valid. Throws error if invalid
const validateEmail = (email) => {

  // Verify that email is not undefined
  if (!email) {
    throw new InvalidDataErr('No email provided');
  }

  // Verify that input is a string
  if (typeof email !== 'string') {
    throw new InvalidDataErr('Please only provide a string for email');
  }

  // Allowed characters
  // First section before @ sign: only alphanumeric (upper and lower case) and the characters - _ . (at least 1 character)
  // Second section: a single @ sign (exactly 1 character)
  // Third section: alphanumeric (upper and lowercase) and the - character
  // Fourth section: a single .
  // Last section: only leters
  const allowedCharsRegex = /^[a-zA-Z0-9\-_\.]+@[a-zA-Z0-9\-]+\.[a-zA-Z]+$/;

  // Check the tag name against the regex pattern and throw an error if it doesn't match
  if (!allowedCharsRegex.test(email)) {
    throw new InvalidDataErr('Invalid characters in email');
  }
};


// Sanitize input to go into database. Returns sanitized input. To be used with parameterized queries such as what is used in the pg library
// Remove leading and trailing whitespaces
// Check to make sure characters are valid
// Escape special characters (will be replaced with HTML versions using express-validator)
const sanitizeInputForHTML = (input) => {

  // Verify that input is not undefined
  if (!input) {
    throw new InvalidDataErr('No input provided.');
  }

  // Verify that input is a string
  if (typeof input !== "string") {
    throw new InvalidDataErr('Please only provide a string as input.');
  }

  // Allowed characters: 
  // alphanumeric uppercase and lowercase, space, and the following symbols: . , ; : ? ! ( ) \ / | ' " - _ @ # $ % ^ & * [ ] + = ~ ` and newline
  const allowedCharsRegex = /^[a-zA-Z0-9 .,;:?!()<>\\\/'"\-_@#$%^&*|\[\]\~+`=\n]*$/; // A regular expression of allowed characters for input

  // Verify that the input only contains valid characters
  if (!allowedCharsRegex.test(input)) {
    throw new InvalidDataErr('Input contains invalid characters.');
  }

  // Strip leading and trailing whitespace
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
    sanitizedInput = sanitizedInput.replaceAll(symbol, htmlEscapeSymbols[symbol]);
  }

  return sanitizedInput;
};

// Sanitize filenames
// Remove leading and trailing whitespaces
// Check to make sure characters are valid
const sanitizeFilename = (filename) => {

  // Verify that filename is not undefined
  if (!filename) {
    throw new InvalidDataErr('No filename provided');
  }

  // Verify that input is a string
  if (typeof filename !== 'string') {
    throw new InvalidDataErr('Please only provide a string for filename.');
  }

  // Allowed format: 
  // Exactly one basename portion created of only alphanumeric, dash, and underscore. 
  // Exactly one file extension that only allows upper and lowercase letters
  // Exactly one period separating the basename and file extension
  const allowedCharsRegex = /^[a-zA-Z0-9\-_]+\.[a-zA-Z]+$/; // A regular expression that describes the allowed characters and format
  
  // Verify that the input only contains valid characters
  if (!allowedCharsRegex.test(filename)) {
    let errMsg;

    // Currently the software does not allow spaces in the filenames so give a custom error message if the error is due to a space in the filename
    // A future iteration should add functionality to replace the spaces with %20 for url encoding
    if (filename.includes(" ")) {
      errMsg = 'Filenames may not contain spaces.';
    } else {
      errMsg = 'Invalid charcters in filename. Filenames may only include alphanumeric characters, periods, dashes, or underscores';
    }
    throw new InvalidDataErr(errMsg);
  }

  return filename;
}; 



// FiletypeInfo class
class FiletypeInfo {
  constructor(mimeType, extensions, magicNumbers) {
    this.mimeType = mimeType;             // The MIME type of the filetype
    this.extensions = extensions;         // An array of valid extensions for the filetype 
    this.magicNumbers = magicNumbers;     // An array of valid "magic numbers" (the first 4 bytes of the file) for the filetype
  };
}

class AllowedFiletypes {
  constructor() {
    // Initialize FiletypeInfo "structs" for all allowed filetypes
    this.jpg = new FiletypeInfo(
      'image/jpeg', 
      ['jpg', 'jpeg'], 
      ['ffd8ffe0', 'ffd8ffe1', 'ffd8ffe2']
    );

    this.png = new FiletypeInfo(
      'image/png',
      ['.png'],
      ['89504e47']
    );

    this.gif = new FiletypeInfo(
      'image/gif',
      ['.gif'],
      ['47494638']
    )

    // Now include all objects in an array of allowedFiletypes
    this.allowedFiletypes = {
      "jpg": this.jpg,
      "png": this.png,
      "gif": this.gif
    }
  };

  validateFiletypeAndExtension = (incomingFile) => {
    // Validate that incomingFile has been provided
    if (!incomingFile) {
      throw new InvalidDataErr(`No incoming file provided.`);
    }

    // Validate that there is a buffer and originalname file in the incomingFile
    if ((!incomingFile.buffer) || (!incomingFile.originalname)) {
      throw new InvalidDataErr('Incoming file must include both buffer and originalname data.');
    }

    // Validate the filetype vs the allowed types and validate the filename extension based on that type
    try {
      // Make sure the filetype is allowed and, if so, get the keyname that is used for it in this.allowedFiletypes
      const filetypeKeyname = this.#getFiletypeKeyname(incomingFile.buffer);

      // Validate the incomingFile's file extension matches the filetype it is
      this.#validateFilenameExt(filetypeKeyname, incomingFile.originalname)

    } catch (err) {
      throw err;
    }
  };

  // Returns the keyname in this.allowedFiletypes that matches the magic number contained in the buffer
  // If the magic number doesn't match any in this.allowedFiletypes, throw an error.
  #getFiletypeKeyname = (buffer) => {

    // Get the magic number of the incoming buffer file as a string
    let incomingMagicNumber;
    try {
      incomingMagicNumber = buffer.toString('hex', 0, 4);
    } catch (err) {
      throw ErrWrapper(err, `Error getting magic number: ${err.message}`);
    }

    // Find the keyname that matches that magicnumber
    let retKey;
    const allowedFiletypeKeys = Object.keys(this.allowedFiletypes);
    for (let i = 0; (!retKey) && (i < allowedFiletypeKeys.length); ++i) {
      const currentKey = allowedFiletypeKeys[i];
      const currentMagicNumbers = this.allowedFiletypes[currentKey].magicNumbers;
      if (currentMagicNumbers.includes(incomingMagicNumber)) {
        retKey = currentKey;
      }
    }

    if (!retKey) {
      throw new InvalidFiletypeErr('Invalid filetype.');
    }

    return retKey;
  };

  // Returns true if the file in the buffer is an allowed filetype or false if not
  #validateFilenameExt = (filetypeKeyname, filename) => {
    // Verify that filetypeKeyname and filename exist
    if (!filetypeKeyname) {
      throw new ErrWrapper(err, 'No filetype keyname was provided.')
    }
    if (!filename) {
      throw new MissingFieldErr('filename')
    }

    // Verify that this.allowedFiletypes[filetypeKeyname] exists
    if (!this.allowedFiletypes[filetypeKeyname]) {
      throw new InvalidFiletypeErr(`Invalid filetype.`)
    }

    // Now split the filename into two parts
    let splitFilenameArr;
    try {
      // Split the filename by the period
      splitFilenameArr = filename.split('.');
    } catch (err) {
      throw new ErrWrapper(err, `Error splitting filename: ${err.message}`);
    }

    // If there aren't exactly 2 entries in splitFilenameArr, throw an error because the filename is malformed.
    if (splitFilenameArr.length !== 2) {
      throw new InvalidDataErr('Invalid filename. Filename must contain exactly one base name and one file extension, separated by a single period.');
    }

    // Asign the file extention portion of the split filename to its own variable
    const fileExtension = splitFilenameArr[1];

    // Check that the file extension matches some entry in the allowedFiletypes[filetypeKeyname].extensions list
    if (!this.allowedFiletypes[filetypeKeyname].extensions.includes(fileExtension)) {
      throw new InvalidDataErr(`Invalid file extension ${fileExtension} for filetype ${filetypeKeyname}`);
    }
  };
}


module.exports = {
  AllowedFiletypes,
  apiLimiter,
  constantTimeComparison,
  createJWT,
  sanitizeInputForHTML,
  sanitizeFilename,
  validateAndDecodeJWT,
  validateEmail,
  validateTagName,
};