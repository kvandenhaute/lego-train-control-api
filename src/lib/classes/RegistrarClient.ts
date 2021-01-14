import type {
	Database,
	Message,
	RegisteredTrain,
	RegisterTrainRequest,
	TrainEngine,
	TrainEngineResponse } from '../../types';
import type { TrainClient } from './TrainClient';

import low from 'lowdb';
import FileSync from 'lowdb/adapters/FileSync';
import { nanoid } from 'nanoid';

import { CallcenterMessage, ClientEvent, RegistrarEvent } from '../../enums';

import { Client } from './Client';

const adapter = new FileSync<Database>('database.json');
const db = low(adapter);

db.defaults({ trains: [] }).write();

export class RegistrarClient extends Client {
	protected trainEngines: Map<TrainClient['id'], TrainEngine>;

	constructor(trainEngines: Map<TrainClient['id'], TrainEngine>) {
		super();

		this.trainEngines = trainEngines;
	}

	processCallcenterMessage(event: CallcenterMessage, value?: unknown) {
		// todo
	}

	processWebSocketMessage(message: Message) {
		switch (message.key) {
			case ClientEvent.GET_TRAIN_ENGINES:
				this.sendTrainEngines();
				break;
			case ClientEvent.REGISTER_TRAIN:
				this.registerTrain(message.value as RegisterTrainRequest);
				break;
		}
	}

	private registerTrain(request: RegisterTrainRequest): void {
		const train: RegisteredTrain = {
			id: nanoid(8),
			name: request.name,
			locomotives: request.trainEngines.map(uuid => ({ uuid, position: 'forward' }))
		};

		db.get('trains').push(train).write();

		this.emit(RegistrarEvent.TRAIN_REGISTERED, train);
	}

	private sendTrainEngines(): void {
		const trainEngines: Array<TrainEngineResponse> = [];

		for (const [uuid, trainEngine] of this.trainEngines.entries()) {
			trainEngines.push({
				uuid,
				name: trainEngine.hub.name
			});
		}

		this.send(ClientEvent.TRAIN_ENGINES, trainEngines);
	}
}
