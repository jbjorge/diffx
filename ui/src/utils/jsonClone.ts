export default function jsonClone<T>(obj: T): T {
	return JSON.parse(JSON.stringify(obj));
}