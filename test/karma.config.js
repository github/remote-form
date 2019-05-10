function checker(request, response, next) {
  if (request.method === 'POST' && request.url === '/ok') {
    response.setHeader('content-type', 'text/html')
    response.setHeader('x-html-safe', 'NOT_EVEN_NONCE')
    response.writeHead(200)
    // eslint-disable-next-line github/unescaped-html-literal
    response.end('<b>Hello</b> world!')
    return
  } else if (request.method === 'POST' && request.url === '/server-error') {
    response.writeHead(500)
    response.end('{"message": "Server error!"}')
    return
  } else if (request.method === 'GET' && request.url === '/ok?query=hello') {
    response.writeHead(200)
    // eslint-disable-next-line github/unescaped-html-literal
    response.end('<b>Hello</b> world!')
    return
  } else if (request.method === 'GET' && request.url === '/ok?a=b&query=hello') {
    response.writeHead(200)
    // eslint-disable-next-line github/unescaped-html-literal
    response.end('<b>Hello</b> world!')
    return
  }
  next()
}

module.exports = function(config) {
  config.set({
    frameworks: ['mocha', 'chai'],
    files: [
      '../node_modules/form-data-entries/index.umd.js',
      '../node_modules/selector-set/selector-set.js',
      '../dist/index.umd.js',
      'test.js'
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
