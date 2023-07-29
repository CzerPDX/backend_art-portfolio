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
const sanitizeInputForHTML = (input) => {

  // Verify that input is not undefined
  if (!input) {
    throw new BadRequestErr('No input provided.');
  }

  // Verify that input is a string
  if (typeof input !== "string") {
    throw new BadRequestErr('Please only provide a string as input.');
  }

  // Allowed characters: 
  // alphanumeric uppercase and lowercase, space, and the following symbols: . , ; : ? ! ( ) \ / | ' " - _ @ # $ % ^ & * [ ] + = ~ ` and newline
  const allowedCharsRegex = /^[a-zA-Z0-9 .,;:?!()<>\\\/'"\-_@#$%^&*|\[\]\~+`=\n]*$/; // A regular expression of allowed characters for input

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
    sanitizedInput = sanitizedInput.replaceAll(symbol, htmlEscapeSymbols[symbol]);
  }

  return sanitizedInput;
}; 

//Sanitize filenames
// Remove leading and trailing whitespaces
// Check to make sure characters are valid
const sanitizeFilename = (filename) => {

  // Verify that filename is not undefined
  if (!filename) {
    throw new BadRequestErr('No filename provided.');
  }

  // Verify that input is a string
  if (typeof filename !== "string") {
    throw new BadRequestErr('Please only provide a string as input.');
  }

  // Allowed format: 
  // Exactly one basename portion created of only alphanumeric, dash, and underscore. 
  // Exactly one file extension that only allows upper and lowercase letters
  // Exactly one period separating the basename and file extension
  const allowedCharsRegex = /^[a-zA-Z0-9\-_]+\.[a-zA-Z]+$/; // A regular expression that describes the allowed characters and format

  // Verify that the input only contains valid characters
  if (!allowedCharsRegex.test(filename)) {
    let errMsg;

    // Currently the software does not allow spaces in the filenames. 
    // However, a future iteration should add functionality to replace the spaces with %20 for url encoding
    if (filename.includes(" ")) {
      errMsg = 'Filenames may not contain spaces.';
    } else {
      errMsg = 'Invalid charcters in filename. Filenames may only include alphanumeric characters, periods, dashes, or underscores';
    }
    throw new BadRequestErr(errMsg);
  }

  // Strip whitespace
  const sanitizedFilename = filename.trim();

  return sanitizedFilename;
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
      throw new Error(`No incomingFile provided.`);
    }

    // Validate that there is a buffer and originalname file in the incomingFile
    if ((!incomingFile.buffer) || (!incomingFile.originalname)) {
      throw new Error('incomingFile must include both buffer and originalname data.');
    }

    // Validate the filetype vs the allowed types and validate the filename extension based on that type
    try {
      // Make sure the filetype is allowed and, if so, get the keyname that is used for it in this.allowedFiletypes
      const filetypeKeyname = this.#getFiletypeKeyname(incomingFile.buffer);
      console.log(`Filetype is ${filetypeKeyname}`);

      // Validate the incomingFile's file extension matches the filetype it is
      this.#validateFilenameExt(filetypeKeyname, incomingFile.originalname)

    } catch (err) {
      throw err;
    }
  };

  // Returns the keyname in this.allowedFiletypes that matches the magic number contained in the buffer
  // If the magic number doesn't match any in this.allowedFiletypes, throw an error.
  // If the
  #getFiletypeKeyname = (buffer) => {

    // Get the magic number of the incoming buffer file as a string
    let incomingMagicNumber;
    try {
      incomingMagicNumber = buffer.toString('hex', 0, 4);
    } catch (err) {
      throw Error(`Error getting magic number: ${err.message}`);
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
      throw new BadRequestErr('Invalid filetype.');
    }

    return retKey;

  };

  // Returns true if the file in the buffer is an allowed filetype or false if not
  #validateFilenameExt = (filetypeKeyname, filename) => {
    // Verify that filetypeKeyname and filename exist
    if (!filetypeKeyname) {
      throw new Error('No filetype keyname was provided.')
    }
    if (!filename) {
      throw new Error('No filename was provided.')
    }

    // Verify that this.allowedFiletypes[filetypeKeyname] exists
    if (!this.allowedFiletypes[filetypeKeyname]) {
      throw new Error(`Incoming filetype keyname of ${filetypeKeyname} is not in the allowed filetypes list.`)
    }

    // Now split the filename into two parts
    let splitFilenameArr;
    try {
      // Split the filename by the period
      splitFilenameArr = filename.split('.');
    } catch (err) {
      throw new Error (`Error splitting filename: ${err.message}`);
    }

    // If there aren't exactly 2 entries in splitFilenameArr, throw an error because the filename is malformed.
    if (splitFilenameArr.length !== 2) {
      throw new Error('Invalid filename. Filename must contain exactly one base name and one file extension, separated by a single period.');
    }

    // Asign the file extention portion of the split filename to its own variable
    const fileExtension = splitFilenameArr[1];

    // Check that the file extension matches some entry in the allowedFiletypes[filetypeKeyname].extensions list
    if (!this.allowedFiletypes[filetypeKeyname].extensions.includes(fileExtension)) {
      throw new Error(`Invalid file extension ${fileExtension} for filetype ${filetypeKeyname}`);
    }

  };
}


module.exports = {
  AllowedFiletypes,
  apiLimiter,
  constantTimeComparison,
  sanitizeInputForHTML,
  sanitizeFilename,
  validateAPI,
};