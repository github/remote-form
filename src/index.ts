import SelectorSet from 'selector-set'
import formDataEntries from 'form-data-entries'

// Parse HTML text into document fragment.
function parseHTML(document: Document, html: string): DocumentFragment {
  const template = document.createElement('template')
  template.innerHTML = html
  return document.importNode(template.content, true)
}

function serialize(form: HTMLFormElement): string {
  const params = new URLSearchParams()
  const entries = 'entries' in FormData.prototype ? new FormData(form).entries() : formDataEntries(form)
  for (const [name, value] of [...entries]) {
    params.append(name, value.toString())
  }
  return params.toString()
}

class ErrorWithResponse extends Error {
  response: SimpleResponse

  constructor(message: string, response: SimpleResponse) {
    super(message)
    this.response = response
  }
}

function makeDeferred<T>(): [Promise<T>, () => void, () => void] {
  let resolve: () => void
  let reject: () => void
  const promise = new Promise(function (_resolve, _reject) {
    resolve = _resolve
    reject = _reject
  })

  return [promise as Promise<T>, resolve!, reject!]
}

interface SimpleRequest {
  method: string
  url: string
  body: FormData | null
  headers: Headers
}

export interface SimpleResponse {
  url: string
  status: number
  statusText: string
  headers: Headers
  text: string
  json: {[key: string]: unknown}
  html: DocumentFragment
}

interface Kicker {
  text: () => Promise<SimpleResponse>
  json: () => Promise<SimpleResponse>
  html: () => Promise<SimpleResponse>
}

export type RemoteFormHandler = (form: HTMLFormElement, kicker: Kicker, req: SimpleRequest) => void | Promise<void>

let selectorSet: SelectorSet<RemoteFormHandler>

type Handler = (form: HTMLFormElement) => void

const afterHandlers: Handler[] = []
const beforeHandlers: Handler[] = []

export function afterRemote(fn: Handler) {
  afterHandlers.push(fn)
}

export function beforeRemote(fn: Handler) {
  beforeHandlers.push(fn)
}

export function remoteForm(selector: string, fn: RemoteFormHandler) {
  if (!selectorSet) {
    selectorSet = new SelectorSet()
    document.addEventListener('submit', handleSubmit)
  }
  selectorSet.add(selector, fn)
}

export function remoteUninstall(selector: string, fn: RemoteFormHandler) {
  if (selectorSet) {
    selectorSet.remove(selector, fn)
  }
}

function handleSubmit(event: Event) {
  if (!(event.target instanceof HTMLFormElement)) {
    return
  }
  const form = event.target
  const matches = selectorSet && selectorSet.matches(form)
  if (!matches || matches.length === 0) {
    return
  }

  const req = buildRequest(form)
  const [kickerPromise, ultimateResolve, ultimateReject] = makeDeferred<SimpleResponse>()

  event.preventDefault()
  processHandlers(matches, form, req, kickerPromise).then(
    async (performAsyncSubmit: unknown) => {
      if (performAsyncSubmit) {
        for (const handler of beforeHandlers) {
          await handler(form)
        }

        // TODO: ensure that these exceptions are processed by our global error handler
        remoteSubmit(req)
          .then(ultimateResolve, ultimateReject)
          // eslint-disable-next-line @typescript-eslint/no-empty-function
          .catch(() => {})
          .then(() => {
            for (const handler of afterHandlers) {
              handler(form)
            }
          })
      } else {
        // No handler called the kicker function
        form.submit()
      }
    },
    (err: Error) => {
      // TODO: special "cancel" error object to halt processing and avoid
      // submitting the form
      form.submit()
      setTimeout(() => {
        throw err
      })
    }
  )
}

// Process each handler sequentially until it either completes or calls the
// kicker function.
async function processHandlers(
  matches: Array<{data: (form: HTMLFormElement, kicker: Kicker, req: SimpleRequest) => void}>,
  form: HTMLFormElement,
  req: SimpleRequest,
  kickerPromise: Promise<SimpleResponse>
): Promise<boolean> {
  let kickerWasCalled = false
  for (const match of matches) {
    const [kickerCalled, kickerCalledResolve] = makeDeferred()
    const kick = () => {
      kickerWasCalled = true
      kickerCalledResolve()
      return kickerPromise
    }
    const kicker: Kicker = {
      text: kick,
      json: () => {
        req.headers.set('Accept', 'application/json')
        return kick()
      },
      html: () => {
        req.headers.set('Accept', 'text/html')
        return kick()
      },
    }
    await Promise.race([kickerCalled, match.data.call(null, form, kicker, req)])
  }
  return kickerWasCalled
}

function buildRequest(form: HTMLFormElement): SimpleRequest {
  const req: SimpleRequest = {
    method: form.method || 'GET',
    url: form.action,
    headers: new Headers({'X-Requested-With': 'XMLHttpRequest'}),
    body: null,
  }

  if (req.method.toUpperCase() === 'GET') {
    const data = serialize(form)
    if (data) {
      req.url += (~req.url.indexOf('?') ? '&' : '?') + data
    }
  } else {
    req.body = new FormData(form)
  }

  return req
}

async function remoteSubmit(req: SimpleRequest): Promise<SimpleResponse> {
  const response = await window.fetch(req.url, {
    method: req.method,
    body: req.body !== null ? req.body : undefined,
    headers: req.headers,
    credentials: 'same-origin',
  })

  const res: SimpleResponse = {
    url: response.url,
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
    text: '',
    get json() {
      // eslint-disable-next-line no-shadow, @typescript-eslint/no-this-alias
      const response: SimpleResponse = this
      const data = JSON.parse(response.text)
      delete response.json
      response.json = data
      return response.json
    },
    get html() {
      // eslint-disable-next-line no-shadow, @typescript-eslint/no-this-alias
      const response: SimpleResponse = this
      delete response.html

      response.html = parseHTML(document, response.text)
      return response.html
    },
  }

  const body = await response.text()
  res.text = body

  if (response.ok) {
    return res
  } else {
    throw new ErrorWithResponse('request failed', res)
  }
}