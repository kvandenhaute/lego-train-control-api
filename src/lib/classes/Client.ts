import type { CallcenterMessage, ClientEvent } from '../../enums';
import type { Message } from '../../types';

import { EventEmitter } from 'events';
import { nanoid } from 'nanoid';

import logger from '../../logger';

export abstract class Client extends EventEmitter {
	readonly id: string;

	constructor() {
		super();

		this.id = nanoid(4);
	}

	abstract processCallcenterMessage(event: CallcenterMessage, value?: unknown): void;

	abstract processWebSocketMessage(message: Message): void;

	protected send<T>(event: ClientEvent, value: T): void {
		this.emit('message', {
			key: event,
			value
		});
	}

	protected logInfo(message: string): void {
		logger.info(`[ ${this.constructor.name} ][ ${this.id} ] ${message}`);
	}
}
