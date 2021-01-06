'use strict';

const expect = require('chai').expect;

const db = require('../../src/db');

describe('db', () => {
    describe('#handleThroughput()', () => {
        it('should work for normal case', () => {
            return db.handleThroughput(params => {
                expect(params).to.equal('123');
            },
            '123');
        });

        it('should work for ProvisionedThroughputExceededException', () => {
            class DynamoDBError extends Error {
                constructor(code, ...params) {
                    super(...params);
                    this.code = code;
                }
            }

            let thrown = false;
            return db.handleThroughput(params => {
                if (!thrown) {
                    thrown = true;
                    throw new DynamoDBError('ProvisionedThroughputExceededException');
                }
                expect(params).to.equal('123');
            },
            '123');
        });

        it('should work for other Exception', done => {
            db.handleThroughput(params => { throw new Error('expected exception'); }, '123')
                .then(() => { throw new Error("shouldn't be here"); })
                .catch(err => {
                    if (err.message !== 'expected exception') {
                        // Evil hack: calling done() twice to make it fail, as re-throwing err here just results in a timeout :(
                        console.error(err);
                        done();
                    }
                    done();
                });
        });
    });

    describe('#CompanyOverview.symbol.validate()', () => {
        it('should work for AMZN', () => {
            const schemaObject = db.CompanyOverview.Model.schemas[0].schemaObject;
            expect(schemaObject.symbol.validate('AMZN')).to.be.true;
        });
    });

    describe('#RSI.symbol.validate()', () => {
        it('should work for AMZN', () => {
            const schemaObject = db.RSI.Model.schemas[0].schemaObject;
            expect(schemaObject.symbol.validate('AMZN')).to.be.true;
        });
    });

    describe('#RSI.date.validate()', () => {
        it('should work for 2021-01-04', () => {
            const schemaObject = db.RSI.Model.schemas[0].schemaObject;
            expect(schemaObject.date.validate('2021-01-04')).to.be.true;
        });
    });

    describe('#RSI.rsi.validate()', () => {
        it('should fail for -0.1', () => {
            const schemaObject = db.RSI.Model.schemas[0].schemaObject;
            expect(schemaObject.rsi.validate(-0.1)).to.be.false;
        });

        it('should work for 0.0', () => {
            const schemaObject = db.RSI.Model.schemas[0].schemaObject;
            expect(schemaObject.rsi.validate(0.0)).to.be.true;
        });

        it('should work for 30.0', () => {
            const schemaObject = db.RSI.Model.schemas[0].schemaObject;
            expect(schemaObject.rsi.validate(30.0)).to.be.true;
        });

        it('should work for 70.0', () => {
            const schemaObject = db.RSI.Model.schemas[0].schemaObject;
            expect(schemaObject.rsi.validate(70.0)).to.be.true;
        });

        it('should work for 100.0', () => {
            const schemaObject = db.RSI.Model.schemas[0].schemaObject;
            expect(schemaObject.rsi.validate(100.0)).to.be.true;
        });

        it('should fail for 100.1', () => {
            const schemaObject = db.RSI.Model.schemas[0].schemaObject;
            expect(schemaObject.rsi.validate(100.1)).to.be.false;
        });
    });
});
