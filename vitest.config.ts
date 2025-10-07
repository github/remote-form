import {defineConfig} from 'vitest/config'

export default defineConfig({
  test: {
    browser: {
      enabled: true,
      provider: 'playwright',
      instances: [
        {
          browser: 'chromium',
          launch: {
            executablePath: '/usr/bin/chromium-browser',
          },
        },
      ],
      headless: true,
    },
  },
  server: {
    middleware: {
      mode: 'html',
    },
  },
  plugins: [
    {
      name: 'test-middleware',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.method === 'POST' && req.url === '/ok') {
            res.setHeader('content-type', 'text/html')
            res.writeHead(200)
            res.end('<b>Hello</b> world!')
            return
          } else if (req.method === 'POST' && req.url === '/server-error') {
            res.writeHead(500)
            res.end('{"message": "Server error!"}')
            return
          } else if (req.method === 'GET' && req.url === '/ok?query=hello') {
            res.writeHead(200)
            res.end('<b>Hello</b> world!')
            return
          } else if (req.method === 'GET' && req.url === '/ok?a=b&query=hello') {
            res.writeHead(200)
            res.end('<b>Hello</b> world!')
            return
          }
          next()
        })
      },
    },
  ],
})
