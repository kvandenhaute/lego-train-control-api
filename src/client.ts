import WebSocket from 'ws';

const ws = new WebSocket('ws://localhost:3000');

ws.on('open', () => {
	console.log('OPEN');

	const yolo = {
		event: 'STOP',
		message: 'please stop this train'
	}

	ws.send(JSON.stringify(yolo));
});
