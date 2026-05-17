import { request } from 'chai-http';
import config from 'config';
import { setupSnapshots } from '../../../../../../utils.js';

const server = `http://127.0.0.1:${config.get(`server.port`)}`;

describe('/v1/stats/packages/badge', () => {
	before(() => {
		setupSnapshots(import.meta.url);
	});

	it(`GET /v1/stats/packages/npm/package-2/badge`, () => {
		return request.execute(server)
			.get(`/v1/stats/packages/npm/package-2/badge`)
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, stale-while-revalidate=3600, stale-if-error=86400');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.matchSnapshot();
			});
	});

	it(`GET /v1/stats/packages/npm/package-2/badge?type=rank`, () => {
		return request.execute(server)
			.get(`/v1/stats/packages/npm/package-2/badge?type=rank`)
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, stale-while-revalidate=3600, stale-if-error=86400');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.matchSnapshot();
			});
	});

	it(`GET /v1/stats/packages/npm/package-2/badge?type=type-rank`, () => {
		return request.execute(server)
			.get(`/v1/stats/packages/npm/package-2/badge?type=type-rank`)
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, stale-while-revalidate=3600, stale-if-error=86400');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.matchSnapshot();
			});
	});

	it(`GET /v1/stats/packages/npm/package-2/badge?type=type-rank&period=year`, () => {
		return request.execute(server)
			.get(`/v1/stats/packages/npm/package-2/badge?type=type-rank&period=year`)
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, stale-while-revalidate=3600, stale-if-error=86400');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.matchSnapshot();
			});
	});

	it(`GET /v1/stats/packages/npm/package-2/badge?type=type-rank&period=s-year`, () => {
		return request.execute(server)
			.get(`/v1/stats/packages/npm/package-2/badge?type=type-rank&period=s-year`)
			.then((response) => {
				expect(response).to.have.status(400);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'no-cache, no-store, must-revalidate');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.matchSnapshot();
			});
	});

	it(`GET /v1/stats/packages/npm/@scope/package-1/badge?type=type-rank`, () => {
		return request.execute(server)
			.get(`/v1/stats/packages/npm/@scope/package-1/badge?type=type-rank`)
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, stale-while-revalidate=3600, stale-if-error=86400');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.matchSnapshot();
			});
	});

	it(`GET /v1/stats/packages/npm/@scope/package-1/badge?style=rounded`, () => {
		return request.execute(server)
			.get(`/v1/stats/packages/npm/@scope/package-1/badge?style=rounded`)
			.then((response) => {
				expect(response).to.have.status(200);
				expect(response).to.have.header('Access-Control-Allow-Origin', '*');
				expect(response).to.have.header('Cache-Control', 'public, stale-while-revalidate=3600, stale-if-error=86400');
				expect(response).to.have.header('Timing-Allow-Origin', '*');
				expect(response).to.have.header('Vary', 'Accept-Encoding');
				expect(response).to.matchSnapshot();
			});
	});
});
