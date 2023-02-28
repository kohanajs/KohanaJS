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

import { existsSync } from 'node:fs';
import path from 'node:path';
import { View } from '@kohana/mvc'
const __dirname = path.dirname(import.meta.url.replace("file:///", ""));

class KohanaJSConfigTool{
  nodeModuleConfigCache = new Map();
  configSources = new Map();
  data = {};

  add(configMap){
    configMap.forEach((v, k) => {
      if(!v)return;
      this.configSources.set(k, v);

      //if config map default value not set, set it
      if(!this.data[k])this.data[k] = v;
    });
  }

  async getConfigs(folder){
    const config = {};

    await Promise.all(Array.from(this.configSources.keys()).map(async key =>{
      //key is classes, database, view etc
      const targetConfigFile = folder+'/config/'+key+'.mjs';
      if(existsSync(targetConfigFile)){
        config[key] = await KohanaJS.import(targetConfigFile);
      }
    }));
    return config;
  }

  async update(){
    this.data = {};

    //load default config from config sources
    this.configSources.forEach((v, k) => {
      if(!v)return;
      this.data[k] = v;
    });

    //search all config files in node_modules
    await Promise.all(
      KohanaJS.nodePackages.map(async nodeModulePath => {
        //guard config loaded
        if(this.nodeModuleConfigCache.get(nodeModulePath))return;
        const c = await this.getConfigs(nodeModulePath)
        Object.assign(this.data, c);
        this.nodeModuleConfigCache.set(nodeModulePath, c);
      })
    );

    //search all config files in local modules
    await Promise.all(
      KohanaJS.bootstrap.modules.map(async moduleName => {
        const localModulePath = KohanaJS.MOD_PATH+'/'+moduleName;
        Object.assign( this.data, await this.getConfigs(localModulePath) );
      })
    );

    //search all config files in application
    Object.assign( this.data, await this.getConfigs(KohanaJS.APP_PATH) );

    //replace kohanaJS config
    KohanaJS.config = this.data;
  }

}

class KohanaJSFileLocator {
  static resolve(fileName, seekPaths, store, forceUpdate = false) {
    if (/\.\./.test(fileName)) throw new Error('invalid import file, should not contain ../');

    //guard if file already loaded
    if(store.get(fileName) && !forceUpdate)return store.get(fileName);

    //guard if file is absolute path
    if(existsSync(fileName))return fileName;

    seekPaths.some(x => {
      const fullPath = x + '/' + fileName;
      if (existsSync(path.normalize(fullPath))) {
        store.set(fileName, fullPath);
        return true;
      }
      return false;
    });

    if (!store.get(fileName)) {
      throw new Error(`KohanaJS resolve path error: ${fileName} not found in [\n${seekPaths.join('\n')}\n] , ${JSON.stringify(store)} `);
    }

    return store.get(fileName);
  }
}

class KohanaJS {
  static #classCacheId = 0;
  static #viewCacheId = 0;

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

  static config;

  static nodePackages = []; // this will not clear when reset.

  //cache of resolved path
  static classPath = new Map(); // {'ORM'          => 'APP_PATH/classes/ORM.js'}
  static viewPath = new Map(); // {'layout/index' => 'APP_PATH/views/layout/index'}

  static classesSeekPaths = [];
  static viewsSeekPaths = [];

  static bootstrap = { modules: [] };

  static configTool;

  static async init(opts = {}) {
    const options = {
      EXE_PATH: null,
      APP_PATH: null,
      MOD_PATH: null,
      VIEW_PATH: null,
      ...opts,
    };

    this.configTool = new KohanaJSConfigTool();
    this.configTool.add(
      new Map([
        ['classes', await this.#import('../config/classes')],
        ['view', await this.#import('../config/view')],
      ])
    );

    this.classPath = new Map();
    this.viewPath = new Map();
    this.bootstrap = { modules: [] }

    // set paths
    this.#setPath(options);
    await this.#loadBootStrap();
    await this.configTool.update();

    this.classesSeekPaths = [
      `${this.APP_PATH}/classes`,
      ...[...this.bootstrap.modules].reverse().map(x => `${this.MOD_PATH}/${x}/classes`),
      ...[...this.nodePackages].reverse().map(x => `${x}/classes`),
    ]

    this.viewsSeekPaths = [
      `${this.VIEW_PATH}`,
      ...[...this.bootstrap.modules].reverse().map(x => `${this.MOD_PATH}/${x}/views`),
      ...[...this.nodePackages].reverse().map(x => `${x}/views`),
    ]

    await this.#reloadModuleInit();

    return this;
  }

  static #setPath(opts) {
    this.EXE_PATH = opts.EXE_PATH || __dirname;
    this.APP_PATH = opts.APP_PATH || `${this.EXE_PATH}/application`;
    this.MOD_PATH = opts.MOD_PATH || `${this.APP_PATH}/modules`;
    this.VIEW_PATH = opts.VIEW_PATH || `${this.APP_PATH}/views`;
  }

  static async #loadBootStrap() {
    const bootstrapFile = `${this.APP_PATH}/bootstrap.mjs`;
    if (!existsSync(path.normalize(bootstrapFile))) return;

    this.bootstrap = await this.import(bootstrapFile);
    if(!this.bootstrap.modules)this.bootstrap.modules = [];
  }

  static async #reloadModuleInit() {
    // activate init.js in require('kohanajs-sample-module')
    await Promise.all(
      this.nodePackages.map(async x => {
        const initPath = `${x}/init.mjs`;
        const filePath = path.normalize(initPath);
        if (!existsSync(filePath)) return;
        return this.#import(initPath);
      })
    )

    await Promise.all(
      this.bootstrap.modules.map(async x => {
        const initPath = `${this.MOD_PATH}/${x}/init.mjs`;
        const filePath = path.normalize(initPath);
        if (!existsSync(filePath)) return;
        return this.#import(initPath);
      })
    );
    // activate init.js in modules

  }

  static addNodeModule(dirname) {
    this.nodePackages.push(path.dirname(dirname.replace('file:///', '')));
    return this;
  }

  static async flushCache() {
      if (!KohanaJS.config.classes?.cache){
        await this.configTool.update();
        this.#clearClassCache();
        await this.#reloadModuleInit();
      }
      if (!KohanaJS.config.view?.cache) this.#clearViewCache();
  }

  static async import(pathToFile){
    // if explicit set classPath to Class or required object, just return it.
    const c = this.classPath.get(pathToFile);
    if (c && typeof c !== 'string')return c;


    // pathToFile may include file extension;
    // check pathToFile has file extension, if not, add .mjs
    const adjustedPathToFile = /\..*$/.test(pathToFile) ? pathToFile : (`${pathToFile}.mjs`);

    const file = KohanaJSFileLocator.resolve(adjustedPathToFile, this.classesSeekPaths, this.classPath);
    return this.#import(file);
  }

  static async #import(file) {
    try{
      const mod = await import(file + '?cache=' + this.#classCacheId);
      return mod.default || mod;
    }catch(e){
      return file
    }
  }

  static resolveView(pathToFile) {
    return KohanaJSFileLocator.resolve(pathToFile, this.viewsSeekPaths, this.viewPath);
  }

  static #clearClassCache() {
    this.#classCacheId++;
    this.classPath = new Map();
  }

  static #clearViewCache() {
    this.#viewCacheId++
    this.viewPath = new Map();
    View.DefaultViewClass.clearCache();
  }
}

Object.freeze(KohanaJS.prototype);

export {
  KohanaJS,
  KohanaJSConfigTool,
  KohanaJSFileLocator
};