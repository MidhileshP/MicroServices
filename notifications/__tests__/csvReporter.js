import fs from 'fs';
import path from 'path';

class CsvReporter {
  constructor(globalConfig, options) {
    this._globalConfig = globalConfig;
    this._options = options;
    this.results = [];
  }

  onTestResult(test, testResult, aggregatedResult) {
    testResult.testResults.forEach((result) => {
      this.results.push({
        testFile: path.relative(process.cwd(), result.ancestorTitles[0] || testResult.testFilePath),
        testSuite: result.ancestorTitles.join(' > '),
        testName: result.title,
        status: result.status,
        duration: result.duration || 0,
        failureMessages: result.failureMessages.join(' | ').replace(/,/g, ';'),
        errorMessage: result.failureMessages.length > 0 ? result.failureMessages[0].split('\n')[0] : ''
      });
    });
  }

  onRunComplete(contexts, results) {
    const csvHeader = 'Test File,Test Suite,Test Name,Status,Duration (ms),Error Message\n';
    const csvRows = this.results.map(result => 
      `"${result.testFile}","${result.testSuite}","${result.testName}","${result.status}",${result.duration},"${result.errorMessage}"`
    ).join('\n');

    const csvContent = csvHeader + csvRows;
    const outputPath = path.join(process.cwd(), this._options.outputFile || 'test-results.csv');

    fs.writeFileSync(outputPath, csvContent, 'utf8');
    console.log(`\n✅ Test results saved to: ${outputPath}`);
    console.log(`📊 Total tests: ${this.results.length}`);
    console.log(`✅ Passed: ${this.results.filter(r => r.status === 'passed').length}`);
    console.log(`❌ Failed: ${this.results.filter(r => r.status === 'failed').length}`);
    console.log(`⏭️  Skipped: ${this.results.filter(r => r.status === 'skipped').length}`);
  }
}

export default CsvReporter;

