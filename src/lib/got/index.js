import got from 'got';
import config from 'config';

const { userAgent } = config.get('server');

export default got.extend({
	headers: {
		'User-Agent': userAgent,
	},
});
