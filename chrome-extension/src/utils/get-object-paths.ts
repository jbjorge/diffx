export function getObjectPaths(obj: object): string[] {
	const paths = rKeys(obj);
	return paths.toString().split(",")
}

function rKeys(o: any, path = ""): any {
	if (!o || (Array.isArray(o) && !o.length) || typeof o !== "object") {
		return path;
	}
	const k = Object.keys(o)
		.map(key => {
			const x = path ? [path, key].join(".") : key;
			return rKeys(o[key], x);
		})
	return k;
}
