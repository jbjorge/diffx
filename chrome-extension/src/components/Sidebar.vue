<script lang="ts">
import { defineComponent, PropType } from 'vue';
import SidebarEntry from './Sidebar-Entry.vue';
import { DiffEntry } from '@diffx/core/dist/internals';
import { getDiffByPath } from '../utils/diff-indexer';

export default defineComponent({
	components: { SidebarEntry },
	props: {
		filteredDiffs: {
			type: Array as PropType<DiffEntry[]>,
			default: () => []
		},
		selectedDiffIndex: {
			type: Number,
			default: null
		},
		selectedDiffPath: String
	},
	setup(props, { emit }) {
		function onClickedDiff(diff: DiffEntry) {
			if (!diff.isGeneratedByDiffx) {
				emit('onDiffSelected', diff);
			}
		}

		function setFilter(stateName: string) {
			emit('setFilter', stateName);
		}

		return { onClickedDiff, setFilter };
	}
});
</script>

<template>
	<div class="diff-list">
		<SidebarEntry
			v-for="(diff, index) in filteredDiffs"
			class="diff-entry-list-item"
			:diffEntry="diff"
			:path="[index]"
			@setFilter="setFilter"
			@stateClicked="onClickedDiff($event)"
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
