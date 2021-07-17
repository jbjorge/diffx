let backingStore: any = {};
export const mockStorage = {
	setItem(key: string, value: string) {
		backingStore[key] = value;
	},
	key(index: number): string | null {
		return backingStore[index];
	},
	length: backingStore.length,
	getItem(key: string): string | null {
		return backingStore[key];
	},
	removeItem(key: string) {
		delete backingStore[key];
	},
	clear() {
		backingStore = {};
	}
} as Storage;