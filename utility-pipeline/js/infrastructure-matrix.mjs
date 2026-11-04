/** ES-module entry point for the Quickwell Utility Pipeline Matrix.
 * The Studio repository uses "type": "module"; import these functions rather
 * than using CommonJS require().
 */
export { normalizeOnDevicePayload, calculateSpreadMath, toSpreadsheetCSV } from './engine.mjs';
