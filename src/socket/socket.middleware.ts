import type { Socket } from 'socket.io'
import jwt from 'jsonwebtoken'

type JwtPayload = {
  userId: number
  email: string
}

/**
 * Middleware d'authentification Socket.io via JWT.
 *
 * - Refuse la connexion si aucun token n'est fourni
 * - Refuse la connexion si le token est invalide ou expiré
 * - Injecte userId et email dans socket.data après validation
 *
 * @param socket - Instance Socket.io
 * @param next - Callback permettant d'accepter ou refuser la connexion
 *
 * @throws Token manquant
 * @throws Token invalide ou expiré
 */
export function socketAuthMiddleware(
  socket: Socket,
  next: (err?: Error) => void,
): void {
  const tokenUnknown: unknown = socket.handshake.auth?.token

  if (typeof tokenUnknown !== 'string' || tokenUnknown.trim() === '') {
    return next(new Error('Token manquant'))
  }

  const secret = process.env.JWT_SECRET
  if (!secret) {
    return next(new Error('JWT_SECRET non configuré'))
  }

  try {
    const decoded = jwt.verify(tokenUnknown, secret) as JwtPayload

    socket.data.userId = decoded.userId
    socket.data.email = decoded.email

    return next()
  } catch {
    return next(new Error('Token invalide ou expiré'))
  }
}
