const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');

const Category = require('../models/category');
const Question = require('../models/question');
const User = require('../models/user');

const getCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find();
  res.status(200).json(new ApiResponse(200, categories, "Categories fetched"));
});

const createCategory = asyncHandler(async (req, res) => {
  const { name, difficulty } = req.body;
  if (!name) {
    return res.status(400).json(new ApiResponse(400, null, "Category name required"));
  }

  if (difficulty && !['beginner', 'intermediate'].includes(difficulty)) {
    return res.status(400).json(new ApiResponse(400, null, "Difficulty must be either 'beginner' or 'intermediate'"));
  }

  let category = await Category.findOne({ name: name.trim() });
  if (category) {
    return res.status(400).json(new ApiResponse(400, null, "Category already exists"));
  }

  category = await Category.create({ name: name.trim(), ...(difficulty && { difficulty }) });
  res.status(201).json(new ApiResponse(201, category, "Category created"));
});

const updateCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, difficulty } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json(new ApiResponse(400, null, "Category name required"));
  }

  if (difficulty && !['beginner', 'intermediate'].includes(difficulty)) {
    return res.status(400).json(new ApiResponse(400, null, "Difficulty must be either 'beginner' or 'intermediate'"));
  }

  const normalizedName = name.trim();

  const duplicate = await Category.findOne({
    name: normalizedName,
    _id: { $ne: id }
  });

  if (duplicate) {
    return res.status(400).json(new ApiResponse(400, null, "Category already exists"));
  }

  const updateData = { name: normalizedName };
  if (difficulty) {
    updateData.difficulty = difficulty;
  }

  const category = await Category.findByIdAndUpdate(
    id,
    updateData,
    { new: true }
  );

  if (!category) {
    return res.status(404).json(new ApiResponse(404, null, "Category not found"));
  }

  res.status(200).json(new ApiResponse(200, category, "Category updated"));
});

const deleteCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const hasQuestions = await Question.exists({ categoryId: id });
  if (hasQuestions) {
    return res.status(400).json(new ApiResponse(400, null, "Cannot delete category with existing questions"));
  }

  const category = await Category.findByIdAndDelete(id);

  if (!category) {
    return res.status(404).json(new ApiResponse(404, null, "Category not found"));
  }

  res.status(200).json(new ApiResponse(200, category, "Category deleted"));
});

const getQuestions = asyncHandler(async (req, res) => {
  const questions = await Question.find()
    .populate('categoryId', 'name')
    .sort({ createdAt: -1 });
  res.status(200).json(new ApiResponse(200, questions, "Questions fetched"));
});

const createQuestion = asyncHandler(async (req, res) => {
  const { category, title, description, hint, answer, point, year, level, difficulty } = req.body;

  if (!category || !title || !description || !answer || !point || !year) {
    return res.status(400).json({
      statusCode: 400,
      message: "All fields are required (category, title, description, answer, point, year)",
      success: false
    });
  }

  // Validate level if provided
  if (level && !['easy', 'medium'].includes(level.toLowerCase())) {
    return res.status(400).json({
      statusCode: 400,
      message: "Level must be either 'easy' or 'medium'",
      success: false
    });
  }
  const questionLevel = level ? level.toLowerCase() : 'easy';

  // Validate difficulty if provided
  if (difficulty && !['beginner', 'intermediate'].includes(difficulty)) {
    return res.status(400).json({
      statusCode: 400,
      message: "Difficulty must be either 'beginner' or 'intermediate'",
      success: false
    });
  }

  let cat = await Category.findOne({ name: category });
  if (!cat) cat = await Category.create({ name: category });

  const existing = await Question.findOne({ title, categoryId: cat._id });
  if (existing) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "Question already exists in this category"));
  }

  const question = await Question.create({
    ...req.body,
    level: questionLevel,
    categoryId: cat._id
  });

  res.status(201).json(new ApiResponse(201, question, "Question created"));
});

