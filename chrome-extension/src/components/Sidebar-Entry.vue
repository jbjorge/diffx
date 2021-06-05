<script lang="ts">
import { computed, defineComponent, PropType, reactive } from 'vue';
import randomColor from 'randomcolor';
import { DiffEntry } from '@diffx/core/dist/internals';

export default defineComponent({
	name: 'SidebarEntry',
	props: {
		diffEntry: {
			type: Object as PropType<DiffEntry>
		},
		nestingLevel: {
			type: Number,
			default: 0
		},
		selected: Boolean,
		inactive: Boolean,
		disabled: Boolean
	},
	setup(props) {
		const formattedDate = computed(() => {
			const d = new Date(props?.diffEntry?.timestamp || 0);
			const hours = d.getHours();
			const minutes = d.getMinutes();
			const seconds = d.getSeconds();
			const milliseconds = d.getMilliseconds();
			return `${hours}:${minutes}:${seconds}.${milliseconds}`;
		});
		const changedStateNames = computed(() => Object.keys((props.diffEntry as DiffEntry)?.diff || {}));
		const stateNameEntries = computed(() => {
			return changedStateNames.value.map(stateName => ({
				stateName,
				color: randomColor({
					seed: stateName,
					luminosity: 'light',
					alpha: 0.7,
					format: 'rgba'
				}) as string
			}));
		});
		const backgroundColor = computed(() => {
			return randomColor({
				seed: ((props.nestingLevel + 1) * 7).toString(),
				luminosity: 'dark',
				alpha: 0.5,
				format: 'rgba'
			})
		});

		const hoverPosition = reactive({ top: '0', left: '0' });

		function onColorHover(evt: MouseEvent) {
			hoverPosition.top = evt.clientY + 12 + 'px';
			hoverPosition.left = evt.clientX + 5 + 'px';
		}

		return { backgroundColor, formattedDate, stateNameEntries, onColorHover, hoverPosition };
	}
});
</script>

<template>
	<div>
		<div
			@click.stop="$emit('stateSelected', diffEntry)"
			class="diff-entry"
			:class="{ selected, inactive, disabled, nested: nestingLevel > 0 }"
		>
			<div class="flex row i-align-center">
				<div
					v-if="nestingLevel> 0"
					style="padding-right: 7px;"
				>
					⤷
				</div>
				<div class="grow">
					<div class="flex row c-justify-space-between i-align-center wrap">
						<div class="diff-list-timestamp">{{ formattedDate }}</div>
						<div
							class="flex row i-align-center wrap"
							:style="{ marginRight: nestingLevel !== 0 ? '5px' : '0px' }"
						>
							<div
								v-for="entry in stateNameEntries"
								:key="entry.stateName"
								:style="{backgroundColor: entry.color}"
								class="state-name-circle"
								@mouseover="onColorHover"
								@click.stop="$emit('stateNameClicked', entry.stateName)"
							>
								<div :style="hoverPosition">{{ entry.stateName }}</div>
							</div>
						</div>
					</div>
					<div>{{ diffEntry?.reason || 'No reason for change provided' }}</div>
				</div>
			</div>
		</div>

		<SidebarEntry
			v-for="subEntry in diffEntry?.subDiffEntries"
			:key="subEntry.id"
			:diffEntry="subEntry"
			:nestingLevel="nestingLevel + 1"
			:style="{borderLeft: `7px solid ${backgroundColor}`}"
			@stateNameClicked="$emit('stateNameClicked', $event)"
			@stateSelected="$emit('stateSelected', $event)"
		/>
	</div>
</template>

<style lang="scss" scoped>
.diff-entry {
	padding: 10px 20px;
	background-color: #1c2634;
	color: rgba(255,255,255,0.9);
	cursor: pointer;

	&.nested {
		padding-left: 10px;
	}

	&:hover {
		background-color: #2d3d53;
	}

	&.selected {
		background-color: rgba(255,255,255,0.08);
		animation: selectedGlow 5s infinite;
	}

	@keyframes selectedGlow {
		0% {
			box-shadow: inset 0 0 1px 1px rgba(47,222,137,0.5);
		}
		50% {
			box-shadow: inset 0 0 1px 1px rgba(47,222,137,.3);
		}
		100% {
			box-shadow: inset 0 0 1px 1px rgba(47,222,137,0.5);
		}
	}

	&.inactive {
		background-color: rgba(0,0,0,0.2);
		color: rgba(255,255,255,0.3);
	}

	&.disabled {
		opacity: 0.5;
		pointer-events: none;
	}
}

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