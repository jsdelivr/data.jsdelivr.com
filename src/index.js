import './lib/startup.js';
import cluster from 'cluster';
import config from 'config';
import { onExit } from 'signal-exit';

const serverConfig = config.get('server');

async function listen () {
	let { default: server } = await import('./server.js');

	server.listen(process.env.PORT || serverConfig.port, function () {
		log.info(`Web server started at http://localhost:${this.address().port}, NODE_ENV=${process.env.NODE_ENV}.`);
	});
}

let processes = serverConfig.processes;

if (cluster.isPrimary && processes > 1) {
	for (let i = 0; i < processes; i++) {
		cluster.fork();
	}

	cluster.on('exit', (worker, code, signal) => {
		if (!worker.exitedAfterDisconnect) {
			log.error(`Worker ${worker.process.pid} exited.`, { code, signal });
			cluster.fork();
		}
	});
} else {
	await listen();
}

// istanbul ignore next
onExit((code, signal) => {
	log[code === 0 ? 'info' : 'fatal']('Web server stopped.', { code, signal });
});

// istanbul ignore next
process.on('uncaughtException', (error) => {
	log.fatal(`Uncaught exception. Exiting.`, error, { handled: false });

	setTimeout(() => {
		process.exit(1);
	}, 10000);
});

// istanbul ignore next
process.on('unhandledRejection', (error) => {
	log.fatal('Unhandled rejection. Exiting.', error, { handled: false });

	setTimeout(() => {
		process.exit(1);
	}, 10000);
});
