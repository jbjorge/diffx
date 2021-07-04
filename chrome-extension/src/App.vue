<script lang="ts">
import Sidebar from './components/Sidebar.vue'
import DiffViewer from './components/Diff-Viewer.vue'
import { computed, nextTick, onMounted, onUnmounted, Ref, ref } from "vue";
import { patch, unpatch } from "jsondiffpatch";
import Fuse, { default as FuzzySearch } from 'fuse.js';
import { Delta, DiffEntry } from '@diffx/core/dist/internals';
import IFuseOptions = Fuse.IFuseOptions;
import diffxBridge, { removeDiffListener } from './utils/diffx-bridge';
import jsonClone from './utils/jsonClone';
import FilterInput from './components/Filter-Input.vue';
import { getStateAtPath } from './utils/get-state-at-path';

const {
	addDiffListener,
	commit,
	getStateSnapshot,
	lockState,
	replaceState,
	unlockState
} = diffxBridge;

export default {
	name: 'App',
	components: { FilterInput, Sidebar, DiffViewer },
	setup() {
		const diffListRef = ref();
		const diffs: Ref<DiffEntry[]> = ref([]);
		const selectedDiffIndex: Ref<number> = ref(-1);
		const selectedDiffPath: Ref<number[]> = ref([]);
		const stateLocked = ref(false);

		const filterText = ref('');

		function flattenDiffKeys(diff: DiffEntry): string[] {
			const keys = Object.keys(diff.diff || {});
			if (!diff.subDiffEntries?.length) {
				return keys;
			}
			const subkeys = diff.subDiffEntries.reduce((sub, subk) => {
				return sub.concat(flattenDiffKeys(subk))
			}, [] as string[]);
			return keys.concat(subkeys);
		}

		function flattenReasons(diff: DiffEntry): string[] {
			const value = [diff.reason];
			if (!diff.subDiffEntries?.length) {
				return value;
			}
			const subReasons = diff.subDiffEntries.reduce((subR, subDiff) => {
				return subR.concat(flattenReasons(subDiff))
			}, [] as string[]);
			return value.concat(subReasons);
		}

		function flattenAsyncIds(diff: DiffEntry): string[] {
			const value = [diff.id];
			if (diff.asyncOrigin) {
				value.push(diff.asyncOrigin);
			}
			if (!diff.subDiffEntries?.length) {
				return value;
			}
			const subAsyncIds = diff.subDiffEntries.reduce((subR, subDiff) => {
				return subR.concat(flattenAsyncIds(subDiff))
			}, [] as string[]);
			return value.concat(subAsyncIds);
		}

		const filteredDiffs = computed(() => {
			if (!filterText?.value?.trim()) {
				return diffs.value;
			}

			const decoratedDiffs = diffs.value.map((diff, i) => ({
				...diff,
				diffReasons: flattenReasons(diff),
				diffKeys: flattenDiffKeys(diff),
				asyncIds: flattenAsyncIds(diff),
				realIndex: i
			}));
			const options: IFuseOptions<any> = {
				findAllMatches: true,
				keys: ['diffReasons', 'diffKeys', 'asyncIds'],
				shouldSort: false,
				threshold: 0.1
			};
			return new FuzzySearch(decoratedDiffs, options)
				.search(filterText.value)
				.map(item => item.item);
		})

		let latestStateSnapshot: any = null;
		async function onDiffSelected(index: number) {
			// if (selectedDiffIndex.value === index || index === diffs.value.length - 1) {
			// 	selectedDiffIndex.value = -1;
			// 	if (latestStateSnapshot) {
			// 		await replaceState(latestStateSnapshot);
			// 		latestStateSnapshot = null;
			// 	}
			// 	await unpauseState();
			// } else {
			// 	selectedDiffIndex.value = index;
			// 	await pauseState();
			// 	const currentStateSnapshot = await getStateSnapshot();
			// 	if (!latestStateSnapshot) {
			// 		latestStateSnapshot = jsonClone(currentStateSnapshot);
			// 	}
			// 	const stateAtIndex = getStateAtIndex(currentStateSnapshot, index);
			// 	await replaceState(stateAtIndex);
			// }
		}

		async function onDiffSelected2(path: number[]) {
			if (selectedDiffPath.value.join('.') === path.join('.')) {
				selectedDiffPath.value = [];
				if (latestStateSnapshot) {
					await replaceState(latestStateSnapshot);
					latestStateSnapshot = null;
				}
				await unpauseState();
			} else {
				selectedDiffPath.value = path;
				await pauseState();
				const currentStateSnapshot = await getStateSnapshot();
				if (!latestStateSnapshot) {
					latestStateSnapshot = jsonClone(currentStateSnapshot);
				}
				const stateAtIndex = getStateAtPath(diffs.value, currentStateSnapshot, path);
				await replaceState(stateAtIndex);
			}
		}

		function getStateAtIndex(currentState: any, index: number) {
			const operation = index <= (diffs.value.length / 2) ? 'patch' : 'unpatch';
			if (operation === 'patch') {
				const startValue = {};
				diffs.value.slice(0, index + 1).forEach(diffEntry => patch(startValue, diffEntry.diff));
				return startValue;
			}
			const startValue = jsonClone(currentState);
			const diffList = diffs.value.slice(index + 1).reverse();
			diffList.forEach(diffEntry => unpatch(startValue, diffEntry.diff));
			return startValue;
		}

		async function pauseState() {
			await lockState();
			stateLocked.value = true;
		}

		async function unpauseState() {
			await unlockState();
			stateLocked.value = false;
			selectedDiffIndex.value = -1;
		}

		async function onCommit() {
			await commit();
		}

		function onNewDiff({ data }: { data: any }) {
			if (!data || data.type !== 'diffx_diff') {
				return;
			}
			const { diff, commit } = data;
			const diffListElement = diffListRef.value?.$el;
			const isScrolledToBottom = diffListElement && diffListElement.scrollHeight - diffListElement.scrollTop - diffListElement.clientHeight < 100;
			if (commit) {
				diffs.value = [diff];
			} else {
				diffs.value.push(diff);
			}
			if (isScrolledToBottom) {
				nextTick(() => {
					diffListElement.scrollTo({ top: diffListElement.scrollHeight, behavior: 'smooth' });
				});
			}
		}

		const resizeBarElement = ref();
		const sidebarWidth = ref(400);
		const resizeMouseDown = ref(false);
		onMounted(() => {
			document.addEventListener('mousedown', onResizeMouseDown);
			document.addEventListener('mousemove', onResizeMouseMove);
			document.addEventListener('mouseup', onResizeMouseUp);
			window.addEventListener('message', onNewDiff);
		})

		onUnmounted(() => {
			document.removeEventListener('mousedown', onResizeMouseDown);
			document.removeEventListener('mousemove', onResizeMouseMove);
			document.removeEventListener('mouseup', onResizeMouseUp);

			window.removeEventListener('message', onNewDiff);
		})

		function onResizeMouseDown(evt: MouseEvent) {
			if (evt.target === resizeBarElement.value) {
				resizeMouseDown.value = true;
			}
		}

		function onResizeMouseMove(evt: MouseEvent) {
			if (resizeMouseDown.value) {
				sidebarWidth.value = evt.clientX;
			}
		}

		function onResizeMouseUp(evt: MouseEvent) {
			resizeMouseDown.value = false;
		}

		return {
			diffListRef,
			diffs,
			stateLocked,
			onDiffSelected,
			filteredDiffs,
			selectedDiffIndex,
			onCommit,
			sidebarWidth,
			resizeBarElement,
			filterText,
			pauseState,
			unpauseState,
			onDiffSelected2,
			selectedDiffPath
		}
	}
}
</script>

