import internalState from './internal-state';

export default function runDelayedEmitters() {
	for (const emitFunc in internalState.delayedEmitters) {
		internalState.delayedEmitters[emitFunc]();
	}
	internalState.delayedEmitters = {};
}