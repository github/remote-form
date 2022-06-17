import {remoteForm as _remoteForm, remoteUninstall} from '../dist/index.js'

describe('remoteForm', function () {
  let htmlForm

  beforeEach(function () {
    document.body.innerHTML = `
      <form action="/ok" class="my-remote-form remote-widget" method="post" target="submit-fallback">
        <input name="query" value="hello">
        <button type="submit">Submit<button>
      </form>

      <iframe name="submit-fallback" style="display: none"></iframe>
      <meta name="html-safe-nonce" content="NOT_EVEN_NONCE">
    `

    htmlForm = document.querySelector('form')
  })

  const installed = []

  function remoteForm(selector, fn) {
    installed.push([selector, fn])
    _remoteForm(selector, fn)
  }

  afterEach(function () {
    for (const [selector, fn] of installed) {
      remoteUninstall(selector, fn)
    }
    installed.length = 0
  })

  it('submits the form with fetch', function (done) {
    remoteForm('.my-remote-form', async function (form, wants, req) {
      assert.ok(req.url.endsWith('/ok'))
      assert.instanceOf(req.body, FormData)

      const response = await wants.html()
      assert.ok(form.matches('.my-remote-form'))
      assert.ok(response.html.querySelector('b'))
      done()
    })

    document.querySelector('button[type=submit]').click()
  })

  it('server failure scenario', function (done) {
    htmlForm.action = 'server-error'

    remoteForm('.my-remote-form', async function (form, wants) {
      try {
        await wants.html()
        assert.ok(false, 'should not resolve')
      } catch (error) {
        assert.equal(error.response.status, 500)
        assert.equal(error.response.json['message'], 'Server error!')
        done()
      }
    })

    document.querySelector('button[type=submit]').click()
  })

  it('chained handlers', function (done) {
    let callbacksCalled = 0

    remoteForm('.remote-widget', async function () {
      callbacksCalled++

      if (callbacksCalled === 2) {
        done()
      }
    })

    remoteForm('.my-remote-form', async function () {
      callbacksCalled++

      if (callbacksCalled === 2) {
        done()
      }
    })

    document.querySelector('button[type=submit]').click()
  })

  it('exception in js handlers results in form submitting normally', async function () {
    remoteForm('.remote-widget', function () {
      throw new Error('ignore me')
    })

    remoteForm('.my-remote-form', async function (form, wants) {
      try {
        await wants.text()
        assert.ok(false, 'should never happen')
      } catch (error) {
        assert.ok(true)
      }
    })

    function errorHandler(event) {
      event.preventDefault()
    }
    const originalMochaError = window.onerror
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    window.onerror = function () {}
    window.addEventListener('error', errorHandler)

    document.querySelector('button[type=submit]').click()

    const iframe = await new Promise(resolve => {
      document.querySelector('iframe[name=submit-fallback]').addEventListener('load', event => resolve(event.target))
    })
    window.onerror = originalMochaError
    window.removeEventListener('error', errorHandler)
    assert.match(iframe.contentWindow.location.href, /\/ok$/)
  })

  it('GET form serializes data to URL', function (done) {
    remoteForm('.my-remote-form', async function (form, wants, req) {
      assert.isNull(req.body)
      await wants.html()
      done()
    })

    const button = document.querySelector('button[type=submit]')
    button.form.method = 'GET'
    button.click()
  })

  it('GET form serializes data to URL with existing query', function (done) {
    remoteForm('.my-remote-form', async function (form, wants) {
      await wants.html()
      done()
    })

    const button = document.querySelector('button[type=submit]')
    button.form.method = 'GET'
    button.form.action += '?a=b'
    button.click()
  })

  it('does not submit the request if default is already prevented', function () {
    // prevent default before this event reaches the remote-form listener
    const defaultPreventHandler = event => event.preventDefault()
    document.addEventListener('submit', defaultPreventHandler, {capture: true})

    let handlerCalled = false
    remoteForm('.my-remote-form', async function () {
      handlerCalled = true
    })

    document.querySelector('button[type=submit]').click()

    assert.isFalse(handlerCalled)
    document.removeEventListener('submit', defaultPreventHandler, {capture: true})
  })
})
