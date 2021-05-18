import { dateReviver } from "jsondiffpatch";

export default function clone<T>(obj: T): T {
	if (obj === undefined) {
		return;
	}
	return JSON.parse(JSON.stringify(obj), dateReviver);
}