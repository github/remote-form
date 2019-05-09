# remote-form

A function that will enable submitting forms over AJAX.

The function will make a request based on the form using `window.fetch` with the payload encoded as URL parameters if the form method is a `GET` and `FormData` for all the other methods.

The user can access the request object in the callback so they can add headers or modifying the request in other ways before a network call is initialized.

## Installation

```
$ npm install --save @github/remote-form
```

## Usage

```js
import {remoteForm} from '@github/remote-form'

// Make all forms that have the `data-remote` attribute a remote form.
remoteForm('form[data-remote]', async function(form, wants, request) {
  // Before we start the request
  form.classList.remove('has-error')
  form.classList.add('is-loading')

  let response
  try {
    response = await wants.html()
  } catch (error) {
    // If the request errored, we'll set the error state and return.
    form.classList.remove('is-loading')
    form.classList.add('has-error')
    return
  }

  // If the request succeeded we can do something with the results.
  form.classList.remove('is-loading')
  form.querySelector('.results').innerHTML = response.html
})
```

```html
<form action="/signup" method="post" data-remote>
  <label for="username">Username</label>
  <input id="username" type="text" />

  <label for="password">Username</label>
  <input id="password" type="password" />

  <button>Log in</button>
</form>
```

## Browser support

Browsers without native [custom element support][support] require a [polyfill][].

- Chrome
- Firefox
- Safari
- Microsoft Edge

[support]: https://caniuse.com/#feat=custom-elementsv1
[polyfill]: https://github.com/webcomponents/custom-elements

## Development

```
npm install
npm test
```

## License

Distributed under the MIT license. See LICENSE for details.
