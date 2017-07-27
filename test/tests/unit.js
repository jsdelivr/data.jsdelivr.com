const chai = require('chai');
const expect = chai.expect;

const relativeDayUtc = require('relative-day-utc');
const dateRange = require('../../src/routes/utils/dateRange');
const pagination = require('../../src/routes/utils/pagination');

describe('Unit tests', () => {
	describe('utils/dateRange.js', () => {
		it('no parameters', () => {
			let range = dateRange();
			expect(range).to.deep.equal([ relativeDayUtc(-31), relativeDayUtc(-2) ]);
			expect(range.isStatic).to.be.undefined;
		});

		it('no parameters, custom range', () => {
			let range = dateRange(undefined, undefined, 15);
			expect(range).to.deep.equal([ relativeDayUtc(-16), relativeDayUtc(-2) ]);
			expect(range.isStatic).to.be.undefined;
		});

		it('from too late, to wrong format', () => {
			let range = dateRange('2200-01-01', '2000/11/11');
			expect(range).to.deep.equal([ undefined, relativeDayUtc(-2) ]);
			expect(range.isStatic).to.be.undefined;
		});

		it('to too late', () => {
			let range = dateRange('2015-01-01', '2200-01-01');
			expect(range).to.deep.equal([ relativeDayUtc(0, new Date('2015-01-01')), relativeDayUtc(-2) ]);
			expect(range.isStatic).to.be.undefined;
		});

		it('only from', () => {
			let range = dateRange('2015-01-01');
			expect(range).to.deep.equal([ relativeDayUtc(0, new Date('2015-01-01')), relativeDayUtc(-2) ]);
			expect(range.isStatic).to.be.undefined;
		});

		it('only to', () => {
			let range = dateRange(undefined, '2015-01-01');
			expect(range).to.deep.equal([ undefined, relativeDayUtc(0, new Date('2015-01-01')) ]);
			expect(range.isStatic).to.be.true;
		});

		it('both from and to', () => {
			let range = dateRange('2015-01-01', '2015-01-02');
			expect(range).to.deep.equal([ relativeDayUtc(0, new Date('2015-01-01')), relativeDayUtc(0, new Date('2015-01-02')) ]);
			expect(range.isStatic).to.be.true;
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
		});

		it('valid parameters', () => {
			expect(pagination(50, 4)).to.deep.equal([ 50, 4 ]);
		});
	});
});
