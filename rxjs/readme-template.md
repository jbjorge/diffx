# @diffx/rxjs <!-- replaceLine:Diffx -->

## Notice <!-- removeSection -->

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
