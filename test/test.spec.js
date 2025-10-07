/* eslint-disable i18n-text/no-en */
import {describe, it, beforeEach, afterEach, expect} from 'vitest'
import {remoteForm as _remoteForm, remoteUninstall} from '../src/index.ts'

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

  it('submits the form with fetch', async () => {
    const promise = new Promise(resolve => {
      remoteForm('.my-remote-form', async function (form, wants, req) {
        expect(req.url.endsWith('/ok')).toBe(true)
        expect(req.body).toBeInstanceOf(FormData)

        const response = await wants.html()
        expect(form.matches('.my-remote-form')).toBe(true)
        expect(response.html.querySelector('b')).toBeTruthy()
        resolve()
      })
    })

    document.querySelector('button[type=submit]').click()
    await promise
  })

  it('installs remoteForm on form reference', async () => {
    const promise = new Promise(resolve => {
      remoteForm(htmlForm, async form => {
        expect(form).toBe(htmlForm)
        resolve()
      })
    })

    document.querySelector('button[type=submit]').click()
    await promise
  })

  it('server failure scenario', async () => {
    htmlForm.action = 'server-error'

    const promise = new Promise(resolve => {
      remoteForm('.my-remote-form', async function (form, wants) {
        try {
          await wants.html()
          expect.fail('should not resolve')
        } catch (error) {
          expect(error.response.status).toBe(500)
          expect(error.response.json['message']).toBe('Server error!')
          resolve()
        }
      })
    })

    document.querySelector('button[type=submit]').click()
    await promise
  })

  it('chained handlers', async () => {
    let callbacksCalled = 0

    const promise = new Promise(resolve => {
      remoteForm('.remote-widget', async function () {
        callbacksCalled++

        if (callbacksCalled === 2) {
          resolve()
        }
      })

      remoteForm('.my-remote-form', async function () {
        callbacksCalled++

        if (callbacksCalled === 2) {
          resolve()
        }
      })
    })

    document.querySelector('button[type=submit]').click()
    await promise
  })

  it('exception in js handlers results in form submitting normally', async () => {
    remoteForm('.remote-widget', function () {
      throw new Error('ignore me')
    })

    remoteForm('.my-remote-form', async function (form, wants) {
      try {
        await wants.text()
        expect.fail('should never happen')
      } catch (error) {
        expect(error).toBeTruthy()
      }
    })

    function errorHandler(event) {
      event.preventDefault()
    }
    const originalError = window.onerror
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    window.onerror = function () {}
    window.addEventListener('error', errorHandler)

    document.querySelector('button[type=submit]').click()

    const iframe = await new Promise(resolve => {
      document.querySelector('iframe[name=submit-fallback]').addEventListener('load', event => resolve(event.target))
    })
    window.onerror = originalError
    window.removeEventListener('error', errorHandler)
    expect(iframe.contentWindow.location.href).toMatch(/\/ok$/)
  })

  it('GET form serializes data to URL', async () => {
    const promise = new Promise(resolve => {
      remoteForm('.my-remote-form', async function (form, wants, req) {
        expect(req.body).toBeNull()
        await wants.html()
        resolve()
      })
    })

    const button = document.querySelector('button[type=submit]')
    button.form.method = 'GET'
    button.click()
    await promise
  })

  it('GET form serializes data to URL with existing query', async () => {
    const promise = new Promise(resolve => {
      remoteForm('.my-remote-form', async function (form, wants) {
        await wants.html()
        resolve()
      })
    })

    const button = document.querySelector('button[type=submit]')
    button.form.method = 'GET'
    button.form.action += '?a=b'
    button.click()
    await promise
  })

  it('does not submit the request if default is already prevented', () => {
    // prevent default before this event reaches the remote-form listener
    const defaultPreventHandler = event => event.preventDefault()
    document.addEventListener('submit', defaultPreventHandler, {capture: true})

    let handlerCalled = false
    remoteForm('.my-remote-form', async function () {
      handlerCalled = true
    })

    document.querySelector('button[type=submit]').click()

    expect(handlerCalled).toBe(false)
    document.removeEventListener('submit', defaultPreventHandler, {capture: true})
  })

  it('overwrites form method with buttons formmethod', async () => {
    const promise = new Promise(resolve => {
      remoteForm(htmlForm, async (form, wants, req) => {
        expect(req.method.toUpperCase()).toBe('GET')
        resolve()
      })
    })

    const button = document.querySelector('button[type=submit]')
    button.formMethod = 'get'
    button.click()
    await promise
  })
})
