import internalState from './internal-state';

export default function runDelayedEmitters() {
	const emitters = { ...internalState.delayedEmitters };

	internalState.delayedEmitters = {};

	for (const emitFunc in emitters) {
		emitters[emitFunc]();
	}
}