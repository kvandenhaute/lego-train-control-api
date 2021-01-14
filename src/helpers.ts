import { Consts, Device, Hub } from 'node-poweredup';

export function connectToDeviceByType<T extends Device>(hub: Hub, type: Consts.DeviceType): Promise<T | null> {
	const { promiseOrTimeout, timeoutId } = promiseWithTimeout(hub.waitForDeviceByType(type));

	return promiseOrTimeout
		.then(device => device as T)
		.catch(() => null)
		.finally(() => clearTimeout(timeoutId));
}

export function promiseWithTimeout<T>(promise: Promise<T>, ms: number = 4000) {
	let timeoutId;

	const timeoutPromise = new Promise((_, reject) => {
		timeoutId = setTimeout(() => {
			reject(new Error(`Request timed out after ${ms}ms`));
		}, ms);
	});

	return {
		promiseOrTimeout: Promise.race([promise, timeoutPromise]),
		timeoutId
	};
}
