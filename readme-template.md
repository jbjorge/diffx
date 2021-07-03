# Diffx

## Introduction

Diffx is a state management library that focuses on being easy to learn and use, and to offer a great development
experience at any scale.

### Features

* Minimal API
* Minimal boilerplate
    * No forced usage patterns
    * Change any state from anywhere
    * Proxy/mutation based
* Tracking of asynchronous and nested changes to state
* Built in support for persistence
* Supports all major frameworks
* Built with typescript
* Devtools browser extension

### Why choose Diffx?

There are **a lot** of great state management libraries out there.  
Some focus on a rigid structure, suitable for large teams that want predictable code patterns, sometimes at the cost of
writing a lot of boilerplate code.  
Others give freedom to the developers to use it how they see fit at the cost of potentially losing control due to lack
of structure/patterns.

Diffx aims to get rid of the need for patterns by making it the library's responsibility to stay in control, and let the
developer stay on top of any shenanigans with the devtools extension.

#### Goals of Diffx

* be quick and easy to learn
* write as little code as possible
* use it with any framework
* allow developers to interact with the state however they want
* stay in control with the devtools extension

#### Is it better than Redux/Zustand/Mobx/Valtio/Vuex/Recoil/jotai/...?

I don't know. I haven't spent time trying all of them (yet).  
There are a heap of great choices out there, and the library you end up using will probably stay in your project for a
long time.  
I recommend you to look into several of the popular ones and see if you like them better than Diffx.

## Supported frameworks

