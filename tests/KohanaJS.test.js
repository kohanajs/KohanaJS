import path from 'node:path';
import __dirname from './__dirname.mjs';
import testDir from './KohanaJS/__dirname.mjs';
import {KohanaJS as kohanaJS, KohanaJSConfigTool, KohanaJSFileLocator} from '../classes/KohanaJS';
import {existsSync, unlinkSync, copyFileSync} from "node:fs";

describe('KohanaJS test', () => {
  const EXE_PATH = `${__dirname.replace(/\/tests$/, '')}/server`;
  const packagePath = `${testDir}/test1`;

  beforeEach(() => {});

  test('APP Path', async () => {
    await kohanaJS.init({ EXE_PATH });
    expect(kohanaJS.APP_PATH).toBe(`${EXE_PATH}/application`);
    expect(kohanaJS.MOD_PATH).toBe(`${EXE_PATH}/application/modules`);
  });

  test('MOD Path is not in application folder', async () => {
    await kohanaJS.init({ EXE_PATH: packagePath, MOD_PATH: `${packagePath}/modules` });
    expect(kohanaJS.APP_PATH).toBe(`${packagePath}/application`);
    expect(kohanaJS.MOD_PATH).toBe(`${packagePath}/modules`);

    //reset path
    await kohanaJS.init({ EXE_PATH });
    expect(kohanaJS.APP_PATH).toBe(`${EXE_PATH}/application`);
    expect(kohanaJS.MOD_PATH).toBe(`${EXE_PATH}/application/modules`);
  })

  test('__dirname', async () => {
    expect(__dirname).toBe(path.dirname(import.meta.url).replace('file:///', ''));
  });

  test('bootstrap file exists', async () => {
    await kohanaJS.init({ EXE_PATH: packagePath, MOD_PATH: `${packagePath}/modules` });
    expect(kohanaJS.APP_PATH).toBe(`${packagePath}/application`);
    const file = path.normalize(kohanaJS.APP_PATH + '/bootstrap.mjs');
    expect(existsSync(file)).toBe(true);
  });

  test('bootstrap', async () => {
    await kohanaJS.init({ EXE_PATH });
    expect(kohanaJS.bootstrap).toEqual({ modules: [] });


    await kohanaJS.init({ EXE_PATH: packagePath, MOD_PATH: `${packagePath}/modules` });
    expect(kohanaJS.APP_PATH).toBe(`${packagePath}/application`);
    expect(existsSync(path.normalize(kohanaJS.APP_PATH + '/bootstrap.mjs'))).toBe(true);

    expect(kohanaJS.bootstrap).toEqual({ modules: ['test'] });
  });

  test('Config', async () => {
    await kohanaJS.init({ EXE_PATH });
    expect(kohanaJS.config).toEqual({ classes: { cache: false }, view: { cache: false } });

    await kohanaJS.init({ EXE_PATH: packagePath, MOD_PATH: `${packagePath}/modules` });
    kohanaJS.configTool.getConfigs(kohanaJS.APP_PATH)

    expect(kohanaJS.bootstrap).toEqual({ modules: ['test'] });
    expect(await kohanaJS.configTool.getConfigs(kohanaJS.APP_PATH)).toEqual({ classes: { cache: true } });

    expect(kohanaJS.config).toEqual({ classes: { cache: true }, view: { cache: false } });
  });

  test('kohanaJS.import', async () => {
    await kohanaJS.init({ EXE_PATH: packagePath, MOD_PATH: `${packagePath}/modules` });

    expect(kohanaJS.MOD_PATH).toBe(`${packagePath}/modules`);

    const Test = await kohanaJS.import('Test');
    const t = new Test();
    expect(t.getFoo()).toBe('bar');
  });

  test('switch package', async () => {
    await kohanaJS.init({ EXE_PATH: packagePath, MOD_PATH: `${packagePath}/modules` });
    expect(kohanaJS.MOD_PATH).toBe(`${packagePath}/modules`);

    let T = await kohanaJS.import('Test');
    const t1 = new T();
    expect(t1.getFoo()).toBe('bar');

    const Foo1 = await kohanaJS.import('Foo');
    const f1 = new Foo1();
    expect(f1.getFoo()).toBe('fooo');

    await kohanaJS.init({ EXE_PATH: `${testDir}/test2`, MOD_PATH: `${testDir}/test2/modules` });
    expect(kohanaJS.MOD_PATH).toBe(`${testDir}/test2/modules`);

    T = await kohanaJS.import('Test');
    const t2 = new T();
    expect(t2.getFoo()).toBe('tar');

    try {
      const Foo2 = await kohanaJS.import('Foo');
      // eslint-disable-next-line no-unused-vars
      const f2 = new Foo2();
    } catch (e) {
      expect(e.message.replace(/ {[^}]+}/, '')).toBe(`KohanaJS resolve path error: Foo.mjs not found in [\n${kohanaJS.APP_PATH}/classes\n${kohanaJS.MOD_PATH}/test/classes\n] , {} `);
    }
  });

  test('application folder', async () => {
    await kohanaJS.init({ EXE_PATH: `${packagePath}` });
    expect(kohanaJS.APP_PATH).toBe(`${packagePath}/application`);

    const Foo1 = await kohanaJS.import('Foo');
    const f1 = new Foo1();
    expect(f1.getFoo()).toBe('fooo');

    await kohanaJS.init({ EXE_PATH: `${testDir}/test2` });
    expect(kohanaJS.APP_PATH).toBe(`${testDir}/test2/application`);

    try {
      const Foo2 = await kohanaJS.import('Foo');
      // eslint-disable-next-line no-unused-vars
      const f2 = new Foo2();
    } catch (e) {
      expect(e.message.replace(/ {[^}]+}/, '')).toBe(`KohanaJS resolve path error: Foo.mjs not found in [\n${kohanaJS.APP_PATH}/classes\n${kohanaJS.MOD_PATH}/test/classes\n] , {} `);
    }
  });

  test('custom module folder', async () => {
    await kohanaJS.init({ EXE_PATH: `${testDir}/test1`, APP_PATH: `${testDir}/test3/application`, MOD_PATH: `${testDir}/test1/modules` });
    expect(kohanaJS.APP_PATH).toBe(`${testDir}/test3/application`);
    expect(kohanaJS.MOD_PATH).toBe(`${testDir}/test1/modules`);

    const Foo1 = await kohanaJS.import('Foo');// test3/Foo
    const f1 = new Foo1();
    expect(f1.getFoo()).toBe('waa');

    const Test = await kohanaJS.import('Test');
    const t = new Test();
    expect(t.getFoo()).toBe('bar');
  });

  test('path not found', async () => {
    try {
      await kohanaJS.import('NotFound');
    } catch (e) {
      expect(e.message.replace(/ {[^}]+}/, '')).toBe(`KohanaJS resolve path error: NotFound.mjs not found in [\n${kohanaJS.APP_PATH}/classes\n${kohanaJS.MOD_PATH}/test/classes\n] , {} `);
    }
  });

  test('inline modules init', async () => {
    expect(global.testInit).toBe(undefined);
    await kohanaJS.init({ EXE_PATH: `${testDir}/test4`, MOD_PATH: `${testDir}/test4/modules` });
    expect(global.testInit).toBe(true);
    delete global.testInit;
  });

  test('npm modules init ', async () => {
    expect(global.testInit).toBe(undefined);
    await kohanaJS.init({ EXE_PATH: `${testDir}/test5` });
    expect(global.testInit).toBe(true);
  });

  test('clear cache', async () => {
    await kohanaJS.init({ EXE_PATH: `${testDir}/test6` });
    const Foo = await kohanaJS.import('Foo');
    expect(Foo.id).toBe(1);

    const Foo2 = await kohanaJS.import('Foo');
    expect(Foo2.id).toBe(1);

    kohanaJS.configForceUpdate = false;
    kohanaJS.config.classes.cache = true;
    await kohanaJS.flushCache();

    const Foo3 = await kohanaJS.import('Foo');
    expect(Foo3.id).toBe(1);

    kohanaJS.config.classes.cache = false;
    kohanaJS.config.view.cache = false;
    await kohanaJS.flushCache();
    // jest override require, need to use reset modules to invalidate
//    jest.resetModules();

    const Foo4 = await kohanaJS.import('Foo');
    expect(Foo4.id).toBe(2);

    const ins = new Foo4();
    expect(ins.getFooId()).toBe(2);

    kohanaJS.config.classes.cache = true;
    kohanaJS.config.view.cache = true;
    await kohanaJS.flushCache();
    // change config after validateCache. otherwise the config file will over write it.

    // jest override require, need to use reset modules to invalidate

    expect(kohanaJS.config.view.cache).toBe(true);

    kohanaJS.configForceUpdate = true;
  });

  test('resolveView', async () => {
    await kohanaJS.init({ EXE_PATH: `${testDir}/test7`, VIEW_PATH: `${testDir}/test7/application/views`});
    const viewFile = await kohanaJS.resolveView('test.html');
    expect(viewFile).toBe(`${testDir}/test7/application/views/test.html`);
  });

  test('config path', async () => {
    await kohanaJS.init({ EXE_PATH: `${testDir}/test8` });

    if (existsSync(`${kohanaJS.APP_PATH}/config/salt.mjs`)) {
      unlinkSync(`${kohanaJS.APP_PATH}/config/salt.mjs`);
    }

    kohanaJS.configForceUpdate = true;

    await kohanaJS.configTool.add(new Map([['salt', {value:'hello'}]]));

    expect(kohanaJS.config.salt.value).toBe('hello');

    copyFileSync(path.normalize(`${kohanaJS.APP_PATH}/config/salt.default.mjs`), path.normalize(`${kohanaJS.APP_PATH}/config/salt.mjs`));

    await kohanaJS.flushCache();
    expect(kohanaJS.config.salt.value).toBe('default salt 1');

    unlinkSync(`${kohanaJS.APP_PATH}/config/salt.mjs`);

    try {
      await kohanaJS.flushCache();
    } catch (e) {
      expect(e.message).toBe(`KohanaJS resolve path error: salt.mjs not found in [] config , {} `);
    }

    expect(kohanaJS.config.salt.value).toBe('hello');
  });

  test('setPath default value', async () => {
    await kohanaJS.init();
    expect(path.normalize(`${kohanaJS.EXE_PATH}/`)).toBe(path.normalize(`${__dirname}/../classes/`));
  });

  test('set all init value', async () => {
    await kohanaJS.init({
      EXE_PATH: `${testDir}/test1`,
      APP_PATH: `${testDir}/test2/application`,
      MOD_PATH: `${testDir}/test3/modules`,
    });
    expect(kohanaJS.EXE_PATH).toBe(`${testDir}/test1`);
    expect(kohanaJS.APP_PATH).toBe(`${testDir}/test2/application`);
    expect(kohanaJS.MOD_PATH).toBe(`${testDir}/test3/modules`);
  });

  test('test default MODPATH ', async () => {
    await kohanaJS.init({
      EXE_PATH: `${testDir}/test1`,
      APP_PATH: `${testDir}/test2/application`,
    });
    expect(kohanaJS.EXE_PATH).toBe(`${testDir}/test1`);
    expect(kohanaJS.APP_PATH).toBe(`${testDir}/test2/application`);
    expect(kohanaJS.MOD_PATH).toBe(`${testDir}/test2/application/modules`);
  });

  test('kohanaJS nodePackages without init', async () => {
    await kohanaJS.init({ EXE_PATH: `${testDir}/test9` });
    expect(kohanaJS.nodePackages.length).toBe(1);
  });

  test('kohanaJS require file with extension', async () => {
    await kohanaJS.init({ EXE_PATH: `${testDir}/test10` });
    const Foo = await kohanaJS.import('Foo.mjs');
    const ins = new Foo();
    expect(ins.getFoo()).toBe('bar');
  });

  test('should fail if require contain ../ ', async () => {
    try {
      await kohanaJS.import('../hello');
      expect('this line should not run').toBe('');
    } catch (e) {
      expect(e.message).toBe('invalid import file, should not contain ../');
    }

    try {
      await kohanaJS.import('foo/../hello');
      expect('this line should not run').toBe('');
    } catch (e) {
      expect(e.message).toBe('invalid import file, should not contain ../');
    }
  });

  test('specific kohanaJS.require file', async () => {
    kohanaJS.classPath.set('foo/Bar.mjs', path.normalize(`${testDir}/test14/Bar`));
    const Bar = await kohanaJS.import('foo/Bar');
    const bar = new Bar();
    expect(bar.greeting()).toBe('Hello from Bar');

    kohanaJS.classPath.set('kaa/Tar.mjs', path.normalize(`${testDir}/test14/Tar.mjs`));
    const Tar = await kohanaJS.import('kaa/Tar.mjs');
    const tar = new Tar();
    expect(tar.greeting()).toBe('Hello from Tar');
  });

  test('explict set class to KohanaJS.require', async () => {
    const C = class Collection {};
    kohanaJS.classPath.set('model/Collection.mjs', C);
    const C2 = await kohanaJS.import('model/Collection');

    expect(C === C2).toBe(true);
  });
});
