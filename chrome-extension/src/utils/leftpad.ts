export function leftpad(string: string, length: number, char = '0'): string {
	if (string.length < length) {
		return char + string;
	}
	return string.length >= length ? string : leftpad(string, length, char);
}