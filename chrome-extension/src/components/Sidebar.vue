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
		}
	},
	setup(props, { emit }) {
		function onClickedDiff(diff: DiffEntry, index: number) {
			if (!diff.isInitialState) {
				emit("selectDiff", (diff as any).realIndex || index);
			}
		}

		function onClickedStateName(stateName: string) {
			emit('filterByState', stateName);
		}

		function isSelected(diff: DiffEntry, index: number) {
			const i = (diff as any).realIndex || index;
			if (i === props.selectedDiffIndex) {
				return true;
			}
			if (!props.selectedDiffIndex && i === props.diffList.length - 1) {
				return true;
			}
			return false;
		}

		function isInactive(diff: DiffEntry, index: number) {
			const i = (diff as any).realIndex || index;
			return props.selectedDiffIndex != null && props.selectedDiffIndex !== -1 && (i > props.selectedDiffIndex);
		}

		function isDisabled(diff: DiffEntry) {
			return diff.isInitialState;
		}

		return { onClickedDiff, onClickedStateName, isSelected, isInactive, isDisabled };
	}
});
</script>

<template>
	<div class="diff-list">
		<SidebarEntry
			v-for="(diff, index) in diffList"
			:class="{
				'selected': isSelected(diff, index),
				'inactive': isInactive(diff, index),
				'disabled': isDisabled(diff)
			}"
			class="diff-entry"
			:diffEntry="diff"
			@click="onClickedDiff(diff, index)"
			@stateNameClicked="onClickedStateName"
		/>
	</div>
</template>

<style lang="scss" scoped>
.diff-list {
	height: 100%;
	overflow-y: scroll;
	width: 100%;
}

.diff-entry {
	padding: 10px 20px;
	background-color: #1c2634;
	color: whitesmoke;
	cursor: pointer;

	&:not(:last-child) {
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	&:hover {
		background-color: #2d3d53;
	}

	&.selected {
		background-color: #494d5c;
		box-shadow: inset 0px 0px 1px 1px white;
	}

	&.inactive {
		background-color: #4f5465;
		color: #888888;
	}

	&.disabled {
		opacity: 0.5;
		pointer-events: none;
	}
}
</style>
