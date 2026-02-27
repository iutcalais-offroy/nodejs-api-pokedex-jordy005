import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import bcrypt from "bcrypt";
import { app } from "../src/index";
import { prismaMock } from "./vitest.setup";
import type { User } from "../src/generated/prisma/client";

const makeUser = (overrides: Partial<User> = {}): User => ({
  id: 1,
  email: "red@tcg.com",
  username: "Red",
  password: "$2b$10$hashedpassword",
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe("POST /api/auth/sign-up", () => {
  beforeEach(() => {
    prismaMock.user.findUnique.mockReset();
    prismaMock.user.create.mockReset();
  });

  it("201 → inscription réussie avec des données valides", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue(
      makeUser({ id: 1, email: "red@tcg.com", username: "Red" }),
    );

    const res = await request(app).post("/api/auth/sign-up").send({
      email: "red@tcg.com",
      username: "Red",
      password: "password123",
    });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("token");
    expect(res.body.user).toMatchObject({ email: "red@tcg.com", name: "Red" });
  });

  it("400 → email manquant", async () => {
    const res = await request(app).post("/api/auth/sign-up").send({
      username: "Red",
      password: "password123",
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Champs manquants");
  });

  it("400 → username manquant", async () => {
    const res = await request(app).post("/api/auth/sign-up").send({
      email: "red@tcg.com",
      password: "password123",
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Champs manquants");
  });

  it("400 → password manquant", async () => {
    const res = await request(app).post("/api/auth/sign-up").send({
      email: "red@tcg.com",
      username: "Red",
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Champs manquants");
  });

  it("400 → email non-string (données invalides)", async () => {
    const res = await request(app).post("/api/auth/sign-up").send({
      email: 123,
      username: "Red",
      password: "password123",
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Données invalides");
  });

  it("400 → username non-string (données invalides)", async () => {
    const res = await request(app).post("/api/auth/sign-up").send({
      email: "red@tcg.com",
      username: 42,
      password: "password123",
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Données invalides");
  });

  it("400 → password non-string (données invalides)", async () => {
    const res = await request(app).post("/api/auth/sign-up").send({
      email: "red@tcg.com",
      username: "Red",
      password: true,
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Données invalides");
  });

  it("409 → email déjà utilisé", async () => {
    prismaMock.user.findUnique.mockResolvedValue(makeUser());

    const res = await request(app).post("/api/auth/sign-up").send({
      email: "red@tcg.com",
      username: "Red",
      password: "password123",
    });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe("Email déjà utilisé");
  });

  it("500 → erreur serveur (prisma lève une erreur)", async () => {
    prismaMock.user.findUnique.mockRejectedValue(new Error("DB down"));

    const res = await request(app).post("/api/auth/sign-up").send({
      email: "red@tcg.com",
      username: "Red",
      password: "password123",
    });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Erreur serveur");
  });
});

describe("POST /api/auth/sign-in", () => {
  beforeEach(() => {
    prismaMock.user.findUnique.mockReset();
  });

  it("200 → connexion réussie avec bonnes credentials", async () => {
    const hashed = await bcrypt.hash("password123", 10);
    prismaMock.user.findUnique.mockResolvedValue(makeUser({ password: hashed }));

    const res = await request(app).post("/api/auth/sign-in").send({
      email: "red@tcg.com",
      password: "password123",
    });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("token");
    expect(res.body.message).toBe("Connexion réussie");
    expect(res.body.user).toMatchObject({ email: "red@tcg.com" });
  });

  it("400 → email manquant", async () => {
    const res = await request(app).post("/api/auth/sign-in").send({
      password: "password123",
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Champs manquants");
  });

  it("400 → password manquant", async () => {
    const res = await request(app).post("/api/auth/sign-in").send({
      email: "red@tcg.com",
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Champs manquants");
  });

  it("400 → email non-string (données invalides)", async () => {
    const res = await request(app).post("/api/auth/sign-in").send({
      email: 42,
      password: "password123",
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Données invalides");
  });

  it("400 → password non-string (données invalides)", async () => {
    const res = await request(app).post("/api/auth/sign-in").send({
      email: "red@tcg.com",
      password: false,
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Champs manquants");
  });

  it("401 → utilisateur introuvable", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    const res = await request(app).post("/api/auth/sign-in").send({
      email: "unknown@tcg.com",
      password: "password123",
    });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Email ou mot de passe incorrect");
  });

  it("401 → mauvais mot de passe", async () => {
    const hashed = await bcrypt.hash("correct-password", 10);
    prismaMock.user.findUnique.mockResolvedValue(makeUser({ password: hashed }));

    const res = await request(app).post("/api/auth/sign-in").send({
      email: "red@tcg.com",
      password: "wrong-password",
    });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Email ou mot de passe incorrect");
  });

  it("500 → erreur serveur (prisma lève une erreur)", async () => {
    prismaMock.user.findUnique.mockRejectedValue(new Error("DB down"));

    const res = await request(app).post("/api/auth/sign-in").send({
      email: "red@tcg.com",
      password: "password123",
    });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Erreur serveur");
  });
});