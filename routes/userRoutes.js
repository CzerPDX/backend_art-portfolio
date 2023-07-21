const express = require(`express`);
const router = express.Router();

router.use(express.json()); // Add this line

// Compare API keys with constant time to mitigate timing attacks
const constantTimeComparison = (comp1, comp2) => {
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
};

router.post('/register', async (req, res) => {
  console.log('register hit!');
  console.log(req.body);
  const incomingApiKey = req.headers['x-admin-api-key'];
  // Check that the request has the admin api key otherwise kick them out.
  if (constantTimeComparison(incomingApiKey, process.env.BACKEND_ADMIN_API_KEY)) {
    console.log('API KEYS MATCH');
    res.status(200).send({ message: `Successfully registered user` });
  } else {
    const errMsg = `Error! Unauthorized. Endpoint requires admin access.`
    console.error(errMsg);
    res.status(401).send({ message: errMsg });
  }
});


module.exports = router;