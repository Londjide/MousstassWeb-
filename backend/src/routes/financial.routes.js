const express = require('express');
const { body } = require('express-validator');
const FinancialController = require('../controllers/financial.controller');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Toutes les routes nécessitent une authentification
router.use(authenticateToken);

/**
 * @route GET /api/financial/user/:userId?
 * @desc Récupère toutes les données financières d'un utilisateur
 * @access Private
 */
router.get(
  '/user/:userId?',
  FinancialController.getUserFinancialData
);

/**
 * @route GET /api/financial/:id
 * @desc Récupère des données financières par ID
 * @access Private
 */
router.get(
  '/:id',
  FinancialController.getFinancialData
);

/**
 * @route GET /api/financial/:id/content
 * @desc Récupère le contenu déchiffré des données financières
 * @access Private
 */
router.get(
  '/:id/content',
  FinancialController.getFinancialContent
);

/**
 * @route POST /api/financial
 * @desc Crée de nouvelles données financières
 * @access Private
 */
router.post(
  '/',
  [
    body('data_type')
      .isLength({ min: 1, max: 50 })
      .withMessage('Le type de données doit contenir entre 1 et 50 caractères'),
    
    body('content')
      .notEmpty()
      .withMessage('Le contenu est requis'),
    
    body('notes')
      .optional()
      .isString()
      .withMessage('Les notes doivent être une chaîne de caractères')
  ],
  FinancialController.createFinancialData
);

/**
 * @route PUT /api/financial/:id
 * @desc Met à jour des données financières
 * @access Private
 */
router.put(
  '/:id',
  [
    body('content')
      .optional()
      .isString()
      .withMessage('Le contenu doit être une chaîne de caractères'),
    
    body('notes')
      .optional()
      .isString()
      .withMessage('Les notes doivent être une chaîne de caractères')
  ],
  FinancialController.updateFinancialData
);

/**
 * @route DELETE /api/financial/:id
 * @desc Supprime des données financières
 * @access Private
 */
router.delete(
  '/:id',
  FinancialController.deleteFinancialData
);

module.exports = router;