* [React](https://reactjs.org/) --> [@diffx/react](https://github.com/jbjorge/diffx/tree/master/react)
* [Vue.js](https://vuejs.org/) --> [@diffx/vue](https://github.com/jbjorge/diffx/tree/master/vue)
* [Angular](https://angular.io/) --> [@diffx/angular](https://github.com/jbjorge/diffx/tree/master/angular)
* [RxJS](https://rxjs.dev/) --> [@diffx/rxjs](https://github.com/jbjorge/diffx/tree/master/rxjs)
* No framework --> [@diffx/core](https://github.com/jbjorge/diffx/tree/master/core)

## Installation

```shell
npm install @diffx/core
```

And install
the [devtools browser extension](https://chrome.google.com/webstore/detail/diffx-devtools/ecijpnkbdaghilfokgbcieakdfbibeec)
for a better development experience ([view documentation](#devtools-browser-extension)).

## Quick start

### Create state

```javascript
import { createState } from '@diffx/core';

export const dinnerOptions = createState('dinnerOptions', {
    fish: 0,
    meat: 0,
    vegetarian: 0
});
export const guests = createState('guests', { names: [] });
```

### Read state once

```javascript
import { dinnerOptions } from './above';

console.log(dinnerOptions.fish); // --> 0
```

### Set state

```javascript
import { setState } from '@diffx/core';
import { dinnerOptions, guests } from './above';

// set any state from anywhere
setState('add guest who wants fish and meat', () => {
    dinnerOptions.fish++;
    dinnerOptions.meat++;
    guests.names.push('John');
});

console.log(dinnerOptions.fish); // --> 1
```

### Watch state for changes

```javascript
import { watchState } from '@diffx/core';
import { guests } from './above';

watchState(() => guests.fish, {
    onChanged: (newValue) => console.log(newValue)
})
```

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
    includeStackTrace: false,
    /**
     * Persist the latest snapshot of all states and automatically use that as the initial state
     *
     * Default: false
     */
    persistent: false,
    /**
     * Location for storing persistent state.
     *
     * Default: sessionStorage
     */
    persistenceLocation: sessionStorage
})
```

### `createState`

`createState(namespace, state, options)` is used to create state in Diffx. It returns a readonly copy of the state which
Diffx will watch for changes.

* `namespace` - a string which is used as the key when storing the state in the state tree. _The namespace must be
  unique_.
* `state` - an object which contains the initial state
* `options`- optional settings for this particular state
    * `persistent` - Persist the latest snapshot of this state and automatically use that as the initial state. Setting
      it to `false` will exclude the state from persistence, even though it is globally set to `true`
      in `setDiffxOptions`.

    * `persistenceLocation` - Location for storing persistent state. Default: sessionStorage

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

#### Using `setState()` inside `setState()`

Diffx supports nesting/wrapping which enables a structured approach to setting state.

```javascript
import { setState } from '@diffx/core';
import { servings, dinnerGuests } from './the-above-example';

// The outer setState is used as a wrapper to create a context for the changes.
setState('Add guest with two kids', () => {
    addGuest('Bob the builder');
    setState('Add serving for kids', () => servings += 2);
})

function addGuest(name) {
    setState('Add guest', () => {
        dinnerGuests.names.push(name);
        servings++;
    });
}
```

### `setStateAsync`

`setStateAsync(reason, asyncMutatorFunc, onDone [, onError])` is used to make asynchronous changes to the state (and
enhances tracking of async state in Diffx devtools).

* `reason` - a string which explains why the state was changed. Will be displayed in the devtools extension for easier
  debugging.

* `asyncMutatorFunc` - a function that does async work (and returns a `Promise`).

* `onDone` - a function that receives the result of `asyncMutatorFunc` as an argument, and is free to change the state.

* `onError` - a function that receives the error from `asyncMutatorFunc` as an argument, and is free to change the
  state.

```javascript
import { createState, setState } from '@diffx/core';
import { servings } from './the-above-example';
import { orderFoodAsync } from './some-file';

export const orderState = createState('upload info', {
    isOrdering: false,
    successfulOrders: 0,
    errorMessage: ''
})

export function uploadGuests() {
    setStateAsync(
        'order food',
        () => {
            // set state before the async work begins
            orderState.errorMessage = '';
            orderState.successfulOrders = 0;
            orderState.isOrdering = true;
            // return the async work
            return orderFood(servings.count);
        },
        result => {
            // the async work succeeded
            orderState.isOrdering = false;
            orderState.successfulOrders = result;
        },
        error => {
            // the async work failed
            orderState.isOrdering = false;
            orderState.successfulOrders = 0;
            orderState.errorMessage = error.message;
        }
    )
}
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

## Devtools browser extension

[Install Diffx devtools for Chrome](https://chrome.google.com/webstore/detail/diffx-devtools/ecijpnkbdaghilfokgbcieakdfbibeec)

Diffx devtools is made to give insights into

* Why state was changed
* Which state was changed
* When did it change
* What caused the change

The extension will show up as a tab in the browser devtools when it detects that the page is using Diffx, and the
devtools flag is set to true [(see setDiffxOptions)](#setdiffxoptions).

![Devtools location](./assets/devtools-7.png)

The left pane displays a list of changes to the state along with their `reason`.  
The right pane displays the `Diff`, `State` and `Stacktrace` (if stacktrace has been enabled
in [setDiffxOptions](#setdiffxoptions)).

### Diff tab

![Diff tab preview](./assets/devtools-1.png)

### State tab

![State tab preview](./assets/devtools-6.png)

### Stacktrace tab

![Stacktrace tab preview](./assets/devtools-5.png)

### State namespace indicators

The dots in the left tab indicate which state was changed with their color, can be hovered to view the namespace and
clicked to filter the list by that state.

![State type hints](./assets/devtools-4.png)

### Nested setState/setStateAsync

For places where `setState()` has been used inside `setState()`, the left pane will display a nested view with colors
used for displaying nesting depth.

![Nested setState preview](./assets/devtools-2.png)

### Tracing setStateAsync

For operations done with `setStateAsync()`, the left pane will display an `async` tag where the operation starts, and
a `resolved` tag where the async operation finished.  
These tags are highlighted with a color to make it easier to spot and are also clickable to filter by.

![setStateAsync preview](./assets/devtools-3.png)

## Diffx compared to other state management libraries

## Credits and thanks

* Thanks to the team behind [Vue.js](https://vuejs.org/) for making a great framework and the `@vue/reactive` package
  this project depends on.
* Thanks to Benjamine, the creator of [jsondiffpatch](https://github.com/benjamine/jsondiffpatch) which this project
  uses for creating diffs.
* Thanks to all developers teaming together to share their creations with others
