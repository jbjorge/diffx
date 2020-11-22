<script lang="ts">
import { defineComponent, PropType } from 'vue';
import { diffxInternals } from 'diffx';
import DiffEntry = diffxInternals.DiffEntry;

export default defineComponent({
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
		function formatDate(timestamp: number) {
			const d = new Date(timestamp);
			return d.toLocaleTimeString();
		}

		function onClickedDiff(index: number) {
			emit("selectDiff", index);
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

		return { formatDate, onClickedDiff, isSelected };
	}
});
</script>

<template>
	<div class="diff-list">
		<div
			v-for="(diff, index) in diffList"
			class="diff-entry"
			:class="{'diff-entry-selected': isSelected(index)}"
			@click="onClickedDiff(index)"
		>
			<div class="diff-list-timestamp">{{ formatDate(diff.timestamp) }}</div>
			<div>{{ diff.reason || 'No reason for change provided' }}</div>
		</div>
	</div>
</template>

<style scoped>
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
}

.diff-entry:hover {
	background-color: #2d3d53;
}

.diff-entry-selected {
	background-color: #494d5c;
}

.diff-entry:not(:last-child) {
	border-bottom: 1px solid rgba(255,255,255,0.1);
}

.diff-list-timestamp {
	font-size: 0.8rem;
	padding: 2px 0;
}
</style>
