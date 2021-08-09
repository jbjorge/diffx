<script lang="ts">
import Sidebar from './components/Sidebar.vue'
import DiffViewer from './components/Diff-Viewer.vue'
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import Fuse, { default as FuzzySearch } from 'fuse.js';
import { DiffEntry } from '@diffx/core/dist/internals';
import diffxBridge from './utils/diffx-bridge';
import FilterInput from './components/Filter-Input.vue';
import { getStateAtPath } from './utils/get-state-at-path';
import { currentState, diffIdToPathMap, diffs, getDiffsByValuePath, latestState } from './utils/diff-indexer';
import { negotiateHighlightDiffs } from './utils/negotiate-highlight-diffs';
import { DecoratedDiffEntryType } from './utils/decorated-diff-entry-type';
import IFuseOptions = Fuse.IFuseOptions;

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
		const selectedDiffPath = ref('');
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

		function flattenWatcherIds(diff: DiffEntry): string[] {
			const value = [diff.id];
			if (diff.triggeredByDiffId) {
				value.push(diff.triggeredByDiffId);
			}
			if (!diff.subDiffEntries?.length) {
				return value;
			}
			const subWatcherIds = diff.subDiffEntries.reduce((subR, subDiff) => {
				return subR.concat(flattenWatcherIds(subDiff))
			}, [] as string[]);
			return value.concat(subWatcherIds);
		}

		const filteredDiffs = computed(() => {
			if (!filterText?.value?.trim()) {
				return diffs.value;
			}

			if (filterText.value.startsWith('@highlight:')) {
				const highlightedDiffIds = getDiffsByValuePath(filterText.value.substr('@highlight:'.length));
				return negotiateHighlightDiffs(diffs.value, highlightedDiffIds);
			}

			if (filterText.value.startsWith('@trace:')) {
				const tracedDiffIds = getDiffsByValuePath(filterText.value.substr('@trace:'.length))
				return diffs.value.filter(diff => tracedDiffIds.includes(diff.id));
			}

			if (filterText.value.startsWith('@namespace:')) {
				const diffNamespaces = getDiffsByValuePath(filterText.value.substr('@namespace:'.length));
				return diffs.value.filter(diff => diffNamespaces.includes(diff.id));
			}

			const decoratedDiffs: DecoratedDiffEntryType[] = diffs.value.map(diff => ({
				...diff,
				diffReasons: flattenReasons(diff),
				diffKeys: flattenDiffKeys(diff),
				asyncIds: flattenAsyncIds(diff),
				watcherIds: flattenWatcherIds(diff)
			}));
			const options: IFuseOptions<any> = {
				findAllMatches: true,
				keys: ['diffReasons', 'diffKeys', 'asyncIds', 'watcherIds'],
				shouldSort: false,
				threshold: 0.1
			};
			return new FuzzySearch(decoratedDiffs, options)
				.search(filterText.value)
				.map(item => item.item);
		})

		async function onDiffSelected(diff: DiffEntry) {
			// set the diff path or clear it
			const newDiffPath = diffIdToPathMap[diff.id];
			const isSameAsPrevious = !!(selectedDiffPath.value && selectedDiffPath.value === newDiffPath);
			// const isLastEntry = (parseInt(newDiffPath.split('.')[0]) === diffs.value.length - 1);
			if (isSameAsPrevious) {
				selectedDiffPath.value = '';
				await replaceState(latestState.value);
				await unpauseState();
			} else {
				await pauseState();
				selectedDiffPath.value = diffIdToPathMap[diff.id];
				const stateAtIndex = getStateAtPath(selectedDiffPath.value);
				await replaceState(stateAtIndex);
			}
			currentState.value = await getStateSnapshot();
		}

		async function pauseState() {
			await lockState();
			stateLocked.value = true;
		}

		async function unpauseState() {
			await unlockState();
			stateLocked.value = false;
			selectedDiffPath.value = '';
		}

		async function onCommit() {
			let count = selectedDiffPath.value.split('.')[0];
			if (count && parseInt(count)) {
				await unpauseState();
				await commit(parseInt(count) + 1);
			} else {
				await unpauseState();
				await commit();
			}
		}

		watch(
			() => diffs.value.length,
			() => {
				const diffListElement = diffListRef.value?.$el;
				const isScrolledToBottom = diffListElement && diffListElement.scrollHeight - diffListElement.scrollTop - diffListElement.clientHeight < 100;
				if (isScrolledToBottom) {
					nextTick(() => {
						diffListElement.scrollTo({ top: diffListElement.scrollHeight, behavior: 'smooth' });
					});
				}
			}
		)

		const resizeBarElement = ref();
		const sidebarWidth = ref(400);
		const resizeMouseDown = ref(false);
		onMounted(() => {
			document.addEventListener('mousedown', onResizeMouseDown);
			document.addEventListener('mousemove', onResizeMouseMove);
			document.addEventListener('mouseup', onResizeMouseUp);
		})

		onUnmounted(() => {
			document.removeEventListener('mousedown', onResizeMouseDown);
			document.removeEventListener('mousemove', onResizeMouseMove);
			document.removeEventListener('mouseup', onResizeMouseUp);
		})

		function onResizeMouseDown(evt: MouseEvent) {
			if (evt.target === resizeBarElement.value) {
				resizeMouseDown.value = true;
			}
		}

		function onResizeMouseMove(evt: MouseEvent) {
			if (resizeMouseDown.value && evt.clientX > 180 && evt.clientX < window.innerWidth - 20) {
				sidebarWidth.value = evt.clientX;
			}
		}

		function onResizeMouseUp(evt: MouseEvent) {
			resizeMouseDown.value = false;
		}

		function onTrace(tracePath: string) {
			filterText.value = '@trace:' + tracePath;
		}

		function onHighlightValuePath(tracePath: string) {
			filterText.value = '@highlight:' + tracePath;
		}

		return {
			diffListRef,
			diffs,
			stateLocked,
			filteredDiffs,
			onCommit,
			sidebarWidth,
			resizeBarElement,
			filterText,
			pauseState,
			unpauseState,
			onDiffSelected,
			selectedDiffPath,
			onTrace,
			onHighlightValuePath,
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
						title="Resume changes to the state"
					>
						<span>Resume</span>
					</button>
					<button
						v-else
						class="action-button"
						@click="pauseState"
						title="Pause changes to the state"
					>
						<span>Pause</span>
					</button>
					<button
						class="action-button"
						@click="onCommit"
						title="Merge all changes into one single diff. If a diff has been selected, it will merge the selected diff with previous ones"
					>
						<span>Merge</span>
					</button>
				</div>
				<FilterInput v-model="filterText" />
			</div>
			<Sidebar
				ref="diffListRef"
				:filteredDiffs="filteredDiffs"
				:selected-diff-path="selectedDiffPath"
				class="left-sidebar"
				@onDiffSelected="onDiffSelected"
				@setFilter="filterText = $event"
				:style="{ width: sidebarWidth + 'px' }"
			/>
		</div>
		<div class="resize-bar" ref="resizeBarElement">
			<span class="dots">...</span>
		</div>
		<DiffViewer
			:diffList="diffs"
			:selected-diff-path="selectedDiffPath"
			@traceValue="onTrace"
			@highlightValue="onHighlightValuePath"
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
		height: 40px;
		background-color: #2d3d53;
		color: whitesmoke;
		font-size: 1rem;

		&.paused {
			background-color: #6d5d17;
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
