const mongoose = require("mongoose");
const Submission = require("../models/submission");
const User = require("../models/user"); // Changed from Team to User
const Question = require("../models/question");
const categoryModel = require("../models/category");
const { emitLeaderboardUpdate, emitNewSolve } = require("./leaderController");

const getQuestion = async (req, res) => {
  const { question_id } = req.body;
  
  try {
    // Validation
    if (!question_id) {
      return res.status(400).json({
        success: false,
        message: "Question ID is required",
      });
    }

    // Find question but exclude the answer field for security
    const question = await Question.findById(question_id)
      .populate('categoryId', 'name')
      .select('title description hint link point year solved_count createdAt categoryId level') // Exclude 'answer' field
      .lean();

    console.log("Fetched Question:", question); // Debug log

    if (!question) {
      return res.status(404).json({
        success: false,
        message: "Question not found",
      });
    }
    const data = question;
    data.hint = question.hint;

    res.status(200).json({
      success: true,
      data: data,
      message: "Question fetched successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch Question",
      error: error.message,
    });
  }
};

const fetchCategories = async (req, res) => {
  try {
    const categories = await categoryModel.find();
    res.status(200).json({
      success: true,
      data: categories,
      message: "Categories fetched successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch Categories",
      error: error.message,
    });
  }
};

const fetchQuestions = async (req, res) => {
  try {
    const { categoryId, level } = req.body;
    
    if (!categoryId) {
      return res.status(400).json({
        success: false,
        message: "Category ID is required",
      });
    }

    // Validate if category exists
    const categoryExists = await categoryModel.findById(categoryId);
    if (!categoryExists) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    // Filter questions based on category and optional level (easy / medium)
    const questionsQuery = {
      categoryId: categoryId
    };
    if (level && ['easy', 'medium'].includes(level.toLowerCase())) {
      questionsQuery.level = level.toLowerCase();
    }

    const questions = await Question.find(questionsQuery)
      .populate('categoryId', 'name')
      .select('title description hint point year solved_count createdAt level') // Removed 'answer' for security
      .sort({ point: -1, createdAt: -1 }) // Sort by points descending, then by newest
      .lean(); // Use lean() for better performance

    res.status(200).json({
      success: true,
      data: {
        questions: questions,
        category: categoryExists.name,
        totalQuestions: questions.length
      },
      message: "Questions fetched successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch questions",
      error: error.message,
    });
  }
};

const fetchSolvedQuestions = async (req, res) => {
  try {
    const userId = req.user.id; // Get user ID from JWT token
    const { categoryId, level } = req.body;

    // Validation
    if (!categoryId) {
      return res.status(400).json({
        success: false,
        message: "Category ID is required",
      });
    }

    // Validate if category exists
    const categoryExists = await categoryModel.findById(categoryId);
    if (!categoryExists) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const questionMatch = { categoryId: categoryId };
    if (level && ['easy', 'medium'].includes(level.toLowerCase())) {
      questionMatch.level = level.toLowerCase();
    }

    // Find all correctly solved submissions by this user in the specific category
    const solvedSubmissions = await Submission.find({
      user_id: userId,
      iscorrect: true
    })
    .populate({
      path: 'question_id',
      match: questionMatch,
      populate: {
        path: 'categoryId',
        select: 'name'
      }
    })
    .sort({ submitted_at: -1 }) // Most recent first
    .lean();

    // Filter out submissions where question_id is null (didn't match the category filter)
    const validSolvedSubmissions = solvedSubmissions.filter(submission => submission.question_id);

    // Extract question details
    const solvedQuestions = validSolvedSubmissions.map(submission => ({
      _id: submission.question_id._id,
      title: submission.question_id.title,
      description: submission.question_id.description,
      point: submission.question_id.point,
      year: submission.question_id.year,
      level: submission.question_id.level || 'easy',
      solved_count: submission.question_id.solved_count,
      categoryId: submission.question_id.categoryId,
      solved_at: submission.submitted_at,
      createdAt: submission.question_id.createdAt
    }));

    res.status(200).json({
      success: true,
      data: {
        questions: solvedQuestions,
        category: categoryExists.name,
        totalSolved: solvedQuestions.length
      },
      message: "Solved questions fetched successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch solved questions",
      error: error.message,
    });
  }
};

