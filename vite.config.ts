import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createHash } from 'node:crypto'

const privateSources = [
  { name: 'pasted-text.txt', type: 'text/plain;charset=utf-8' },
  { name: 'Pasted markdown(2).md', type: 'text/markdown;charset=utf-8' },
]

export default defineConfig({
  worker: { format: 'es' },
  plugins: [react(), {
    name: 'local-private-note-import',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__lifeos_local_notes', (request, response, next) => {
        if (request.method !== 'GET') return next()
        const indexPath = resolve(process.cwd(), '.lifeos-private', 'note-index.json')
        const indexes = existsSync(indexPath) ? JSON.parse(readFileSync(indexPath, 'utf8')).sources as { sourceName: string; sha256: string; blocks: unknown[] }[] : []
        const notes = privateSources.flatMap(source => {
          const path = resolve(process.cwd(), '.lifeos-private', 'imports', source.name)
          if (!existsSync(path)) return []
          const bytes = readFileSync(path)
          const sha256 = createHash('sha256').update(bytes).digest('hex')
          const index = indexes.find(item => item.sourceName === source.name && item.sha256 === sha256)
          return [{ name: source.name, type: source.type, bytesBase64: bytes.toString('base64'), index }]
        })
        response.setHeader('Content-Type', 'application/json; charset=utf-8')
        response.setHeader('Cache-Control', 'no-store')
        response.end(JSON.stringify(notes))
      })
    },
  }],
})
