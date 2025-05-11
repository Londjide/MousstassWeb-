const express = require('express');
const { body } = require('express-validator');
const AuthController = require('../controllers/auth.controller');
const { auth } = require('../middleware/auth');

const router = express.Router();

/**
 * @route POST /api/auth/register
 * @desc Inscription d'un nouvel utilisateur
 * @access Public
 */
router.post(
  '/register',
  [
    body('email')
      .isEmail()
      .withMessage('Email invalide')
      .normalizeEmail(),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Le mot de passe doit contenir au moins 6 caractères')
  ],
  AuthController.register
);

/**
 * @route POST /api/auth/login
 * @desc Connexion d'un utilisateur
 * @access Public
 */
router.post(
  '/login',
  [
    body('email')
      .isEmail()
      .withMessage('Email invalide')
      .normalizeEmail(),
    body('password')
      .notEmpty()
      .withMessage('Mot de passe requis')
  ],
  AuthController.login
);

/**
 * @route GET /api/auth/me
 * @desc Récupération des informations de l'utilisateur connecté
 * @access Private
 */
router.get('/me', auth, AuthController.getMe);

/**
 * @route POST /api/auth/logout
 * @desc Déconnexion d'un utilisateur
 * @access Private
 */
router.post('/logout', auth, AuthController.logout);

/**
 * @route GET /api/auth/verify
 * @desc Vérifie si le token JWT est valide
 * @access Private
 */
router.get('/verify', auth, AuthController.verifyToken);

/**
 * @route POST /api/auth/change-password
 * @desc Change le mot de passe d'un utilisateur
 * @access Private
 */
router.post(
  '/change-password',
  auth,
  [
    body('currentPassword')
      .notEmpty()
      .withMessage('Mot de passe actuel requis'),
    
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('Le nouveau mot de passe doit contenir au moins 8 caractères')
      .matches(/\d/)
      .withMessage('Le nouveau mot de passe doit contenir au moins un chiffre')
      .matches(/[A-Z]/)
      .withMessage('Le nouveau mot de passe doit contenir au moins une lettre majuscule')
  ],
  AuthController.changePassword
);

module.exports = router;