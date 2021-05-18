// import * as meh from 'diffx';
// import { DiffListenerCallback, DiffxOptions } from 'diffx/dist/utils/internal-state';
//
// let listenerId = 0;
// export function addDiffListener(cb: DiffListenerCallback, lazy?: boolean): number {
//
// };
//
// export function removeDiffListener(listenerId: number) {
//
// }
// function commit(): void;
// function replaceState(state: any): void;
// function lockState(): void;
// function unlockState(): void;
// function pauseState(): void;
// function unpauseState(): void;
//
// function getStateSnapshot(): any;
// function getDiffs(): DiffEntry[];
//
// const bridge = {};
//
// for (let key in meh) {
// 	bridge['__diffx__' + key] = function() {
// 		const event = new CustomEvent(key, { detail: Array.prototype.slice.call(arguments, 1) })
// 		const returnValue = new Promise((resolve, reject) => {
//
// 		})
// 		window.dispatchEvent(event);
// 	}
// }
//
// function emitEvent(name: string, id: number, ...args) {
// 	const event = new CustomEvent(name, { detail: args })
// 	window.dispatchEvent(event);
// }
//
// export default bridge;