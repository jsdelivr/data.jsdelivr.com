import got from 'got';
import config from 'config';

const { userAgent } = config.get('server');

export default got.extend({
	headers: {
		'User-Agent': userAgent,
	},
	handlers: [ (options, next) => {
		if (options.isStream) {
			return next(options);
		}

		let settled = false;

		options.hooks.beforeRetry.push((options, error) => {
			// Node.js can reject the promise before Got's transport retry timer runs.
			// https://github.com/sindresorhus/got/issues/2469
			if (settled && !error.response) {
				error.request.destroy();
			}
		});

		let request = next(options);
		let markSettled = () => {
			settled = true;
		};

		// Observe settlement without replacing Got's cancelable request.
		void request.then(markSettled, markSettled);
		return request;
	} ],
});
