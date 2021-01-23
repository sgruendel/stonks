'use strict';

const winston = require('winston');

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    transports: [
        new winston.transports.Console({
            format: winston.format.simple(),
        }),
    ],
    exitOnError: false,
});

const alphavantage = require('./alphavantage');
const db = require('./db');

const ALL_SYMBOLS = require('./symbols.json');

async function batchPut(model, documents, attempt = 1) {
    const BATCH_SIZE = 25;

    try {
        let begin = 0;
        const promises = [];
        while (begin < documents.length) {
            promises.push(
                db.handleThroughput(
                    docs => model.batchPut(docs),
                    documents.slice(begin, begin + BATCH_SIZE)));
            begin += BATCH_SIZE;
        }
        const results = await Promise.all(promises);
        const unprocessedResults = results.filter(result => result.unprocessedItems.length > 0);
        if (unprocessedResults.length === 0) {
            logger.debug('put succeeded for', documents.length, 'documents for', model.Model.name, documents[0].symbol, 'in attempt', attempt);
        } else if (unprocessedResults.length > 0) {
            logger.debug('retrying', unprocessedResults.length, 'failed put(s) for', model.Model.name, unprocessedResults[0].unprocessedItems[0].symbol);
            let unprocessedDocumentCount = 0;
            unprocessedResults.forEach(result => (unprocessedDocumentCount += result.unprocessedItems.length));

            const unprocessedDocuments = [];
            unprocessedResults.forEach(
                result => result.unprocessedItems.forEach(
                    unprocessedItem => unprocessedDocuments.push(unprocessedItem)));
            return batchPut(model, unprocessedDocuments, ++attempt);
        }
        return results;
    } catch (err) {
        if (err.retryable) {
            logger.debug('retrying put for ' + model.Model.name + ': ' + err.message);
            return batchPut(model, documents, ++attempt);
        }
        throw err;
    }
}

const args = process.argv.slice(2);
const symbols = (args[0] === '*') ? ALL_SYMBOLS : args[0].split(',');
const since = args[1] || '2018-01-01';

logger.info('getting data for ' + symbols + ' since ' + since + ' ...');

symbols.forEach(async symbol => {
    logger.info(symbol + ' ...');

    try {
        let overview = await alphavantage.queryCompanyOverview(symbol);
        if (!overview.symbol) {
            // E.g. BYDDF and XIACF do not exist, so we just insert their symbol
            overview = { symbol: symbol };
        }
        db.CompanyOverview.update(overview);

        const dailyAdjusteds = await alphavantage.queryDailyAdjusted(symbol, since);
        batchPut(db.DailyAdjusted, dailyAdjusteds);

        const sma15s = await alphavantage.querySMA(symbol, 15, since);
        const sma50s = await alphavantage.querySMA(symbol, 50, since);
        const ema12s = await alphavantage.queryEMA(symbol, 12, since);
        const ema26s = await alphavantage.queryEMA(symbol, 26, since);
        const ema50s = await alphavantage.queryEMA(symbol, 50, since);
        const ema200s = await alphavantage.queryEMA(symbol, 200, since);
        const macds = await alphavantage.queryMACD(symbol, since);
        const rsis = await alphavantage.queryRSI(symbol, 14, since);
        const bbands = await alphavantage.queryBBands(symbol, 20, since);

        let technicalIndicators = [];
        for (let i = 0; i < dailyAdjusteds.length; i++) {
            let ti = { symbol: symbol, date: dailyAdjusteds[i].date };

            if (i < ema200s.length) {
                if (sma15s[i].date !== dailyAdjusteds[i].date
                    || sma50s[i].date !== dailyAdjusteds[i].date
                    || ema12s[i].date !== dailyAdjusteds[i].date
                    || ema26s[i].date !== dailyAdjusteds[i].date
                    || ema50s[i].date !== dailyAdjusteds[i].date
                    || ema200s[i].date !== dailyAdjusteds[i].date
                    || macds[i].date !== dailyAdjusteds[i].date
                    || rsis[i].date !== dailyAdjusteds[i].date
                    || bbands[i].date !== dailyAdjusteds[i].date) {

                    throw new Error('diff. date ' + symbol);
                }
            }
            if (sma15s[i]) ti.sma15 = sma15s[i].sma;
            if (sma50s[i]) ti.sma50 = sma50s[i].sma;
            if (ema12s[i]) ti.ema12 = ema12s[i].ema;
            if (ema26s[i]) ti.ema26 = ema26s[i].ema;
            if (ema50s[i]) ti.ema50 = ema50s[i].ema;
            if (ema200s[i]) ti.ema200 = ema200s[i].ema;
            if (macds[i]) {
                ti.macd = macds[i].macd;
                ti.macdHist = macds[i].hist;
                ti.macdSignal = macds[i].signal;
            }
            if (rsis[i]) ti.rsi = rsis[i].rsi;
            if (bbands[i]) {
                ti.bbandLower = bbands[i].lower;
                ti.bbandUpper = bbands[i].upper;
                ti.bbandMiddle = bbands[i].middle;
            }

            technicalIndicators.push(ti);
        }

        batchPut(db.TechnicalIndicators, technicalIndicators);
    } catch (err) {
        logger.error(symbol, err);
    }
});