const updateQuestion = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { category, level, difficulty } = req.body;

  let updateData = { ...req.body };

  if (level) {
    if (!['easy', 'medium'].includes(level.toLowerCase())) {
      return res.status(400).json({
        statusCode: 400,
        message: "Level must be either 'easy' or 'medium'",
        success: false
      });
    }
    updateData.level = level.toLowerCase();
  }

  // Validate difficulty if provided
  if (difficulty && !['beginner', 'intermediate'].includes(difficulty)) {
    return res.status(400).json({
      statusCode: 400,
      message: "Difficulty must be either 'beginner' or 'intermediate'",
      success: false
    });
  }

  if (category) {
    let cat = await Category.findOne({ name: category });
    if (!cat) cat = await Category.create({ name: category });
    updateData.categoryId = cat._id;
  }

  const question = await Question.findByIdAndUpdate(
    id,
    updateData,
    { new: true }
  );

  if (!question) {
    return res.status(404).json(new ApiResponse(404, null, "Question not found"));
  }
  res.status(200).json(new ApiResponse(200, question, "Question updated"));
});

const deleteQuestion = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const deleted = await Question.findByIdAndDelete(id);

  if (!deleted) {
    return res.status(404).json(new ApiResponse(404, null, "Question not found"));
  }

  res.status(200).json(new ApiResponse(200, deleted, "Question deleted"));
});

const isAdmin = (req, res) => {
  res.status(200).json({ flag: true });
};

// ─── User CRUD (Admin) ───────────────────────────────────────

const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find({ field: 'user' })
    .select('-password')
    .sort({ createdAt: -1 });
  res.status(200).json(new ApiResponse(200, users, "Users fetched"));
});

const getUserById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await User.findById(id).select('-password');
  if (!user) {
    return res.status(404).json(new ApiResponse(404, null, "User not found"));
  }
  res.status(200).json(new ApiResponse(200, user, "User fetched"));
});

const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { email, team_name, year, difficulty, point, solved_no } = req.body;

  const updateData = {};
  if (email !== undefined) updateData.email = email;
  if (team_name !== undefined) updateData.team_name = team_name;
  if (year !== undefined) updateData.year = parseInt(year);
  if (point !== undefined) updateData.point = parseInt(point);
  if (solved_no !== undefined) updateData.solved_no = parseInt(solved_no);

  if (difficulty !== undefined) {
    if (!['beginner', 'intermediate'].includes(difficulty)) {
      return res.status(400).json(new ApiResponse(400, null, "Difficulty must be 'beginner' or 'intermediate'"));
    }
    updateData.difficulty = difficulty;
  }

  // Check for duplicate email
  if (email) {
    const dupEmail = await User.findOne({ email, _id: { $ne: id } });
    if (dupEmail) {
      return res.status(400).json(new ApiResponse(400, null, "Email already in use"));
    }
  }

  // Check for duplicate team name
  if (team_name) {
    const dupTeam = await User.findOne({ team_name, _id: { $ne: id } });
    if (dupTeam) {
      return res.status(400).json(new ApiResponse(400, null, "Team name already in use"));
    }
  }

  const user = await User.findByIdAndUpdate(id, updateData, { new: true }).select('-password');
  if (!user) {
    return res.status(404).json(new ApiResponse(404, null, "User not found"));
  }
  res.status(200).json(new ApiResponse(200, user, "User updated"));
});

const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findById(id);
  if (!user) {
    return res.status(404).json(new ApiResponse(404, null, "User not found"));
  }
  if (user.field === 'admin') {
    return res.status(400).json(new ApiResponse(400, null, "Cannot delete admin accounts"));
  }

  await User.findByIdAndDelete(id);
  res.status(200).json(new ApiResponse(200, { id }, "User deleted"));
});

const resetUserScore = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findByIdAndUpdate(
    id,
    { point: 0, solved_no: 0 },
    { new: true }
  ).select('-password');

  if (!user) {
    return res.status(404).json(new ApiResponse(404, null, "User not found"));
  }
  res.status(200).json(new ApiResponse(200, user, "User score reset"));
});

module.exports = {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  isAdmin,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  resetUserScore,
};
