import type { Message, RegisteredTrain } from '../../types';
import type { Locomotive } from './Locomotive';

import { Consts } from 'node-poweredup';

import { CallcenterMessage, ClientEvent, TrainClientCallcenterRequest, TrainClientStatus, TrainEvent } from '../../enums';
import { isSet } from '../../utils';

import { Client } from './Client';

export class TrainClient extends Client {
	private train?: RegisteredTrain;

	private locomotives: Array<Locomotive> = [];

	processCallcenterMessage(event: CallcenterMessage, value?: unknown) {
		this.logInfo(`Incoming callcenter event ${event}`);

		switch (event) {
			case CallcenterMessage.LOCOMOTIVE_ADDED:
				this.processLocomotive(value as Locomotive);
				this.sendStatusUpdate();
				break;
			case CallcenterMessage.LOCOMOTIVES:
				this.processLocomotives(value as Map<Locomotive['id'], Locomotive>);
				this.sendStatusUpdate();
				break;
		}
	}

	processWebSocketMessage(message: Message) {
		switch (message.key) {
			case TrainEvent.LINK:
				this.linkRegisteredTrain(message.value as RegisteredTrain);
				break;
			case TrainEvent.START:
				this.startTrain();
				break;
			case TrainEvent.STOP:
				this.stopTrain();
				break;
		}
	}

	private isReady(): boolean {
		return isSet(this.train) && this.train.locomotives.length === this.locomotives.length;
	}

	private processLocomotives(locomotives: Map<Locomotive['id'], Locomotive>): void {
		if (this.isReady()) {
			return;
		}

		locomotives.forEach(this.processLocomotive.bind(this));
	}

	private sendStatusUpdate(): void {
		if (this.isReady()) {
			this.send(ClientEvent.STATUS_UPDATE, TrainClientStatus.READY);
		} else {
			this.send(ClientEvent.STATUS_UPDATE, TrainClientStatus.WAITING_FOR_LOCOMOTIVES);
		}
	}

	private processLocomotive(locomotive: Locomotive): void {
		if (!this.train) {
			this.logInfo('No train linked yet');
			return;
		}

		const isItForMe = this.train.locomotives.map(l => l.uuid)
			.includes(locomotive.id);

		if (!isItForMe) {
			return;
		}

		locomotive.setLinked(Consts.Color.YELLOW);

		this.locomotives.push(locomotive);
	}

	private linkRegisteredTrain(train: RegisteredTrain): void {
		this.train = train;

		this.emit(TrainClientCallcenterRequest.GET_LOCOMOTIVES);
	}

	private startTrain() {
		if (!this.isReady()) {
			return Promise.reject('Train not ready');
		}

		return Promise.all(this.locomotives.map(locomotive => {
			return locomotive.start();
		}));
	}

	private stopTrain() {
		if (!this.isReady()) {
			return Promise.reject('Train not ready');
		}

		return Promise.all(this.locomotives.map(locomotive => {
			return locomotive.stop();
		}));
	}
}
