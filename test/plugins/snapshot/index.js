const fs = require('fs-extra');
const relativeDayUtc = require('relative-day-utc');
const defaultSnapshotDate = '2010-12-31';

module.exports = ({ snapshotResponses = false, updateExistingSnapshots = false }) => {
	if (updateExistingSnapshots) {
		snapshotResponses = true;
	}

	let snapshotFiles = new Map();
	let useTracker = new Map();
	let currentFile;

	function getFile () {
		if (!snapshotFiles.has(currentFile)) {
			useTracker.set(currentFile, new Map());

			try {
				snapshotFiles.set(currentFile, fs.readJsonSync(currentFile));
			} catch {
				snapshotFiles.set(currentFile, {});
			}
		}

		return snapshotFiles.get(currentFile);
	}

	function getResponseBodyFromSnapshot (key, newBody) {
		let expectedResponses = getFile();
		markUsed(currentFile, key);

		if (newBody && snapshotResponses) {
			storeResponse(expectedResponses, key, newBody);
		}

		if (!expectedResponses[key]) {
			return undefined;
		}

		let data = _.cloneDeep(expectedResponses[key]);
		let diff = relativeDayUtc().valueOf() - relativeDayUtc(0, data.date || defaultSnapshotDate);
		delete data.date;

		return recalculateDates(data, diff);
	}

	function isUsed (file, key) {
		return useTracker.get(file).get(key);
	}

	function markUsed (file, key) {
		useTracker.get(file).set(key, true);
	}

	function storeFile (path, contents) {
		// Sort the object to minimize serialization diffs.
		let sortedContents = _.fromPairs(Object.keys(contents).sort((a, b) => {
			let aCount = a.split('/').length;
			let bCount = b.split('/').length;

			if (aCount === bCount) {
				return a < b ? -1 : b > a;
			}

			return aCount - bCount;
		}).map(key => [ key, contents[key] ]));

		fs.outputJsonSync(path, sortedContents, { spaces: '\t' });
	}

	function storeResponse (expectedResponses, key, data) {
		let dateDiff = relativeDayUtc().valueOf() - relativeDayUtc(0, expectedResponses[key]?.date || defaultSnapshotDate);

		if (expectedResponses[key]) {
			if (!updateExistingSnapshots) {
				return;
			}

			let currentData = _.cloneDeep(expectedResponses[key]);
			delete currentData.date;

			if (_.isEqual(data, recalculateDates(currentData, dateDiff))) {
				return;
			}
		}

		if (typeof data !== 'object') {
			expectedResponses[key] = data;
		} else if (Array.isArray(data)) {
			expectedResponses[key] = recalculateDates(data, -dateDiff);
		} else {
			expectedResponses[key] = {
				date: expectedResponses[key]?.date || defaultSnapshotDate,
				...recalculateDates(data, -dateDiff || 0),
			};
		}
	}

	return Object.assign((chai) => {
		chai.Assertion.addMethod('matchSnapshot', function (snapshotName = this._obj.req.path, message) {
			let body = Buffer.isBuffer(this._obj.body) ? this._obj.body.toString() : this._obj.body;
			new chai.Assertion(body).to.deep.equal(getResponseBodyFromSnapshot(snapshotName, body), message);
		});
	}, {
		prune () {
			for (let [ path, contents ] of snapshotFiles) {
				for (let key of Object.keys(contents)) {
					if (!isUsed(path, key)) {
						delete contents[key];
					}
				}

				storeFile(path, contents);
			}
		},
		setCurrentFile (file) {
			currentFile = file;
		},
		store () {
			for (let [ path, contents ] of snapshotFiles) {
				storeFile(path, contents);
			}
		},
	});
};

function recalculateDates (object, dateDiff) {
	let datePattern = /^\d{4}-\d{2}-\d{2}$/;

	if (!_.isObject(object)) {
		return object;
	} else if (Array.isArray(object)) {
		return object.map(value => recalculateDates(value, dateDiff));
	}

	return _.mapValues(_.mapKeys(object, (value, key) => {
		if (datePattern.test(key)) {
			return new Date(relativeDayUtc(0, key).valueOf() + dateDiff).toISOString().substr(0, 10);
		}

		return key;
	}), value => recalculateDates(value, dateDiff));
}
