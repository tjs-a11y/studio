Self-hosted on-device OCR for Quickwell Pilot (loaded only when someone chooses a photo or a scanned PDF).

File                                   Bytes      From (npm)                         License
tesseract.min.js                       66,654     tesseract.js@5.1.1 dist            Apache-2.0 (LICENSE-tesseract.js.md)
worker.min.js                          123,686    tesseract.js@5.1.1 dist            Apache-2.0 (bundles MIT/BSD parts, see headers)
tesseract-core-simd-lstm.wasm.js       3,938,657  tesseract.js-core@5.1.1            Apache-2.0 (LICENSE-tesseract.js-core.txt)
tesseract-core-lstm.wasm.js            3,938,277  tesseract.js-core@5.1.1            Apache-2.0
lang/eng.traineddata.gz                2,952,873  @tesseract.js-data/eng@1.0.0, 4.0.0_best_int   Apache-2.0 data (tesseract-ocr/tessdata_best, lang/LICENSE-tessdata.txt); npm package metadata says MIT
lang/spa.traineddata.gz                2,100,190  @tesseract.js-data/spa@1.0.0, 4.0.0_best_int   same

Only the "sourceMappingURL" comment line was removed from the two tesseract.js files (the .map files are not shipped).
A visitor downloads one core (SIMD or not, picked by the worker) plus one or two language files: about 6.9-9 MB, once (cached in IndexedDB by tesseract.js).
