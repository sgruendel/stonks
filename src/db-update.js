import fs from 'fs';
import pMap from 'p-map';
import winston from 'winston';

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    transports: [
        new winston.transports.Console({
            format: winston.format.simple(),
        }),
    ],
    exitOnError: false,
});

import * as alphavantage from './alphavantage.js';
import * as db from './db.js';

const ALL_SYMBOLS = JSON.parse(fs.readFileSync('src/symbols.json'));

async function batchPut(model, documents, attempt = 1) {
    const BATCH_SIZE = 25;

    try {
        let begin = 0;
        const promises = [];
        while (begin < documents.length) {
            promises.push(
                db.handleThroughput((docs) => model.batchPut(docs), documents.slice(begin, begin + BATCH_SIZE)),
            );
            begin += BATCH_SIZE;
        }
        const results = await Promise.all(promises);
        const unprocessedResults = results.filter((result) => result.unprocessedItems.length > 0);
        if (unprocessedResults.length === 0) {
            logger.debug(
                'put succeeded for',
                documents.length,
                'documents for',
                model.Model.name,
                documents[0].symbol,
                'in attempt',
                attempt,
            );
        } else if (unprocessedResults.length > 0) {
            logger.debug(
                'retrying',
                unprocessedResults.length,
                'failed put(s) for',
                model.Model.name,
                unprocessedResults[0].unprocessedItems[0].symbol,
            );
            let unprocessedDocumentCount = 0;
            unprocessedResults.forEach((result) => (unprocessedDocumentCount += result.unprocessedItems.length));

            const unprocessedDocuments = [];
            unprocessedResults.forEach((result) =>
                result.unprocessedItems.forEach((unprocessedItem) => unprocessedDocuments.push(unprocessedItem)),
            );
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

async function updateSymbol(symbolSince) {
    return updateSymbolAsync(symbolSince.symbol, symbolSince.since);
}

async function updateSymbolAsync(symbol, since) {
    logger.info(symbol + ' ...');

    let allPromises = [];
    try {
        let overview = await alphavantage.queryCompanyOverview(symbol);
        if (!overview.symbol) {
            // E.g. BYDDF and XIACF do not exist, so we just insert their symbol
            overview = { symbol: symbol };
        }
        allPromises.push(db.CompanyOverview.update(overview));

        const dailyAdjusteds = await alphavantage.queryDailyAdjusted(symbol, since);
        dailyAdjusteds
            .filter((da) => da.splitCoefficient !== 1)
            .forEach((da) => {
                logger.info(da.symbol + ' split on ' + da.date + ' ' + da.splitCoefficient + ':1');
            });
        if (dailyAdjusteds.length === 0) {
            logger.info('no updates for ' + symbol);
            return;
        }
        allPromises.push(batchPut(db.DailyAdjusted, dailyAdjusteds));

        const sma15s = await alphavantage.querySMA(symbol, 15, since);
        const sma20s = await alphavantage.querySMA(symbol, 20, since);
        const sma50s = await alphavantage.querySMA(symbol, 50, since);
        const sma100s = await alphavantage.querySMA(symbol, 100, since);
        const sma200s = await alphavantage.querySMA(symbol, 200, since);
        const ema12s = await alphavantage.queryEMA(symbol, 12, since);
        const ema20s = await alphavantage.queryEMA(symbol, 20, since);
        const ema26s = await alphavantage.queryEMA(symbol, 26, since);
        const ema50s = await alphavantage.queryEMA(symbol, 50, since);
        const ema100s = await alphavantage.queryEMA(symbol, 100, since);
        const ema200s = await alphavantage.queryEMA(symbol, 200, since);
        const macds = await alphavantage.queryMACD(symbol, since);
        const rsis = await alphavantage.queryRSI(symbol, 14, since);
        const bbands = await alphavantage.queryBBands(symbol, 20, since);

        let technicalIndicators = [];
        for (let i = 0; i < dailyAdjusteds.length; i++) {
            let ti = { symbol: symbol, date: dailyAdjusteds[i].date };

            if (i < sma200s.length) {
                if (
                    sma15s[i].date !== dailyAdjusteds[i].date ||
                    sma20s[i].date !== dailyAdjusteds[i].date ||
                    sma50s[i].date !== dailyAdjusteds[i].date ||
                    sma100s[i].date !== dailyAdjusteds[i].date ||
                    sma200s[i].date !== dailyAdjusteds[i].date ||
                    ema12s[i].date !== dailyAdjusteds[i].date ||
                    ema20s[i].date !== dailyAdjusteds[i].date ||
                    ema26s[i].date !== dailyAdjusteds[i].date ||
                    ema50s[i].date !== dailyAdjusteds[i].date ||
                    ema100s[i].date !== dailyAdjusteds[i].date ||
                    ema200s[i].date !== dailyAdjusteds[i].date ||
                    macds[i].date !== dailyAdjusteds[i].date ||
                    rsis[i].date !== dailyAdjusteds[i].date ||
                    bbands[i].date !== dailyAdjusteds[i].date
                ) {
                    throw new Error('diff. date ' + symbol);
                }
            }
            if (sma15s[i]) ti.sma15 = sma15s[i].sma;
            if (sma20s[i]) ti.sma20 = sma20s[i].sma;
            if (sma50s[i]) ti.sma50 = sma50s[i].sma;
            if (sma100s[i]) ti.sma100 = sma100s[i].sma;
            if (sma200s[i]) ti.sma200 = sma200s[i].sma;
            if (ema12s[i]) ti.ema12 = ema12s[i].ema;
            if (ema20s[i]) ti.ema20 = ema20s[i].ema;
            if (ema26s[i]) ti.ema26 = ema26s[i].ema;
            if (ema50s[i]) ti.ema50 = ema50s[i].ema;
            if (ema100s[i]) ti.ema100 = ema100s[i].ema;
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

        allPromises.push(batchPut(db.TechnicalIndicators, technicalIndicators));
        return Promise.all(allPromises);
    } catch (err) {
        logger.error(symbol, err);
    }
}

const args = process.argv.slice(2);
const symbols = args[0] === '*' ? ALL_SYMBOLS : args[0].split(',');
const since = args[1] || '2018-01-01';

logger.info('getting data for ' + symbols + ' since ' + since + ' ...');

pMap(
    symbols.map((symbol) => ({ symbol, since })),
    updateSymbol,
    { concurrency: 1, stopOnError: false },
).then(() => {
    logger.info('done, waiting to finish ...');
});
