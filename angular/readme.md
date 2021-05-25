# @diffx/angular

Contains helpers for using `@diffx/rxjs` in an angular project.

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

## DiffxPipe

Due to limitations in angular change detection, when using the diffx browser devtools, the state of the application will not
update when selecting a diff.

To fix this, **templates should use the `diffx` pipe** instead of the `async` pipe.

```html
// example.component.html
// this works
<div>{{ time$ | diffx }}</div>

// this does not work
<div>{{ time$ | async }}</div>
```

[**But due to limitations in angular**](https://github.com/ng-packagr/ng-packagr/issues/1923#issuecomment-810467786), it's practically impossible to create a npm module for `@Pipe` of the type I'm using.

So instead of me spending weeks debugging and hacking angular, you're gonna have to do something you've done
a lot of times while browsing stackoverflow - copy the code below and paste it into your project.

```typescript
import {
	ChangeDetectorRef,
	NgZone,
	OnDestroy,
	Pipe,
	PipeTransform,
	Type,
	ɵstringify as stringify
} from '@angular/core';
import { Observable, OperatorFunction, Unsubscribable } from 'rxjs';

function invalidPipeArgumentError(type: Type<any>, value: any): Error {
	return Error(`InvalidPipeArgument: '${value}' for pipe '${stringify(type)}'`);
}

function runInZone<T>(zone: NgZone): OperatorFunction<T, T> {
	return (source) => {
		return new Observable(observer => {
			const onNext = (value: T) => zone.run(() => observer.next(value));
			const onError = (e: any) => zone.run(() => observer.error(e));
			const onComplete = () => zone.run(() => observer.complete());
			return source.subscribe(onNext, onError, onComplete);
		});
	};
}

@Pipe({ name: 'diffx', pure: false })
export class DiffxPipe implements OnDestroy, PipeTransform {
	private latestValue: any = null;
	private subscription: Unsubscribable | null = null;
	private obj: Observable<any> | null = null;

	constructor(private ref: ChangeDetectorRef, private zone: NgZone) {
	}

	transform<T>(obj: Observable<T>): T | null {
		if (!this.obj) {
			if (obj) {
				this._subscribe(obj);
			}
			return this.latestValue;
		}

		if (obj !== this.obj) {
			this._dispose();
			return this.transform(obj);
		}

		return this.latestValue;
	}

	ngOnDestroy(): void {
		if (this.subscription) {
			this._dispose();
		}
	}

	private _subscribe(obj: Observable<any>): void {
		this.obj = obj;
		this.subscription = obj
			.pipe(
				runInZone(this.zone)
			)
			.subscribe({
				next: (value) => this._updateLatestValue(obj, value),
				error: (e: any) => {
					throw e;
				}
			});
	}

	private _dispose(): void {
		this.subscription.unsubscribe();
		this.latestValue = null;
		this.subscription = null;
		this.obj = null;
	}

	private _updateLatestValue(async: any, value: any): void {
		if (async === this.obj) {
			this.latestValue = value;
			this.ref.markForCheck();
		}
	}
}
```