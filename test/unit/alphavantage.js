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
        it('should work für AMZN since 2020-12-31', async() => {
            const results = await alphavantage.queryDailyAdjusted('AMZN', '2020-12-31');
            expect(results.length).greaterThan(1);
            const result = results.slice(-1)[0];
            expect(result.symbol).to.equal('AMZN');
            expect(result.date).to.equal('2020-12-31');
            expect(result.open).to.equal(3275);
            expect(result.high).to.equal(3282.9219);
            expect(result.low).to.equal(3241.2);
            expect(result.close).to.equal(3256.93);
            expect(result.adjustedClose).to.equal(3256.93);
            expect(result.volume).to.equal(2957206);
            expect(result.dividendAmount).to.equal(0);
            expect(result.splitCoefficient).to.equal(1);
        });
    });

    describe('#queryDailyAdjusted()', () => {
        it('should work für AMZN since <future date>', async() => {
            const results = await alphavantage.queryDailyAdjusted('AMZN', '9999-12-31');
            expect(results.length).equal(0);
        });
    });

    describe('#querySMA()', () => {
        it('should work für AMZN since 2020-12-31', async() => {
            const results = await alphavantage.querySMA('AMZN', 38, '2020-12-31');
            expect(results.length).greaterThan(1);
            const result = results.slice(-1)[0];
            expect(result.symbol).to.equal('AMZN');
            expect(result.date).to.equal('2020-12-31');
            expect(result.sma).to.equal(3172.9108);
        });
    });

    describe('#querySMA()', () => {
        it('should work für AMZN since <future date>', async() => {
            const results = await alphavantage.querySMA('AMZN', 38, '9999-12-31');
            expect(results.length).equal(0);
        });
    });

    describe('#queryEMA()', () => {
        it('should work für AMZN since 2020-12-31', async() => {
            const results = await alphavantage.queryEMA('AMZN', 50, '2020-12-31');
            expect(results.length).greaterThan(1);
            const result = results.slice(-1)[0];
            expect(result.symbol).to.equal('AMZN');
            expect(result.date).to.equal('2020-12-31');
            expect(result.ema).to.equal(3186.5997);
        });
    });

    describe('#queryEMA()', () => {
        it('should work für AMZN since <future date>', async() => {
            const results = await alphavantage.queryEMA('AMZN', 50, '9999-12-31');
            expect(results.length).equal(0);
        });
    });

    describe('#queryMACD()', () => {
        it('should work für AMZN since 2020-12-31', async() => {
            const results = await alphavantage.queryMACD('AMZN', '2020-12-31');
            expect(results.length).greaterThan(1);
            const result = results.slice(-1)[0];
            expect(result.symbol).to.equal('AMZN');
            expect(result.date).to.equal('2020-12-31');
            expect(result.macd).to.equal(28.6142);
            expect(result.hist).to.equal(10.7848);
            expect(result.signal).to.equal(17.8294);
        });
    });

    describe('#queryMACD()', () => {
        it('should work für AMZN since <future date>', async() => {
            const results = await alphavantage.queryMACD('AMZN', '9999-12-31');
            expect(results.length).equal(0);
        });
    });

    describe('#queryRSI()', () => {
        it('should work für AMZN since 2020-12-31', async() => {
            const results = await alphavantage.queryRSI('AMZN', 14, '2020-12-31');
            expect(results.length).greaterThan(1);
            const result = results.slice(-1)[0];
            expect(result.symbol).to.equal('AMZN');
            expect(result.date).to.equal('2020-12-31');
            expect(result.rsi).to.equal(56.0688);
        });
    });

    describe('#queryRSI()', () => {
        it('should work für AMZN since <future date>', async() => {
            const results = await alphavantage.queryRSI('AMZN', 14, '9999-12-31');
            expect(results.length).equal(0);
        });
    });

    describe('#queryBBands()', () => {
        it('should work für AMZN since 2020-12-31', async() => {
            const results = await alphavantage.queryBBands('AMZN', 20, '2020-12-31');
            expect(results.length).greaterThan(1);
            const result = results.slice(-1)[0];
            expect(result.symbol).to.equal('AMZN');
            expect(result.date).to.equal('2020-12-31');
            expect(result.lower).to.equal(3078.7905);
            expect(result.upper).to.equal(3313.8985);
            expect(result.middle).to.equal(3196.3445);
        });
    });

    describe('#queryBBands()', () => {
        it('should work für AMZN since <future date>', async() => {
            const results = await alphavantage.queryBBands('AMZN', 20, '9999-12-31');
            expect(results.length).equal(0);
        });
    });
});
