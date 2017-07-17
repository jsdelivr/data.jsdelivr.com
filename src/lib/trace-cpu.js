module.exports = (trace) => {
	let startTime = process.hrtime();
	let startUsage = process.cpuUsage();

	setInterval(() => {
		let elapsedTime = process.hrtime(startTime);
		let usage = process.cpuUsage(startUsage);

		trace.recordMetric('CPU time %', (usage.user + usage.system) / hrTimeToMilliseconds(elapsedTime) / 10);

		startTime = process.hrtime();
		startUsage.user += usage.user;
		startUsage.system += usage.system;
	}, 1000);
};

function hrTimeToMilliseconds (hrTime) {
	return hrTime[0] * 1000 + hrTime[1] / 1000000;
}
