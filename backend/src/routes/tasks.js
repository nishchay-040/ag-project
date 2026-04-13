const express = require('express');
const tasks = require('../controllers/taskController');

const router = express.Router();
router.patch('/:id', tasks.update);
router.delete('/:id', tasks.remove);

module.exports = router;
