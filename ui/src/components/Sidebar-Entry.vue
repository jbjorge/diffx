<script lang="ts">
import { computed, defineComponent, PropType, reactive } from 'vue';
import randomColor from 'randomcolor';
import { DiffEntry } from '@diffx/rxjs/dist/internals';

export default defineComponent({
	props: {
		diffEntry: {
			type: Object as PropType<DiffEntry>
		}
	},
	setup(props) {
		const formattedDate = computed(() => (new Date(props?.diffEntry?.timestamp || 0).toLocaleTimeString()));
		const changedStateNames = computed(() => Object.keys((props.diffEntry as DiffEntry)?.diff || {}));
		const stateNameEntries = computed(() => {
			return changedStateNames.value.map(stateName => ({
				stateName,
				color: randomColor({
					seed: stateName,
					luminosity: 'light',
					alpha: 0.6,
					format: 'rgba'
				}) as string
			}));
		});

		const hoverPosition = reactive({ top: '0', left: '0' });

		function onColorHover(evt: MouseEvent) {
			hoverPosition.top = evt.clientY + 12 + 'px';
			hoverPosition.left = evt.clientX + 5 + 'px';
		}

		return { formattedDate, stateNameEntries, onColorHover, hoverPosition };
	}
});
</script>

<template>
	<div>
		<div class="flex row c-justify-space-between i-align-center wrap">
			<div class="diff-list-timestamp">{{ formattedDate }}</div>
			<div class="flex row i-align-center">
				<div
					v-for="entry in stateNameEntries"
					:style="{backgroundColor: entry.color}"
					class="state-name-circle"
					@mouseover="onColorHover"
				>
					<div :style="hoverPosition">{{ entry.stateName }}</div>
				</div>
			</div>
		</div>
		<div>{{ diffEntry?.reason || 'No reason for change provided' }}</div>
	</div>
</template>

<style lang="scss" scoped>
.state-name-circle {
	width: 10px;
	height: 10px;
	border-radius: 50%;

	&:nth-child(even) {
		margin: 0 5px;
	}

	&:last-child {
		margin-right: 0;
	}

	& > * {
		display: none;
	}

	&:hover {
		& > * {
			position: absolute;
			background-color: black;
			display: block;
			padding: 10px;
			border-radius: 4px;
		}
	}
}

.diff-list-timestamp {
	font-size: 0.8rem;
	padding: 2px 0;
}
</style>