const isSolvedQuestion = async (req, res) => {
  const { question_id } = req.body;
  const userId = req.user.id; // Get user ID from JWT token
  
  try {
    // Validation
    if (!question_id) {
      return res.status(400).json({
        success: false,
        message: "Question ID is required",
      });
    }

    // Check if the question exists
    const questionExists = await Question.findById(question_id);
    if (!questionExists) {
      return res.status(404).json({
        success: false,
        message: "Question not found",
      });
    }

    // Check if user has a correct submission for this question
    const solvedSubmission = await Submission.findOne({
      user_id: userId,
      question_id: question_id,
      iscorrect: true
    });

    const isSolved = solvedSubmission ? true : false;

    res.status(200).json({
      success: true,
      data: {
        isSolved: isSolved,
        questionId: question_id
      },
      message: `Question is ${isSolved ? 'solved' : 'not solved'}`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to check question status",
      error: error.message,
    });
  }
};

const fetchIncorrectSubmissions = async (req, res) => {
  try {
    const userId = req.user.id; // Get user ID from JWT token
    const { categoryId, level } = req.body;

    // Validation
    if (!categoryId) {
      return res.status(400).json({
        success: false,
        message: "Category ID is required",
      });
    }

    // Validate if category exists
    const categoryExists = await categoryModel.findById(categoryId);
    if (!categoryExists) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const questionMatch = { categoryId: categoryId };
    if (level && ['easy', 'medium'].includes(level.toLowerCase())) {
      questionMatch.level = level.toLowerCase();
    }

    // Get all questions in this category and level
    const allQuestions = await Question.find(questionMatch)
      .populate('categoryId', 'name')
      .select('title description hint point year solved_count createdAt level')
      .sort({ point: -1, createdAt: -1 })
      .lean();

    // Get all correctly solved questions by this user in this category
    const solvedQuestions = await Submission.find({
      user_id: userId,
      iscorrect: true
    })
    .populate({
      path: 'question_id',
      match: questionMatch
    })
    .lean();

    // Create set of solved question IDs
    const solvedQuestionIds = new Set(
      solvedQuestions
        .filter(submission => submission.question_id) // Filter out null populated questions
        .map(submission => submission.question_id._id.toString())
    );

    // Get incorrectly attempted questions by this user in this category
    const incorrectSubmissions = await Submission.find({
      user_id: userId,
      iscorrect: false
    })
    .populate({
      path: 'question_id',
      match: questionMatch
    })
    .lean();

    // Create set of incorrectly attempted question IDs
    const incorrectQuestionIds = new Set(
      incorrectSubmissions
        .filter(submission => submission.question_id) // Filter out null populated questions
        .map(submission => submission.question_id._id.toString())
    );

    // Get unsolved questions (never attempted + incorrectly attempted)
    const unsolvedQuestions = allQuestions
      .filter(question => !solvedQuestionIds.has(question._id.toString())) // Exclude solved questions
      .map(question => {
        const questionId = question._id.toString();
        const wasAttempted = incorrectQuestionIds.has(questionId);
        
        return {
          ...question,
          status: wasAttempted ? 'attempted_incorrect' : 'never_attempted'
        };
      });

    res.status(200).json({
      success: true,
      data: {
        unsolvedQuestions: unsolvedQuestions, // Combined list of incorrectly attempted + never attempted questions
        category: categoryExists.name,
        totalUnsolved: unsolvedQuestions.length
      },
      message: "Unsolved questions (incorrect + never attempted) fetched successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch unsolved questions",
      error: error.message,
    });
  }
};

