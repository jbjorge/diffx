# @diffx/angular

Contains helpers for using `@diffx/rxjs` in an angular project.

## Make the `async` pipe work properly in .html files

```typescript
// example.component.ts
import { Component } from '@angular/core';
import { watchState } from '@diffx/rxjs';
import { state1 } from '../example-state';

@Component({
	selector: 'app-example',
	templateUrl: './example.component.html'
})
export class ExampleComponent {
	time$ = watchState(() => state1.currentTime);
}
```

Changes to the value of `time$` does not always trigger change detection
```html
// example.component.html
<div>{{ time$ | async }}</div>
```

### How to fix
Import the zone-patch-rxjs in your `polyfills.ts` file after your import of `zone`.
```typescript
import 'zone.js/dist/zone';  // Included with Angular CLI.
import 'zone.js/dist/zone-patch-rxjs'; // <---
```

## UseWatchers

If a component relies on a watcher being subscribed to, it can use the @UseWatchers decorator.

This should only be used for watchers that should be started when a component is created, but not stopped when it is
destroyed. **Due to limitations in angular**, there is no way for the decorator to know when a component is destroyed
or to hook into lifecycle events.

Given the example state:
```typescript
// example-state.ts
import { createState } from '@diffx/rxjs';

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
import { setState, watchState } from '@diffx/rxjs';

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
import { setState, watchState } from '@diffx/rxjs';
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