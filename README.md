# jsDelivr API

The public jsDelivr API provides package metadata for npm and GitHub, including versions, files, and npm entry points. It also provides jsDelivr usage statistics and allows looking up CDN files by their hashes.

## Usage

The API is free to use and imposes no rate limits. However, if you plan to make 100+ RPM for longer periods of time, you should contact us first.
Please note that usage statistics are available with a 48 hour delay.

## Let us know how you use this API

**If you create a tool/plugin/etc. which uses this API, please include a link to your tool in the `User-Agent` header so that we can learn more about how this API is being used.**

## Restrictions

Neither jsDelivr CDN nor this API supports packages larger than 50 MB for GitHub and 150 MB for npm. Trying to get a list of files using the API will result in a `403` response.

## Endpoints

See the [documentation](https://www.jsdelivr.com/docs/data.jsdelivr.com)
or download the [OpenAPI spec file](https://data.jsdelivr.com/v1/spec.yaml).

## Example use cases

- [CodeSandbox](https://codesandbox.io/) - resolves dependencies and loads their files in a browser-based development environment.
- [TypeScript Playground](https://www.typescriptlang.org/play/) - locates TypeScript declaration files for imported packages.
- [Shields.io](https://shields.io/) - generates download statistics badges for npm and GitHub projects.
- [Microsoft Library Manager](https://learn.microsoft.com/en-us/aspnet/core/client-side/libman/) - resolves dependency versions and selects individual files for installation.
- [Algolia npm-search](https://github.com/algolia/npm-search) - enriches package search with version, file, and popularity metadata.
- [Drupal Bootstrap](https://www.drupal.org/project/bootstrap/releases/8.x-3.17) - discovers package versions for CDN-hosted assets.

## FAQ

### Search npm packages

There is no search endpoint in this API because there are already two other APIs for that:

- [the official npm API](https://github.com/npm/registry/blob/master/docs/REGISTRY-API.md#get-v1search)
- [Algolia's npm search](https://github.com/algolia/npm-search) ([more info](https://github.com/jsdelivr/data.jsdelivr.com/issues/6))

## Related projects

- [jsDelivr CDN](https://github.com/jsdelivr/jsdelivr)
- [jsDelivr website](https://github.com/jsdelivr/www.jsdelivr.com)

## Contributing

Refer to [CONTRIBUTING.md](CONTRIBUTING.md) for more information.
