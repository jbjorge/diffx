export function createId(length = 20, alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'): string {
	let result = [];
	let charactersLength = alphabet.length;
	for (var i = 0; i < length; i++) {
		result.push(alphabet.charAt(Math.floor(Math.random() * charactersLength)));
	}
	return result.join('');
}