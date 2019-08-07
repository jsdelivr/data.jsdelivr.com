class ArrayStream {
	constructor (json) {
		this.json = json;
	}

	async parse (string) {
		let array = [], prevIndex = 0, index;

		while ((index = string.indexOf('\n]', prevIndex)) !== -1) {
			index += 2;
			array.push(...this.json.parse(string.substring(prevIndex, index)));
			await Bluebird.resolve();
			prevIndex = index;
		}

		return array;
	}

	async stringify (array, { itemsPerBatch = 10000, singleArrayOutput = false } = {}) {
		let out = [];
		let max = 0, min;

		while (max < array.length) {
			min = max;
			max = Math.min(max + itemsPerBatch, array.length);
			let json = this.json.stringify(array.slice(min, max), undefined, '\t');

			if (singleArrayOutput) {
				json = json.slice(1, -1).trim();
			}

			out.push(json);
			await Bluebird.resolve();
		}

		if (singleArrayOutput) {
			return `[\n\t${out.join(',\n\t')}\n]`;
		}

		return out.join('\n');
	}
}

module.exports = ArrayStream;
// TODO: check the possibility of integrating this into JSONPP.
