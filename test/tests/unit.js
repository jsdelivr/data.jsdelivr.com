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

		it('s-month', () => {
			expect(dateRange('s-month', new Date('2022-01')))
				.to.deep.equal([ new Date(Date.UTC(2022, 0, 1)), new Date(Date.UTC(2022, 0, 31)) ]);

			expect(dateRange('s-month', new Date('2022-02')))
				.to.deep.equal([ new Date(Date.UTC(2022, 1, 1)), new Date(Date.UTC(2022, 1, 28)) ]);

			expect(dateRange('s-month', new Date('2020-02')))
				.to.deep.equal([ new Date(Date.UTC(2020, 1, 1)), new Date(Date.UTC(2020, 1, 29)) ]);

			expect(dateRange.parseStaticPeriod('s-month', new Date('2020-01-31')).date)
				.to.deep.equal(new Date(Date.UTC(2019, 11, 1)));

			expect(dateRange.parseStaticPeriod('s-month', new Date('2020-02-01')).date)
				.to.deep.equal(new Date(Date.UTC(2019, 11, 1)));

			expect(dateRange.parseStaticPeriod('s-month', new Date('2020-02-02')).date)
				.to.deep.equal(new Date(Date.UTC(2019, 11, 1)));

			expect(dateRange.parseStaticPeriod('s-month', new Date('2020-02-3')).date)
				.to.deep.equal(new Date(Date.UTC(2019, 11, 1)));

			expect(dateRange.parseStaticPeriod('s-month', new Date('2020-02-04')).date)
				.to.deep.equal(new Date(Date.UTC(2019, 11, 1)));

			expect(dateRange.parseStaticPeriod('s-month', new Date('2020-02-05')).date)
				.to.deep.equal(new Date(Date.UTC(2020, 0, 1)));
		});

		it('s-year', () => {
			expect(dateRange('s-year', new Date('2022')))
				.to.deep.equal([ new Date(Date.UTC(2022, 0, 1)), new Date(Date.UTC(2022, 11, 31)) ]);

			expect(dateRange('s-year', new Date('2020')))
				.to.deep.equal([ new Date(Date.UTC(2020, 0, 1)), new Date(Date.UTC(2020, 11, 31)) ]);

			expect(dateRange.parseStaticPeriod('s-year', new Date('2019-12-31')).date)
				.to.deep.equal(new Date(Date.UTC(2018, 0, 1)));

			expect(dateRange.parseStaticPeriod('s-year', new Date('2020-01-01')).date)
				.to.deep.equal(new Date(Date.UTC(2018, 0, 1)));

			expect(dateRange.parseStaticPeriod('s-year', new Date('2020-01-02')).date)
				.to.deep.equal(new Date(Date.UTC(2018, 0, 1)));

			expect(dateRange.parseStaticPeriod('s-year', new Date('2020-01-03')).date)
				.to.deep.equal(new Date(Date.UTC(2018, 0, 1)));

			expect(dateRange.parseStaticPeriod('s-year', new Date('2020-01-04')).date)
				.to.deep.equal(new Date(Date.UTC(2018, 0, 1)));

			expect(dateRange.parseStaticPeriod('s-year', new Date('2020-01-05')).date)
				.to.deep.equal(new Date(Date.UTC(2019, 0, 1)));
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
