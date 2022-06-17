// Parse HTML text into document fragment.
function parseHTML(document: Document, html: string): DocumentFragment {
  const template = document.createElement('template')
  // eslint-disable-next-line github/no-inner-html
  template.innerHTML = html
  return document.importNode(template.content, true)
}

function serialize(form: HTMLFormElement): string {
  const params = new URLSearchParams()
  const entries = new FormData(form).entries()
  for (const [name, value] of [...entries]) {
    params.append(name, value.toString())
  }
  return params.toString()
}

export class ErrorWithResponse extends Error {
  response: SimpleResponse

  constructor(message: string, response: SimpleResponse) {
    super(message)
    this.response = response
  }
}

function makeDeferred<T>(): [Promise<T>, (x?: unknown) => void, () => void] {
  let resolve: (x?: unknown) => void
  let reject: () => void
  const promise = new Promise(function (_resolve, _reject) {
    resolve = _resolve
    reject = _reject
  })

  return [promise as Promise<T>, resolve!, reject!]
}

export interface SimpleRequest {
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  json: any
  html: DocumentFragment
}

export interface Kicker {
  text: () => Promise<SimpleResponse>
  json: () => Promise<SimpleResponse>
  html: () => Promise<SimpleResponse>
}

export type RemoteFormHandler = (form: HTMLFormElement, kicker: Kicker, req: SimpleRequest) => void

let formHandlers: Map<string, RemoteFormHandler[]>
type Handler = (form: HTMLFormElement) => void

const afterHandlers: Handler[] = []
const beforeHandlers: Handler[] = []

export function afterRemote(fn: Handler): void {
  afterHandlers.push(fn)
}

export function beforeRemote(fn: Handler): void {
  beforeHandlers.push(fn)
}

export function remoteForm(selector: string, fn: RemoteFormHandler): void {
  if (!formHandlers) {
    formHandlers = new Map<string, RemoteFormHandler[]>()
    document.addEventListener('submit', handleSubmit)
  }
  const handlers = formHandlers.get(selector) || []
  formHandlers.set(selector, [...handlers, fn])
}

export function remoteUninstall(selector: string, fn: RemoteFormHandler): void {
  if (formHandlers) {
    const handlers = formHandlers.get(selector) || []
    formHandlers.set(
      selector,
      handlers.filter(x => x !== fn)
    )
  }
}

function getMatches(el: HTMLElement): RemoteFormHandler[] {
  const results = []
  for (const selector of formHandlers.keys()) {
    if (el.matches(selector)) {
      const handlers = formHandlers.get(selector) || []
      results.push(...handlers)
    }
  }
  return results
}

function handleSubmit(event: Event) {
  if (!(event.target instanceof HTMLFormElement) || event.defaultPrevented) {
    return
  }
  const form = event.target
  const matches = getMatches(form)
  if (matches.length === 0) {
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
  matches: RemoteFormHandler[],
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
      }
    }
    await Promise.race([kickerCalled, match(form, kicker, req)])
  }
  return kickerWasCalled
}

function buildRequest(form: HTMLFormElement): SimpleRequest {
  const req: SimpleRequest = {
    method: form.method || 'GET',
    url: form.action,
    headers: new Headers({'X-Requested-With': 'XMLHttpRequest'}),
    body: null
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
    credentials: 'same-origin'
  })

  const res: SimpleResponse = {
    url: response.url,
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
    text: '',
    get json() {
      // eslint-disable-next-line @typescript-eslint/no-shadow, @typescript-eslint/no-this-alias
      const response: SimpleResponse = this
      const data = JSON.parse(response.text)
      delete response.json
      response.json = data
      return response.json
    },
    get html() {
      // eslint-disable-next-line @typescript-eslint/no-shadow, @typescript-eslint/no-this-alias
      const response: SimpleResponse = this
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      delete response.html

      response.html = parseHTML(document, response.text)
      return response.html
    }
  }

  const body = await response.text()
  res.text = body

  if (response.ok) {
    return res
  } else {
    throw new ErrorWithResponse('request failed', res)
  }
}
