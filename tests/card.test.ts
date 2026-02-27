import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../src/index";
import { prismaMock } from "./vitest.setup";
import { PokemonType } from "../src/generated/prisma/client";

const makeCard = (id: number) => ({
  id,
  name: `Card ${id}`,
  pokedexNumber: id,
  hp: 45,
  attack: 49,
  type: PokemonType.Grass,
  imgUrl: "https://example.com/card.png",
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe("GET /api/cards", () => {
  beforeEach(() => {
    prismaMock.card.findMany.mockReset();
  });

  it("200 → retourne la liste de toutes les cartes", async () => {
    const cards = [makeCard(1), makeCard(2), makeCard(3)];
    prismaMock.card.findMany.mockResolvedValue(cards);

    const res = await request(app).get("/api/cards");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(3);
    expect(res.body[0]).toMatchObject({ id: 1, name: "Card 1" });
  });

  it("200 → retourne un tableau vide si aucune carte", async () => {
    prismaMock.card.findMany.mockResolvedValue([]);

    const res = await request(app).get("/api/cards");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("200 → les cartes sont triées par pokedexNumber (asc)", async () => {
    const cards = [makeCard(1), makeCard(2), makeCard(3)];
    prismaMock.card.findMany.mockResolvedValue(cards);

    await request(app).get("/api/cards");

    expect(prismaMock.card.findMany).toHaveBeenCalledWith({
      orderBy: { pokedexNumber: "asc" },
    });
  });

  it("500 → erreur serveur si prisma lève une erreur", async () => {
    prismaMock.card.findMany.mockRejectedValue(new Error("DB down"));

    const res = await request(app).get("/api/cards");

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Erreur serveur");
  });
});