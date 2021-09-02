# @diffx/core

Diffx is a state management library that focuses on three things:

* Make it easy to learn and use
* Get rid of boilerplate
* Make great devtools

### Key features

🤏 Small API and a very compact syntax  
🔍 Tracks the _reason_ behind changes to the state  
🔧 Devtools that track:  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;- what, when, where and **why** state changed  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;- async start/resolution  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;- nested changes  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;- changes triggered by watchers  
💾 Built in persistence  
📝 Written in Typescript, inferring your types


### Supported frameworks

![react logo](https://github.com/jbjorge/diffx/raw/master/assets/framework-logos/react.png) React
--> [@diffx/react](https://github.com/jbjorge/diffx/tree/master/react)  
![vue logo](https://github.com/jbjorge/diffx/raw/master/assets/framework-logos/vue.png) Vue.js
--> [@diffx/vue](https://github.com/jbjorge/diffx/tree/master/vue)  
![svelte logo](https://github.com/jbjorge/diffx/raw/master/assets/framework-logos/svelte.png) Svelte
--> [@diffx/svelte](https://github.com/jbjorge/diffx/tree/master/svelte)  
![angular logo](https://github.com/jbjorge/diffx/raw/master/assets/framework-logos/angular.png) Angular
--> [@diffx/angular](https://github.com/jbjorge/diffx/tree/master/angular)  
![rxjs logo](https://github.com/jbjorge/diffx/raw/master/assets/framework-logos/rxjs.png) RxJS
--> [@diffx/rxjs](https://github.com/jbjorge/diffx/tree/master/rxjs)  
No framework --> [@diffx/core](https://github.com/jbjorge/diffx/tree/master/core)



## Installation

```shell
npm install @diffx/core
```

And install
the [devtools browser extension](https://chrome.google.com/webstore/detail/diffx-devtools/ecijpnkbdaghilfokgbcieakdfbibeec)
for a better development experience ([view documentation](#devtools-browser-extension)).

Or use it as a browser import (API available through `window.diffx`)

```html
<script src="https://unpkg.com/@diffx/core@2.0.2/dist/diffx.umd.min.js"></script>
```



## Usage



### Configure Diffx

`setDiffxOptions(options)` is used to configure which global features to enable for Diffx. Should be run before any code
interacts with Diffx.

* `options` - an options object that configures how Diffx works internally

```javascript
import { setDiffxOptions } from '@diffx/core';

setDiffxOptions({ devtools: true });
```

<details>
    <summary><strong>Show all options</strong></summary>

```javascript
import { setDiffxOptions } from '@diffx/core';

setDiffxOptions({
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
});
```

</details>





### Create state

`createState(namespace, state)` is used to create state in Diffx.

* `namespace` - a string which is used as the key when storing the state in the state tree. _The namespace must be
  unique_.
* `state` - an object which contains the initial state

```javascript
import { createState } from '@diffx/core';

export const usersState = createState('users state', { names: [] });
export const clickCounter = createState('click counter', { count: 0 });

console.log(clickCounter.count); // --> 0
```

You can create as many states as you like and access them as regular objects to read their values.



<details>
    <summary><strong>Configure persistence</strong></summary>

`createState(..., ..., options)`

* `options`- optional settings for this particular state
    * `persistent` - Persist the latest snapshot of this state and automatically use that as the initial state. Setting
      it to `false` will exclude the state from persistence, even though it is globally set to `true`
      in `setDiffxOptions`.  
      Default: `false`

    * `persistenceLocation` - Location for persisting this particular state - e.g. `window.sessionStorage`.  
      Default: `false`

```javascript
import { setDiffxOptions, createState } from '@diffx/core';

// this enables persistence for all states globally
setDiffxOptions({
    persistent: true,
    persistenceLocation: sessionStorage
})

// this disables persistence for a specific state (if it's enabled globally)
export const clickCounter = createState('click counter', { count: 0 }, { persistent: false });

// this state is persisted in accordance with the global settings in `setDiffxOptions`
export const clickCounter = createState('click counter', { count: 0 });

// this state is persisted in localStorage instead of the globally defined persistenceLocation
export const clickCounter = createState('click counter', { count: 0 }, { persistenceLocation: localStorage });
```

</details>





### Update state

`setState(reason, mutatorFunc)` is used to wrap changes to the state.

* `reason` - a string which explains why the state was changed. Will be displayed in the devtools extension for easier
  debugging.
* `mutatorFunc` - a function that wraps all changes to the state.

```javascript
import { setState } from '@diffx/core';
import { clickCounter } from './createState-example';

setState('increment the counter', () => clickCounter.count++);
```




<details>
    <summary><strong>Synchronous usage</strong></summary>

Since Diffx is proxy-based, it will keep track of anything happening within `setState()`.  
Multiple states can be changed within one `setState()`:

```javascript
import { setState } from '@diffx/core';
import { clickCounter, usersState } from './createState-example';

setState('Change the counter and add a user', () => {
    clickCounter.count++;
    if (clickCounter.count > 2) {
        clickCounter.count = 200;
    }
    usersState.names.push('John');
})
```

This will also create an entry in the devtools  
![devtools entry screenshot](https://github.com/jbjorge/diffx/raw/master/assets/devtools/img_9.png)

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
import { createState, setState } from '@diffx/core';
import { fetchUsersStateFromServer } from './some-file';

export const usersState = createState('usersState-status', {
    isFetching: false,
    names: [],
    fetchErrorMessage: ''
});

setState(
    'fetch and update usersState',
    () => {
        // set state before the async work begins
        usersState.fetchErrorMessage = '';
        usersState.names = [];
        usersState.isFetching = true;
        // return the async work
        return fetchUsersStateFromServer();
    },
    result => {
        // the async work succeeded
        usersState.names = result;
        usersState.isFetching = false;
    },
    error => {
        // the async work failed
        usersState.fetchErrorMessage = error.message;
        usersState.isFetching = false;
    }
);
```

The `asyncMutatorFunc` and its resolution with `onDone` or `onError` will be tracked in the devtools:
<table>
<tr>
<td>onDone</td>
<td>

![async onDone in devtools](https://github.com/jbjorge/diffx/raw/master/assets/devtools/img_10.png)

</td>
</tr>
<tr>
<td>onError</td>
<td>

![async onError in devtools](https://github.com/jbjorge/diffx/raw/master/assets/devtools/img_11.png)

</td>
</tr>
</table>

</details>



<details>
    <summary><strong>Nesting <code>setState()</code> inside <code>setState()</code></strong></summary>

To avoid repeating yourself, it can be beneficial to wrap `setState` in a function that can be reused.

```javascript
import { createState, setState } from '@diffx/core';
import { usersState } from './createState-example';

export function addUser(name) {
    setState('Add user', () => usersState.names.push(name));
}
```

To make the state history more readable, the usage of the wrapped `setState` above can be used inside a `setState`
providing a reason for the changes and grouping them.

```javascript
// in some other file
import { setState } from '@diffx/core';
import { addUser } from './example-above';

setState('PeopleComponent: User clicked "Save usersState"', () => {
    addUser('John');
    addUser('Jenny');
});
```

This nesting will be displayed in the devtools as an indented hierarchical list, clarifying why "Add user" happened:  
![nesting in devtools](https://github.com/jbjorge/diffx/raw/master/assets/devtools/img_7.png)

Nesting can go as many levels deep as desired, making it easy to see who did what and why, and at the same time making
it easy to discover reusable compositions of `setState`.

</details>



<details>
    <summary><strong>Why can't I directly modify the state?</strong></summary>

By having the freedom to change state from *anywhere* in the codebase, state can quickly get out of control and be
difficult to debug if there is no human-readable reasoning behind why a change was made.  
To ensure that the usage experience stays developer friendly, easy to debug, and help with identifying which code needs
refactoring, Diffx enforces the use of `setState` since it groups changes and allows the developer to specify a `reason`
for the changes.

_Any changes made to the state outside of `setState()` will throw an error._

```javascript
import { clickCounter } from './createState-example';

clickCounter.count++; // this will throw an error
```

</details>









### Watch state





`watchState(stateGetter, options)` is used for watching the state and being notified/reacting when it changes.

* `stateGetter` - a function which returns the state(s) to be watched
* `callback` - a callback that will be called the next time the watched state changes

`watchState` is useful when creating "background services" that watches the state and reacts when it changes.

```javascript
import { watchState } from '@diffx/core';
import { clickCounter } from './createState-example';

const unwatchFunc = watchState(
    () => clickCounter,
    (newValue, oldValue) => {
        console.log('counter changed to', newValue.count);
    }
);

// stop watching
unwatchFunc();
```








<details>
    <summary><strong>Using setState() inside watchState()</strong></summary>

A watcher is allowed to change the state when triggered.

```javascript
import { watchState, setState } from '@diffx/core';
import { clickCounter } from './createState-example';

watchState(
    () => clickCounter.count === 5,
    countIsFive => {
        if (!countIsFive) return;
        setState('Counter has the value 5, so I added another user', () => {
            usersState.names.push('Jenny');
        });
    }
);
```

This will also be tracked in the devtools and tagged with "watcher".  
![devtools watcher example](https://github.com/jbjorge/diffx/raw/master/assets/devtools/img_13.png)

The tag can be hovered/clicked for more information about its trigger origin.  
![devtools watcher hover example](https://github.com/jbjorge/diffx/raw/master/assets/devtools/img_14.png)

</details>




<details>
    <summary><strong>Watching projections</strong></summary>

```javascript
import { watchState } from '@diffx/core';
import { clickCounter } from './createState-example';

watchState(
    () => clickCounter.count > 5,
    isAboveFive => console.log(isAboveFive)
);
```

</details>



<details>
    <summary><strong>Watching multiple states</strong></summary>

```javascript
import { watchState } from '@diffx/core';
import { clickCounter, usersState } from './createState-example';

watchState(
    () => [clickCounter.count, usersState.names],
    ([clickCount, names]) => console.log(clickCount, names)
);
```

</details>




<details>
    <summary><strong>Controlling how state is watched</strong></summary>

To have fine-grained control over how the state is watched, the second argument can be an options object instead of a
callback.

```javascript
import { watchState } from '@diffx/core';
import { clickCounter } from './createState-example';

const unwatchFunc = watchState(() => clickCounter, {
    /**
     * Whether to emit the current value of the watched item(s).
     *
     * Default: `false`
     */
    emitInitialValue: false,
    /**
     * Callback called with the final state after the outermost `.setState` function has finished running.
     * This is the default behavior when using a callback instad of an options object.
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
    hasChangedComparer: (newValue, oldValue) => 'true or false',
    /**
     * Whether the watcher should automatically stop watching after the first changed value has
     * been emitted.
     *
     * Default: false
     */
    once: false
});

// stop watching
unwatchFunc();
```

</details>




### Destroy state

`destroyState(namespace)` is used for removing state from diffx.

* `namespace` - the namespace (string) to destroy

_Any watchers of the destroyed state will **not** be automatically unwatched_.

```javascript
import { destroyState } from '@diffx/core';

destroyState('click counter');
```








## Devtools browser extension

### Installation

The extension can be installed through
[the Chrome web store](https://chrome.google.com/webstore/detail/diffx-devtools/ecijpnkbdaghilfokgbcieakdfbibeec).

### Features

Diffx devtools is made to give insights into

* Why state was changed
* Which state was changed
* When did it change
* What caused the change

<details open><summary>Overview</summary>


It will show up as a tab in the browser devtools when it detects that the page is using Diffx and debugging has been
enabled [(see setDiffxOptions)](#configure-diffx).

![Devtools location](https://github.com/jbjorge/diffx/raw/master/assets/devtools-7.png)

The left pane displays a list of changes (diffs) to the state along with their `reason`.  
The right pane displays the `Diff`, `State` and `Stacktrace` (if stacktrace has been enabled
in [setDiffxOptions](#configure-diffx)).

</details>

<details><summary>Diff tab</summary>

Displays the difference between each change made by `setState()`.

![Diff tab preview](https://github.com/jbjorge/diffx/raw/master/assets/devtools-1.png)

</details>
<details><summary>State tab</summary>

Displays the current state at the selected diff.

![State tab preview](https://github.com/jbjorge/diffx/raw/master/assets/devtools-6.png)

</details>
<details><summary>Stacktrace tab</summary>

Displays the stack trace for the code that led to this state change.

![Stacktrace tab preview](https://github.com/jbjorge/diffx/raw/master/assets/devtools-5.png)

</details>
<details><summary>State namespace indicators</summary>

The dots in the left tab indicate which state was changed with their color, can be hovered to view the namespace and
clicked to filter the list by that state.

![State type hints](https://github.com/jbjorge/diffx/raw/master/assets/devtools-4.png)

</details>
<details><summary>Visualizing nested setState</summary>

For places where `setState()` has been used inside `setState()`, the left pane will display a nested view with colors
used for displaying nesting depth.

![Nested setState preview](https://github.com/jbjorge/diffx/raw/master/assets/devtools-2.png)

</details>
<details><summary>Tracing async setState</summary>

For async operations done with `setState()`, the left pane will display an `async` tag where the operation starts, and
a `resolve`/`reject`  tag where the async operation finished.  
These tags are highlighted with a color to make it easier to spot which operations belong together and are also
clickable to filter by.

![setState preview](https://github.com/jbjorge/diffx/raw/master/assets/devtools-3.png)

</details>
<details><summary>Tracing state changed in watchState</summary>

If a `watchState()` runs `setState()`, the left pane will display a `watcher` tag to indicate that the change was
triggered.

![watchState tracing preview 1](https://github.com/jbjorge/diffx/raw/master/assets/devtools-8.png)

The `watcher` tag can be hovered to see which state change triggered it and clicked to find the state change.

![watchState tracing preview 2](https://github.com/jbjorge/diffx/raw/master/assets/devtools-9.png)

To see where in the code the watcher was run, enable `includeStackTrace` in [setDiffxOptions](#setdiffxoptions) and open
the Stacktrace tab for the entry tagged with the `watcher`.

</details>
<details><summary>Highlight/filter changes to a specific value</summary>

The Highlight and Filter button can be used to find the state changes that affected a specific value.

![highlight/filter preview](https://github.com/jbjorge/diffx/raw/master/assets/devtools-10.png)

</details>

## Do I need a state management library?

A lot of projects start out with keeping state localized. When the project grows and requirements change, some of that
state usually gets refactored to become shared state. That might work well for a while, but as the project grows even
further, it can become a real mental burden to keep track of the current state and how it came to be. The author of the
code might not feel this way, but the next developer to join the project is almost guaranteed to have a hard time
keeping up with it. This is usually when developers will reach for a library to aid with state management.

If you foresee a project that will grow in size over time, and/or other developers will join, it might be a good idea to
use a well documented and inspectable way to manage state.

### Why Diffx?

There are **a lot** of great state management libraries out there.

* Some focus on a rigid structure, suitable for large teams that want predictable code patterns, often at the cost of
  writing a lot of boilerplate.
* Some provide the same ease of use as local state, often at the cost of having less context which might make it more
  difficult to debug.

Diffx tries to be the best of both worlds by

* making it easy to provide context/intent behind any changes, which in turn makes it easy to reason about how a
  specific state came to be. **It makes the state self-documenting.**
* compactness comparable to local state
* offloading the responsibility to stay in control over to the library/devtools

There are a heap of great choices out there, and the library you end up using will probably stay in your project for a
long time. Diffx is a tool - I recommend you to look into several of the popular ones before you decide which is the
best fit for your project.

## Credits and thanks

* Thanks to the team behind [Vue.js](https://vuejs.org/) for making a great framework and the `@vue/reactive` package
  this project depends on.
* Thanks to Benjamine, the creator of [jsondiffpatch](https://github.com/benjamine/jsondiffpatch) which this project
  uses for creating diffs.
* Thanks to all developers teaming together to share their creations with others
