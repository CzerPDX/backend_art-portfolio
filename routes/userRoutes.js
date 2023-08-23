const express = require(`express`);
const router = express.Router();
const { handleError } = require('../utilities/customErrors');

const { validateUser } = require('../utilities/userManagement');


router.use(express.json());

router.post('/login', async (req, res) => {
  try {
    // Remove the file using the ContentManagement class' deleteFile method
    const successMsg = await validateUser(req);

    // Send http response
    return res.send({ message: `${successMsg}` });

  } catch (err) {
    handleError(err, res);
  }
});


module.exports = router;