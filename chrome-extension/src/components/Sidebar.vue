<script lang="ts">
import { defineComponent, PropType } from 'vue';
import SidebarEntry from './Sidebar-Entry.vue';
import { DiffEntry } from '@diffx/core/dist/internals';

export default defineComponent({
	components: { SidebarEntry },
	props: {
		diffList: {
			type: Array as PropType<DiffEntry[]>,
			default: () => []
		},
		selectedDiffIndex: {
			type: Number,
			default: null
		},
		selectedDiffPath: {
			type: Array as PropType<number[]>,
			default: []
		}
	},
	setup(props, { emit }) {
		function onClickedDiff(diff: DiffEntry, index: number) {
			if (!diff.isInitialState) {
				emit("selectDiff", (diff as any).realIndex || index);
			}
		}

		function onClickedDiff2(path: number[], diff: DiffEntry, index: number) {
			if (!diff.isInitialState) {
				const realIndex = (diff as any).realIndex || index;
				emit('onDiffSelected', [realIndex].concat(path.slice(1)));
			}
		}

		function setFilter(stateName: string) {
			emit('setFilter', stateName);
		}

		function isSelected(diff: DiffEntry, index: number) {
			const i = (diff as any).realIndex || index;
			if (i === props.selectedDiffPath[0]) {
				return true;
			}
			if (!props.selectedDiffPath.length && i === props.diffList.length - 1) {
				return true;
			}
			return false;
		}

		function isInactive(diff: DiffEntry, index: number) {
			const i = (diff as any).realIndex || index;
			return !!(props.selectedDiffPath.length && i > props.selectedDiffPath[0]);
		}

		function isDisabled(diff: DiffEntry) {
			return diff.isInitialState;
		}

		return { onClickedDiff, onClickedDiff2, setFilter, isSelected, isInactive, isDisabled };
	}
});
</script>

<template>
	<div class="diff-list">
		<SidebarEntry
			v-for="(diff, index) in diffList"
			class="diff-entry-list-item"
			:selected="isSelected(diff, index)"
			:inactive="isInactive(diff, index)"
			:disabled="isDisabled(diff)"
			:diffEntry="diff"
			:path="[index]"
			@stateSelected="onClickedDiff($event, index)"
			@setFilter="setFilter"
			@stateClicked="onClickedDiff2($event, diff, index)"
		/>
	</div>
</template>

<style lang="scss" scoped>
.diff-list {
	height: 100%;
	overflow-y: scroll;
	width: 100%;
}

.diff-entry-list-item {
	&:not(:last-child) {
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}
	&:last-child {
		margin-bottom: 10px;
	}
}
</style>
