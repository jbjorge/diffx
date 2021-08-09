<!-- replaceLine:# Diffx -->
# @diffx/angular
<!-- end -->

<!-- prependSection:## Usage -->

## Setup

### Fix angular change detection and the `async` pipe
Angular has the concept of code running inside zones, and anything running outside a zone will not trigger change
detection.

To ensure observables returned from Diffx are run in the correct zone, import zone-patch-rxjs in your `polyfills.ts`
file after your import of `zone`.

```javascript
import 'zone.js/dist/zone';
import 'zone.js/dist/zone-patch-rxjs'; // <--- This thing right here
```

<!-- end -->

<!-- replaceSection:### watchState() -->

### watchState()

`watchState(stateGetter)` is used for watching the state and being notified/reacting when it changes.

* `stateGetter` - a function which returns the state(s) to be watched

`watchState` is useful when creating "background services" that watches the state and reacts when it changes.

```javascript
import { watchState } from '@diffx/rxjs';
import { clickCounter } from './createState-example-above';

watchState(() => clickCounter.count); // --> observable
```

<details>
    <summary><strong>watchState in-depth documentation</strong></summary>

```javascript
import { watchState } from '@diffx/rxjs';
import { clickCounter } from './createState-example-above';

const observable = watchState(() => clickCounter.count, {
    /**
     * Whether to start with emitting the current value of the watched item(s).
     *
     * Default: `false`
     */
    emitInitialValue: true / false,
    /**
     * Whether to emit each change to the state during .setState (eachValueUpdate),
     * the current state after each .setState and .setState nested within it (eachSetState),
     * or to only emit the final state after the outer .setState function has finished running (setStateDone).
     *
     * Default: `setStateDone`
     */
    emitOn: 'eachSetState' | 'setStateDone' | 'eachValueUpdate',
    /**
     * Custom comparer function to decide if the state has changed.
     * Receives newValue and oldValue as arguments and should return `true` for changed
     * and `false` for no change.
     *
     * Default: Diffx built in comparer
     */
    hasChangedComparer: (newValue, oldValue) => true / false
});
```

The `watchState()` function can also watch projections of state or multiple states

Projection of state:

```javascript
import { watchState } from '@diffx/core';
import { clickCounter } from './createState-example-above';

watchState(() => clickCounter.count > 5)
  .subscribe(isGreaterThanFive => {
  	console.log(isGreaterThanFive); // --> true/false
  });
```

Multiple states (which is actually just a projection of state):

```javascript
import { watchState } from '@diffx/core';
import { clickCounter, users } from './createState-in-depth-docs';

watchState(() => [clickCounter.count, users.names])
  .subscribe(([count, names]) => {
  	console.log(count) // --> number
  });
```

If a watcher changes state, this will also be tracked in the devtools:

```javascript
import { watchState, setState } from '@diffx/core';
import { clickCounter, users } from './createState-in-depth-docs';

watchState(() => clickCounter.count)
    .pipe(
    	filter(count => count === 5),
        take(1)
    )
    .subscribe(countIsFive => {
        if (!countIsFive) return;
        setState('counter has the value 5, so I added another user', () => {
            users.names.push('Jenny');
        });
    });
```

</details>

<!-- end -->

<!-- replaceSection:### Async setState() -->
### Async setState()

`setState(reason, asyncMutatorFunc, onDone [, onError])` is used to make asynchronous changes to the state (and enhances
tracking of async state in Diffx devtools).

* `reason` - a string which explains why the state was changed. Will be displayed in the devtools extension for easier
  debugging.
* `asyncMutatorFunc` - a function that is free to change the state, and returns a rxjs `Observable`.
* `onDone` - a function that receives the result of `asyncMutatorFunc` as an argument, and is free to change the state.
* `onError` - a function that receives the error from `asyncMutatorFunc` as an argument, and is free to change the
  state.

```javascript
import { createState, setState } from '@diffx/core';
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

</details>

<!-- end -->

<!-- append:## Usage -->

### @UseWatchers()

`@UseWatchers(...watcher)` is a decorator that can be used to automatically subscribe to a watcher when a component is instantiated. Accepts one
or more watchers as argument.

* `watcher` - an observable created with `watchState`.

This should only be used for watchers that should be started when a component is created, but not stopped when it is
destroyed. **Due to limitations in angular**, there is no way for the decorator to know when a component is destroyed or
to hook into lifecycle events.

<details>
    <summary><strong>Example usage</strong></summary>

Given the example state:

```typescript
// example-state.ts
import { createState } from '@diffx/angular';

export const state1 = createState('state1', {
    currentTime: Date.now(),
    timerRunning: false
});
```

And the example watcher:

```typescript
// example-watcher.ts
import { state1 } from '../example-state.ts';
import { share } from 'rxjs/operators';
import { setState, watchState } from '@diffx/angular';

let interval;

export default watchState(() => state1.timerRunning, { lazy: true })
    .pipe(
        tap(timerRunning => {
            if (timerRunning) {
                startTimer();
            } else {
                clearInterval(interval);
            }
        }),
        // it's a good idea to use share() to avoid multiple subscriptions
        // in case multiple components use the same watcher
        share()
    );

function startTimer(): void {
    interval = setInterval(() => {
        setState('Watcher: Update time', () => {
            state1.currentTime = Date.now();
        });
    }, 1000);
}
```

It can be used in a component like so:

```typescript
// example.component.ts
import { Component } from '@angular/core';
import { setState, watchState } from '@diffx/angular';
import { UseWatchers } from '@diffx/angular';
import { state1 } from '../example-state';
import timeWatcher from '../example-watcher.ts';

@UseWatchers(timeWatcher) // <-- this thing right here
@Component({
    selector: 'app-example',
    templateUrl: './example.component.html'
})
export class ExampleComponent {
    time$ = watchState(() => state1.currentTime);

    btnClick() {
        setState('User toggled timer', () => {
            state1.timerRunning = !state1.timerRunning;
        })
    }
}
```
</details>

<!-- end -->
