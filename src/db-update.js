'use strict';

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
        if (unprocessedResults.length === 0 && attempt > 1) {
            console.log('succeeded for', documents.length, 'documents for', model.Model.name, documents[0].symbol, 'in attempt', attempt);
        } else if (unprocessedResults.length > 0) {
            console.log('retrying', unprocessedResults.length, 'failed put(s) for', model.Model.name, unprocessedResults[0].unprocessedItems[0].symbol);
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
            console.log('retrying for ' + model.Model.name + ': ' + err.message);
            return batchPut(model, documents, ++attempt);
        }
        throw err;
    }
}

const args = process.argv.slice(2);
const symbols = (args[0] === '*') ? ALL_SYMBOLS : args[0].split(',');
const since = args[1] || '2018-01-01';

console.log('getting data for ' + symbols + ' since ' + since + ' ...');

symbols.forEach(async symbol => {
    console.log(symbol);

    try {
        let overview = await alphavantage.queryCompanyOverview(symbol);
        if (!overview.symbol) {
            // E.g. BYDDF and XIACF do not exist, so we just insert their symbol
            overview = { symbol: symbol };
        }
        const result = await db.CompanyOverview.update(overview);
        console.log('CompanyOverview', result);

        let values = await alphavantage.queryDailyAdjusted(symbol, since);
        let results = await batchPut(db.DailyAdjusted, values);

        let smas = await alphavantage.querySMA(symbol, 15, since);
        results = await batchPut(db.SMA15, smas);

        smas = await alphavantage.querySMA(symbol, 50, since);
        results = await batchPut(db.SMA50, smas);

        let emas = await alphavantage.queryEMA(symbol, 12, since);
        results = await batchPut(db.EMA12, emas);

        emas = await alphavantage.queryEMA(symbol, 26, since);
        results = await batchPut(db.EMA26, emas);

        emas = await alphavantage.queryEMA(symbol, 50, since);
        results = await batchPut(db.EMA50, emas);

        emas = await alphavantage.queryEMA(symbol, 200, since);
        results = await batchPut(db.EMA200, emas);

        const macds = await alphavantage.queryMACD(symbol, since);
        results = await batchPut(db.MACD, macds);

        const rsis = await alphavantage.queryRSI(symbol, 14, since);
        results = await batchPut(db.RSI, rsis);

        const bbands = await alphavantage.queryBBands(symbol, 20, since);
        results = await batchPut(db.BBands, bbands);
    } catch (err) {
        console.error(symbol, err);
    }
});
