import { createLogger, format, transports } from 'winston';

import { isSet } from './utils';

const logger = createLogger({
	level: 'debug'
});

logger.add(new transports.Console({
	format: format.combine(
		format.cli({
			colors: {
				debug: 'white blueBG',
				verbose: 'grey'
			}
		}),
		format.timestamp({
			format: 'HH:mm:ss'
		}),
		format.printf(({ level, message, timestamp, ...rest }) => {
			Object.keys(rest).forEach(key => !isSet(rest[ key ]) ? delete rest[ key ] : {});

			if (Object.keys(rest).length === 0) {
				return `${timestamp}  ${level} ${message}`;
			}

			return `${timestamp}  ${level} ${message} ${JSON.stringify(rest)}`;
		})
	)
}));

export default logger;
