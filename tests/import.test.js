import path from "node:path";
import __dirname from './__dirname.mjs';
import __dirname2 from './KohanaJS/__dirname.mjs';

describe('import function test', () => {
  test('run script in module', async () => {
    const M = await import('./testmodule.mjs');
    const N = await import('./testmodule.mjs');
    const O = await import('./testmodule.mjs?reload');

    expect(M === N).toBe(true);
    expect(M === O).toBe(false);
  });

  test('__dirname', async () => {
    const M = await import('./testmodule.mjs');
    expect(path.dirname(M.default.url.replace('file:///', ''))).toBe(__dirname)
  })

  test('dirname in differ folder', async () => {
    expect(__dirname2).toBe(__dirname+'/KohanaJS')
  })
});