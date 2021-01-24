<script lang="ts">
import Sidebar from './components/Sidebar.vue'
import DiffViewer from './components/Diff-Viewer.vue'
import { computed, nextTick, onMounted, onUnmounted, Ref, ref } from "vue";
import { createState, diffxInternals, setDiffxOptions, setState, watchState } from "diffx";
import { create, unpatch, patch } from "jsondiffpatch";
import Fuse, { default as FuzzySearch } from 'fuse.js';
import IFuseOptions = Fuse.IFuseOptions;

setDiffxOptions({
	debug: {
		devtools: true,
		includeStackTrace: true
	}
});

export default {
	name: 'App',
	components: { Sidebar, DiffViewer },
	setup() {
		const diffListRef = ref();
		const diffs: Ref<diffxInternals.DiffEntry[]> = ref([]);
		const selectedDiffIndex: Ref<number> = ref();
		const stateLocked = ref(false);

		diffxInternals.addDiffListener((diff, commit) => {
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
		});

		const filterText = ref('');
		const filteredDiffs = computed(() => {
			if (!filterText?.value?.trim()) { return diffs.value; }

			const options: IFuseOptions<any> = {
				findAllMatches: true,
				keys: ['reason'],
				shouldSort: true,
				threshold: 0.3
			};
			return new FuzzySearch(diffs.value, options)
				.search(filterText.value)
				.map(item => item.item);
		})

		const state = createState('myState', {
			counter: 0,
			name: ''
		})
		const state2 = createState('state2', {
			nameish: [] as string[]
		})
		const state3 = createState('state3', {
			posts: []
		});

		let interval = 0 as any;
		onMounted(() => {
			let intervalCounter = 0;
			interval = setInterval(() => {
				setState(`State change #${++intervalCounter}`, () => {
					state.counter++;
				})
			}, 1000);
		})

		onUnmounted(() => clearInterval(interval));

		let currentStateSnapshot = null;

		function onDiffSelected(index: number) {
			if (selectedDiffIndex.value === index || index === diffs.value.length - 1) {
				selectedDiffIndex.value = null;
				if (currentStateSnapshot) {
					diffxInternals.replaceState(currentStateSnapshot);
				}
				unpauseState();
			} else {
				selectedDiffIndex.value = index;
				pauseState();
				currentStateSnapshot = diffxInternals.getStateSnapshot();
				const stateAtIndex = getStateAtIndex(currentStateSnapshot, index);
				diffxInternals.replaceState(stateAtIndex);
			}
		}

		watchState(() => state.counter, (newValue) => console.log(newValue));

		function getStateAtIndex(currentState, index: number) {
			const operation = index <= (diffs.value.length / 2) ? 'patch' : 'unpatch';
			if (operation === 'patch') {
				const startValue = {};
				diffs.value.slice(0, index + 1).forEach(diffEntry => patch(startValue, diffEntry.diff));
				return startValue;
			}
			const startValue = currentState;
			const diffList = diffs.value.slice(index + 1).reverse();
			diffList.forEach(diffEntry => unpatch(startValue, diffEntry.diff));
			return startValue;
		}

		function pauseState() {
			diffxInternals.lockState();
			stateLocked.value = true;
		}

		function unpauseState() {
			diffxInternals.unlockState();
			stateLocked.value = false;
			selectedDiffIndex.value = null;
		}

		function onCommit() {
			diffxInternals.commit();
		}

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
			unpauseState
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
				<input
					type="text"
					class="filter-input"
					placeholder="Filter..."
					v-model="filterText"
				></div>
			<Sidebar
				ref="diffListRef"
				:diffList="filteredDiffs"
				:selected-diff-index="selectedDiffIndex"
				class="left-sidebar"
				@selectDiff="onDiffSelected"
				:style="{ width: sidebarWidth + 'px' }"
			/>
		</div>
		<div class="resize-bar" ref="resizeBarElement">
			<span class="dots">...</span>
		</div>
		<DiffViewer
			:diffList="diffs"
			:selected-diff-index="selectedDiffIndex"
		/>
	</div>
</template>

<style lang="scss">
@import './styles/flexbox.scss';
</style>

<style lang="scss" scoped>
* {
	box-sizing: border-box;
}
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

.filter-input {
	width: 100%;
	background-color: #2d3d53;
	font-size: 1rem;
	color: white;
	border: none;
	padding: 10px;
	height: 30px;
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
	height: calc(100vh - 80px);
	background-color: #1c2634;
}
</style>
