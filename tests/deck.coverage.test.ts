/**
 * deck_coverage.test.ts : Test complementaire pour 
 * s'occuper des lignes qui ne peucent pas être couvertes par deck.test.ts:
 */

import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { app } from "../src/index";
import { prismaMock } from "./vitest.setup";
import { PokemonType } from "../src/generated/prisma/client";
import { deckRepository } from "../src/decks/repository/deck.repository";

const makeToken = (payload: { userId: number; email: string }) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET manquant dans les tests");
  return jwt.sign(payload, secret, { expiresIn: "7d" });
};

const makeCard = (id: number) => ({
  id,
  name: `Card ${id}`,
  pokedexNumber: id,
  hp: 10,
  attack: 10,
  type: PokemonType.Grass,
  imgUrl: "",
  createdAt: new Date(),
  updatedAt: new Date(),
});

const makeDeck = (deckId: number, userId: number) => ({
  id: deckId,
  name: "My Deck",
  userId,
  createdAt: new Date(),
  updatedAt: new Date(),
});

const makeDeckWithCards = (
  deckId: number,
  userId: number,
  cardIds: number[],
) => ({
  ...makeDeck(deckId, userId),
  deckCard: cardIds.map((cardId, index) => ({
    id: index + 1,
    deckId,
    cardId,
    createdAt: new Date(),
    updatedAt: new Date(),
    card: makeCard(cardId),
  })),
});

describe("deckRepository — fonctions non couvertes", () => {
  beforeAll(() => {
    process.env.JWT_SECRET = "test-secret";
  });

  beforeEach(() => {
    prismaMock.deck.create.mockReset();
    prismaMock.deck.update.mockReset();
    prismaMock.deck.delete.mockReset();
    prismaMock.deckCard.createMany.mockReset();
    prismaMock.deckCard.deleteMany.mockReset();
  });

  it("createDeck : appelle prisma.deck.create avec userId et name", async () => {
    const expected = makeDeck(1, 42);
    prismaMock.deck.create.mockResolvedValue(expected);

    const result = await deckRepository.createDeck(42, "Test Deck");

    expect(prismaMock.deck.create).toHaveBeenCalledWith({
      data: { userId: 42, name: "Test Deck" },
    });
    expect(result).toEqual(expected);
  });

  it("addDeckCards : appelle prisma.deckCard.createMany avec les bons deckCard", async () => {
    prismaMock.deckCard.createMany.mockResolvedValue({ count: 3 });

    const result = await deckRepository.addDeckCards(5, [10, 20, 30]);

    expect(prismaMock.deckCard.createMany).toHaveBeenCalledWith({
      data: [
        { deckId: 5, cardId: 10 },
        { deckId: 5, cardId: 20 },
        { deckId: 5, cardId: 30 },
      ],
    });
    expect(result).toEqual({ count: 3 });
  });

  it("deleteDeckCards : appelle prisma.deckCard.deleteMany avec le bon deckId", async () => {
    prismaMock.deckCard.deleteMany.mockResolvedValue({ count: 10 });

    const result = await deckRepository.deleteDeckCards(5);

    expect(prismaMock.deckCard.deleteMany).toHaveBeenCalledWith({
      where: { deckId: 5 },
    });
    expect(result).toEqual({ count: 10 });
  });

  it("updateDeckName : appelle prisma.deck.update avec le bon id et name", async () => {
    const updated = makeDeck(7, 1);
    prismaMock.deck.update.mockResolvedValue(updated);

    const result = await deckRepository.updateDeckName(7, "Nouveau Nom");

    expect(prismaMock.deck.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: { name: "Nouveau Nom" },
    });
    expect(result).toEqual(updated);
  });

  it("deleteDeck : appelle prisma.deck.delete avec le bon id", async () => {
    const deleted = makeDeck(7, 1);
    prismaMock.deck.delete.mockResolvedValue(deleted);

    const result = await deckRepository.deleteDeck(7);

    expect(prismaMock.deck.delete).toHaveBeenCalledWith({ where: { id: 7 } });
    expect(result).toEqual(deleted);
  });
});

describe("deckController — req.body absent (fallback ?? {})", () => {
  beforeAll(() => {
    process.env.JWT_SECRET = "test-secret";
  });

  beforeEach(() => {
    prismaMock.$transaction.mockReset();
    prismaMock.deck.findFirst.mockReset();
    prismaMock.card.findMany.mockReset();
  });

  it("POST /api/decks sans body : 400 (ligne 8 couverte)", async () => {
    const token = makeToken({ userId: 1, email: "red@tcg.com" });

    const res = await request(app)
      .post("/api/decks")
      .set("Authorization", `Bearer ${token}`)
      .set("Content-Type", "application/json");

    expect(res.status).toBe(400);
  });

  
  it("PATCH /api/decks/:id sans body : 400 (aucune donnée, line 46 couverte)", async () => {
    const token = makeToken({ userId: 1, email: "red@tcg.com" });
    prismaMock.deck.findFirst.mockResolvedValue(
      makeDeckWithCards(10, 1, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
    );

    const res = await request(app)
      .patch("/api/decks/10")
      .set("Authorization", `Bearer ${token}`)
      .set("Content-Type", "application/json");

    expect(res.status).toBe(400);
  });
});