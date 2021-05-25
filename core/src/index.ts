import { DiffxOptions, VueReactive } from './internal-state';
import internalState from './internal-state';
import * as Api from './api';

// export the internal functions
export * as DiffxInternals from './internals';

// export the setup function
export const setup = (vueReactive: VueReactive, diffxOptions: DiffxOptions): Api => {
	internalState.instanceOptions = diffxOptions;
	internalState.vueReactive = vueReactive;
	return Api;
}