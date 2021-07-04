export const missingOnDoneHandler = '[diffx] A promise was returned inside setState, but no onDone handler was provided.\nhttps://github.com/jbjorge/diffx/wiki/Errors-and-warnings-overview#core-10';
export const stateChangedWithoutSetState = '[diffx] State was changed outside of .setState().\nhttps://github.com/jbjorge/diffx/wiki/Errors-and-warnings-overview#core-11';
export const stateChangedInPromise = '[diffx] setState() returned a promise that changed the state after setState finished running.\nhttps://github.com/jbjorge/diffx/wiki/Errors-and-warnings-overview#core-12';
export const missingWatchCallbacks = '[diffx] No callback specified for watchState(_, Options). Options.onChanged and/or Options.onEachChange needs to be assigned a callback function.\nhttps://github.com/jbjorge/diffx/wiki/Errors-and-warnings-overview#core-13';
export const duplicateNamespace = namespace => `[diffx] The state "${namespace}" already exists.` +
	"\ncreateState() should only be called once per namespace." +
	"\nIf you meant to replace the state, use replaceState() instead." +
	"\nIf you are running in a development environment, use setDiffxOptions({ devtools: true })." +
	"\nhttps://github.com/jbjorge/diffx/wiki/Errors-and-warnings-overview#core-14";
export const replacingStateForNamespace = namespace => `[diffx] Replacing the state for "${namespace}".\nhttps://github.com/jbjorge/diffx/wiki/Errors-and-warnings-overview#core-15`;
export const missingReason = '[diffx] setState(reason, mutatorFunc) - reason must be a string.\nhttps://github.com/jbjorge/diffx/wiki/Errors-and-warnings-overview#core-16';
export const missingMutatorFunc = '[diffx] setState(reason, mutatorFunc) - mutatorFunc must be a function.\nhttps://github.com/jbjorge/diffx/wiki/Errors-and-warnings-overview#core-17';
export const pausedStateMessage = reason => `[diffx] State is paused, skipped processing of "${reason}".\nhttps://github.com/jbjorge/diffx/wiki/Errors-and-warnings-overview#core-18`;
export const missingOnErrorHandler = '[diffx] asyncMutatorFunc in setState(_, asyncMutatorFunc) returned a Promise that threw an error, but no error handler was provided to setState().\nhttps://github.com/jbjorge/diffx/wiki/Errors-and-warnings-overview#core-19\nThe error was:';