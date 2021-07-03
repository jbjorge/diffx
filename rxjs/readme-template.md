# @diffx/rxjs <!-- replaceLine:Diffx -->

### Watch state for changes <!-- replaceSection:Watch state for changes -->
```javascript
const observable = watchState(() => state.meat);
```

### `setStateAsync` <!-- replaceSection:`setStateAsync` -->
`setStateAsync(reason, asyncMutatorFunc, onDone [, onError])` is used to make asynchronous changes
to the state (and enhances tracking of async state in Diffx devtools).

* `reason` - a string which explains why the state was changed. Will be displayed in the devtools extension for easier
  debugging.

* `asyncMutatorFunc` - a function that does async work (and returns an `Observable`).

* `onDone` - a function that receives the result of `asyncMutatorFunc` as an argument, and is free to change the state.

* `onError` - a function that receives the error from `asyncMutatorFunc` as an argument, and is free to change the
  state.

```javascript
import { createState, setState } from '@diffx/rxjs';
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

### `watchState` <!-- replaceSection:`watchState` -->

`watchState(stateGetter, options)` is used for creating an observable of the state or an observable projection of the state.

* `stateGetter` - a function which returns the state to be watched
* `options` - options object which describes how to watch the state

```javascript
import { watchState } from '@diffx/angular';
import { coolnessFactor, people } from './the-above-example';

const observable = watchState(() => people, {
	/**
	 * [Optional]
	 * Whether to emit the current value of the watched item(s).
	 *
	 * Default: false
	 */
	lazy: false,

	/**
	 * [Optional]
	 * Whether to emit each change to the state during `.setState` or
	 * to only emit the final state after the `.setState` function has finished running.
	 *
	 * Default: false
	 */
	emitIntermediateChanges: false,

	/**
	 * [Optional]
	 * Custom comparer function to decide if the state has changed.
	 * Receives newValue and oldValue as arguments and should return `true` for changed
	 * and `false` for no change.
	 *
	 * Default: Diffx does automatic change comparison
	 */
	hasChangedComparer: (newValue, oldValue) => 'true or false'
});

// stop watching
observable.unsubscribe();
```
