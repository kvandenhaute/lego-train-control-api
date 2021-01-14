import type { Message } from './types';

import { Consts, Hub, HubLED, PoweredUP, TrainMotor } from 'node-poweredup';
import WebSocket from 'ws';

import { Callcenter } from './lib/classes/Callcenter';
import { ClientType } from './enums';
import { connectToDeviceByType } from './helpers';
import logger from './logger';

const callcenter = new Callcenter();
const poweredUp = new PoweredUP();
const wss = new WebSocket.Server({ port: 3001 });

poweredUp.on('discover', async (hub: Hub) => {
	logger.info(`[ ${hub.name} ] Discovered hub #${hub.uuid}`);

	await hub.connect();

	logger.info(`[ ${hub.name} ] Connected to hub #${hub.uuid}`);

	const [trainMotor, hubLED] = await Promise.all([
		connectToDeviceByType<TrainMotor>(hub, Consts.DeviceType.TRAIN_MOTOR),
		connectToDeviceByType<HubLED>(hub, Consts.DeviceType.HUB_LED)
	]);

	if (trainMotor === null || hubLED === null) {
		logger.warn(`[ ${hub.name} ] Hub #${hub.uuid} is not connected to a train motor`);

		return;
	}

	await hubLED.setColor(Consts.Color.NONE);

	callcenter.createLocomotive(hub, trainMotor, hubLED);
});

wss.on('connection', ws => {
	const client = callcenter.createClient(ClientType[ ws.protocol as keyof typeof ClientType ]);
	client.on('message', clientListener);

	logger.info(`[ ${ws.protocol} ][ ${client.id} ] Connected`);
	logger.debug(`Number of clients: ${callcenter.clients.size}`);

	ws.on('message', data => {
		const message: Message = JSON.parse(data.toString());

		logger.info(`[ ${client.constructor.name} ][ ${client.id} ] Incoming message ${message.key}`);

		client.processWebSocketMessage(message);
	});

	ws.on('close', () => {
		logger.info(`[ ${ws.protocol} ][ ${client.id} ] Disconnected`);

		client.off('message', clientListener);
		callcenter.deleteClient(client);

		logger.debug(`Number of clients: ${callcenter.clients.size}`);
	});

	function clientListener(message: Message) {
		logger.info(`[ ${ws.protocol} ][ ${client.id} ] Outgoing message ${message.key}`);
		logger.debug(`[ ${ws.protocol} ][ ${client.id} ] ${JSON.stringify(message.value)}`);

		ws.send(JSON.stringify(message));
	}
});

poweredUp.scan()
	.then(() => logger.info('Scanning for hubs ...'));
