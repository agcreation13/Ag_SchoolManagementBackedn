const express = require('express');
const router = express.Router();
const commentController = require('../controllers/commentController');
const { protect } = require('../middleware/auth');
const { validateComment } = require('../middleware/validateComment');

// Comments for a post
router.get('/posts/:postId/comments', commentController.getComments);
router.post('/posts/:postId/comments', protect, validateComment, commentController.createComment);

// Individual comment operations
router.put('/:id', protect, validateComment, commentController.updateComment);
router.delete('/:id', protect, commentController.deleteComment);
router.post('/:id/like', protect, commentController.likeComment);

module.exports = router;

