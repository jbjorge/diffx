<script lang="ts">
import { defineComponent, PropType } from 'vue';
import SidebarEntry from './Sidebar-Entry.vue';
import { DiffEntry } from '@diffx/rxjs/dist/internals';

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
			emit("selectDiff", (diff as any).realIndex || index);
		}

		function onClickedStateName(stateName: string) {
			emit('filterByState', stateName);
		}

		function isSelected(index: number) {
			if (index === props.selectedDiffIndex) {
				return true;
			}
			if (!props.selectedDiffIndex && index === props.diffList.length - 1) {
				return true;
			}
			return false;
		}

		function isInactive(index: number) {
			return props.selectedDiffIndex != null && props.selectedDiffIndex !== -1 && (index > props.selectedDiffIndex);
		}

		return { onClickedDiff, onClickedStateName, isSelected, isInactive };
	}
});
</script>

<template>
	<div class="diff-list">
		<SidebarEntry
			v-for="(diff, index) in diffList"
			:class="{'selected': isSelected(index), 'inactive': isInactive(index)}"
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
}
</style>
