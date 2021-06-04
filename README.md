# Diffx

## Introduction

Diffx is a state management library that focuses on minimizing boilerplate, effortless usage with typescript as well as
support for:

* [React](https://reactjs.org/) --> [@diffx/react](https://www.npmjs.com/package/@diffx/react)
* [Vue.js](https://vuejs.org/) --> [@diffx/vue](https://www.npmjs.com/package/@diffx/vue)
* [Angular](https://angular.io/) --> [@diffx/angular](https://www.npmjs.com/package/@diffx/angular)
* [RxJS](https://rxjs.dev/) --> [@diffx/rxjs](https://www.npmjs.com/package/@diffx/rxjs)

Debugging can be done with
the [devtools extension for Google Chrome](https://chrome.google.com/webstore/detail/diffx-devtools/ecijpnkbdaghilfokgbcieakdfbibeec)
.

## Notice

This is the documentation for `@diffx/core` which can be used for wrapping the library.  
For documentation of your framework of choice, see the links in [Introduction](#introduction) section above.

## Usage

### `setDiffxOptions`

`setDiffxOptions(options)` is used to configure which global features to enable for Diffx.

```javascript
import { setDiffxOptions } from '@diffx/core';

setDiffxOptions({
  /**
   * Whether to record all diffs of the state in-memory.
   *
   * Default: false
   **/
  createDiffs: false,
  /**
   * Enable viewing the state history in devtools.
   * If set to true, `createDiffs` will also be implicitly true since it
   * is required by devtools.
   *
   * Default: false
   */
  devtools: false,
  /**
   * Store a stack-trace with every diff if `createDiffs` is enabled.
   * Will be displayed in devtools to help with tracking down
   * which code is making state changes.
   *
   * NOT recommended for production environments since creating stack traces is a slow operation!
   *
   * Default: false
   */
  includeStackTrace: false;
})
```

### `createState`

`createState(namespace, state)` is used to create state in diffx and returns a readonly copy of the state which diffx
will watch for changes.

* `namespace` - a string which is used as the key when storing the state in the state tree. _The namespace has to be
  unique_.
* `state` - an object which contains the initial state

```javascript
import { createState } from '@diffx/core';

export const coolnessFactor = createState('coolnessFactor', { numberOfCoolPeople: 1 });
export const people = createState('people', { names: ['Ola Nordmann'] });
```

The return value of `createState()` can be accessed as a regular object to read its values.

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

// this mutates the state outside of setState() and will throw an error
people.names.push('Karl the first');
```

### `watchState`

`watchState(stateGetter, options)` is used for watching the state and being notified/reacting when it changes.

* `stateGetter` - a function which returns the state to be watched
* `options` - options object which describes how to watch the state
    * An error will be thrown if both `onChanged` and `onEachChange` are `undefined` (one of them needs to be set).

`watchState` is useful when creating "background services" that watches the state and reacts to changes.

```javascript
import { watchState } from '@diffx/core';
import { coolnessFactor, people } from './the-above-example';

const unwatchFunc = watchState(() => people, {
	/**
	 * [Optional]
	 * Whether to emit the current value of the watched item(s).
	 *
	 * Default: false
	 */
	lazy: true / false,

	/**
	 * Callback called with the final state after
	 * the .setState() function has finished running.
	 */
	onChanged: newValue => 'do whatever you want',

	/**
	 * Callback for each change to the state during .setState().
	 */
	onEachChange: newValue => 'do whatever you want',

	/**
	 * [Optional]
	 * Custom comparer function to decide if the state has changed.
	 * Receives newValue and oldValue as arguments and should return `true` for changed
	 * and `false` for no change.
	 *
	 * Default: Diffx does automatic change comparison
	 */
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
