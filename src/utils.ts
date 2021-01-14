export function isSet<T>(value: T | null | undefined): value is T {
	return typeof value !== 'undefined' && value !== null;
}
