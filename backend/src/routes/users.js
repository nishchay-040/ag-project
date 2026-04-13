const express = require('express');
const users = require('../controllers/userController');

const router = express.Router();
router.get('/', users.list);
router.get('/me', users.me);

module.exports = router;
