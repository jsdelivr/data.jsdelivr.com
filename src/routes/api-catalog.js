import config from 'config';

const serverConfig = config.get('server');

export default async (ctx) => {
	ctx.set('Content-Type', 'application/linkset+json; profile="https://www.rfc-editor.org/info/rfc9727"; charset=utf-8');

	ctx.body = {
		linkset: [
			{
				'anchor': `${serverConfig.host}/v1`,
				'service-desc': [
					{
						href: `${serverConfig.host}/v1/spec.yaml`,
						type: 'application/yaml',
					},
				],
				'service-doc': [
					{
						href: `${serverConfig.docsHost}/docs/data.jsdelivr.com`,
						type: 'text/html',
					},
				],
			},
		],
	};

	ctx.maxAge = ctx.app.env === 'production' ? 600 : 0;
};
