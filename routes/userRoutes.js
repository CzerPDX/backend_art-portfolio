const express = require(`express`);
const router = express.Router();

const dbHandler = require('../utilities/dbHandler');
const { constantTimeComparison } = require('../utilities/security');

router.use(express.json());

router.post('/register', async (req, res) => {
  const incomingApiKey = req.headers['x-admin-api-key'];
  let isUserAuthorized = false;

  // Validate the user is authorized to register new non-demo accounts
  try {
    // Compare the incoming x-admin-api-key the authorized admin API key
    isUserAuthorized = constantTimeComparison(incomingApiKey, process.env.BACKEND_ADMIN_API_KEY);

    // If the user is not authorized, kick them out 
    if (!isUserAuthorized) {
      const errMsg = `Error! Unauthorized. Registration endpoint requires admin access.`
      console.error(errMsg);
      return res.status(401).send({ message: errMsg });
    }
  } catch (err) {
    const errMsg = `An unknown error occurred when checking the admin API key: ${err.message}.`
    console.error(errMsg);
    return res.status(500).send({ message: errMsg });
  }

  // Verify that all required registration data is included in the request
  if (!req.body.email || !req.body.password) {
    const errMsg = `Error! Email and password for new account must be included in the request body!`;
    console.error(errMsg);
    return res.status(400).send({ message: errMsg });
  }
  let email = req.body.email;
  const plaintextPassword = req.body.email;

  // If the user is authorized and all data needed is present send new user to the database
  
  try {
    // Set email to lowercase and verify it is in a correct format for an email
    email = email.toLowerCase();
  } catch (err) {
    const errMsg = `Unknown error setting email to lowercase!`;
    console.error(errMsg);
    return res.status(500).send({ message: errMsg });
  }
  
  // Check that email is a valid format
  // Hash the password
  // Send it to the database
    // Failure
      // Email already exists
      // Other
    // Success
      // Send success message

  const successMsg = `Successfully registered ${req.body.email}`;
  console.log(successMsg);
  res.status(200).send(successMsg);
});


module.exports = router;