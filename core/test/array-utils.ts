export function singleArrayItem<ArrayType>(array: ArrayType[]) {
	if (array.length > 1) {
		throw new Error('Array contained more than one element. ' + JSON.stringify(array));
	}
	if (array.length === 0) {
		throw new Error('Array was empty. ' + JSON.stringify(array));
	}
	return array[0];
}

export function firstArrayItem<ArrayType>(array: ArrayType[]) {
	if (array.length === 0) {
		throw new Error('Array was empty. ' + JSON.stringify(array));
	}
	return array[0];
}

export function lastArrayItem<ArrayType>(array: ArrayType[]) {
	if (array.length === 0) {
		throw new Error('Array was empty. ' + JSON.stringify(array));
	}
	return array[array.length - 1];
}