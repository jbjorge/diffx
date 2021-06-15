import internalState, { CreateStateOptions, PersistenceLocation } from './internal-state';

export function getInitialState<T>(namespace: string, initialState: T, options: CreateStateOptions): [T, boolean, PersistenceLocation] {
	// check if persistent locally, if undefined, check globally
	const isPersistent = options?.persistent === false ? false : internalState.instanceOptions.persistent;

	// resolve persistence location
	const persistenceLocation = options.persistenceLocation || internalState.instanceOptions.persistenceLocation;

	if (persistenceLocation && isPersistent === false) {
		// clean up previously persistent state
		persistenceLocation.removeItem('__diffx__' + namespace);
	}

	if (isPersistent && persistenceLocation) {
		const storedState = (isPersistent && JSON.parse(persistenceLocation.getItem('__diffx__' + namespace) || '""'));

		if (storedState) {
			// Only load props present in the initialState into the hydrated state.
			// This prevents localStorage from becoming bloated with state that no longer exists.
			const hydratedInitialState = {} as T;
			for (const propName in initialState) {
				hydratedInitialState[propName] = storedState[propName] ?? initialState[propName];
			}
			return [hydratedInitialState, isPersistent, persistenceLocation];
		}
	}

	return [initialState, isPersistent, persistenceLocation];
}