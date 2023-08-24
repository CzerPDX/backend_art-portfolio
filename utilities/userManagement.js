/*
  References:
  https://www.npmjs.com/package/jsonwebtoken
*/

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fs = require('fs/promises');

const dbHandler = require('./dbHandler').dbHandlerInstance;
const DBQuery = require('../utilities/dbHandler').DBQuery;
const { 
  ErrWrapper, 
  getErrToThrow, 
  InvalidPasswordErr, 
  InvalidUsernameErr, 
  MissingFieldErr 
} = require('./customErrors');


// Hash a plain text password using bcrypt.
// Returns the hashed password or throws an error
const hashAndSalt = async (plainTextPass) => {
  const saltRounds = 10;
  try {
    return await bcrypt.hash(plainTextPass, saltRounds);
  } catch (err) {
    throw new ErrWrapper(err, `Failed to hash password: ${err.message}`);
  }
};

// Validates the incoming password vs the hashed password in the database
// Returns a JWT if login credentials are valid
// Otherwise, will throw a custom error
const loginUser = async (req) => {

  try {
    // Validate the request contains the required data for a login and then pull out email and password
    validateLoginRequest(req);
    const incomingEmail = req.body.email;
    const incomingPass = req.body.password;

    // Get the hashed password associated with the incoming email
    const hashedPass = await getHashedPass(incomingEmail);

    // compare the passwords
    if (!await bcrypt.compare(incomingPass, hashedPass)) {
      throw new InvalidPasswordErr();
    }

    // Return the JWT
    return await createJWT(incomingEmail);

  } catch (err) {
    throw err;
  }
};

// Create a JWT for the user
const createJWT = async (userEmail) => {
  // Payload is empty in this iteration but will hold info like role in the future
  const payload = {};

  // Private key for signing JWT
  const privateKey = await fs.readFile('utilities/private/jwt-key', 'utf8');

  // Options for the JWT through the jsonwebtoken library
  const options = {
    algorithm:  'RS256',
    issuer:     'Redbird Art Portfolio Backend',
    subject:    userEmail,
    expiresIn:  '20m',
  };

  return jwt.sign(payload, privateKey, options);
};



// Validate incoming login request data
// Throws an appropriate error if anything is missing but otherwise does not return anything
const validateLoginRequest = (req) => {
  // Verify that a body was provided
  if (!req.body) {
    throw new MissingFieldErr('body');
  }

  // Verify that both email and password fields exist in the body
  // Pull email and password from request
  const incomingEmail = req.body.email;
  const incomingPass = req.body.password;
  if (!incomingEmail) {
    throw new MissingFieldErr('email');
  }
  if (!incomingPass) {
    throw new MissingFieldErr('password');
  }
};

// Get the hashed password from the database
// Returns hashed password if user exists, otherwise throws an error
const getHashedPass = async (incomingEmail) => {
  // Get hashed pass from database
  let getPasswordQuery;
  try {
    const getPasswordQueryText = `
    SELECT hashed_password
    FROM users
    WHERE email = $1
    `;
    const getPasswordQueryParams = [incomingEmail];
    getPasswordQuery = new DBQuery(getPasswordQueryText, getPasswordQueryParams);

    // Execute the query
    await dbHandler.executeQueries([getPasswordQuery]);
  } catch (err) {
    throw getErrToThrow(err, 'Failed to get info from database');
  }

  // Validate that exactly 1 row was returned otherwise the user doesn't exist
  try {
    if (getPasswordQuery.rows.length !== 1) {
      throw new InvalidUsernameErr();
    }
  } catch (err) {
    throw getErrToThrow(err, 'Failed to find email in database');
  }

  // Validate that the row contains a key for "hashed_password"
  if (!getPasswordQuery.rows[0].hashed_password) {
    throw new Error('No "hashed_password" key in query.rows[0]');
  }

  return getPasswordQuery.rows[0].hashed_password;
};






module.exports = {
  loginUser
};