<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
	props: {
		modelValue: String
	},
	setup() {

	}
});
</script>

<template>
	<div class="filter-input-wrapper">
		<input
			type="text"
			class="filter-input"
			placeholder="Filter..."
			:value="modelValue"
			@input="$emit('update:modelValue', $event.target.value)"
		>
		<button
			v-show="modelValue"
			class="clear-button"
			@click="$emit('update:modelValue', '')"
		>
			X
		</button>
	</div>
</template>

<style lang="scss" scoped>
.filter-input-wrapper {
	width: 100%;
	position: relative;

	.clear-button {
		position: absolute;
		top: 9px;
		right: 10px;
		color: #212121;
		background-color: #c74242;
		box-shadow: none;
		border-radius: 5px;
	}

	.filter-input {
		width: 100%;
		background-color: #2d3d53;
		font-size: 1rem;
		color: white;
		border: none;
		padding: 5px 45px 5px 10px;
		height: 40px;
	}
}
</style>