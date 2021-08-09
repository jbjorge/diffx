<script lang="ts">
import { computed, defineComponent, PropType, Ref, ref } from 'vue';
import { ObjectMap } from '../utils/get-object-map';
import randomColor from 'randomcolor';

const expandedIds: Ref<string[]> = ref([]);

export default defineComponent({
	name: 'object-explorer',
	props: {
		objectMap: {
			type: Object as PropType<ObjectMap[]>,
			default: () => []
		},
		level: {
			type: Number as PropType<number>,
			default: 0
		}
	},
	setup(props, { emit }) {
		const hoveredEntryId = ref('');
		const levelColor = computed(() => {
			return randomColor({
				seed: (props.level * 2).toString()
			})
		})

		const levelMargin = computed(() => {
			if (props.level === 0) {
				return '';
			}
			return (props.level * 10) + 'px';
		})

		function toggleExpand(entry: ObjectMap) {
			if (!isExpandable(entry)) {
				return;
			}
			const index = expandedIds.value.findIndex(x => x === entry.id);
			if (index === -1) {
				expandedIds.value.push(entry.id);
			} else {
				expandedIds.value.splice(index, 1);
			}
		}

		function isString(entry: ObjectMap) {
			return entry.type === 'string';
		}

		function isValue(entry: ObjectMap) {
			return !isString(entry) && !isExpandable(entry);
		}

		function isExpanded(entry: ObjectMap) {
			return expandedIds.value.includes(entry.id);
		}

		function isExpandable(entry: ObjectMap) {
			return entry.children.length;
		}

		function onTrace(entry: string, child = '') {
			let path = entry;
			if (child) {
				path += '.' + child;
			}
			emit('traceValue', path);
		}

		function onHighlight(entry: string, child = '') {
			let path = entry;
			if (child) {
				path += '.' + child;
			}
			emit('highlightValue', path);
		}

		return { onHighlight, hoveredEntryId, onTrace, isExpanded, toggleExpand, levelColor, isString, isValue, isExpandable, levelMargin };
	}
});
</script>

<template>
	<div>
		<div
			v-for="entry in objectMap"
			:key="entry.id"
			class="key-list"
			@click.stop="toggleExpand(entry)"
		>
			<div
				:style="{ marginLeft: levelMargin }"
				class="flex row gutter-20 obj-info is-hoverable"
				@mouseenter="hoveredEntryId = entry.id;"
				@mouseleave="hoveredEntryId = '';"
			>
				<div
					class="flex row gutter-5"
					:class="{ pointer: !isValue(entry) && !isString(entry)}"
				>
					<div
						v-if="isExpandable(entry)"
						class="not-selectable"
						:class="{ 'is-collapsed': !isExpanded(entry) }"
					>
						▼
					</div>
					<div :style="{ marginLeft: !isExpandable(entry) ? '20px' : ''}">
				<span :style="{color: levelColor}">
					{{ entry.key }}
				</span>:
						<span v-if="isExpanded(entry)">
					{{ entry.type === 'array' ? '[' : '{' }}
				</span>
						<span
							v-else
							:class="{ 'is-string': isString(entry), 'is-value': isValue(entry) }"
						>
							{{ isString(entry) ? `"${entry.value}"` : entry.value }}
						</span>
					</div>
				</div>
				<div class="flex row wrap gutter-10">
					<button
						v-show="hoveredEntryId === entry.id"
						@click.stop="onHighlight(entry.key)"
						class="traceValue-button not-selectable"
						title="Highlight diffs in the left sidebar that affected this value"
					>
						Highlight
					</button>
					<button
						v-show="hoveredEntryId === entry.id"
						@click.stop="onTrace(entry.key)"
						class="traceValue-button not-selectable"
						title="Filter diffs in the left sidebar that affected this value"
					>
						Filter
					</button>
				</div>
			</div>
			<object-explorer
				v-if="isExpanded(entry)"
				style="margin-left: 10px"
				:object-map="entry.children"
				:level="level + 1"
				@traceValue="onTrace(entry.key, $event)"
				@highlightValue="onHighlight(entry.key, $event)"
			/>
			<span
				v-if="isExpanded(entry)"
				:style="{ marginLeft: (level * 10) + 10 + 'px' }"
			>
				{{ entry.type === 'array' ? ']' : '}' }}
			</span>
		</div>
	</div>
</template>

<style lang="scss" scoped>
.traceValue-button {
	color: whitesmoke;
	background-color: transparent;
	border: none;
	box-shadow: 0 0 1px 1px rgba(255,255,255,0.3);
	cursor: pointer;
	padding: 0 5px;

	&:hover {
		background-color: rgba(0,0,0,0.2);
	}
}

.not-selectable {
	user-select: none;
}

.pointer {
	cursor: pointer;
}

.key-list {
	font-size: 1rem;

	& > .obj-info {
		padding-bottom: 5px;
		padding-top: 5px;
	}

	.key {
		color: #87e886;
	}

	.is-string {
		color: #ffc905;
	}

	.is-value {
		color: #ff8a8a;
	}
}

.is-hoverable:hover {
	background-color: rgb(73 73 73 / 53%);
}

.is-collapsed {
	transform: rotate(-90deg);
}

.is-hidden {
	visibility: hidden;
}
</style>