const chai = require('chai');
const expect = chai.expect;

const relativeDayUtc = require('relative-day-utc');
const dateRange = require('../../src/routes/utils/dateRange');
const pagination = require('../../src/routes/utils/pagination');

describe('Unit tests', () => {
	describe('utils/dateRange.js', () => {
		it('day', () => {
			let range = dateRange('day', relativeDayUtc(-10));
			expect(range).to.deep.equal([ relativeDayUtc(-12), relativeDayUtc(-12) ]);
		});

		it('week', () => {
			let range = dateRange('week', relativeDayUtc(-10));
			expect(range).to.deep.equal([ relativeDayUtc(-18), relativeDayUtc(-12) ]);
		});

		it('month', () => {
			let range = dateRange('month', relativeDayUtc(-10));
			expect(range).to.deep.equal([ relativeDayUtc(-41), relativeDayUtc(-12) ]);
		});

		it('year', () => {
			let range = dateRange('year', relativeDayUtc(-10));
			expect(range).to.deep.equal([ relativeDayUtc(-376), relativeDayUtc(-12) ]);
		});

		it('all', () => {
			let range = dateRange('all', relativeDayUtc(-10));
			expect(range).to.deep.equal([ relativeDayUtc(0, Date.UTC(2017, 7, 19)), relativeDayUtc(-12) ]);
		});

		it('invalid period', () => {
			let range = () => dateRange('xxx', relativeDayUtc(-10));
			expect(range).to.throw('period');
		});
	});

	describe('utils/pagination.js', () => {
		it('no parameters', () => {
			expect(pagination()).to.deep.equal([ 100, 1 ]);
		});

		it('invalid parameters', () => {
			expect(pagination(-1, -1)).to.deep.equal([ 100, 1 ]);
			expect(pagination(1.12, 0.5)).to.deep.equal([ 100, 1 ]);
			expect(pagination(1000, 2)).to.deep.equal([ 100, 2 ]);
			expect(pagination('1x', '1x')).to.deep.equal([ 100, 1 ]);
			expect(pagination(100, 0)).to.deep.equal([ 100, 1 ]);
		});

		it('valid parameters', () => {
			expect(pagination(50, 4)).to.deep.equal([ 50, 4 ]);
		});
	});
});