const handleSubmission = async (req, res) => {
  const { question_id, submitted_answer } = req.body;
  const userId = req.user.id; // From JWT token

  if (!question_id || !submitted_answer) {
    return res
      .status(400)
      .json({ message: "Question ID and submission answer are required." });
  }

  const session = await mongoose.startSession();

  try {
    let resultMessage = "";
    let isCorrect = false;
    let pointsAwarded = 0;
    let totalScore = 0;
    let questionTitle = ""; // Store question title for later use in setTimeout

    await session.withTransaction(async () => {
      // Get user information from JWT token
      const user = await User.findById(userId).session(session);
      if (!user) {
        throw new Error("User not found.");
      }

      // Get question information
      const question = await Question.findById(question_id).session(session);
      if (!question) {
        throw new Error("Question not found.");
      }

      // Store question title for use outside transaction
      questionTitle = question.title;

      // --- VALIDATION CHECKS ---

      // 1. Check for an existing correct submission for this question by this user
      const existingCorrectSubmission = await Submission.findOne({
        user_id: user._id, // Changed from team_id to user_id
        question_id: question._id,
        iscorrect: true,
      }).session(session);

      if (existingCorrectSubmission) {
        throw new Error("You have already solved this question.");
      }

      // 2. Check if the submitted answer is correct (trimmed & case-insensitive)
      const cleanStoredAnswer = (question.answer || "").trim().toLowerCase();
      const cleanSubmittedAnswer = (submitted_answer || "").trim().toLowerCase();

      if (cleanStoredAnswer !== cleanSubmittedAnswer) {
        // Log the incorrect attempt
        const incorrectLog = new Submission({
          user_id: user._id,
          question_id: question._id,
          iscorrect: false,
          submitted_answer: (submitted_answer || "").trim(),
          submitted_at: new Date(),
        });
        await incorrectLog.save({ session });

        isCorrect = false;
        totalScore = user.point;
        resultMessage = "Incorrect answer. Try again!";
      } else {
        // --- UPDATES (if answer is correct and not previously solved) ---
        pointsAwarded = question.point;
        isCorrect = true;

        // Update the user's score and last submission timestamp
        user.point += pointsAwarded;
      // Increment solved count for correct answer
      user.solved_no = (user.solved_no || 0) + 1;
        user.lastSubmissionAt = new Date();

        // Dynamically reduce the question's points
        const newPoints = Math.floor(question.point * 0.95);
        question.point = newPoints;

        // Log the new, correct submission
        const correctLog = new Submission({
          user_id: user._id,
          question_id: question._id,
          iscorrect: true,
          submitted_answer: (submitted_answer || "").trim(),
          submitted_at: new Date(),
        });

        // Save all updated documents within the transaction
        await user.save({ session });
        await question.save({ session });
        await correctLog.save({ session });

        totalScore = user.point;
        resultMessage = `Correct! You earned ${pointsAwarded} points.`;
      }
    });

    // 🚀 REAL-TIME LEADERBOARD UPDATE!
    if (isCorrect) {
      // Emit real-time leaderboard update to all clients
      setTimeout(() => {
        emitLeaderboardUpdate(userId);
        emitNewSolve(userId, questionTitle, pointsAwarded);
      }, 100); // Small delay to ensure database updates are complete
    }

    res.status(200).json({
      message: resultMessage,
      isCorrect: isCorrect,
      pointsAwarded: pointsAwarded,
      totalScore: totalScore,
      success: true,
    });
  } catch (error) {
    res.status(400).json({
      message: error.message,
      success: false,
    });
  } finally {
    await session.endSession();
  }
};

module.exports = { 
  handleSubmission,
  fetchQuestions,
  fetchCategories,
  getQuestion,
  fetchSolvedQuestions,
  fetchIncorrectSubmissions,
  isSolvedQuestion
};
