import { prisma } from '../../database'

export const deckRepository = {
  createDeck: (userId: number, name: string) => {
    return prisma.deck.create({
      data: { userId, name },
    })
  },

  addDeckCards: (deckId: number, cardIds: number[]) => {
    return prisma.deckCard.createMany({
      data: cardIds.map((cardId) => ({ deckId, cardId })),
    })
  },

  deleteDeckCards: (deckId: number) => {
    return prisma.deckCard.deleteMany({ where: { deckId } })
  },

  findDeckByIdForUser: (deckId: number, userId: number) => {
    return prisma.deck.findFirst({
      where: { id: deckId, userId },
      include: {
        deckCard: { include: { card: true } },
      },
    })
  },

  findDecksForUser: (userId: number) => {
    return prisma.deck.findMany({
      where: { userId },
      include: {
        deckCard: { include: { card: true } },
      },
      orderBy: { id: 'asc' },
    })
  },

  updateDeckName: (deckId: number, name: string) => {
    return prisma.deck.update({
      where: { id: deckId },
      data: { name },
    })
  },

  deleteDeck: (deckId: number) => {
    return prisma.deck.delete({ where: { id: deckId } })
  },

  countExistingCards: async (cardIds: number[]) => {
    const found = await prisma.card.findMany({
      where: { id: { in: cardIds } },
      select: { id: true },
    })
    return found.length
  },
}
