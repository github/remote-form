# remote-form

A function that will enable submitting it over AJAX

## Installation

```
$ npm install --save @github/remote-form
```

## Usage

```js
import {remoteForm} from '@github/remote-form'
```

```html
<form action="/signup" method="post">
  <label for="username">Username</label>
  <input id="username" type="text" />

  <label for="password">Username</label>
  <input id="password" type="password" />

  <button>Log in</button>
</form>
```

## Browser support

- Chrome
- Firefox
- Safari
- Microsoft Edge

## Development

```
npm install
npm test
```

## License

Distributed under the MIT license. See LICENSE for details.
