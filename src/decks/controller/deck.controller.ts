import { Request, Response } from 'express'
import { deckService } from '../service/deck.service'

export const deckController = {
  /**
   * @route  POST /api/decks
   * @summary Crée un nouveau deck pour l'utilisateur authentifié.
   *
   * @param {Request}  req            - Requête Express.
   * @param {string}   req.body.name  - Nom du deck.
   * @param {number[]} req.body.cards - Tableau de 10 cartes uniques.
   * @param {Response} res            - Réponse Express.
   *
   * @returns {201} `Deck` - Le deck créé avec ses cartes associées.
   * @returns {400} `{ error }` - Données invalides (nom manquant, cartes incorrectes, IDs inexistants).
   * @returns {500} `{ error: 'Erreur serveur' }` - Erreur inattendue côté serveur.
   *
   * @throws {500} En cas d'erreur Prisma ou de transaction échouée.
   */
  async create(req: Request, res: Response) {
    try {
      const userId = req.user!.userId
      const { name, cards } = req.body

      const result = await deckService.createDeck(userId, name, cards)
      if (!result.ok)
        return res.status(result.status).json({ error: result.message })

      return res.status(result.status).json(result.decks)
    } catch {
      return res.status(500).json({ error: 'Erreur serveur' })
    }
  },

  /**
   * @route  GET /api/decks/mine
   * @summary Récupère tous les decks appartenant à l'utilisateur authentifié.
   *
   * @param {Request}  req - Requête Express.
   * @param {Response} res - Réponse Express.
   *
   * @returns {200} `Deck[]` - Liste des decks de l'utilisateur avec leurs cartes.
   * @returns {500} `{ error: 'Erreur serveur' }` - Erreur inattendue côté serveur.
   *
   * @throws {500} En cas d'erreur Prisma.
   */
  async mine(req: Request, res: Response) {
    try {
      const userId = req.user!.userId
      const result = await deckService.listMine(userId)
      return res.status(result.status).json(result.decks)
    } catch {
      return res.status(500).json({ error: 'Erreur serveur' })
    }
  },

  /**
   * @route  GET /api/decks/:id
   * @summary Récupère un deck par son identifiant.
   *
   * Vérifie que le deck appartient bien à l'utilisateur authentifié.
   *
   * @param {Request}  req              - Requête Express.
   * @param {string}   req.params.id    - Identifiant numérique du deck.
   * @param {Response} res              - Réponse Express.
   *
   * @returns {200} `Deck`  - Le deck avec ses cartes associées.
   * @returns {400} `{ error }` - Identifiant non numérique.
   * @returns {404} `{ error }` - Deck introuvable ou n'appartenant pas à l'utilisateur.
   * @returns {500} `{ error: 'Erreur serveur' }` - Erreur inattendue côté serveur.
   *
   * @throws {500} En cas d'erreur Prisma.
   */
  async getById(req: Request, res: Response) {
    try {
      const userId = req.user!.userId
      const result = await deckService.getById(userId, req.params.id)

      if (!result.ok)
        return res.status(result.status).json({ error: result.message })
      return res.status(result.status).json(result.deck)
    } catch {
      return res.status(500).json({ error: 'Erreur serveur' })
    }
  },

  /**
   * @route  PATCH /api/decks/:id
   * @summary Met à jour le nom et/ou les cartes d'un deck existant.
   *
   * Au moins un des deux champs (name ou cards) doit être fourni.
   * Si cards est fourni, il remplace intégralement les cartes du deck.
   *
   * @param {Request}  req              - Requête Express.
   * @param {string}   req.params.id    - Identifiant numérique du deck.
   * @param {string}   [req.body.name]  - Nouveau nom du deck.
   * @param {number[]} [req.body.cards] - Nouveau tableau de 10 cartes.
   * @param {Response} res              - Réponse Express.
   *
   * @returns {200} `Deck`  - Le deck mis à jour avec ses cartes.
   * @returns {400} `{ error }` - Données invalides ou aucune donnée fournie.
   * @returns {404} `{ error }` - Deck introuvable ou n'appartenant pas à l'utilisateur.
   * @returns {500} `{ error: 'Erreur serveur' }` - Erreur inattendue côté serveur.
   *
   * @throws {500} En cas d'erreur Prisma ou de transaction échouée.
   */
  async update(req: Request, res: Response) {
    try {
      const userId = req.user!.userId
      const { name, cards } = req.body

      const result = await deckService.update(
        userId,
        req.params.id,
        name,
        cards,
      )

      if (!result.ok)
        return res.status(result.status).json({ error: result.message })
      return res.status(result.status).json(result.deck)
    } catch {
      return res.status(500).json({ error: 'Erreur serveur' })
    }
  },

  /**
   * @route  DELETE /api/decks/:id
   * @summary Supprime un deck et toutes ses associations de cartes.
   *
   * Vérifie que le deck appartient bien à l'utilisateur authentifié avant
   * de procéder à la suppression en cascade (DeckCards puis Deck).
   *
   * @param {Request}  req              - Requête Express (authentifiée).
   * @param {string}   req.params.id    - Identifiant numérique du deck.
   * @param {Response} res              - Réponse Express.
   *
   * @returns {204} Corps vide — suppression réussie.
   * @returns {400} `{ error }` - Identifiant non numérique.
   * @returns {404} `{ error }` - Deck introuvable ou n'appartenant pas à l'utilisateur.
   * @returns {500} `{ error: 'Erreur serveur' }` - Erreur inattendue côté serveur.
   *
   * @throws {500} En cas d'erreur Prisma ou de transaction échouée.
   */
  async remove(req: Request, res: Response) {
    try {
      const userId = req.user!.userId
      const result = await deckService.remove(userId, req.params.id)

      if (!result.ok)
        return res.status(result.status).json({ error: result.message })
      return res.status(result.status).json({ message: result.message })
    } catch {
      return res.status(500).json({ error: 'Erreur serveur' })
    }
  },
}
