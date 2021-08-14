# @diffx/vue

Diffx is a state management library that focuses on three things:

* Make it easy to use
* Get rid of boilerplate
* Make great devtools

<details>
  <summary><strong>Show all features</strong></summary>

## Features

* Minimal API
* Minimal boilerplate
    * No forced usage patterns
    * Change any state from anywhere
    * Proxy/mutation based
* Detailed tracking
    * nested changes
    * asynchronous changes (start, resolve and reject)
    * changes done by watchers of the state
* Built in support for persistence
* Supports all major frameworks
* Built with typescript
* Devtools browser extension

</details>


## Supported frameworks

![react logo](../assets/framework-logos/react.png) React
--> [@diffx/react](https://github.com/jbjorge/diffx/tree/master/react)  
![vue logo](../assets/framework-logos/vue.png) Vue.js --> [@diffx/vue](https://github.com/jbjorge/diffx/tree/master/vue)  
![svelte logo](../assets/framework-logos/svelte.png) Svelte
--> [@diffx/svelte](https://github.com/jbjorge/diffx/tree/master/svelte)  
![angular logo](../assets/framework-logos/angular.png) Angular
--> [@diffx/angular](https://github.com/jbjorge/diffx/tree/master/angular)  
![rxjs logo](../assets/framework-logos/rxjs.png) RxJS
--> [@diffx/rxjs](https://github.com/jbjorge/diffx/tree/master/rxjs)  
No framework --> [@diffx/core](https://github.com/jbjorge/diffx/tree/master/core)


## Installation

```shell
npm install @diffx/vue
```

And install
the [devtools browser extension](https://chrome.google.com/webstore/detail/diffx-devtools/ecijpnkbdaghilfokgbcieakdfbibeec)
for a better development experience ([view documentation](#devtools-browser-extension)).


## Usage


### setDiffxOptions()

`setDiffxOptions(options)` is optionally used to configure which global features to enable for Diffx, and should ideally
be run before any code interacts with Diffx.

* `options` - an options object that configures how Diffx works internally

```javascript
import { setDiffxOptions } from '@diffx/vue';

setDiffxOptions({ devtools: true });
```



<details>
    <summary><strong>See all available options</strong></summary>

```javascript
const opts = {
    /**
     * Enable viewing the state history in devtools.
     * Not recommended for use in a production environment.
     * If set to true, `createDiffs` will also be implicitly true.
     *
     * Default: false
     */
    devtools: false,
    /**
     * Store a stack-trace with every diff if `createDiffs` is enabled.
     * Will be displayed in devtools to help with tracking down
     * which code is making state changes.
     *
     * NOT recommended in production environment since creating stack traces is a slow operation!
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
     * E.g. localStorage or sessionStorage
     *
     * Default: null
     */
    persistenceLocation: null,
    /**
     * Whether to record all diffs of the state in-memory.
     *
     * Default: false
     **/
    createDiffs: false,
    /**
     * Max nesting depth.
     *
     * If a loop of setState <--> watchState is accidentally created, it will run off and crash
     * (and potentially crash the main thread). To avoid this, a max nesting depth can be set.
     *
     * Default: 100
     */
    maxNestingDepth: 100
}
```

</details>



### createState()

`createState(namespace, state)` is used to create state in Diffx.

* `namespace` - a string which is used as the key when storing the state in the state tree. _The namespace must be
  unique_.
* `state` - an object which contains the initial state

```javascript
import { createState } from '@diffx/vue';

const clickCounter = createState('click counter', { count: 0 });
console.log(clickCounter.count); // --> 0
```

You can create as many states as you like and access them as regular objects to read their values.



<details>
    <summary><strong>Configure persistence</strong></summary>

`createState(namespace, state, options)`

* `namespace` - a string which is used as the key when storing the state in the state tree. _The namespace must be
  unique_.
* `state` - an object which contains the initial state
* `options`- optional settings for this particular state
    * `persistent` - Persist the latest snapshot of this state and automatically use that as the initial state. Setting
      it to `false` will exclude the state from persistence, even though it is globally set to `true`
      in `setDiffxOptions`.  
      Default: `false`

    * `persistenceLocation` - Location for persisting this particular state - e.g. `window.sessionStorage`.  
      Default: `false`

```javascript
import { setDiffxOptions, createState } from '@diffx/vue';

// globally enabling persistence
setDiffxOptions({
    persistent: true,
    persistenceLocation: sessionStorage
})

// this state is not persisted
export const loadingState = createState('loading state', { isLoading: false }, { persistent: false });

// this state is persisted in accordance with settings in `setDiffxOptions`
export const clickCounter = createState('click counter', { count: 0 });

// this state is persisted in localStorage instead of the globally defined persistenceLocation
export const users = createState('users', { names: [] }, { persistenceLocation: localStorage });
```

</details>



### setState()

`setState(reason, mutatorFunc)` is used to make changes to the state.

* `reason` - a string which explains why the state was changed. Will be displayed in the devtools extension for easier
  debugging.
* `mutatorFunc` - a function that wraps all changes to the state.

```javascript
import { setState } from '@diffx/vue';
import { clickCounter } from './createState-example-above';

setState('increment the counter', () => clickCounter.count++);
```



<details>
    <summary><strong>Synchronous usage</strong></summary>

Since Diffx is proxy-based, it will keep track of anything happening within `setState()`.  
Multiple states can be changed within one `setState()`:

```javascript
import { setState } from '@diffx/vue';
import { clickCounter, users } from './createState-in-depth-docs';

setState('Change the counter and add a user', () => {
    clickCounter.count++;
    if (clickCounter.count > 2) {
        clickCounter.count = 200;
    }
    users.names.push('John');
})
```

</details>



<details>
    <summary><strong>Asynchronous usage</strong></summary>

`setState(reason, asyncMutatorFunc, onDone [, onError])` is used to make asynchronous changes to the state.

* `reason` - a string which explains why the state was changed. Will be displayed in the devtools extension for easier
  debugging.
* `asyncMutatorFunc` - a function that is free to change the state, and returns a `Promise`.
* `onDone` - a function that receives the result of `asyncMutatorFunc` as an argument, and is free to change the state.
* `onError` - a function that receives the error from `asyncMutatorFunc` as an argument, and is free to change the
  state.

```javascript
import { createState, setState } from '@diffx/vue';
import { fetchUsersFromServer } from './some-file';

export const users = createState('users-status', {
    isFetching: false,
    names: [],
    fetchErrorMessage: ''
});

setState(
    'fetch and update users',
    () => {
        // set state before the async work begins
        users.fetchErrorMessage = '';
        users.names = [];
        users.isFetching = true;
        // return the async work
        return fetchUsersFromServer();
    },
    result => {
        // the async work succeeded
        users.names = result;
        users.isFetching = false;
    },
    error => {
        // the async work failed
        users.fetchErrorMessage = error.message;
        users.isFetching = false;
    }
);
```

The `asyncMutatorFunc` and its resolution with `onDone` or `onError` will
be [tracked in devtools](#tracing-async-setstate).

</details>



<details>
    <summary><strong>Nesting setState() inside setState()</strong></summary>

Diffx supports and encourages nesting/wrapping which enables reuse of `setState` and enhances tracking in devtools.

```javascript
import { setState } from '@diffx/vue';

import { clickCounter, users } from './createState-in-depth-docs';

const addUser = (name) => setState('add user', () => users.names.push('John'));
const incrementCounter = () => setState('increment counter', () => clickCounter.count++);

setState('Change the counter and add a user', () => {
    incrementCounter();
    if (clickCounter.count > 2) {
        clickCounter.count = 200;
    }
    addUser('John');
})
```

This also opens up the possibility to give more context as to why changes happened:

```javascript
// in file 1
export const addUser = (name) => setState('add user', () => users.names.push('John'));
export const incrementCounter = () => setState('increment counter', () => clickCounter.count++);

// in file 2
export const addUserClicked = () => {
    setState('Change the counter and add a user', () => {
        incrementCounter();
        if (clickCounter.count > 2) {
            clickCounter.count = 200;
        }
        addUser('John');
    });
};

// in userComponent we wrap the change with some helpful context
setState('userComponent is adding a user', addUserClicked);
```

This will also enable the devtools to [visualise the hierarchy of changes](#nested-setstate) and make the flow of
changes more understandable.

</details>



<details>
    <summary><strong>Why not directly modify the state?</strong></summary>

By having the freedom to change state from *anywhere* in the codebase with `setState`, state can quickly get out of
control and be difficult to debug if there is no human-readable reasoning behind why a change was made.  
To ensure that the usage experience stays developer friendly, easy to debug, and help with identifying which code needs
refactoring, Diffx enforces the use of `setState` since it requires being provided with a `reason` for the changes.

_Any changes made to the state outside of `setState()` will throw an error._

```javascript
import { clickCounter } from './createState-example-above';

clickCounter.count++; // this will throw an error
```

</details>




### watchState()

> Diffx works natively with Vue, and the state can be considered (and used) as a readonly `reactive` object.
> This means that the state can be used directly in `<template>` and `computed()`.
>
> It also works well with Vue's `watch`/`watchEffect`, but `watchState` is preferred as explained in [watchState vs watch/watchEffect](#watchstate-vs-watch-watchEffect) below.


`watchState(stateGetter, options)` is used for watching the state and being notified/reacting when it changes.

* `stateGetter` - a function which returns the state(s) to be watched
* `callback` - a callback that will be called the next time the watched state changes

`watchState` is useful when creating "background services" that watches the state and reacts when it changes.

```javascript
import { watchState } from '@diffx/vue';
import { clickCounter } from './createState-example-above';

const unwatchFunc = watchState(
    () => clickCounter,
    (newValue, oldValue) => {
        console.log('counter changed to', newValue.count);
    }
);

// stop watching
unwatchFunc();
```


<details id="watchstate-vs-watch-watchEffect">
    <summary><strong>watchState vs watch/watchEffect</strong></summary>

Diffx works well with regular `watch`/`watchEffect`, but there are a few advantages to using `watchState` instead:

1. If `watchState` runs `setState`, the origin of the trigger [will be tracked in devtools](#tracing-state-changed-in-watchstate)
2. Changes to the state can be watched with different levels of granularity (see *Controlling how state is watched* below).
</details>




<details>
    <summary><strong>Controlling how state is watched</strong></summary>

To have fine-grained control over how the state is watched, the second argument can be an options object instead of a
callback.

```javascript
import { watchState } from '@diffx/vue';
import { clickCounter } from './createState-example-above';

const unwatchFunc = watchState(() => clickCounter, {
    /**
     * Whether to emit the current value of the watched item(s).
     *
     * Default: `false`
     */
    emitInitialValue: true / false,
    /**
     * Callback called with the final state after the outermost `.setState` function has finished running.
     */
    onSetStateDone: (newValue, oldValue) => '...',
    /**
     * Callback called with the current state after each `.setState` has finished running
     * (including each .setState wrapped in .setState)
     */
    onEachSetState: (newValue, oldValue) => '...',
    /**
     * Callback for each change to the state during `.setState`.
     */
    onEachValueUpdate: (newValue, oldValue) => '...',
    /**
     * Custom comparer function to decide if the state has changed.
     * Receives newValue and oldValue as arguments and should return `true` for changed
     * and `false` for no change.
     *
     * Default: Diffx built in comparer
     */
    hasChangedComparer: (newValue, oldValue) => true / false,
    /**
     * Whether the watcher should automatically stop watching after the first changed value has
     * been emitted.
     *
     * Default: false
     */
    once: true / false
});

// stop watching
unwatchFunc();
```

</details>



<details>
    <summary><strong>Watching projections</strong></summary>

```javascript
import { watchState } from '@diffx/vue';
import { clickCounter } from './createState-example-above';

watchState(
    () => clickCounter.count > 5,
    isAboveFive => console.log(isAboveFive)
);
```

</details>



<details>
    <summary><strong>Watching multiple states</strong></summary>

```javascript
import { watchState } from '@diffx/vue';
import { clickCounter, users } from './createState-in-depth-docs';

watchState(
    () => [clickCounter.count, users.names],
    ([clickCount, names]) => console.log(clickCount, names)
);
```

</details>



<details>
    <summary><strong>Using setState() inside watchState()</strong></summary>

If a watcher changes state, this will also be [tracked in devtools](#tracing-state-changed-in-watchstate):

```javascript
import { watchState, setState } from '@diffx/vue';
import { clickCounter, users } from './createState-in-depth-docs';

watchState(
    () => clickCounter.count === 5,
    countIsFive => {
        if (!countIsFive) return;
        setState('counter has the value 5, so I added another user', () => {
            users.names.push('Jenny');
        });
    }
);
```

</details>



### destroyState()

`destroyState(namespace)` is used for removing state from diffx.

* `namespace` - the namespace (string) to destroy

_Any watchers of the destroyed state will **not** be automatically unwatched_.

```javascript
import { destroyState } from '@diffx/vue';

destroyState('click counter');
```



## Devtools browser extension

[Install Diffx devtools for Chrome](https://chrome.google.com/webstore/detail/diffx-devtools/ecijpnkbdaghilfokgbcieakdfbibeec) and enable it with [setDiffxOptions](#setdiffxoptions).

Diffx devtools is made to give insights into

* Why state was changed
* Which state was changed
* When did it change
* What caused the change

The extension will show up as a tab in the browser devtools when it detects that the page is using Diffx, and the
devtools option is set to `true` [(see setDiffxOptions)](#setdiffxoptions).

![Devtools location](../assets/devtools-7.png)

The left pane displays a list of changes (diffs) to the state along with their `reason`.  
The right pane displays the `Diff`, `State` and `Stacktrace` (if stacktrace has been enabled
in [setDiffxOptions](#setdiffxoptions)).

### Diff tab

Displays the difference between each change made by `setState()`.

![Diff tab preview](../assets/devtools-1.png)

### State tab

Displays the current state at the selected diff.

![State tab preview](../assets/devtools-6.png)

### Stacktrace tab

Displays the stack trace for the code that led to this state change.

![Stacktrace tab preview](../assets/devtools-5.png)

### State namespace indicators

The dots in the left tab indicate which state was changed with their color, can be hovered to view the namespace and
clicked to filter the list by that state.

![State type hints](../assets/devtools-4.png)

### Nested setState

For places where `setState()` has been used inside `setState()`, the left pane will display a nested view with colors
used for displaying nesting depth.

![Nested setState preview](../assets/devtools-2.png)

### Tracing async setState

For async operations done with `setState()`, the left pane will display an `async` tag where the operation starts, and
a `resolve`/`reject`  tag where the async operation finished.  
These tags are highlighted with a color to make it easier to spot which operations belong together and are also clickable to filter by.

![setState preview](../assets/devtools-3.png)

### Tracing state changed in watchState

If a `watchState()` runs `setState()`, the left pane will display a `watcher` tag to indicate that the change was
triggered.

![watchState tracing preview 1](../assets/devtools-8.png)

The `watcher` tag can be hovered to see which state change triggered it and clicked to find the state change.

![watchState tracing preview 2](../assets/devtools-9.png)

To see where in the code the watcher was run, enable `includeStackTrace` in [setDiffxOptions](#setdiffxoptions) and open
the Stacktrace tab for the entry tagged with the `watcher`.

### Highlight/filter changes to a specific value

The Highlight and Filter button can be used to find the state changes that affected a specific value.

![highlight/filter preview](../assets/devtools-10.png)

## Diffx compared to other state management libraries

There are **a lot** of great state management libraries out there.  
Some focus on a rigid structure, suitable for large teams that want predictable code patterns, sometimes at the cost of
writing a lot of boilerplate code.  
Others give freedom to the developers to use it how they see fit at the cost of potentially losing control due to lack
of structure/patterns.

Diffx aims to get rid of the need for patterns by making it the library's responsibility to stay in control, and let the
developer stay on top of any shenanigans with the devtools extension.

#### Is it better than Redux/Zustand/Mobx/Valtio/Vuex/Recoil/jotai/...?

I don't know. I haven't spent time trying all of them (yet).  
There are a heap of great choices out there, and the library you end up using will probably stay in your project for a
long time.  
I recommend you to look into several of the popular ones and see if you like them better than Diffx.

## Credits and thanks

* Thanks to the team behind [Vue.js](https://vuejs.org/) for making a great framework and the `@vue/reactive` package
  this project depends on.
* Thanks to Benjamine, the creator of [jsondiffpatch](https://github.com/benjamine/jsondiffpatch) which this project
  uses for creating diffs.
* Thanks to all developers teaming together to share their creations with others
