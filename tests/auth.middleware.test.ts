import { describe, it, expect, vi, beforeAll } from "vitest";
import jwt from "jsonwebtoken";
import { authenticateToken } from "../src/auth/middleware/auth.middleware";
import type { Request, Response } from "express";

type AuthenticatedRequest = Request & {
  user?: { userId: number; email: string };
};

const JWT_SECRET = "test-secret";

beforeAll(() => {
  process.env.JWT_SECRET = JWT_SECRET;
});

const mockReq = (overrides: Partial<AuthenticatedRequest> = {}): AuthenticatedRequest =>
  ({
    headers: {},
    ...overrides,
  } as AuthenticatedRequest);

const mockRes = () => {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
};

describe("authenticateToken middleware", () => {
  it("401 : pas d'en-tête Authorization", () => {
    const req = mockReq({ headers: {} });
    const res = mockRes();
    const next = vi.fn();

    authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Token manquant" });
    expect(next).not.toHaveBeenCalled();
  });

  it("401 : Authorization present mais ne commence pas par 'Bearer '", () => {
    const req = mockReq({
      headers: { authorization: "Basic abc123" },
    });
    const res = mockRes();
    const next = vi.fn();

    authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Token manquant" });
    expect(next).not.toHaveBeenCalled();
  });

  it("401 : 'Bearer ' sans token", () => {
    const req = mockReq({
      headers: { authorization: "Bearer " },
    });
    const res = mockRes();
    const next = vi.fn();

    authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Token manquant" });
    expect(next).not.toHaveBeenCalled();
  });

  it("401 : token invalide ", () => {
    const req = mockReq({
      headers: { authorization: "Bearer invalid.token.here" },
    });
    const res = mockRes();
    const next = vi.fn();

    authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Token invalide ou expiré" });
    expect(next).not.toHaveBeenCalled();
  });

  it("401 : token signe avec un mauvais secret", () => {
    const badToken = jwt.sign({ userId: 1, email: "x@y.com" }, "wrong-secret");
    const req = mockReq({
      headers: { authorization: `Bearer ${badToken}` },
    });
    const res = mockRes();
    const next = vi.fn();

    authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Token invalide ou expiré" });
    expect(next).not.toHaveBeenCalled();
  });

  it("401 : token expire", () => {
    const expiredToken = jwt.sign(
      { userId: 1, email: "red@tcg.com" },
      JWT_SECRET,
      { expiresIn: -1 },
    );
    const req = mockReq({
      headers: { authorization: `Bearer ${expiredToken}` },
    });
    const res = mockRes();
    const next = vi.fn();

    authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Token invalide ou expiré" });
    expect(next).not.toHaveBeenCalled();
  });

  it("appelle next() et attache req.user si token valide", () => {
    const validToken = jwt.sign(
      { userId: 42, email: "red@tcg.com" },
      JWT_SECRET,
      { expiresIn: "7d" },
    );
    const req = mockReq({
      headers: { authorization: `Bearer ${validToken}` },
    });
    const res = mockRes();
    const next = vi.fn();

    authenticateToken(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toMatchObject({
      userId: 42,
      email: "red@tcg.com",
    });
    expect(res.status).not.toHaveBeenCalled();
  });
});