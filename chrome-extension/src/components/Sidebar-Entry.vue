<script lang="ts">
import { computed, ComputedRef, defineComponent, PropType, reactive } from 'vue';
import randomColor from 'randomcolor';
import { DiffEntry } from '@diffx/core/dist/internals';
import { leftpad } from '../utils/leftpad';
import { diffIdToPathMap, getDiffById, getDiffByPath } from '../utils/diff-indexer';

export default defineComponent({
	name: 'SidebarEntry',
	props: {
		diffEntry: {
			type: Object as PropType<DiffEntry>,
			required: true
		},
		nestingLevel: {
			type: Number,
			default: 0
		},
		selectedDiffPath: {
			type: String,
			default: ''
		}
	},
	setup(props) {
		const isSelected = computed(() => {
			if (!props.selectedDiffPath) {
				return false;
			}
			return getDiffByPath(props.selectedDiffPath).id === props.diffEntry.id;
		})
		const isInactive = computed(() => {
			if (!props.selectedDiffPath) {
				return false;
			}
			const dp = diffIdToPathMap[props.diffEntry.id];
			if (dp === props.selectedDiffPath) {
				return false;
			}
			const diffPath = dp
				.split('.')
				.map(fragment => parseInt(fragment));
			const selectedPathFragments = props.selectedDiffPath
				.split('.')
				.map(fragment => parseInt(fragment));
			for (let i = 0; i < diffPath.length; i++) {
				const currentDiffIndex = diffPath[i];
				const selectedPathIndex = selectedPathFragments[i];
				if (currentDiffIndex === selectedPathIndex) {
					continue;
				}
				if (currentDiffIndex == null && selectedPathIndex != null) {
					return false;
				}
				if (currentDiffIndex != null && selectedPathIndex == null) {
					return false;
				}
				if (currentDiffIndex < selectedPathIndex) {
					return false;
				}
				if (currentDiffIndex > selectedPathIndex) {
					return true;
				}
			}
		})
		const isDisabled = computed(() => !!props.diffEntry.isGeneratedByDiffx);
		const isHighlightedByTrace = computed(() => props.diffEntry.isHighlightedByTrace);

		const formattedDate = computed(() => {
			const d = new Date(props?.diffEntry?.timestamp || 0);
			const hours = leftpad(d.getHours().toString(), 2);
			const minutes = leftpad(d.getMinutes().toString(), 2);
			const seconds = leftpad(d.getSeconds().toString(), 2);
			const milliseconds = leftpad(d.getMilliseconds().toString(), 3);
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

		const triggerReason: ComputedRef<string> = computed(() => {
			return props.diffEntry.triggeredByDiffId ? `A change in "${getDiffById(props.diffEntry.triggeredByDiffId).reason}" triggered a watchState that made this change.` : '';
		})

		const hoverPosition = reactive({ top: '0', left: '0' });

		function onColorHover(evt: MouseEvent) {
			hoverPosition.top = evt.clientY + 12 + 'px';
			hoverPosition.left = evt.clientX + 5 + 'px';
		}

		function getColorFromString(seed: string) {
			return randomColor({
				seed,
				luminosity: 'dark',
				alpha: 0.5,
				format: 'rgba'
			})
		}

		return {
			backgroundColor,
			formattedDate,
			stateNameEntries,
			onColorHover,
			hoverPosition,
			getColorFromString,
			triggerReason,
			isDisabled,
			isInactive,
			isSelected,
			isHighlightedByTrace
		};
	}
});
</script>

<template>
	<div>
		<div
			@click.stop="$emit('stateClicked', diffEntry)"
			class="diff-entry"
			:class="{ isHighlightedByTrace, selected: isSelected, inactive: isInactive, disabled: isDisabled, nested: nestingLevel > 0 }"
			:style="{
				boxShadow: nestingLevel > 0 && isSelected ? 'inset 0 0 1px 1px rgba(47, 222, 137, 0.05)' : '',
				animation: nestingLevel > 0 && isSelected ? 'none' : ''
			}"
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
						<div class="flex row gutter-10">
							<div class="diff-list-timestamp">{{ formattedDate }}</div>
							<div
								v-if="triggerReason"
								class="tag watcher"
								:title="triggerReason"
								@click.stop="$emit('setFilter', diffEntry.triggeredByDiffId)"
							>
								watcher
							</div>
							<div
								v-if="diffEntry?.asyncOrigin"
								title="View async result"
								class="flex row"
								@click.stop="$emit('setFilter', diffEntry?.asyncOrigin)"
							>
								<div
									class="async-result tag-start"
									:style="{ backgroundColor: getColorFromString(diffEntry?.asyncOrigin) }"
								>
									async
								</div>
								<div
									class="async-result tag-end"
									:class="[diffEntry.asyncRejected ? 'async-rejected' : 'async-resolved']"
								>
									{{ diffEntry.asyncRejected ? 'reject' : 'resolve' }}
								</div>
							</div>
							<div
								v-if="diffEntry?.async"
								class="tag async-start"
								:style="{ backgroundColor: getColorFromString(diffEntry?.id) }"
								title="View async result"
								@click.stop="$emit('setFilter', diffEntry?.id)"
							>
								async
							</div>
						</div>
						<!-- State color button -->
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
								@click.stop="$emit('setFilter', entry.stateName)"
							>
								<div :style="hoverPosition">
									{{ entry.stateName }}
								</div>
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
			:selected-diff-path="selectedDiffPath"
			:style="{borderLeft: `7px solid ${backgroundColor}`}"
			@setFilter="$emit('setFilter', $event)"
			@stateClicked="$emit('stateClicked', $event)"
		/>
	</div>
</template>

<style lang="scss" scoped>
.diff-entry {
	padding: 10px 20px;
	background-color: #1c2634;
	color: rgba(255, 255, 255, 0.9);
	cursor: pointer;

	&.isHighlightedByTrace {
		box-shadow: inset 0 0 3px 0px rgb(249 255 0 / 48%);
		background-color: rgb(255 255 0 / 10%);
	}

	&.nested {
		padding-left: 10px;
		padding-right: 15px;
	}

	&:hover {
		background-color: #2d3d53;
	}

	&.selected {
		background-color: rgba(255, 255, 255, 0.08);
		animation: selectedGlow 5s infinite;
	}

	@keyframes selectedGlow {
		0% {
			box-shadow: inset 0 0 1px 1px rgba(47, 222, 137, 0.5);
		}
		50% {
			box-shadow: inset 0 0 1px 1px rgba(47, 222, 137, .3);
		}
		100% {
			box-shadow: inset 0 0 1px 1px rgba(47, 222, 137, 0.5);
		}
	}

	&.inactive {
		background-color: rgba(0, 0, 0, 0.2);
		color: rgba(255, 255, 255, 0.3);
	}

	&.disabled {
		opacity: 0.5;
	}

	& .async-result {
		border-radius: 10px;
		padding: 1px 7px 0 7px;
		font-size: 0.8rem;
		border: 1px solid rgba(255,255,255,0.09);

		&.tag-start {
			border-bottom-right-radius: 0;
			border-top-right-radius: 0;
			padding-right: 5px;
		}
		&.tag-end {
			border-bottom-left-radius: 0;
			border-top-left-radius: 0;
			padding-left: 5px;
			border-left: 1px solid rgba(255,255,255,0.55);

			&.async-rejected {
				background-color: rgba(255, 0, 0, 0.4);
			}
			&.async-resolved {
				background-color: rgba(0, 255, 0, 0.3);
			}
		}
	}

	& .tag {
		border-radius: 10px;
		padding: 1px 7px 0 7px;
		font-size: 0.8rem;
		border: 1px solid rgba(255,255,255,0.09);

		&:hover {
			opacity: 0.85;
		}

		&.watcher {
			border: 1px solid rgb(255 255 255 / 25%);
		}
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