const express = require(`express`);
const router = express.Router();
const { handleError } = require('../utilities/customErrors');

const { loginUser } = require('../utilities/userManagement');


router.use(express.json());

router.post('/login', async (req, res) => {
  try {
    // Get a JSON web token if the user's credentials were valid
    const JWT = await loginUser(req);

    // Set the Authorization header using the JWT
    res.header('Authorization', `Bearer ${JWT}`);

    // Send http response
    return res.send({ message: `Logged in successfully!` });

  } catch (err) {
    handleError(err, res);
  }
});


module.exports = router;