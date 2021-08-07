import { createId } from './create-id';

export interface ObjectMap {
	id: string,
	key: string,
	value: string,
	type: 'string' | 'boolean' | 'number' | 'array' | 'object',
	children: ObjectMap[]
}

export function getObjectMap(obj: any): ObjectMap[] {
	return Object.keys(obj)
		.map(key => {
			const value = obj[key];
			return {
				id: createId(),
				key,
				value: getValueString(value),
				type: getType(value),
				children: hasChildren(value) ? getObjectMap(value) : []
			} as ObjectMap;
		});
}

function getValueString(value: any) {
	const type = getType(value);
	if (type === 'string' || type === 'boolean' || type === 'number') {
		return value;
	}
	if (type === 'array') {
		return `Array[${value.length}]`;
	}
	return `Object{${Object.keys(value).length}}`;
}

function getType(value: any) {
	if (typeof value === 'string') {
		return 'string';
	}
	if (typeof value === 'boolean') {
		return 'boolean';
	}
	if (typeof value === 'number') {
		return 'number';
	}
	if (Array.isArray(value)) {
		return 'array';
	}
	return 'object';
}

function hasChildren(value: any) {
	const type = getType(value);
	return type === 'array' || type === 'object';
}