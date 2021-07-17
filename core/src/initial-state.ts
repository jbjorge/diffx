import internalState, { CreateStateOptions, PersistenceLocation } from './internal-state';
import { missingPersistenceLocation } from './console-messages';
import getPersistenceKey from './get-persistence-key';

export function getInitialState<T>(namespace: string, initialState: T, options: CreateStateOptions): [T, boolean, PersistenceLocation] {
	// check if persistent locally, if undefined, check globally
	const isPersistent = getPersistenceStatus(options);

	// resolve persistence location
	const persistenceLocation = options.persistenceLocation || internalState.instanceOptions.persistenceLocation;
	if (isPersistent && !persistenceLocation) {
		throw new Error(missingPersistenceLocation);
	}

	if (persistenceLocation && isPersistent === false) {
		// clean up previously persistent state
		persistenceLocation.removeItem(getPersistenceKey(namespace));
	}

	if (isPersistent && persistenceLocation) {
		const storedState = (isPersistent && JSON.parse(persistenceLocation.getItem(getPersistenceKey(namespace)) || '""'));

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

function getPersistenceStatus(options: CreateStateOptions) {
	if (options?.persistent) {
		return true;
	}
	if (options?.persistent === false) {
		return false;
	}
	return internalState.instanceOptions.persistent;
}