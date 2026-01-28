const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const { protect } = require('../middleware/auth');
const { validatePost } = require('../middleware/validatePost');

router.get('/', postController.getPosts);
router.get('/:id', postController.getPost);
router.post('/', protect, validatePost, postController.createPost);
router.put('/:id', protect, validatePost, postController.updatePost);
router.delete('/:id', protect, postController.deletePost);

module.exports = router;

