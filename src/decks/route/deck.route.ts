import { Router } from 'express'
import { authenticateToken } from '../../auth/middleware/auth.middleware'
import { deckController } from '../controller/deck.controller'

export const deckRouter = Router()

/**
 * Toutes les routes de ce router sont protégées par le middleware JWT.
 * Un token Bearer valide est requis dans l'en-tête `Authorization`.
 *
 * @see authenticateToken
 */
deckRouter.use(authenticateToken)

/**
 * @route  POST /api/decks
 * @summary Crée un nouveau deck pour l'utilisateur authentifié.
 * @see deckController.create
 */
deckRouter.post('/', deckController.create)

/**
 * @route  GET /api/decks/mine
 * @summary Récupère tous les decks appartenant à l'utilisateur authentifié.
 * @see deckController.mine
 */
deckRouter.get('/mine', deckController.mine)

/**
 * @route  GET /api/decks/:id
 * @summary Récupère un deck par son identifiant.
 * @see deckController.getById
 */
deckRouter.get('/:id', deckController.getById)

/**
 * @route  PATCH /api/decks/:id
 * @summary Met à jour le nom et/ou les cartes d'un deck existant.
 * @see deckController.update
 */
deckRouter.patch('/:id', deckController.update)

/**
 * @route  DELETE /api/decks/:id
 * @summary Supprime un deck et ses associations de cartes.
 * @see deckController.remove
 */
deckRouter.delete('/:id', deckController.remove)
