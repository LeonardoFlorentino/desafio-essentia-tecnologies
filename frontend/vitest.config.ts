import { defineConfig } from 'vitest/config';

// Merged by the Angular unit-test builder (angular.json → test.options.runnerConfig).
export default defineConfig({
  test: {
    // By default Vitest starts one worker per CPU core; each holds its own Angular test build,
    // which exhausts memory on machines with many cores and little RAM. Two keep it fast enough.
    maxWorkers: 2,
  },
});
