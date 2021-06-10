import { ɵComponentDef, ɵComponentType } from '@angular/core';
import { Observable } from 'rxjs';

interface ComponentDef<T> extends ɵComponentDef<T> {
	factory: FactoryFn<T>;
	onDestroy: (() => void) | null;
}

type FactoryFn<T> = {
	<U extends T>(t: ComponentType<U>): U;
	(t?: undefined): T;
};

type ComponentType<T> = ɵComponentType<T>;

/**
 * Diffx component decorator will subscribe to watchers while the component is in use
 * and automatically unsubscribe when the component is destroyed.
 *
 * Since multiple instances of a component can be rendered, it is wise to use
 * ```
 * .pipe(
 * 		share()
 * )
 * ```
 * for the watchers that are passed to this decorator.
 *
 * @param watchers The watchers that will be subscribed to during the lifetime of this component
 */
export function UseWatchers(...watchers: Observable<any>[]): any {
	return (cmpType: ComponentType<any>) => {
		let watches = watchers.map(watcher => watcher.subscribe());
		const cmp: ComponentDef<typeof cmpType> = getComponentProp(cmpType, 'ɵcmp');
		const cmpOndestroy: (() => void) | null = cmp.onDestroy;

		cmp.onDestroy = function () {
			watches.forEach(watch => watch.unsubscribe());
			watches = [];
			if (cmpOndestroy !== null) {
				cmpOndestroy.apply(this);
			}
		};
	};
}

function getComponentProp<T, K extends keyof T>(t: ComponentType<T>, key: string): T[K] {
	if (t.hasOwnProperty(key)) {
		return t[key];
	}

	throw new Error('No Angular property found for ' + t.name);
}
