declare global {
	namespace Chai {
		interface Assertion {
			matchSnapshot (snapshotName?: string, message?: string): Assertion;
		}
	}
}

declare function chaiSnapshot (options: any): typeof chaiSnapshotPlugin;
declare function chaiSnapshotPlugin (chai: any, utils: any): void;

export = chaiSnapshot;
