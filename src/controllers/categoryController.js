const Category = require('../models/Category');
const Post = require('../models/Post');
const { validationResult } = require('express-validator');

// @desc    Get all categories
// @route   GET /api/categories
// @access  Public
exports.getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find({ isActive: true })
      .populate('parentCategory', 'name slug')
      .sort({ name: 1 });

    // Build tree structure
    const buildTree = (categories, parentId = null) => {
      return categories
        .filter(cat => {
          const catParentId = cat.parentCategory ? cat.parentCategory._id.toString() : null;
          return catParentId === (parentId ? parentId.toString() : null);
        })
        .map(cat => ({
          ...cat.toObject(),
          children: buildTree(categories, cat._id)
        }));
    };

    const tree = buildTree(categories);

    res.json({
      success: true,
      count: categories.length,
      data: tree
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single category
// @route   GET /api/categories/:id
// @access  Public
exports.getCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id)
      .populate('parentCategory', 'name slug');

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Get posts in this category
    const posts = await Post.find({ category: category._id, status: 'published' })
      .select('title slug publishedAt views')
      .limit(10)
      .sort({ publishedAt: -1 });

    res.json({
      success: true,
      data: {
        ...category.toObject(),
        recentPosts: posts
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create category
// @route   POST /api/categories
// @access  Private/Admin
exports.createCategory = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { name, description, parentCategory, image } = req.body;

    // Generate slug
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    // Check if slug exists
    const slugExists = await Category.findOne({ slug });
    if (slugExists) {
      return res.status(400).json({
        success: false,
        message: 'Category with this name already exists'
      });
    }

    // Validate parent category if provided
    if (parentCategory) {
      const parent = await Category.findById(parentCategory);
      if (!parent) {
        return res.status(404).json({
          success: false,
          message: 'Parent category not found'
        });
      }
    }

    const category = await Category.create({
      name,
      slug,
      description,
      parentCategory: parentCategory || null,
      image
    });

    res.status(201).json({
      success: true,
      data: category
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update category
// @route   PUT /api/categories/:id
// @access  Private/Admin
exports.updateCategory = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    let category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Update slug if name changed
    if (req.body.name && req.body.name !== category.name) {
      const slug = req.body.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      
      const slugExists = await Category.findOne({ slug, _id: { $ne: category._id } });
      if (slugExists) {
        return res.status(400).json({
          success: false,
          message: 'Category with this name already exists'
        });
      }
      req.body.slug = slug;
    }

    // Prevent circular parent references
    if (req.body.parentCategory) {
      if (req.body.parentCategory === req.params.id) {
        return res.status(400).json({
          success: false,
          message: 'Category cannot be its own parent'
        });
      }

      // Check if parent is a descendant
      const checkDescendant = async (catId, parentId) => {
        const cat = await Category.findById(catId);
        if (!cat || !cat.parentCategory) return false;
        if (cat.parentCategory.toString() === parentId) return true;
        return checkDescendant(cat.parentCategory, parentId);
      };

      if (await checkDescendant(req.body.parentCategory, req.params.id)) {
        return res.status(400).json({
          success: false,
          message: 'Cannot set parent to a descendant category'
        });
      }
    }

    category = await Category.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      data: category
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete category
// @route   DELETE /api/categories/:id
// @access  Private/Admin
exports.deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Check if category has posts
    const postsCount = await Post.countDocuments({ category: category._id });
    if (postsCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category. It has ${postsCount} post(s). Please remove or reassign posts first.`
      });
    }

    // Check if category has children
    const childrenCount = await Category.countDocuments({ parentCategory: category._id });
    if (childrenCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category. It has ${childrenCount} subcategory(ies). Please remove or reassign subcategories first.`
      });
    }

    await category.deleteOne();

    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

