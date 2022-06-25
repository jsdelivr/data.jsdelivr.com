declare global {
	namespace Chai {
		interface Assertion {
			matchSnapshot (snapshotName?: string, message?: string): Assertion;
		}
	}
}

interface SnapshotOptions {
	snapshotResponses?: boolean,
	updateExistingSnapshots?: boolean
}

declare function chaiSnapshot (options: SnapshotOptions): typeof chaiSnapshotPlugin;
declare function chaiSnapshotPlugin (chai: any, utils: any): void;

export = chaiSnapshot;
