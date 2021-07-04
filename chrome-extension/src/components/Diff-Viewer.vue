<script lang="ts">
import { computed, ComputedRef, defineComponent, PropType, ref, watchEffect } from 'vue';
import * as jsondiffpatch from "jsondiffpatch";
import { Delta } from "jsondiffpatch";
import jsonClone from "../utils/jsonClone";
import { DiffEntry } from '@diffx/core/dist/internals';
import { getStateSnapshot } from '../utils/diffx-bridge';
import { getStateAtPath } from '../utils/get-state-at-path';
import { getDiffAtPath } from '../utils/get-diff-at-path';

export default defineComponent({
	props: {
		diffList: {
			type: Array as PropType<DiffEntry[]>,
			default: (): DiffEntry[] => [] as DiffEntry[]
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
	setup(props) {
		const selectedTab = ref('diff');

		const diffToShow: ComputedRef<DiffEntry> = computed(() => {
			const rootIndex = props.selectedDiffPath[0];
			if (rootIndex == null) {
				return props.diffList[props.diffList.length - 1];
			}
			const rootDiff = props.diffList[rootIndex];
			return getDiffAtPath(rootDiff, props.selectedDiffPath.slice(1));
		})

		const diffToDisplay: ComputedRef<DiffEntry> = computed(() => {
			return props.diffList[props.selectedDiffIndex] || props.diffList[props.diffList.length - 1];
		});

		function formatDate(timestamp: number) {
			return new Date(timestamp).toLocaleString();
		}

		const diffs: ComputedRef<Delta[]> = computed(() => props.diffList.map(diffEntry => diffEntry.diff));

		const previousObjectState = ref({});

		watchEffect(async () => {
			const diffPath = props.selectedDiffPath ?? [diffs.value.length - 1];
			const stateSnapshot = await getStateSnapshot();
			previousObjectState.value = getStateAtPath(props.diffList, stateSnapshot, diffPath);
		})

		watchEffect(async () => {
			// const diffIndex = props.selectedDiffIndex ?? diffs.value.length - 1;

			// const reverseDiff = (diffIndex) > (diffs.value.length / 2);
			// const diffsClone = jsonClone(diffs.value);
			// const diffsToReplay: Delta[] = reverseDiff
			// 	? diffsClone.slice(diffIndex).reverse()
			// 	: diffsClone.slice(0, diffIndex);
			// if (reverseDiff) {
			// 	const stateSnapshot = await getStateSnapshot();
			// 	diffsToReplay.forEach((diff) => {
			// 		if (diff) {
			// 			jsondiffpatch.unpatch(stateSnapshot, diff)
			// 		}
			// 	});
			// 	previousObjectState.value = stateSnapshot;
			// } else {
			// 	const patched = {};
			// 	diffsToReplay.forEach((diff) => {
			// 		if (diff) {
			// 			jsondiffpatch.patch(patched, diff)
			// 		}
			// 	});
			// 	previousObjectState.value = patched;
			// }
		});

		const formattedOutput = computed(() => {
			if (!diffToShow.value.diff && selectedTab.value === 'diff') {
				return 'No change in state.'
			}
			const prevCopy = jsonClone(previousObjectState.value);
			return jsondiffpatch.formatters.html.format(diffToShow.value.diff || {}, prevCopy);
		});

		return { diffToShow, formatDate, formattedOutput, selectedTab };
	}
});
</script>

<template>
	<div class="diff-viewer-wrapper">
		<template v-if="diffToShow">
			<div class="diff-header">
				<div class="diff-timestamp">{{ formatDate(diffToShow.timestamp) }}</div>
				<h2>{{ diffToShow.reason }}</h2>
			</div>
			<div class="diff-tabs">
				<div
					:class="{'diff-tab-selected': selectedTab === 'diff'}"
					@click="selectedTab = 'diff'"
				>
					Diff
				</div>
				<div
					:class="{'diff-tab-selected': selectedTab === 'state'}"
					@click="selectedTab = 'state'"
				>
					State
				</div>
				<div
					v-if="diffToShow.stackTrace"
					:class="{'diff-tab-selected': selectedTab === 'stackTrace'}"
					@click="selectedTab = 'stackTrace'"
				>
					Stacktrace
				</div>
			</div>
			<div class="diff-body">
				<div
					v-if="selectedTab === 'diff' || selectedTab === 'state'"
					:class="{'diff-view': selectedTab === 'diff'}"
					v-html="formattedOutput"
					class="diff-viewer"
				></div>
				<div
					v-if="selectedTab === 'stackTrace'"
					style="white-space: pre"
				>
					{{ diffToShow.stackTrace }}
				</div>
			</div>
		</template>
		<div
			v-else
			class="no-diff-selected"
		>
			<div>No state selected</div>
		</div>
	</div>
</template>

<style lang="scss">
@import '../../node_modules/jsondiffpatch/dist/formatters-styles/html.css';

.diff-viewer-wrapper {
	width: 100%;
	height: 100vh;
	overflow-y: auto;
	display: flex;
	flex-direction: column;
	background-color: #29374a;

	& .jsondiffpatch-delta {
		color: white;

		& .jsondiffpatch-added .jsondiffpatch-property-name,
		& .jsondiffpatch-added .jsondiffpatch-value pre,
		& .jsondiffpatch-modified .jsondiffpatch-right-value pre,
		& .jsondiffpatch-textdiff-added {
			background-color: #347534;
		}

		& .jsondiffpatch-deleted .jsondiffpatch-property-name,
		& .jsondiffpatch-deleted pre,
		& .jsondiffpatch-modified .jsondiffpatch-left-value pre,
		& .jsondiffpatch-textdiff-deleted {
			background-color: #ec2d2d;
		}
	}

	& .jsondiffpatch-unchanged {
		color: white;
	}
}

.diff-header {
	background-color: #1c2634;
	display: block;
	color: whitesmoke;
}

.diff-view .jsondiffpatch-unchanged {
	display: none;
}

.diff-timestamp {
	font-size: 0.8rem;
	padding: 10px 0 0 10px;
}

.diff-header > h2 {
	margin: 0;
	padding: 5px 10px 15px 10px;
}

.diff-tabs {
	width: calc(100% - 10px);
	background-color: #1c2634;
	color: whitesmoke;
	display: flex;
	flex-direction: row;
	padding-left: 10px;
	cursor: pointer;

	& > div {
		padding: 10px;
		border: 1px solid #4f5465;
		border-radius: 3px;
		border-bottom: none;
		margin-right: 5px;

		&:hover {
			background-color: #2d3d53;
		}

		&.diff-tab-selected {
			background-color: #494d5c;
			border-color: whitesmoke;
		}
	}
}

.diff-body {
	padding: 20px;
	flex-grow: 1;
	overflow-y: auto;
	color: white;
}

.no-diff-selected {
	height: 100%;
	width: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
	background-color: #1c2634;
	color: whitesmoke;
}
</style>