<script lang="ts">
import { computed, ComputedRef, defineComponent, ref, watchEffect } from 'vue';
import * as jsondiffpatch from "jsondiffpatch";
import { Delta } from "jsondiffpatch";
import jsonClone from "../utils/jsonClone";
import { DiffEntry } from '@diffx/core/dist/internals';
import { getStateAtPath } from '../utils/get-state-at-path';
import { currentState, diffs, getDiffByPath } from '../utils/diff-indexer';
import ObjectExplorer from './Object-Explorer.vue';
import { getObjectMap } from '../utils/get-object-map';

export default defineComponent({
	components: { ObjectExplorer },
	props: {
		selectedDiffPath: {
			type: String,
			default: ''
		}
	},
	setup(props, { emit }) {
		const selectedTab = ref('diff');

		const diffToShow: ComputedRef<DiffEntry | undefined> = computed(() => {
			return !props.selectedDiffPath
				? diffs.value[diffs.value.length - 1]
				: getDiffByPath(props.selectedDiffPath);
		});

		function formatDate(timestamp: number) {
			return new Date(timestamp).toLocaleString();
		}

		const diffEntries: ComputedRef<Delta[]> = computed(() => diffs.value.map(diffEntry => diffEntry.diff));

		const previousObjectState = ref({});

		watchEffect(async () => {
			if (!diffEntries.value.length) {
				return;
			}
			const previousDiffIndex = props.selectedDiffPath
				? parseInt(props.selectedDiffPath.split('.')[0]) - 1
				: diffEntries.value.length - 1;
			previousObjectState.value = getStateAtPath(previousDiffIndex.toString());
		});

		const currentStateMap = computed(() => getObjectMap(currentState.value));

		const formattedOutput = computed(() => {
			if (!diffToShow?.value?.diff && selectedTab.value === 'diff') {
				return 'No difference in state.'
			}
			const prevCopy = jsonClone(previousObjectState.value);
			return jsondiffpatch.formatters.html.format(diffToShow?.value?.diff || {}, prevCopy);
		});

		function onTrace(tracePath: string) {
			emit('traceValue', tracePath);
		}

		return { onTrace, diffs, diffToShow, formatDate, formattedOutput, selectedTab, currentStateMap };
	}
});
</script>

<template>
	<div class="diff-viewer-wrapper">
		<template v-if="diffToShow">
			<div class="diff-header">
				<div class="diff-timestamp">{{ formatDate(diffToShow?.timestamp) }}</div>
				<h2>{{ diffToShow?.reason }}</h2>
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
					v-if="diffToShow?.stackTrace"
					:class="{'diff-tab-selected': selectedTab === 'stackTrace'}"
					@click="selectedTab = 'stackTrace'"
				>
					Stacktrace
				</div>
			</div>
			<div class="diff-body">
				<div
					v-if="selectedTab === 'diff'"
					:class="{'diff-view': selectedTab === 'diff'}"
					v-html="formattedOutput"
					class="diff-viewer"
				></div>
				<div v-if="selectedTab === 'state'">
					<object-explorer
						:object-map="currentStateMap"
						@traceValue="onTrace"
						@highlightValue="$emit('highlightValue', $event)"
					/>
				</div>
				<div
					v-if="selectedTab === 'stackTrace'"
					style="white-space: pre"
				>
					{{ diffToShow?.stackTrace }}
				</div>
			</div>
		</template>
		<div
			v-else
			class="no-diff-selected"
		>
			<div v-if="diffs.length">No state selected</div>
			<div v-else>
				<div style="text-align: center">
					<div>No state recorded.</div>
					<div>To enable state tracking:</div>
				</div>
				<pre class="code">setDiffxOptions({ devtools: true });</pre>
			</div>
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

pre.code {
	padding: 10px;
	background-color: black;
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
	width: 100%;
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