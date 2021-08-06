<script lang="ts">
import { computed, defineComponent, PropType, ref } from 'vue';
import { ObjectMap } from '../utils/get-object-map';
import randomColor from 'randomcolor';

const expandedIds = ref([]);

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
	setup(props) {
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

		return { isExpanded, toggleExpand, levelColor, isString, isValue, isExpandable, levelMargin };
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
				class="flex row obj-info gutter-5 is-hoverable"
			>
				<div
					v-if="isExpandable(entry)"
					class="not-selectable"
					:class="{ 'is-collapsed': !isExpanded(entry) }"
				>
					▼
				</div>
				<div
					:style="{ marginLeft: !isExpandable(entry) ? '20px' : ''}"
				>
					<span :style="{color: levelColor}">
						{{ entry.key }}
					</span>:
					<span
						v-if="isExpanded(entry)"
					>
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
			<object-explorer
				v-if="isExpanded(entry)"
				style="margin-left: 10px"
				:object-map="entry.children"
				:level="level + 1"
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
.not-selectable {
	user-select: none;
}
.key-list {
	cursor: pointer;

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

.is-hoverable:hover{
	background-color: rgb(73 73 73 / 53%);
}

.is-collapsed {
	transform: rotate(-90deg);
}

.is-hidden {
	visibility: hidden;
}
</style>