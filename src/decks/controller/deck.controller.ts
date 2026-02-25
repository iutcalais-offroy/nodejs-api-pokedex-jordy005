import { Request, Response } from 'express'
import { deckService } from '../service/deck.service'

export const deckController = {
  async create(req: Request, res: Response) {
    try {
      const userId = req.user!.userId
      const { name, cards } = req.body ?? {}

      const result = await deckService.createDeck(userId, name, cards)
      if (!result.ok)
        return res.status(result.status).json({ error: result.message })

      return res.status(result.status).json(result.decks)
    } catch {
      return res.status(500).json({ error: 'Erreur serveur' })
    }
  },

  async mine(req: Request, res: Response) {
    try {
      const userId = req.user!.userId
      const result = await deckService.listMine(userId)
      return res.status(result.status).json(result.decks)
    } catch {
      return res.status(500).json({ error: 'Erreur serveur' })
    }
  },

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

  async update(req: Request, res: Response) {
    try {
      const userId = req.user!.userId
      const { name, cards } = req.body ?? {}

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
