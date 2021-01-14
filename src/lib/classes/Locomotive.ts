import type { HubUUID } from '../../types';

import { Consts, Hub, HubLED, TrainMotor } from 'node-poweredup';

import { LocomotiveStatus } from '../../enums';
import logger from '../../logger';

export class Locomotive {
	readonly id: HubUUID;
	private readonly hub: Hub;
	private readonly trainMotor: TrainMotor;
	private readonly hubLED: HubLED;
	private status: LocomotiveStatus = LocomotiveStatus.OFFLINE;

	constructor(hub: Hub, motor: TrainMotor, hubLED: HubLED) {
		this.id = hub.uuid;
		this.hub = hub;
		this.trainMotor = motor;
		this.hubLED = hubLED;

		console.log(this.hub.batteryLevel);

		this.setStatus(LocomotiveStatus.UNLINKED);
	}

	start() {
		logger.debug(`Start locomotive ${this.id}`);
		console.debug(this.trainMotor.portName);

		return this.trainMotor.setPower(50)
			.catch(e => console.error(e));
	}

	stop() {
		return this.trainMotor.stop();
	}


	setStatus(status: LocomotiveStatus): void {
		this.status = status;
	}

	setLinked(color: Consts.Color = Consts.Color.WHITE): void {
		this.setStatus(LocomotiveStatus.LINKED);
		this.hubLED.setColor(color);
	}

	private async colorLoop() {
		await this.hubLED.setColor(Consts.Color.NONE);

		let color: number = 1;

		return setInterval(async () => {
			await this.hubLED.setColor(color);

			if (++color > 10) {
				color = 1;
			}
		}, 400)
	}
}
