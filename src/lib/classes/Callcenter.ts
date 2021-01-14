import type { Hub, HubLED, TrainMotor } from 'node-poweredup';
import type { Database, HubUUID, RegisteredTrain, TrainEngine, UpdateTrainRequest } from '../../types';
import type { Client } from './Client';

import { EventEmitter } from 'events';
import low from 'lowdb';
import FileSync from 'lowdb/adapters/FileSync';

import {
	CallcenterMessage,
	ClientType,
	RegistrarEvent,
	TrainClientCallcenterRequest
} from '../../enums';
import logger from '../../logger';
import { isSet } from '../../utils';

import { ControlCenterClient } from './ControlCenterClient';
import { Locomotive } from './Locomotive';
import { RegistrarClient } from './RegistrarClient';
import { TrainClient } from './TrainClient';

const adapter = new FileSync<Database>('database.json');
const db = low(adapter);

db.defaults({ trains: [] }).write();

export class Callcenter extends EventEmitter {
	private controlCenterClients: Map<Client['id'], ControlCenterClient> = new Map();
	private registrarClients: Map<Client['id'], RegistrarClient> = new Map();
	private trainClients: Map<Client['id'], TrainClient> = new Map();

	private registeredTrains: Array<RegisteredTrain> = [];
	private trainEngines: Map<HubUUID, TrainEngine> = new Map();
	private locomotives: Map<Locomotive['id'], Locomotive> = new Map();

	constructor() {
		super();

		this.registeredTrains = this.fetchRegisteredTrains();
	}

	// # CLIENTS

	createClient(type: ClientType): Client {
		if (type === ClientType.CONTROL_CENTER) {
			return this.createControlCenterClient();
		} else if (type === ClientType.REGISTRAR) {
			return this.createRegistrarClient();
		} else if (type === ClientType.TRAIN) {
			return this.createTrainClient();
		}

		throw new Error('Unsupported client type');
	}

	get clients(): Map<Client['id'], Client> {
		return new Map<Client['id'], Client>([...this.controlCenterClients, ...this.registrarClients, ...this.trainClients]);
	}

	deleteClient(client: Client): void {
		if (client instanceof ControlCenterClient) {
			this.deleteControlCenterClient(client);
		} else if (client instanceof RegistrarClient) {
			this.deleteRegistrarClient(client);
		} else if (client instanceof TrainClient) {
			this.deleteTrainClient(client);
		}
	}

	private createControlCenterClient(): ControlCenterClient {
		const client = new ControlCenterClient(this.trainEngines, this.registeredTrains);

		this.controlCenterClients.set(client.id, client);

		return client;
	}

	private deleteControlCenterClient(client: ControlCenterClient): void {
		this.controlCenterClients.delete(client.id);
	}

	private createRegistrarClient(): RegistrarClient {
		const client = new RegistrarClient(this.trainEngines);
		client.on(RegistrarEvent.TRAIN_REGISTERED, this.addRegisteredTrain.bind(this));

		this.registrarClients.set(client.id, client);

		return client;
	}

	private deleteRegistrarClient(client: RegistrarClient): void {
		client.off('TRAIN_REGISTERED', this.addRegisteredTrain.bind(this));

		this.registrarClients.delete(client.id);
	}

	private createTrainClient(): TrainClient {
		const client = new TrainClient();
		// client.on('TRAIN_UPDATED', this.updateDatabaseTrain.bind(this));
		// client.on('ENGINE_COUPLING_REQUEST_RECEIVED', this.engineCouplingRequestReceived.bind(this));
		client.on(TrainClientCallcenterRequest.GET_LOCOMOTIVES, this.getLocomotivesListener.bind(this, client));

		this.trainClients.set(client.id, client);

		return client;
	}

	private deleteTrainClient(client: TrainClient): void {
		// client.off('TRAIN_UPDATED', this.updateDatabaseTrain.bind(this));
		// client.off('ENGINE_COUPLING_REQUEST_RECEIVED', this.engineCouplingRequestReceived.bind(this));
		client.off(TrainClientCallcenterRequest.GET_LOCOMOTIVES, this.getLocomotivesListener.bind(this, client));

		this.trainClients.delete(client.id);
	}

	// LISTENERS

	private getLocomotivesListener(client: TrainClient) {
		this.logInfo(`[ ${client.id} ] Request received to send all connected locomotives`);

		client.processCallcenterMessage(CallcenterMessage.LOCOMOTIVES, this.locomotives);
	}

	// # TO DETERMINE

	private updateDatabaseTrain(client: TrainClient, request: UpdateTrainRequest): void {
		const train = this.registeredTrains.find(dbt => dbt.id === request.id);

		if (!isSet(train)) {
			logger.error('Train does not exist');

			return;
		}

		db.get('trains')
			.find({ id: request.id })
			.assign({ name: request.name })
			.write();
	}

	private addRegisteredTrain(train: RegisteredTrain) {
		this.registeredTrains.push(train);

		db.get('trains').push(train).write();

		this.sendToControlCenters(CallcenterMessage.TRAIN_REGISTERED, this.registeredTrains);
	}

	createLocomotive(hub: Hub, trainMotor: TrainMotor, hubLED: HubLED): void {
		const locomotive = new Locomotive(hub, trainMotor, hubLED);
		const registeredLocomotives = this.getRegisteredLocomotivesIds();

		if (registeredLocomotives.includes(hub.uuid)) {
			this.sendToTrains(CallcenterMessage.LOCOMOTIVE_ADDED, locomotive);
		} else {
			this.sendToControlCenters(CallcenterMessage.LOCOMOTIVE_ADDED, locomotive);
		}

		this.locomotives.set(locomotive.id, locomotive);
	}

	private getRegisteredLocomotivesIds(): Array<HubUUID> {
		return this.registeredTrains
			.map(registeredTrain => registeredTrain.locomotives
				.map(locomotive => locomotive.uuid)
			).flat();
	}

	private sendToTrains(message: CallcenterMessage, value?: unknown): void {
		for (const train of this.trainClients.values()) {
			train.processCallcenterMessage(message, value);
		}
	}

	private sendToControlCenters(message: CallcenterMessage, value?: unknown): void {
		for (const controlCenter of this.controlCenterClients.values()) {
			controlCenter.processCallcenterMessage(message, value);
		}
	}

	private fetchRegisteredTrains(): Array<RegisteredTrain> {
		return db.get('trains').cloneDeep().value();
	}

	private logInfo(message: string): void {
		logger.info(`[ ${this.constructor.name} ] ${message}`);
	}
}
