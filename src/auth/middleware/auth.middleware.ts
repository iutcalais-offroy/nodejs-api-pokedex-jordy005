import { Router, Request, Response, NextFunction } from "express";
import jwt from 'jsonwebtoken'

export const authRouter = Router();

// Étendre le type Request pour ajouter userId
declare global {
    namespace Express {
        interface Request {
            user?: {
                userId: number
                email: string
            }
        }
    }
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {

    // 1. Récupérer le token depuis l'en-tête Authorization
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Token manquant" });
    }

    const token = authHeader && authHeader.split(' ')[1] // Format: "Bearer TOKEN"

    try {
        // 2. Vérifier et décoder le token
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
            userId: number
            email: string
        }

        // 3. Ajouter userId à la requête pour l'utiliser dans les routes
        req.user = {
            userId: decoded.userId,
            email: decoded.email,
        }

        // 4. Passer au prochain middleware ou à la route
        next()
    } catch (error) {
        return res.status(401).json({error: 'Token invalide ou expiré'})
    }
}

authRouter.get("/me", authenticateToken, (req: Request, res: Response) => {
  return res.status(200).json({ user: req.user });
});