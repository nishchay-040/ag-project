const express = require('express');
const projects = require('../controllers/projectController');
const tasks = require('../controllers/taskController');

const router = express.Router();

router.get('/', projects.list);
router.post('/', projects.create);
router.get('/:id', projects.getOne);
router.patch('/:id', projects.update);
router.delete('/:id', projects.remove);

router.get('/:id/tasks', tasks.listForProject);
router.post('/:id/tasks', tasks.create);

module.exports = router;
