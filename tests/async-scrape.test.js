const { expect } = require('chai');
const scrape = require("./../index.js");
const yargs = require('yargs');

const argv = yargs
  .option('queries', {
    alias: 'q',
    describe: 'Number of tests to be performed',
    type: 'number',
    demandOption: true,
  })
  .option('timeout', {
    alias: 't',
    describe: 'Timeout for each scraping request in milliseconds',
    type: 'number',
    default: 5000,
  })
  .argv;

describe('Scrape Function Tests', () => {
  for (let i = 0; i < argv.queries; i++) {
    it(`Test ${i + 1}: should successfully scrape data`, async function () {
      this.timeout(argv.timeout + 1000);

      try {
        const productData = await scrape('1005005271402288', {
          reviewsCount: 20,
          rating: 2,
        });
        expect(productData).to.exist;
      } catch (error) {
        throw new Error(`Test ${i + 1} failed: ${error.message}`);
      }
    });
  }
});
