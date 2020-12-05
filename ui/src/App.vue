<script lang="ts">
import Sidebar from './components/Sidebar.vue'
import DiffViewer from './components/Diff-Viewer.vue'
import { computed, nextTick, onMounted, onUnmounted, Ref, ref } from "vue";
import { createState, diffxInternals, setDiffxOptions, setState } from "diffx";
import { create } from "jsondiffpatch";

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
			for (let i = 0; i < 50; i++) {
				setState('becuse resons' + i, () => {
					state.counter++;
				})
			}
			fetch('https://jsonplaceholder.typicode.com/todos')
				.then(response => response.json())
				.then(json => {
					let i = 0;
					interval = setInterval(() => {
						if (i > 199) {
							clearInterval(interval);
							return;
						}
						setState(json[i].title, () => {
							state3.posts.push(json[i]);
							if (i%2) {
								state2.nameish.push(json[i].title);
							}
							if (i%3) {
								state.counter++;
							}
						})
						i++;
					}, 1000);
				})
		})

		onUnmounted(() => clearInterval(interval));

		function onDiffSelected(index: number) {
			if (selectedDiffIndex.value === index || index === diffs.value.length - 1) {
				selectedDiffIndex.value = null;
				diffxInternals.unlockState();
			} else {
				selectedDiffIndex.value = index;
				diffxInternals.lockState();
			}
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
			onDiffSelected,
			selectedDiffIndex,
			onCommit,
			sidebarWidth,
			resizeBarElement
		}
	}
}
</script>

<template>
	<div class="layout">
		<div class="sidebar-wrapper">
			<button
				class="commit-button"
				@click="onCommit"
			>
				<span>Commit</span>
			</button>
			<Sidebar
				ref="diffListRef"
				:diffList="diffs"
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
.layout {
	display: flex;
	flex-direction: row;
}

.sidebar-wrapper {
	.commit-button {
		width: 100%;
		height: 50px;
		background-color: #2d3d53;
		color: whitesmoke;
		font-size: 1rem;
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
	height: calc(100vh - 50px);
	background-color: #1c2634;
}
</style>
