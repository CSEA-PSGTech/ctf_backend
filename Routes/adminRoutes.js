const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');


// middleware provided for authentication and admin check
const { isAdmin } = require('../middleware/auth');
const {verifyToken} = require('../middleware/validate');

/**
 * @swagger
 * /admin/categories:
 *   get:
 *     summary: Get all categories (Admin only)
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Categories fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: number
 *                   example: 200
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Category'
 *                 message:
 *                   type: string
 *                   example: Categories fetched
 *       401:
 *         description: Unauthorized - Missing or invalid token
 *       403:
 *         description: Forbidden - Not an admin
 */
router.get('/categories', verifyToken, isAdmin, adminController.getCategories);

/**
 * @swagger
 * /admin/categories:
 *   post:
 *     summary: Create a new category (Admin only)
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: Cryptography
 *     responses:
 *       201:
 *         description: Category created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: number
 *                   example: 201
 *                 data:
 *                   $ref: '#/components/schemas/Category'
 *                 message:
 *                   type: string
 *                   example: Category created
 *       400:
 *         description: Category name required or already exists
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not an admin
 */
router.post('/categories', verifyToken, isAdmin, adminController.createCategory);
router.patch('/categories/:id', verifyToken, isAdmin, adminController.updateCategory);
router.delete('/categories/:id', verifyToken, isAdmin, adminController.deleteCategory);

/**
 * @swagger
 * /admin/isAdmin:
 *   get:
 *     summary: Check if current user is an admin
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     description: Verifies if the authenticated user has admin privileges
 *     responses:
 *       200:
 *         description: User is an admin
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 flag:
 *                   type: boolean
 *                   example: true
 *       401:
 *         description: Unauthorized - Missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Token not verified yet.
 *                 flag:
 *                   type: boolean
 *                   example: false
 *       403:
 *         description: Forbidden - User is not an admin
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Access denied. Admins only.
 *                 flag:
 *                   type: boolean
 *                   example: false
 */
router.get('/isAdmin', verifyToken, isAdmin, adminController.isAdmin);

/**
 * @swagger
 * /admin/questions:
 *   get:
 *     summary: Get all questions (Admin only)
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Questions fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: number
 *                   example: 200
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Question'
 *                 message:
 *                   type: string
 *                   example: Questions fetched
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not an admin
 */
router.get('/questions', verifyToken, isAdmin, adminController.getQuestions);

/**
 * @swagger
 * /admin/questions:
 *   post:
 *     summary: Create a new question (Admin only)
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - category
 *               - title
 *               - description
 *               - answer
 *               - point
 *               - year
 *               - difficulty
 *             properties:
 *               category:
 *                 type: string
 *                 example: Cryptography
 *               title:
 *                 type: string
 *                 example: Caesar Cipher Challenge
 *               description:
 *                 type: string
 *                 example: Decode the following message...
 *               answer:
 *                 type: string
 *                 example: flag{crypto_master}
 *               point:
 *                 type: number
 *                 example: 100
 *               year:
 *                 type: number
 *                 example: 3
 *               difficulty:
 *                 type: string
 *                 enum: [beginner, intermediate]
 *                 description: Difficulty level for this question
 *                 example: beginner
 *     responses:
 *       201:
 *         description: Question created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: number
 *                   example: 201
 *                 data:
 *                   $ref: '#/components/schemas/Question'
 *                 message:
 *                   type: string
 *                   example: Question created
 *       400:
 *         description: Missing required fields, invalid difficulty, or question already exists
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not an admin
 */
router.post('/questions', verifyToken, isAdmin, adminController.createQuestion);

/**
 * @swagger
 * /admin/questions/{id}:
 *   patch:
 *     summary: Update a question (Admin only)
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Question ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               category:
 *                 type: string
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               answer:
 *                 type: string
 *               point:
 *                 type: number
 *               year:
 *                 type: number
 *               difficulty:
 *                 type: string
 *                 enum: [beginner, intermediate]
 *                 description: Difficulty level for this question
 *     responses:
 *       200:
 *         description: Question updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: number
 *                   example: 200
 *                 data:
 *                   $ref: '#/components/schemas/Question'
 *                 message:
 *                   type: string
 *                   example: Question updated
 *       404:
 *         description: Question not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not an admin
 */
router.patch('/questions/:id', verifyToken, isAdmin, adminController.updateQuestion);

/**
 * @swagger
 * /admin/questions/{id}:
 *   delete:
 *     summary: Delete a question (Admin only)
 *     tags: [Admin]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Question ID
 *     responses:
 *       200:
 *         description: Question deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: number
 *                   example: 200
 *                 data:
 *                   $ref: '#/components/schemas/Question'
 *                 message:
 *                   type: string
 *                   example: Question deleted
 *       404:
 *         description: Question not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not an admin
 */
router.delete('/questions/:id', verifyToken, isAdmin, adminController.deleteQuestion);

// ─── User Management Routes (Admin only) ────────────────────
router.get('/users', verifyToken, isAdmin, adminController.getUsers);
router.get('/users/:id', verifyToken, isAdmin, adminController.getUserById);
router.patch('/users/:id', verifyToken, isAdmin, adminController.updateUser);
router.delete('/users/:id', verifyToken, isAdmin, adminController.deleteUser);
router.patch('/users/:id/reset-score', verifyToken, isAdmin, adminController.resetUserScore);

module.exports = router;
