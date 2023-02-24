/*
MIT License

Copyright (c) 2021 Kojin Nakana

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

*/

import * as url from 'url';
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

import { existsSync } from 'node:fs';
import path from 'node:path';
import { View } from '@kohana/mvc';

class KohanaJS {
  static #configs = new Set();

  static #configSources = new Map();

  static SYS_PATH = __dirname;

  static EXE_PATH = KohanaJS.SYS_PATH;

  static APP_PATH = KohanaJS.SYS_PATH;

  static MOD_PATH = KohanaJS.SYS_PATH;

  static VIEW_PATH = KohanaJS.SYS_PATH;

  static ENV = '';
  static ENV_DEVE = 'dev';
  static ENV_TEST = 'uat';
  static ENV_STAG = 'stg';
  static ENV_PROD = 'prd';

  static config = { classes: {}, view: {} };

  static configForceUpdate = true;

  static nodePackages = [];

  static classPath = new Map(); // {'ORM'          => 'APP_PATH/classes/ORM.js'}

  static viewPath = new Map(); // {'layout/index' => 'APP_PATH/views/layout/index'}

  static configPath = new Map(); // {'site.js       => 'APP_PATH/config/site.js'}

  static bootstrap = { modules: [] };

  static async init(opts = {}) {
    const options = {
      EXE_PATH: null,
      APP_PATH: null,
      MOD_PATH: null,
      VIEW_PATH: null,
      ...opts,
    };

    this.#configs = new Set();
    this.classPath = new Map();
    this.viewPath = new Map();
    this.nodePackages = [];

    // set paths
    this.#setPath(options);
    this.#loadBootStrap();
    this.initConfig(new Map([
      ['classes', await import('./config/classes')],
      ['view', await import('./config/view')],
    ]));
    this.#reloadModuleInit();

    return this;
  }

  static #setPath(opts) {
    this.EXE_PATH = opts.EXE_PATH || __dirname;
    this.APP_PATH = opts.APP_PATH || `${this.EXE_PATH}/application`;
    this.MOD_PATH = opts.MOD_PATH || `${this.APP_PATH}/modules`;
    this.VIEW_PATH = opts.VIEW_PATH || `${this.APP_PATH}/views`;
  }

  static #loadBootStrap() {
    const bootstrapFile = `${this.APP_PATH}/bootstrap.js`;
    if (!existsSync(path.normalize(bootstrapFile))) return;

    this.bootstrap = require(bootstrapFile);
    if(!this.bootstrap.modules)this.bootstrap.modules = [];
  }

  /**
   *
   * @param {Map} configMap
   */
  static initConfig(configMap) {
    configMap.forEach((v, k) => {
      this.#configs.add(k);

      const existConfigSource = KohanaJS.#configSources.get(k);
      if (v) KohanaJS.#configSources.set(k, { ...existConfigSource, ...v });
    });

    KohanaJS.#updateConfig();
  }

  static #reloadModuleInit() {
    // activate init.js in require('kohanajs-sample-module')
    KohanaJS.nodePackages.forEach(x => {
      const initPath = `${x}/init.js`;
      const filePath = path.normalize(initPath);
      if (!fs.existsSync(filePath)) return;

      require(initPath);
      delete require.cache[filePath];
    });

    // activate init.js in modules
    KohanaJS.bootstrap.modules.forEach(x => {
      const initPath = `${KohanaJS.MOD_PATH}/${x}/init.js`;
      const filePath = path.normalize(initPath);
      if (!fs.existsSync(path.normalize(filePath))) return;

      // load the init file
      require(initPath);
      // do not cache it.
      delete require.cache[filePath];
    });
  }

  static addNodeModule(dirname) {
    KohanaJS.nodePackages.push(dirname);
    return KohanaJS;
  }

  static flushCache() {
    if (KohanaJS.configForceUpdate) KohanaJS.#updateConfig();
    if (!KohanaJS.config.classes?.cache) KohanaJS.#clearRequireCache();
    if (!KohanaJS.config.view?.cache) KohanaJS.#clearViewCache();
    if (!KohanaJS.config.classes?.cache) KohanaJS.#reloadModuleInit();
  }

  static async import(pathToFile){
    // pathToFile may include file extension;
    const adjustedPathToFile = /\..*$/.test(pathToFile) ? pathToFile : (`${pathToFile}.mjs`);

    // if explicit set classPath to Class or required object, just return it.
    const c = this.classPath.get(adjustedPathToFile);

    if (c && typeof c !== 'string') {
      return c;
    }

    const mod = await import(this.#resolve(adjustedPathToFile, 'classes', KohanaJS.classPath));

    return mod.default || mod;
  }

  static resolveView(pathToFile) {
    return KohanaJS.#resolve(pathToFile, 'views', KohanaJS.viewPath);
  }

  // private methods
  static #resolve(pathToFile, prefixPath, store, forceUpdate = false) {
    if (/\.\./.test(pathToFile)) {
      throw new Error('invalid require path');
    }

    if (!store.get(pathToFile) || forceUpdate) {
      // search application, then modules
      const fetchList = [];
      if (prefixPath === 'views')fetchList.push(`${KohanaJS.VIEW_PATH}/${pathToFile}`);
      fetchList.push(`${KohanaJS.APP_PATH}/${prefixPath}/${pathToFile}`);
      fetchList.push(pathToFile);

      // load from app/modules
      [...KohanaJS.bootstrap.modules].reverse().forEach(x => fetchList.push(`${KohanaJS.MOD_PATH}/${x}/${prefixPath}/${pathToFile}`));

      fetchList.push(`${KohanaJS.SYS_PATH}/${prefixPath}/${pathToFile}`);
      [...KohanaJS.nodePackages].reverse().forEach(x => fetchList.push(`${x}/${prefixPath}/${pathToFile}`));

      fetchList.some(x => {
        if (existsSync(path.normalize(x))) {
          store.set(pathToFile, x);
          return true;
        }
        return false;
      });

      if (!store.get(pathToFile)) {
        throw new Error(`KohanaJS resolve path error: path ${pathToFile} not found. ${prefixPath} , ${JSON.stringify(store)} `);
      }
    }

    return store.get(pathToFile);
  }

  static #updateConfig() {
    KohanaJS.config = {};
    // search all config files
    KohanaJS.#configs.forEach(key => {
      KohanaJS.config[key] = {...KohanaJS.#configSources.get(key)}

      const fileName = `${key}.js`;

      try{
        KohanaJS.configPath.set(fileName, null); // never cache config file path.
        const file = KohanaJS.#resolve(fileName, 'config', KohanaJS.configPath, true);
        Object.assign(KohanaJS.config[key], require(file));
        delete require.cache[path.normalize(file)];
      }catch(e){
        //config file not found;
      }
    });
  }

  static #clearRequireCache() {
    KohanaJS.classPath.forEach((v, k) => {
      if (typeof v === 'string') {
        delete require.cache[path.normalize(v)];
        KohanaJS.classPath.delete(k);
      }
    });

    KohanaJS.configPath = new Map();
  }

  static #clearViewCache() {
    KohanaJS.viewPath = new Map();
    View.DefaultViewClass.clearCache();
  }
}

Object.freeze(KohanaJS.prototype);
export default KohanaJS;