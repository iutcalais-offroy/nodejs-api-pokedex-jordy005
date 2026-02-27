import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { app } from "../src/index";
import { prismaMock } from "./vitest.setup";
import { PokemonType } from "../src/generated/prisma/client";
import type { Prisma } from "../src/generated/prisma/client";

type TokenPayload = { userId: number; email: string };

const makeToken = (payload: TokenPayload) => {
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
  name: "My Starter Deck",
  userId,
  createdAt: new Date(),
  updatedAt: new Date(),
});

const makeDeckWithCards = (deckId: number, userId: number, cardIds: number[]) => ({
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

const mockTransaction = () => {
  prismaMock.$transaction.mockImplementation(
    (fn: (tx: Prisma.TransactionClient) => Promise<unknown>) =>
      fn(prismaMock as unknown as Prisma.TransactionClient),
  );
};

describe("API Decks (CRUD)", () => {
  beforeAll(() => {
    process.env.JWT_SECRET = "test-secret";
  });

  beforeEach(() => {
    prismaMock.$transaction.mockReset();
    prismaMock.deck.findFirst.mockReset();
    prismaMock.deck.findMany.mockReset();
    prismaMock.deck.create.mockReset();
    prismaMock.deck.update.mockReset();
    prismaMock.deck.delete.mockReset();
    prismaMock.deck.findUnique.mockReset();
    prismaMock.deckCard.createMany.mockReset();
    prismaMock.deckCard.deleteMany.mockReset();
    prismaMock.card.findMany.mockReset();
  });

  // ─── POST /api/decks ──────────────────────────────────────────────────────

  it("POST /api/decks → 401 si pas de token", async () => {
    const res = await request(app)
      .post("/api/decks")
      .send({ name: "Deck", cards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] });
    expect(res.status).toBe(401);
  });

  it("POST /api/decks → 400 si nom manquant", async () => {
    const token = makeToken({ userId: 1, email: "red@tcg.com" });
    const res = await request(app)
      .post("/api/decks")
      .set("Authorization", `Bearer ${token}`)
      .send({ cards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] });
    expect(res.status).toBe(400);
  });

  it("POST /api/decks → 400 si cards n'est pas un tableau", async () => {
    const token = makeToken({ userId: 1, email: "red@tcg.com" });
    const res = await request(app)
      .post("/api/decks")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Deck", cards: "pas-un-tableau" });
    expect(res.status).toBe(400);
  });

  it("POST /api/decks → 400 si pas exactement 10 cartes", async () => {
    const token = makeToken({ userId: 1, email: "red@tcg.com" });
    const res = await request(app)
      .post("/api/decks")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Deck", cards: [1, 2, 3] });
    expect(res.status).toBe(400);
  });

  it("POST /api/decks → 400 si cards contient des IDs non-entiers", async () => {
    const token = makeToken({ userId: 1, email: "red@tcg.com" });
    const res = await request(app)
      .post("/api/decks")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Deck", cards: [1, 2, 3, 4, 5, 6, 7, 8, 9, "dix"] });
    expect(res.status).toBe(400);
  });

  it("POST /api/decks → 400 si cards contient des doublons", async () => {
    const token = makeToken({ userId: 1, email: "red@tcg.com" });
    const res = await request(app)
      .post("/api/decks")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Deck", cards: [1, 1, 2, 3, 4, 5, 6, 7, 8, 9] });
    expect(res.status).toBe(400);
  });

  it("POST /api/decks → 400 si IDs de cartes inexistants en DB", async () => {
    const token = makeToken({ userId: 1, email: "red@tcg.com" });
    prismaMock.card.findMany.mockResolvedValue(
      Array.from({ length: 9 }, (_, i) => makeCard(i + 1)),
    );
    const res = await request(app)
      .post("/api/decks")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Deck", cards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 999] });
    expect(res.status).toBe(400);
  });

  it("POST /api/decks → 201 si 10 cartes valides", async () => {
    const token = makeToken({ userId: 1, email: "red@tcg.com" });
    const ids = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    prismaMock.card.findMany.mockResolvedValue(ids.map(makeCard));
    mockTransaction();
    prismaMock.deck.create.mockResolvedValue(makeDeck(10, 1));
    prismaMock.deckCard.createMany.mockResolvedValue({ count: 10 });
    prismaMock.deck.findUnique.mockResolvedValue(makeDeckWithCards(10, 1, ids));
    const res = await request(app)
      .post("/api/decks")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "My Starter Deck", cards: ids });
    expect(res.status).toBe(201);
    expect(prismaMock.deck.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.deckCard.createMany).toHaveBeenCalledTimes(1);
  });

  it("POST /api/decks → 500 si erreur serveur", async () => {
    const token = makeToken({ userId: 1, email: "red@tcg.com" });
    const ids = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    prismaMock.card.findMany.mockResolvedValue(ids.map(makeCard));
    prismaMock.$transaction.mockRejectedValue(new Error("DB down"));
    const res = await request(app)
      .post("/api/decks")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Deck", cards: ids });
    expect(res.status).toBe(500);
  });

  // ─── GET /api/decks/mine ──────────────────────────────────────────────────

  it("GET /api/decks/mine → 401 si pas de token", async () => {
    const res = await request(app).get("/api/decks/mine");
    expect(res.status).toBe(401);
  });

  it("GET /api/decks/mine → 200 et liste vide si aucun deck", async () => {
    const token = makeToken({ userId: 1, email: "red@tcg.com" });
    prismaMock.deck.findMany.mockResolvedValue([]);
    const res = await request(app)
      .get("/api/decks/mine")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("GET /api/decks/mine → 200 et retourne les decks du user connecte", async () => {
    const token = makeToken({ userId: 1, email: "red@tcg.com" });
    prismaMock.deck.findMany.mockResolvedValue([
      makeDeckWithCards(1, 1, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
    ]);
    const res = await request(app)
      .get("/api/decks/mine")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  it("GET /api/decks/mine → 500 si erreur serveur", async () => {
    const token = makeToken({ userId: 1, email: "red@tcg.com" });
    prismaMock.deck.findMany.mockRejectedValue(new Error("DB down"));
    const res = await request(app)
      .get("/api/decks/mine")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(500);
  });

  // ─── GET /api/decks/:id ───────────────────────────────────────────────────

  it("GET /api/decks/:id → 401 si pas de token", async () => {
    const res = await request(app).get("/api/decks/10");
    expect(res.status).toBe(401);
  });

  it("GET /api/decks/:id → 404 si id non numerique", async () => {
    const token = makeToken({ userId: 1, email: "red@tcg.com" });
    const res = await request(app)
      .get("/api/decks/abc")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it("GET /api/decks/:id → 404 si deck inexistant", async () => {
    const token = makeToken({ userId: 1, email: "red@tcg.com" });
    prismaMock.deck.findFirst.mockResolvedValue(null);
    const res = await request(app)
      .get("/api/decks/999")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it("GET /api/decks/:id → 200 si deck existe et appartient au user", async () => {
    const token = makeToken({ userId: 1, email: "red@tcg.com" });
    prismaMock.deck.findFirst.mockResolvedValue(
      makeDeckWithCards(10, 1, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
    );
    const res = await request(app)
      .get("/api/decks/10")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it("GET /api/decks/:id → 500 si erreur serveur", async () => {
    const token = makeToken({ userId: 1, email: "red@tcg.com" });
    prismaMock.deck.findFirst.mockRejectedValue(new Error("DB down"));
    const res = await request(app)
      .get("/api/decks/10")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(500);
  });

  // ─── PATCH /api/decks/:id ─────────────────────────────────────────────────

  it("PATCH /api/decks/:id → 401 si pas de token", async () => {
    const res = await request(app).patch("/api/decks/10").send({ name: "x" });
    expect(res.status).toBe(401);
  });

  it("PATCH /api/decks/:id → 404 si id non numerique", async () => {
    const token = makeToken({ userId: 1, email: "red@tcg.com" });
    const res = await request(app)
      .patch("/api/decks/abc")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Updated" });
    expect(res.status).toBe(404);
  });

  it("PATCH /api/decks/:id → 404 si deck inexistant", async () => {
    const token = makeToken({ userId: 1, email: "red@tcg.com" });
    prismaMock.deck.findFirst.mockResolvedValue(null);
    const res = await request(app)
      .patch("/api/decks/999")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Updated" });
    expect(res.status).toBe(404);
  });

  it("PATCH /api/decks/:id → 400 si aucune donnee envoyee", async () => {
    const token = makeToken({ userId: 1, email: "red@tcg.com" });
    prismaMock.deck.findFirst.mockResolvedValue(
      makeDeckWithCards(10, 1, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
    );
    const res = await request(app)
      .patch("/api/decks/10")
      .set("Authorization", `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it("PATCH /api/decks/:id → 400 si nom est une chaine vide", async () => {
    const token = makeToken({ userId: 1, email: "red@tcg.com" });
    prismaMock.deck.findFirst.mockResolvedValue(
      makeDeckWithCards(10, 1, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
    );
    const res = await request(app)
      .patch("/api/decks/10")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "   " });
    expect(res.status).toBe(400);
  });

  it("PATCH /api/decks/:id → 400 si cartes fournies mais pas 10", async () => {
    const token = makeToken({ userId: 1, email: "red@tcg.com" });
    prismaMock.deck.findFirst.mockResolvedValue(
      makeDeckWithCards(10, 1, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
    );
    const res = await request(app)
      .patch("/api/decks/10")
      .set("Authorization", `Bearer ${token}`)
      .send({ cards: [1, 2, 3] });
    expect(res.status).toBe(400);
  });

  it("PATCH /api/decks/:id → 400 si cartes inexistantes en DB", async () => {
    const token = makeToken({ userId: 1, email: "red@tcg.com" });
    prismaMock.deck.findFirst.mockResolvedValue(
      makeDeckWithCards(10, 1, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
    );
    prismaMock.card.findMany.mockResolvedValue(
      Array.from({ length: 9 }, (_, i) => makeCard(i + 11)),
    );
    const res = await request(app)
      .patch("/api/decks/10")
      .set("Authorization", `Bearer ${token}`)
      .send({ cards: [11, 12, 13, 14, 15, 16, 17, 18, 19, 999] });
    expect(res.status).toBe(400);
  });

  it("PATCH /api/decks/:id → 200 si update du nom seulement", async () => {
    const token = makeToken({ userId: 1, email: "red@tcg.com" });
    prismaMock.deck.findFirst.mockResolvedValue(
      makeDeckWithCards(10, 1, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
    );
    mockTransaction();
    prismaMock.deck.update.mockResolvedValue(makeDeck(10, 1));
    prismaMock.deck.findUnique.mockResolvedValue(
      makeDeckWithCards(10, 1, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
    );
    const res = await request(app)
      .patch("/api/decks/10")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Updated" });
    expect(res.status).toBe(200);
    expect(prismaMock.deck.update).toHaveBeenCalledTimes(1);
  });

  it("PATCH /api/decks/:id → 200 si update des cartes (remplacement complet)", async () => {
    const token = makeToken({ userId: 1, email: "red@tcg.com" });
    const newIds = [11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
    prismaMock.deck.findFirst.mockResolvedValue(
      makeDeckWithCards(10, 1, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
    );
    prismaMock.card.findMany.mockResolvedValue(newIds.map(makeCard));
    mockTransaction();
    prismaMock.deckCard.deleteMany.mockResolvedValue({ count: 10 });
    prismaMock.deckCard.createMany.mockResolvedValue({ count: 10 });
    prismaMock.deck.findUnique.mockResolvedValue(makeDeckWithCards(10, 1, newIds));
    const res = await request(app)
      .patch("/api/decks/10")
      .set("Authorization", `Bearer ${token}`)
      .send({ cards: newIds });
    expect(res.status).toBe(200);
    expect(prismaMock.deckCard.deleteMany).toHaveBeenCalledTimes(1);
    expect(prismaMock.deckCard.createMany).toHaveBeenCalledTimes(1);
  });

  it("PATCH /api/decks/:id → 500 si erreur serveur", async () => {
    const token = makeToken({ userId: 1, email: "red@tcg.com" });
    prismaMock.deck.findFirst.mockRejectedValue(new Error("DB down"));
    const res = await request(app)
      .patch("/api/decks/10")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Updated" });
    expect(res.status).toBe(500);
  });

  // ─── DELETE /api/decks/:id ────────────────────────────────────────────────

  it("DELETE /api/decks/:id → 401 si pas de token", async () => {
    const res = await request(app).delete("/api/decks/10");
    expect(res.status).toBe(401);
  });

  it("DELETE /api/decks/:id → 404 si id non numerique", async () => {
    const token = makeToken({ userId: 1, email: "red@tcg.com" });
    const res = await request(app)
      .delete("/api/decks/abc")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it("DELETE /api/decks/:id → 404 si deck inexistant", async () => {
    const token = makeToken({ userId: 1, email: "red@tcg.com" });
    prismaMock.deck.findFirst.mockResolvedValue(null);
    const res = await request(app)
      .delete("/api/decks/999")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it("DELETE /api/decks/:id → 204 et suppression des DeckCards en cascade", async () => {
    const token = makeToken({ userId: 1, email: "red@tcg.com" });
    prismaMock.deck.findFirst.mockResolvedValue(
      makeDeckWithCards(10, 1, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
    );
    mockTransaction();
    prismaMock.deckCard.deleteMany.mockResolvedValue({ count: 10 });
    prismaMock.deck.delete.mockResolvedValue(makeDeck(10, 1));
    const res = await request(app)
      .delete("/api/decks/10")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(204);
    expect(res.text).toBe("");
    expect(prismaMock.deckCard.deleteMany).toHaveBeenCalledTimes(1);
    expect(prismaMock.deck.delete).toHaveBeenCalledTimes(1);
  });

  it("DELETE /api/decks/:id → 500 si erreur serveur", async () => {
    const token = makeToken({ userId: 1, email: "red@tcg.com" });
    prismaMock.deck.findFirst.mockRejectedValue(new Error("DB down"));
    const res = await request(app)
      .delete("/api/decks/10")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(500);
  });
});