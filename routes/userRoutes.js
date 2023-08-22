const express = require(`express`);
const router = express.Router();

const dbHandler = require('../utilities/dbHandler').dbHandlerInstance;


router.use(express.json());

router.post('/login', async (req, res) => {
  res.status(200).send({ message: 'Reached login' });
});


module.exports = router;