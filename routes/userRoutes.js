const express = require(`express`);
const router = express.Router();

const dbHandler = require('../utilities/dbHandler');
const { constantTimeComparison } = require('../utilities/security');

router.use(express.json());

router.login('/login', async (req, res) => {

});


module.exports = router;