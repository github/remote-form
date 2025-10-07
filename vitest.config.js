import {defineConfig} from 'vitest/config'

function checker(request, response, next) {
  if (request.method === 'POST' && request.url === '/ok') {
    response.setHeader('content-type', 'text/html')
    response.writeHead(200)
    response.end('<b>Hello</b> world!')
    return
  } else if (request.method === 'POST' && request.url === '/server-error') {
    response.writeHead(500)
    response.end('{"message": "Server error!"}')
    return
  } else if (request.method === 'GET' && request.url === '/ok?query=hello') {
    response.writeHead(200)
    response.end('<b>Hello</b> world!')
    return
  } else if (request.method === 'GET' && request.url === '/ok?a=b&query=hello') {
    response.writeHead(200)
    response.end('<b>Hello</b> world!')
    return
  }
  next()
}

export default defineConfig({
  test: {
    browser: {
      enabled: true,
      provider: 'playwright',
      instances: [
        {
          browser: 'chromium',
          launch: {
            headless: true
          }
        }
      ]
    }
  },
  preview: {
    port: 9876
  },
  server: {
    port: 9876,
    middlewareMode: false
  },
  plugins: [
    {
      name: 'test-server-middleware',
      configureServer(server) {
        server.middlewares.use(checker)
      },
      configurePreviewServer(server) {
        server.middlewares.use(checker)
      }
    }
  ]
})
