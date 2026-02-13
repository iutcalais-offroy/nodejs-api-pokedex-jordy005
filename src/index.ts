/* eslint-disable no-console */

import { createServer } from 'http'
import { env } from './env'
import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import { authRouter } from './auth/route/auth.route'
import { cardsRouter } from './cards/route/cards.route'
import { deckRouter } from './decks/route/deck.route'

// Create Express app
export const app = express()

// Middlewares
app.use(
  cors({
    origin: true, // Autorise toutes les origines
    credentials: true,
  }),
)

app.use(express.json())
app.use('/api/auth', authRouter)
app.use('/api/decks', deckRouter)
app.use('/api/cards', cardsRouter)

// Serve static files (Socket.io test client)
app.use(express.static('public'))

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'TCG Backend Server is running' })
})

// Start server only if this file is run directly (not imported for tests)
if (require.main === module) {
  // Create HTTP server
  const httpServer = createServer(app)
  const PORT = process.env.PORT ? Number(process.env.PORT) : 3000
  // Start server
  try {
    httpServer.listen(PORT, () => {
      console.log(`\n🚀 Server is running on http://localhost:${PORT}`)
      console.log(
        `🧪 Socket.io Test Client available at http://localhost:${PORT}`,
      )
    })
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}
