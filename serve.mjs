import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'

const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.gpx': 'application/gpx+xml', '.svg': 'image/svg+xml' }
const root = new URL('.', import.meta.url).pathname
const port = process.env.PORT || 8080

createServer(async (req, res) => {
  let path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname))
  if (path.endsWith('/')) path += 'index.html'
  try {
    const body = await readFile(join(root, path))
    res.writeHead(200, { 'content-type': types[extname(path)] || 'application/octet-stream' }).end(body)
  } catch {
    res.writeHead(404).end('not found')
  }
}).listen(port, () => console.log(`http://localhost:${port}`))
