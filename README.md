# Diffx

## Introduction

Diffx is a state management library that focuses on minimizing boilerplate, effortless usage with typescript as well as
support for:

* [React](https://reactjs.org/) --> [@diffx/react](https://www.npmjs.com/package/@diffx/react)
* [Vue.js](https://vuejs.org/) --> [@diffx/vue](https://www.npmjs.com/package/@diffx/vue)
* [Angular](https://angular.io/) --> [@diffx/angular](https://www.npmjs.com/package/@diffx/angular)
* [RxJS](https://rxjs.dev/) --> [@diffx/rxjs](https://www.npmjs.com/package/@diffx/rxjs)

Debugging can be done with
the [devtools extension for Google Chrome](https://chrome.google.com/webstore/detail/diffx-devtools/ecijpnkbdaghilfokgbcieakdfbibeec).

## Notice
This is the documentation for `@diffx/core` which can be used for wrapping the library.  
For documentation of your framework of choice, see the links in [Introduction](#introduction) section above.

## Usage

### `setDiffxOptions`

`setDiffxOptions(options)` is used to enable communication with the devtools extension.

```javascript
import { setDiffxOptions } from '@diffx/core';

setDiffxOptions({
	debug: false / {
		/** Enable viewing the state history in devtools. Not recommended for use in a production environment. */
		devtools: true / false,
		/** Beware, creating stack traces for each state change is a slow operation. Not recommended for use in a production environment. */
		includeStackTrace: true / false
	}
})
```

### `createState`

`createState(namespace, state)` is used to create state in diffx and returns a copy of the state which diffx will watch for changes.

* `namespace` - a string which is used as the key when storing the state in the state tree. _The namespace has to be
  unique_.
* `state` - an object which contains the initial state

```javascript
import { createState } from '@diffx/core';

export const coolnessFactor = createState('coolnessFactor', { numberOfCoolPeople: 1 });
export const people = createState('people', { names: ['Ola Nordmann'] });
```

### `setState`

`setState(reason, mutatorFunc)` is used to make changes to the state.

* `reason` - a string which explains why the state was changed. Will be displayed in the devtools extension for easier
  debugging.
* `mutatorFunc` - a function that wraps all changes to the state.

_Any changes made to the state outside of `setState` will throw an error._

```javascript
import { setState } from '@diffx/core';
import { coolnessFactor, people } from './the-above-example';

setState('Adding myself to the list', () => {
	people.names.push('Kari Nordmann');
	coolnessFactor.numberOfCoolPeople++;
});
```

### `watchState`

`watchState(stateGetter, options)` is used for watching the state and being notified/reacting when it changes.

* `stateGetter` - a function which returns the state to be watched
* `options` - options object which describes how to watch the state
    * An error will be thrown if both `onChanged` and `onEachChange` is not provided (one of them needs to be set).

`watchState` is useful when writing "background services" that watches the state and reacts to changes.

```javascript
import { watchState } from '@diffx/core';
import { coolnessFactor, people } from './the-above-example';

const unwatchFunc = watchState(() => people, {
	// [Optional] true = emit the initial value, false = emit changes from now on, default = false
	lazy: true / false,

	// called when the `mutator` in `setState` has finished its run
	onChanged: newValue => { /* do whatever you want */ },

	// called each time the state changes (even midway through a `setState`)
	onEachChange: newValue => { /* do whatever you want */ },

	// [Optional] - called each time the state changes and allows your function to
	// decide if the state has changed or not
	hasChangedComparer: (newValue, oldValue) => true / false
});

// stop watching
unwatchFunc();
```

### `destroyState`

`destroyState(namespace)` is used for removing state from diffx.

* `namespace` - the namespace (string) to destroy

_Any watchers of the destroyed state will **not** be automatically unwatched_.

## Typescript
Diffx is written in typescript and leans on typescript's type inference to avoid interface boilerplate.

## Credits and thanks

Thanks to the team behind [Vue.js](https://vuejs.org/) for making a great framework and the `@vue/reactive` package this
project depends on.  
Thanks to Benjamine, the creator of [jsondiffpatch](https://github.com/benjamine/jsondiffpatch) which this project uses
for creating diffs.  
Thanks to [Redux](https://redux.js.org/) for inspiring me to try my hand at decreasing boilerplate.