<template>
	<div class="layout">
		<div class="sidebar-wrapper">
			<div>
				<div class="flex row">
					<button
						v-if="stateLocked"
						class="action-button paused"
						@click="unpauseState"
					>
						<span>Resume</span>
					</button>
					<button
						v-else
						class="action-button"
						@click="pauseState"
					>
						<span>Pause</span>
					</button>
					<button
						class="action-button"
						@click="onCommit"
					>
						<span>Commit</span>
					</button>
				</div>
				<FilterInput v-model="filterText"/>
			</div>
			<Sidebar
				ref="diffListRef"
				:diffList="filteredDiffs"
				:selected-diff-index="selectedDiffIndex"
				:selected-diff-path="selectedDiffPath"
				class="left-sidebar"
				@selectDiff="onDiffSelected"
				@onDiffSelected="onDiffSelected2"
				@setFilter="filterText = $event"
				:style="{ width: sidebarWidth + 'px' }"
			/>
		</div>
		<div class="resize-bar" ref="resizeBarElement">
			<span class="dots">...</span>
		</div>
		<DiffViewer
			:diffList="diffs"
			:selected-diff-index="selectedDiffIndex"
			:selected-diff-path="selectedDiffPath"
		/>
	</div>
</template>

<style lang="scss">
@import './styles/flexbox.scss';
</style>

<style lang="scss" scoped>
.layout {
	display: flex;
	flex-direction: row;
}

.sidebar-wrapper {
	.action-button {
		width: 50%;
		height: 50px;
		background-color: #2d3d53;
		color: whitesmoke;
		font-size: 1rem;

		&.paused {
			background-color: #4f5465;
		}
	}
}

.resize-bar {
	width: 8px;
	height: 100vh;
	background-color: #1c2634;
	display: flex;
	justify-content: center;
	align-items: center;
	cursor: col-resize;
	user-select: none;

	& > .dots {
		writing-mode: vertical-lr;
		text-orientation: upright;
		color: white;
		pointer-events: none;
	}
}

.left-sidebar {
	height: calc(100vh - 90px);
	background-color: #1c2634;
}
</style>
