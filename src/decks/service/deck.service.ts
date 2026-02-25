import { deckRepository } from '../repository/deck.repository'
import { prisma } from '../../database'
import type { Prisma } from '../../generated/prisma/client'

const parseId = (value: string) => {
  const n = Number(value)
  return Number.isInteger(n) && n > 0 ? n : null
}

const validateCardsOrThrow = async (cards: unknown) => {
  if (!Array.isArray(cards)) {
    return {
      ok: false as const,
      status: 400,
      message: 'Cards doit être un tableau',
    }
  }

  if (cards.length !== 10) {
    return {
      ok: false as const,
      status: 400,
      message: 'Le deck doit contenir exactement 10 cartes.',
    }
  }

  if (!cards.every((c) => Number.isInteger(c))) {
    return {
      ok: false as const,
      status: 400,
      message: 'Les IDs de cartes doivent être des entiers.',
    }
  }

  const unique = Array.from(new Set(cards as number[]))
  if (unique.length !== 10) {
    return {
      ok: false as const,
      status: 400,
      message: 'Les IDs de cartes doivent être tous différents.',
    }
  }

  const existingCount = await deckRepository.countExistingCards(unique)
  if (existingCount !== 10) {
    return {
      ok: false as const,
      status: 400,
      message: "Certaines cartes n'existent pas.",
    }
  }

  return { ok: true as const, cardIds: unique }
}

export const deckService = {
  parseId,

  async createDeck(userId: number, name: unknown, cards: unknown) {
    if (!name || typeof name !== 'string' || !name.trim()) {
      return { ok: false as const, status: 400, message: 'Nom manquant' }
    }

    const check = await validateCardsOrThrow(cards)
    if (!check.ok) return check

    const decks = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const created = await tx.deck.create({
          data: { userId, name: name.trim() },
        })

        await tx.deckCard.createMany({
          data: check.cardIds.map((cardId) => ({ deckId: created.id, cardId })),
        })

        return tx.deck.findUnique({
          where: { id: created.id },
          include: { deckCard: { include: { card: true } } },
        })
      },
    )

    return { ok: true as const, status: 201, decks }
  },

  async listMine(userId: number) {
    const decks = await deckRepository.findDecksForUser(userId)
    return { ok: true as const, status: 200, decks }
  },

  async getById(userId: number, deckIdRaw: string) {
    const deckId = parseId(deckIdRaw)
    if (!deckId)
      return { ok: false as const, status: 404, message: 'Deck introuvable' }

    const deck = await deckRepository.findDeckByIdForUser(deckId, userId)
    if (!deck)
      return { ok: false as const, status: 404, message: 'Deck introuvable' }

    return { ok: true as const, status: 200, deck }
  },

  async update(
    userId: number,
    deckIdRaw: string,
    name: unknown,
    cards: unknown,
  ) {
    const deckId = parseId(deckIdRaw)
    if (!deckId)
      return { ok: false as const, status: 404, message: 'Deck introuvable' }

    const owned = await deckRepository.findDeckByIdForUser(deckId, userId)
    if (!owned)
      return { ok: false as const, status: 404, message: 'Deck introuvable' }

    if (name === undefined && cards === undefined) {
      return {
        ok: false as const,
        status: 400,
        message: 'Aucune donnée à modifier',
      }
    }

    if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
      return { ok: false as const, status: 400, message: 'Nom invalide' }
    }

    let cardIds: number[] | null = null
    if (cards !== undefined) {
      const check = await validateCardsOrThrow(cards)
      if (!check.ok) return check
      cardIds = check.cardIds
    }

    const updated = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        if (name !== undefined) {
          await tx.deck.update({
            where: { id: deckId },
            data: { name: name.trim() },
          })
        }

        if (cardIds) {
          await tx.deckCard.deleteMany({ where: { deckId } })
          await tx.deckCard.createMany({
            data: cardIds.map((cardId) => ({ deckId, cardId })),
          })
        }

        return tx.deck.findUnique({
          where: { id: deckId },
          include: { deckCard: { include: { card: true } } },
        })
      },
    )

    return { ok: true as const, status: 200, deck: updated }
  },

  async remove(userId: number, deckIdRaw: string) {
    const deckId = parseId(deckIdRaw)
    if (!deckId)
      return { ok: false as const, status: 404, message: 'Deck introuvable' }

    const owned = await deckRepository.findDeckByIdForUser(deckId, userId)
    if (!owned)
      return { ok: false as const, status: 404, message: 'Deck introuvable' }

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.deckCard.deleteMany({ where: { deckId } })
      await tx.deck.delete({ where: { id: deckId } })
    })

    return { ok: true as const, status: 204 }
  },
}
