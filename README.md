# Diffx

## Introduction

Diffx is a state management library that focuses on being easy to learn and use, and to offer a great development
experience at any scale.

## Features

* Minimal API
* No forced usage patterns
  * Minimal boilerplate
* Supports nested changes to state
* Built with typescript
* [Devtools extension](https://chrome.google.com/webstore/detail/diffx-devtools/ecijpnkbdaghilfokgbcieakdfbibeec) for
  Google Chrome
    * Step through states
    * View diffs, current state, and a stacktrace of what initiated the change
    * View and track nested state changes

## Supported frameworks

* [React](https://reactjs.org/) --> [@diffx/react](https://www.npmjs.com/package/@diffx/react)
* [Vue.js](https://vuejs.org/) --> [@diffx/vue](https://www.npmjs.com/package/@diffx/vue)
* [Angular](https://angular.io/) --> [@diffx/angular](https://www.npmjs.com/package/@diffx/angular)
* [RxJS](https://rxjs.dev/) --> [@diffx/rxjs](https://www.npmjs.com/package/@diffx/rxjs)
* No framework --> [@diffx/core](https://www.npmjs.com/package/@diffx/core)

## Notice

This is the documentation for `@diffx/core` which can be used for wrapping the library or using it without a
framework.  
For documentation of your framework of choice, see the links in [Supported frameworks](#supported-frameworks) section
above.

## Installation

```shell
npm install @diffx/core
```

And install
the [devtools extension for Google Chrome](https://chrome.google.com/webstore/detail/diffx-devtools/ecijpnkbdaghilfokgbcieakdfbibeec)
for a better debugging experience.

## Usage

### `setDiffxOptions`

`setDiffxOptions(options)` is used to configure which global features to enable for Diffx.

```javascript
import { setDiffxOptions } from '@diffx/core';

setDiffxOptions({
	/**
	 * Whether to record a history of state changes in-memory.
	 * Useful if e.g. the application wants to upload the history that lead to a crash.
	 * History can be obtained through `diffxInternals.getDiffs()`.
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
	 * Store a stack-trace with every history entry if `createDiffs` is enabled.
	 * Will be displayed in devtools to help with tracking down
	 * which code is making state changes.
	 *
	 * NOT recommended for production environments since creating stack traces is a slow operation!
	 *
	 * Default: false
	 */
	includeStackTrace: false
})
```

### `createState`

`createState(namespace, state)` is used to create state in Diffx. It returns a readonly copy of the state which Diffx
will watch for changes.

* `namespace` - a string which is used as the key when storing the state in the state tree. _The namespace must be
  unique_.
* `state` - an object which contains the initial state

```javascript
import { createState } from '@diffx/core';

export const dinnerGuests = createState('dinnerGuests', { names: [] });
export const servings = createState('servings', { count: 0 });
```

The return value of `createState()` can be accessed as a regular object to read its values.

### `setState`

`setState(reason, mutatorFunc)` is used to make changes to the state.

* `reason` - a string which explains why the state was changed. Will be displayed in the devtools extension for easier
  debugging.
* `mutatorFunc` - a function that wraps all changes to the state.

_Any changes made to the state outside of `setState()` will throw an error._

```javascript
import { setState } from '@diffx/core';
import { servings, dinnerGuests } from './the-above-example';

setState('Add guest to dinner party', () => {
	dinnerGuests.names.push('Kari Nordmann');
	servings.count++;
});

// this mutates the state outside of setState() and will throw an error
dinnerGuests.names.push('Karl the first');
```

It also supports nested calls to `setState()`.

```javascript
export const addGuest = (name) => setState('Add guest', () => {
	dinnerGuests.names.push(name);
	servings++;
});

// in some other file
import { addGuest } from './code-above';

setState('Add guest with two kid who also wants to eat', () => {
	addGuest('Bob the builder');
	setState('Add serving for kids', () => servings += 2);
})
```

### `watchState`

`watchState(stateGetter, options)` is used for watching the state and being notified/reacting when it changes.

* `stateGetter` - a function which returns the state(s) to be watched
* `options` - options object which describes how to watch the state
    * An error will be thrown if both `onChanged` and `onEachChange` are `undefined` (one of them needs to be set).

`watchState` is useful when creating "background services" that watches the state and reacts to changes.

```javascript
import { watchState } from '@diffx/core';
import { servings, dinnerGuests } from './the-above-example';

const unwatchFunc = watchState(() => dinnerGuests, {
	/**
	 * [Optional]
	 * Whether to emit the current value of the watched item(s).
	 *
	 * Default: false
	 */
	lazy: false,

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
	 * Default: undefined, Diffx does automatic change comparison
	 */
	hasChangedComparer: (newValue, oldValue) => true / false
});

// stop watching
unwatchFunc();
```

The `watchState()` function can also watch projections of state or multiple states

```javascript
// projection of state
watchState(
	() => servings.count - dinnerGuests.names.length,
	{
		onChanged: (extraServings) => 'do whatever you want'
	}
);

// multiple states (which is actually just a projection of state)
watchState(
	() => [dinnerGuests.names, servings.count],
	{
		onChanged: ([guestNames, servingsCount]) => 'do whatever you want'
	}
);
```

### `destroyState`

`destroyState(namespace)` is used for removing state from diffx.

* `namespace` - the namespace (string) to destroy

_Any watchers of the destroyed state will **not** be automatically unwatched_.

## Credits and thanks

Thanks to the team behind [Vue.js](https://vuejs.org/) for making a great framework and the `@vue/reactive` package this
project depends on.  
Thanks to Benjamine, the creator of [jsondiffpatch](https://github.com/benjamine/jsondiffpatch) which this project uses
for creating diffs.  
Thanks to [Redux](https://redux.js.org/) for inspiring me to try my hand at decreasing boilerplate.
