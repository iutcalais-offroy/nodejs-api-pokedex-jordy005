import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

/**
 * Middleware d'authentification JWT.
 *
 * Vérifie la présence et la validité du token Bearer dans l'en-tête
 * `Authorization`. Si le token est valide, les informations de l'utilisateur
 * sont attachées à `req.user` avant de passer au middleware suivant.
 *
 * @param {Request}      req  - Requête Express. Doit contenir un en-tête
 *                             `Authorization: Bearer <token>`.
 * @param {Response}     res  - Réponse Express.
 * @param {NextFunction} next - Fonction de passage au middleware suivant.
 *
 * @returns {void}
 *
 * @throws {401} `Token manquant`         - Si l'en-tête `Authorization` est absent ou ne commence pas par `Bearer `.
 * @throws {401} `Token invalide ou expiré` - Si le token est signé avec un mauvais secret ou expiré.
 */
export const authenticateToken = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // 1. Récupérer le token depuis l'en-tête Authorization
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token manquant' })
  }

  const token = authHeader && authHeader.split(' ')[1]
  if (!token) {
    return res.status(401).json({ error: 'Token manquant' })
  }

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
    return next()
  } catch {
    return res.status(401).json({ error: 'Token invalide ou expiré' })
  }
}
