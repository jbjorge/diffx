export default function getPersistenceKey(namespace: string) {
	return '__diffx__' + namespace;
}