import { Router } from 'express'
import { prisma } from '../../database'

export const cardsRouter = Router()

/**
 * @route  GET /api/cards
 * @summary Récupère la liste de toutes les cartes Pokémon.
 *
 * Retourne toutes les cartes disponibles en base, triées par numéro Pokédex
 * croissant. Aucune authentification requise.
 *
 * @param {Request}  _req - Requête Express.
 * @param {Response} res  - Réponse Express.
 *
 * @returns {200} `Card[]` - Tableau de toutes les cartes, ordonné par numéro dans la pokédex.
 * @returns {500} `{ error: 'Erreur serveur' }` - Erreur inattendue côté serveur.
 *
 * @throws {500} En cas d'erreur Prisma.
 */

cardsRouter.get('/', async (_req, res) => {
  try {
    const cards = await prisma.card.findMany({
      orderBy: { pokedexNumber: 'asc' },
    })

    return res.status(200).json(cards)
  } catch {
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})
