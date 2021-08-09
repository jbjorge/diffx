import internalState, { DelayedEmitterMap } from './internal-state';

export function runSetStateDoneEmitters() {
	const emittersCopy = { ...internalState.setStateDoneEmitters };

	internalState.setStateDoneEmitters = {};

	for (const emitFunc in emittersCopy) {
		emittersCopy[emitFunc]();
	}
}

export function runEachSetStateEmitters() {
	const emittersCopy = { ...internalState.eachSetStateEmitters };

	internalState.eachSetStateEmitters = {};

	for (const emitFunc in emittersCopy) {
		emittersCopy[emitFunc]();
	}
}
