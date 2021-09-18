import { patch, unpatch } from 'jsondiffpatch';
import rootState from '../root-state';
import { createHistoryEntry } from '../createHistoryEntry';
import { runEachSetStateEmitters, runSetStateDoneEmitters } from '../delayedEmitters';
import { getStateSnapshot } from './getStateSnapshot';
import { internalState } from '../internal-state';

interface UndoRedoOptions {
	steps?: number;
}

export function undoState(options?: UndoRedoOptions) {
	const diffs = internalState.diffs.filter(diff => !diff.isGeneratedByDiffx && !internalState.undoList.includes(diff.id));
	if (diffs.length === 0) {
		// no more stuff to undo
		return;
	}
	internalState.redoEnabled = true;
	const steps = Math.min(diffs.length, options?.steps ?? 1);
	const diffsToUndo = diffs.slice(-steps);
	const newState = getStateSnapshot();
	diffsToUndo.reverse().forEach(diff => {
		unpatch(newState, diff.diff);
		internalState.undoList.push(diff.id);
	});

	internalState.isUndoingRedoing = true;
	for (let namespace in newState) {
		for (let propName in newState[namespace]) {
			rootState[namespace][propName] = newState[namespace][propName];
		}
	}
	createHistoryEntry(`@undo ${diffsToUndo.length} ${diffsToUndo.length === 1 ? 'diff' : 'diffs'}`, true);
	internalState.isUndoingRedoing = false;
	runEachSetStateEmitters();
	runSetStateDoneEmitters();
}

export function redoState(options?: UndoRedoOptions) {
	if (!internalState.redoEnabled || !internalState.undoList.length) return;
	const diffs = internalState.diffs.filter(diff => internalState.undoList.includes(diff.id));
	const steps = Math.min(diffs.length, options?.steps ?? 1);
	const diffsToRedo = diffs.slice(0, steps);
	const newState = getStateSnapshot();
	diffsToRedo.forEach(diff => {
		patch(newState, diff.diff);
		internalState.undoList.pop();
	});

	internalState.isUndoingRedoing = true;
	for (let namespace in newState) {
		for (let propName in newState[namespace]) {
			rootState[namespace][propName] = newState[namespace][propName];
		}
	}
	createHistoryEntry(`@redo ${diffsToRedo.length} ${diffsToRedo.length === 1 ? 'diff' : 'diffs'}`, true);
	internalState.isUndoingRedoing = false;
	runEachSetStateEmitters();
	runSetStateDoneEmitters();
}