import type { Hub, HubLED, TrainMotor } from 'node-poweredup';

export interface TrainEngine {
	hub: Hub,
	motor: TrainMotor;
	led: HubLED;
}

export type HubUUID = string;
export type MotorPosition = 'forward' | 'backward';

export interface Database {
	trains: Array<RegisteredTrain>;
}

export interface RegisteredTrain {
	id: string;
	name: string;
	locomotives: Array<{
		uuid: HubUUID;
		position: MotorPosition;
	}>;
}

export interface Message {
	key: string;
	value: unknown;
}

export interface RegisterTrainRequest {
	name: string;
	trainEngines: Array<HubUUID>;
}

export interface TrainEngineResponse {
	uuid: HubUUID;
	name: string;
}

export interface TrainResponse extends RegisteredTrain {
}

export type UpdateTrainRequest = Pick<RegisteredTrain, 'id' | 'name'>;

export interface CouplingRequestReceived {
	id: string;
	trainId: string;
}

export interface SendMeLocomotivesRequest {
	clientId: string;
}
