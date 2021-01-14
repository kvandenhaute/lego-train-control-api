import type {
	Database,
	HubUUID,
	Message,
	RegisteredTrain,
	TrainEngine,
	TrainEngineResponse,
	TrainResponse } from '../../types';

import low from 'lowdb';
import FileSync from 'lowdb/adapters/FileSync';

import { CallcenterMessage, ClientEvent } from '../../enums';

import { Client } from './Client';

const adapter = new FileSync<Database>('database.json');
const db = low(adapter);

export class ControlCenterClient extends Client {
	protected databaseTrains: Array<RegisteredTrain>;

	protected trainEngines: Map<HubUUID, TrainEngine>;

	constructor(trainEngines: Map<HubUUID, TrainEngine>, trains: Array<RegisteredTrain>) {
		super();

		this.databaseTrains = trains;
		this.trainEngines = trainEngines;
	}

	private addTrainEngine(trainEngine: TrainEngine): void {
		this.trainEngines.set(trainEngine.hub.uuid, trainEngine);

		return this.sendTrainEngine(trainEngine);
	}

	processCallcenterMessage(event: CallcenterMessage, value?: unknown): void {
		switch (event) {
			case CallcenterMessage.TRAIN_ENGINE_ADDED:
				this.addTrainEngine(value as TrainEngine);
				break;
			case CallcenterMessage.TRAIN_REGISTERED:
				this.databaseTrains = value as Array<RegisteredTrain>;

				this.sendTrainEngines();
				this.sendTrains();
				break;
		}
	}

	processWebSocketMessage(message: Message) {
		switch (message.key) {
			case ClientEvent.GET_TRAINS:
				this.sendTrains();
				break;
			case ClientEvent.GET_TRAIN_ENGINES:
				this.sendTrainEngines();
				break;
		}
	}

	private sendTrains(): void {
		this.send<Array<TrainResponse>>(ClientEvent.TRAINS, db.get('trains').value());
	}

	private sendTrainEngines(): void {
		const usedHubs = this.databaseTrains
			.map(train => train.locomotives.map(hub => hub.uuid))
			.flat();

		const trainEngines: Array<TrainEngineResponse> = [];

		for (const [uuid, trainEngine] of this.trainEngines.entries()) {
			trainEngines.push({
				uuid,
				name: trainEngine.hub.name
			});
		}

		// console.log(trainEngines, usedHubs, trainEngines.filter(trainEngine => !usedHubs.includes(trainEngine.uuid)));

		this.send(ClientEvent.TRAIN_ENGINES, trainEngines.filter(trainEngine => !usedHubs.includes(trainEngine.uuid)));
	}

	private sendTrainEngine(trainEngine: TrainEngine): void {
		this.send<TrainEngineResponse>(ClientEvent.TRAIN_ENGINE_ADDED, {
			uuid: trainEngine.hub.uuid,
			name: trainEngine.hub.name
		});
	}
}
