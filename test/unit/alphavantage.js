'use strict';

const expect = require('chai').expect;
const alphavantage = require('../../src/alphavantage');

describe('alphavantage', () => {
    describe('#queryCompanyOverview()', () => {
        it('should work für AMZN', async() => {
            const result = await alphavantage.queryCompanyOverview('AMZN');
            expect(result.symbol).to.equal('AMZN');
            expect(result.name).to.equal('Amazon.com, Inc');
        });
    });

    describe('#queryDailyAdjusted()', () => {
        it('should work für AMZN since 2020-12-01', async() => {
            const results = await alphavantage.queryDailyAdjusted('AMZN', '2020-12-01');
            expect(results.length).greaterThan(1);
            expect(results[0].symbol).to.equal('AMZN');
            expect(results[0].date).to.equal('2020-12-31');
            expect(results[0].open).to.equal(3275);
            expect(results[0].high).to.equal(3282.9219);
            expect(results[0].low).to.equal(3241.2);
            expect(results[0].close).to.equal(3256.93);
            expect(results[0].adjustedClose).to.equal(3256.93);
            expect(results[0].volume).to.equal(2957206);
            expect(results[0].dividendAmount).to.equal(0);
            expect(results[0].splitCoefficient).to.equal(1);
        });
    });

    describe('#queryDailyAdjusted()', () => {
        it('should work für AMZN since <future date>', async() => {
            const results = await alphavantage.queryDailyAdjusted('AMZN', '9999-12-01');
            expect(results.length).equal(0);
        });
    });

    describe('#querySMA()', () => {
        it('should work für AMZN since 2020-12-01', async() => {
            const results = await alphavantage.querySMA('AMZN', 38, '2020-12-01');
            expect(results.length).greaterThan(1);
            expect(results[0].symbol).to.equal('AMZN');
            expect(results[0].date).to.equal('2020-12-31');
            expect(results[0].sma).to.equal(3172.9108);
        });
    });

    describe('#querySMA()', () => {
        it('should work für AMZN since <future date>', async() => {
            const results = await alphavantage.querySMA('AMZN', 38, '9999-12-01');
            expect(results.length).equal(0);
        });
    });

    describe('#queryEMA()', () => {
        it('should work für AMZN since 2020-12-01', async() => {
            const results = await alphavantage.queryEMA('AMZN', 50, '2020-12-01');
            expect(results.length).greaterThan(1);
            expect(results[0].symbol).to.equal('AMZN');
            expect(results[0].date).to.equal('2020-12-31');
            expect(results[0].ema).to.equal(3186.5997);
        });
    });

    describe('#queryEMA()', () => {
        it('should work für AMZN since <future date>', async() => {
            const results = await alphavantage.queryEMA('AMZN', 50, '9999-12-01');
            expect(results.length).equal(0);
        });
    });

    describe('#queryMACD()', () => {
        it('should work für AMZN since 2020-12-01', async() => {
            const results = await alphavantage.queryMACD('AMZN', '2020-12-01');
            expect(results.length).greaterThan(1);
            expect(results[0].symbol).to.equal('AMZN');
            expect(results[0].date).to.equal('2020-12-31');
            expect(results[0].macd).to.equal(28.6142);
            expect(results[0].hist).to.equal(10.7848);
            expect(results[0].signal).to.equal(17.8294);
        });
    });

    describe('#queryMACD()', () => {
        it('should work für AMZN since <future date>', async() => {
            const results = await alphavantage.queryMACD('AMZN', '9999-12-01');
            expect(results.length).equal(0);
        });
    });

    describe('#queryRSI()', () => {
        it('should work für AMZN since 2020-12-01', async() => {
            const results = await alphavantage.queryRSI('AMZN', 14, '2020-12-01');
            expect(results.length).greaterThan(1);
            expect(results[0].symbol).to.equal('AMZN');
            expect(results[0].date).to.equal('2020-12-31');
            expect(results[0].rsi).to.equal(56.0688);
        });
    });

    describe('#queryRSI()', () => {
        it('should work für AMZN since <future date>', async() => {
            const results = await alphavantage.queryRSI('AMZN', 14, '9999-12-01');
            expect(results.length).equal(0);
        });
    });

    describe('#queryBBands()', () => {
        it('should work für AMZN since 2020-12-01', async() => {
            const results = await alphavantage.queryBBands('AMZN', 20, '2020-12-01');
            expect(results.length).greaterThan(1);
            expect(results[0].symbol).to.equal('AMZN');
            expect(results[0].date).to.equal('2020-12-31');
            expect(results[0].lower).to.equal(3078.7905);
            expect(results[0].upper).to.equal(3313.8985);
            expect(results[0].middle).to.equal(3196.3445);
        });
    });

    describe('#queryBBands()', () => {
        it('should work für AMZN since <future date>', async() => {
            const results = await alphavantage.queryBBands('AMZN', 20, '9999-12-01');
            expect(results.length).equal(0);
        });
    });
});
