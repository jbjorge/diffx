# @diffx/angular <!-- replaceLine:Diffx -->

## Fix angular change detection and the `async` pipe <!-- prependSection:Usage -->

Angular has the concept of code running inside zones, and anything running outside a zone will not trigger change
detection.

To ensure observables returned from Diffx are run in the correct zone, import zone-patch-rxjs in your `polyfills.ts`
file after your import of `zone`.

```typescript
import 'zone.js/dist/zone';
import 'zone.js/dist/zone-patch-rxjs'; // <--- This thing right here
```

## Notice <!-- removeSection -->

### `watchState` <!-- replaceSection:`watchState` -->

`watchState(stateGetter, options)` is used for creating an observable of the state or a projection of the state.

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

### `@UseWatchers` <!-- append:Usage -->

`@UseWatchers(...watcher)` is used to automatically subscribe to a watcher when a component is instantiated. Accepts one
or more watchers as argument.

* `watcher` - an observable created with `watchState`.

This should only be used for watchers that should be started when a component is created, but not stopped when it is
destroyed. **Due to limitations in angular**, there is no way for the decorator to know when a component is destroyed or
to hook into lifecycle events.

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
