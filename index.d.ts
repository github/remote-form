type Kicker = {
  text: () => Promise<SimpleResponse>,
  json: () => Promise<SimpleResponse>,
  html: () => Promise<SimpleResponse>
}

type SimpleRequest = {
  method: string,
  url: string,
  body: FormData | null,
  headers: Headers
}

export type SimpleResponse = {
  url: string,
  status: number,
  statusText?: string,
  headers: Headers,
  text: string,
  json: {[key: string]: any},
  html: DocumentFragment
}

export type RemoteFormHandler = (form: HTMLFormElement, kicker: Kicker, req: SimpleRequest) => void | Promise<void>;
export function afterRemote(fn: (form: HTMLFormElement) => void): void;
export function beforeRemote(fn: (form: HTMLFormElement) => void): void;
export function remoteForm(selector: string, fn: RemoteFormHandler): void;
export function remoteUninstall(selector: string, fn: RemoteFormHandler): void;
