/* eslint-disable no-console */

import path from 'path'
import yaml from 'js-yaml'
import fs from 'fs'
import { Express } from 'express'
import swaggerUi from 'swagger-ui-express'

/**
 * Charge un fichier YAML et le parse en objet JS.
 */
function loadYml(filename: string): Record<string, unknown> {
  const filePath = path.join(__dirname, filename)
  return yaml.load(fs.readFileSync(filePath, 'utf8')) as Record<string, unknown>
}

/**
 * Fusionne les documentations par module dans le document
 * OpenAPI principal.
 */
function mergePaths(
  base: Record<string, unknown>,
  ...modules: Record<string, unknown>[]
): Record<string, unknown> {
  const merged = { ...base, paths: {} as Record<string, unknown> }

  for (const mod of modules) {
    const paths = /* v8 ignore next */ (mod.paths ?? {}) as Record<
      string,
      unknown
    >
    merged.paths = { ...merged.paths, ...paths }
  }

  return merged
}

/**
 * Construit le document OpenAPI final en fusionnant la configuration principale
 * avec les documentations par module, puis monte l'UI Swagger sur `/api-docs`.
 *
 * @param {Express} app - Instance Express sur laquelle monter la route.
 */
export function setupSwagger(app: Express): void {
  const base = loadYml('swagger.config.yml')
  const authDoc = loadYml('auth.doc.yml')
  const cardDoc = loadYml('card.doc.yml')
  const deckDoc = loadYml('deck.doc.yml')

  const swaggerDocument = mergePaths(base, authDoc, cardDoc, deckDoc)

  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerDocument, {
      swaggerOptions: {
        persistAuthorization: true,
      },
      customSiteTitle: 'Pokédex TCG — API Docs',
    }),
  )

  console.log('📖 Swagger UI disponible sur http://localhost:3001/api-docs')
}
