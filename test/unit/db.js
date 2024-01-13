'use strict';

const expect = require('chai').expect;

const db = require('../../src/db');

describe('db', () => {
    describe('#handleThroughput()', () => {
        it('should work for normal case', () => {
            return db.handleThroughput((params) => {
                expect(params).to.equal('123');
            }, '123');
        });

        it('should work for ProvisionedThroughputExceededException', () => {
            class DynamoDBError extends Error {
                constructor(type, ...params) {
                    super(...params);
                    this.__type = type;
                }
            }

            let thrown = false;
            return db.handleThroughput((params) => {
                if (!thrown) {
                    thrown = true;
                    throw new DynamoDBError('#ProvisionedThroughputExceededException');
                }
                expect(params).to.equal('123');
            }, '123');
        });

        it('should work for other Exception', (done) => {
            db.handleThroughput((params) => {
                throw new Error('expected exception');
            }, '123')
                .then(() => {
                    throw new Error("shouldn't be here");
                })
                .catch((err) => {
                    if (err.message !== 'expected exception') {
                        // Evil hack: calling done() twice to make it fail, as re-throwing err here just results in a timeout :(
                        console.error(err);
                        done();
                    }
                    done();
                });
        });
    });

    describe('#CompanyOverviewSchema.symbol.validate()', () => {
        it('should work for AMZN', () => {
            expect(db.CompanyOverviewSchema.symbol.validate('AMZN')).to.be.true;
        });
    });

    describe('#DailyAdjustedSchema.symbol.validate()', () => {
        it('should work for AMZN', () => {
            expect(db.DailyAdjustedSchema.symbol.validate('AMZN')).to.be.true;
        });
    });

    describe('#DailyAdjustedSchema.date.validate()', () => {
        it('should work for 2021-01-04', () => {
            expect(db.DailyAdjustedSchema.date.validate('2021-01-04')).to.be.true;
        });
    });

    describe('#TechnicalIndicatorsSchema.symbol.validate()', () => {
        it('should work for AMZN', () => {
            expect(db.TechnicalIndicatorsSchema.symbol.validate('AMZN')).to.be.true;
        });
    });

    describe('#TechnicalIndicatorsSchema.date.validate()', () => {
        it('should work for 2021-01-04', () => {
            expect(db.TechnicalIndicatorsSchema.date.validate('2021-01-04')).to.be.true;
        });
    });

    describe('#TechnicalIndicatorsSchema.rsi.validate()', () => {
        it('should fail for -0.1', () => {
            expect(db.TechnicalIndicatorsSchema.rsi.validate(-0.1)).to.be.false;
        });

        it('should work for 0.0', () => {
            expect(db.TechnicalIndicatorsSchema.rsi.validate(0.0)).to.be.true;
        });

        it('should work for 30.0', () => {
            expect(db.TechnicalIndicatorsSchema.rsi.validate(30.0)).to.be.true;
        });

        it('should work for 70.0', () => {
            expect(db.TechnicalIndicatorsSchema.rsi.validate(70.0)).to.be.true;
        });

        it('should work for 100.0', () => {
            expect(db.TechnicalIndicatorsSchema.rsi.validate(100.0)).to.be.true;
        });

        it('should fail for 100.1', () => {
            expect(db.TechnicalIndicatorsSchema.rsi.validate(100.1)).to.be.false;
        });
    });
});
