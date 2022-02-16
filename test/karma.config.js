process.env.CHROME_BIN = require('chromium').path

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

module.exports = function (config) {
  config.set({
    basePath: '..',
    frameworks: ['mocha', 'chai'],
    files: [
      { pattern: 'dist/index.js', type: 'module' },
      { pattern: 'test/test.js', type: 'module' }
    ],
    reporters: ['mocha'],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    browsers: ['ChromeHeadless'],
    autoWatch: false,
    singleRun: true,
    concurrency: Infinity,
    middleware: ['checker'],
    plugins: [
      'karma-*',
      {
        'middleware:checker': ['value', checker]
      }
    ]
  })
}
