<script lang="ts">
import Sidebar from './components/Sidebar.vue'
import DiffViewer from './components/Diff-Viewer.vue'
import { nextTick, onMounted, Ref, ref } from "vue";
import { addDiffListener, commit, createState, DiffEntry, setState, stateOptions } from "stategate";

export default {
	name: 'App',
	components: { Sidebar, DiffViewer },
	setup() {
		const diffListRef = ref();
		const diffs: Ref<DiffEntry[]> = ref([]);
		const selectedDiffIndex: Ref<number> = ref();

		addDiffListener((diff, commit) => {
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

		stateOptions.debug = true;
		stateOptions.stackTrace = true;
		const state = createState('myState', {
			counter: 0,
			name: ''
		})
		const state2 = createState('state2', {
			nameish: [] as string[]
		})

		onMounted(() => {
			for (let i = 0; i < 50; i++) {
				setState('becuse resons' + i, () => {
					state.counter++;
				})
			}
			setInterval(() => {
				setState('becus' + Date.now(), () => {
					state.counter++;
					state.name = Math.random().toString();
					// state2.nameish = Math.random().toString();
				})
			}, 1000/3)

			setInterval(() => {
				setState('More seldom some long ass string shiiiim' + Date.now(), () => {
					state2.nameish.push(Math.random().toString());			
				})
			}, 1000)
		})

		function onDiffSelected(index: number) {
			if (selectedDiffIndex.value === index) {
				selectedDiffIndex.value = null;
			} else {
				selectedDiffIndex.value = index;
			}
		}

		function onCommit() {
			commit();
		}

		return { diffListRef, diffs, onDiffSelected, selectedDiffIndex, onCommit }
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
			/>
		</div>
		<DiffViewer
			:diffList="diffs"
			:selected-diff-index="selectedDiffIndex"
		/>
	</div>
</template>

<style scoped lang="scss">
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

.left-sidebar {
	height: calc(100vh - 50px);
	background-color: #1c2634;
}
</style>
