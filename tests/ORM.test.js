import __dirname from "./KohanaJS/__dirname.mjs";

import {KohanaJS} from '../classes/KohanaJS';
import ORM from '../classes/ORM';
import defaultDatabaseAdapter from "./KohanaJS/orm/application/classes/ORMAdapterTest";
ORM.defaultAdapter = defaultDatabaseAdapter;

describe('orm test', () => {
  beforeEach(async () => {
    await KohanaJS.init({
      EXE_PATH: __dirname,
      APP_PATH: `${__dirname}/orm/application`,
      MOD_PATH: `${__dirname}/test1/modules`,
    });

  });

  afterEach(() => {

  });

  test('orm', async () => {
    KohanaJS.classPath.set('ORM', ORM);
    const KOJSORM = await KohanaJS.import('ORM');
    expect(KOJSORM).toBe(ORM);

    const obj = new ORM();
    const className = obj.constructor.name;

    expect(className).toBe('ORM');
    expect(ORM.tableName).toBe(null);
    // ORM is abstract class, should not found lowercase and tableName
  });

  test('alias model', async () => {
//    import AliasModel from "./orm/application/classes/AliasModel.mjs";
    const {default: AliasModel} = await import('./KohanaJS/orm/application/classes/AliasModel');
    expect(AliasModel.tableName).toBe('testmodels');
    expect(AliasModel.joinTablePrefix).toBe('testmodel');

    const model = await ORM.factory(AliasModel, 1);
    expect(model.id).toBe(1);
  });

  test('belongsTo', async () => {
    const Address = await ORM.import('Address');
    const Person = await ORM.import('Person');

    const peter = await new Person(1).read();
    expect(peter.id).toBe(1);

    const home = await new Address(20).read();
    home.person_id = 1;
    expect(home.id).toBe(20);

    const owner = await home.parent('person_id');
    expect(owner.id).toBe(1);
  });

  test('belongsToMany', async () => {
    const Product = await ORM.import('Product');
    const Tag = await ORM.import('Tag');

    const product = await ORM.factory(Product, 1);

    expect(product.id).toBe(1);
    const tags = await product.siblings(Tag);
    expect(Array.isArray(tags)).toBe(true);
  });

  test('add belongsToMany', async () => {
    const Product = await KohanaJS.import('model/Product');
    const Tag = await KohanaJS.import('model/Tag');

    const tagA = new Tag(null);
    tagA.name = 'white';
    tagA.write();

    const tagB = new Tag(null);
    tagB.name = 'liquid';
    tagB.write();

    const product = new Product(null);
    product.name = 'milk';
    product.write();
    product.add(tagA);
    product.write();
  });

  test('add duplicate belongsToMany', async () => {
    const Product = await KohanaJS.import('model/Product');
    const Tag = await KohanaJS.import('model/Tag');

    const tagA = new Tag(null);
    tagA.name = 'white';
    await tagA.write();

    const product = new Product(null);
    product.name = 'milk';
    await product.write();
    await product.add(tagA);
    await product.write();
    await product.add(tagA);
    await product.write();
  });

  test('remove belongsToMany', async () => {
    const Product = await KohanaJS.import('model/Product');
    const Tag = await KohanaJS.import('model/Tag');

    const tagA = new Tag(null);
    tagA.name = 'white';
    tagA.write();

    const product = new Product(null);
    product.name = 'milk';
    await product.write();
    await product.add(tagA);
    await product.write();

    await product.remove(tagA);
    await product.write();
  });

  test('delete', async () => {
    const Product = await KohanaJS.import('model/Product');
    const product = new Product(null);
    product.name = 'milk';
    product.write();
    product.delete();
  });

  test('delete and remove links', async () => {

  });

  test('lazy loading', async () => {
    const Product = await KohanaJS.import('model/Product');

    const product = new Product(null);
    try {
      await product.read();
      expect('this line should not be loaded').toBe(false);
    } catch (e) {
      expect(e.message).toBe('Product: No id and no value to read');
    }

    expect(product.name).toBe(null);

    product.id = 1;
    await product.read();

    expect(product.created_at).toBe(1);
  });

  test('delete unsaved object', async () => {
    const Product = await KohanaJS.import('model/Product');
    const product = new Product(null);
    try {
      await product.delete();
      expect('this line should not exec').toBe('');
    } catch (e) {
      expect(e.message).toBe('ORM delete Error, no id defined');
    }
  });

  test('abstract ORM adapter function coverage', async () => {
    const Person = await KohanaJS.import('model/Person');
    const Adapter = (await import('../classes/ORMAdapter')).default;
    const p = ORM.create(Person);
    const a = new Adapter(p, null);
    Adapter.defaultID();
    a.processValues();

    await a.read();
    await a.update([]);
    await a.insert([]);
    await a.delete();

    await a.hasMany('test', 'key');
    await a.belongsToMany('test', 'test', 'lk', 'fk');
    await a.add(p, 0, 'test', 'lk', 'fk');
    await a.remove(p, 'test', 'lk', 'fk');
    await a.removeAll('test', 'lk');

    await a.readAll();
    await a.readAll(new Map());
    await a.readBy('id', [1, 2, 3, 4]);
    await a.readWith([['', 'id', 'EQUAL', 1], ['AND', 'name', 'EQUAL', 'test']]);

    await a.deleteAll();
    await a.deleteAll(new Map());
    await a.deleteBy('id', [1, 2, 3, 4]);
    await a.deleteWith([['', 'id', 'EQUAL', 1], ['AND', 'name', 'EQUAL', 'test']]);

    await a.updateAll();
    await a.updateAll(new Map());
    await a.updateBy('id', [1, 2, 3, 4]);
    await a.updateWith([['', 'id', 'EQUAL', 1], ['AND', 'name', 'EQUAL', 'test']]);
    await a.insertAll([], [], []);

    Adapter.defaultID();
    Adapter.uuid();
    a.processValues();
    Adapter.translateValue([]);
    expect(true).toBe(true);
  });

  test('prepend model prefix path', async () => {
    await KohanaJS.init({ EXE_PATH: `${__dirname}/test15` });
    const Person = await ORM.import('Person');
    const p = new Person();
    expect(!!p).toBe(true);

    try {
      ORM.classPrefix = 'models/';
      await ORM.import('Person');
      expect('this line should not be run').expect(true);
    } catch (e) {
      ORM.classPrefix = 'model/';
      expect(e.message).toBe(`KohanaJS resolve path error: models/Person.mjs not found in [\n${KohanaJS.APP_PATH}/classes\n] , {} `);
    }
  });

  test('ORM require', async () => {
    await KohanaJS.init({ EXE_PATH: `${__dirname}/test15` });
    const Person = await ORM.import('Person');
    const p = new Person();
    expect(!!p).toBe(true);

    const P2 = await KohanaJS.import('model/Person');
    expect(Person === P2).toBe(true);
  });

  test('ORM snapshot', async () => {
    await KohanaJS.init({ EXE_PATH: `${__dirname}/test15` });
    const Person = await ORM.import('Person');
    const p = new Person();
    p.name = 'Alice';

    p.snapshot();
    p.name = 'Bob';
    p.snapshot();
    p.name = 'Charlie';

    const states = p.getStates();
    expect(states[0].name).toBe('Alice');
    expect(states[1].name).toBe('Bob');
  });

  test('ORM Eager Load', async () => {
    await KohanaJS.init({ EXE_PATH: `${__dirname}/orm` });
    const Address = await ORM.import('Address');

    const a = await ORM.factory(Address, 11);
    expect(a.person).toBe(undefined);

    await a.eagerLoad({
      with: ['Person'],
      person: {
        with: ['Address'],
        addresses: {
          with: ['Person'],
          person: { with: null },
        },
      },
    });

    expect(a.person.id).toBe(2);

    const Person = await ORM.import('Person');
    const person = await ORM.factory(Person, 2);

    await person.eagerLoad({
      with: ['Address'],
      addresses: { with: null },
    });

    const Product = await ORM.import('Product');
    const p = await ORM.factory(Product, 22);
    expect(p.tags).toBe(undefined);

    await p.eagerLoad({
      with: ['Tag'],
      tags: { with: null },
    });

    expect(p.tags.length).toBe(2);
  });

  test('no record on read', async () => {
    const Product = await ORM.import('Product');
    try {
      await ORM.factory(Product, 200);
      expect('this line not run').toBe('');
    } catch (e) {
      expect(e.message).toBe('Record not found. Product id:200');
    }
  });

  test('read By Value', async () => {
    const Product = await ORM.import('Product');
    const p = ORM.create(Product);
    p.name = 'Foo';
    await p.read();

    expect(p.id).toBe(88);
  });

  test('parent is undefined', async () => {
    const Address = await ORM.import('Address');
    const a = ORM.create(Address);
    try {
      await a.parent('tag_id');
      expect('this line should not run').toBe('');
    } catch (e) {
      expect(e.message).toBe('tag_id is not foreign key in Address');
    }
  });

  test('not have many to many relationship', async () => {
    const Product = await ORM.import('Product');
    const Tag = await ORM.import('Tag');
    const Person = await ORM.import('Person');
    const p = ORM.create(Product);
    await p.siblings(Tag);

    const t = ORM.create(Tag);
    await t.siblings(Product);

    try {
      await t.siblings(Person);
      expect('not run').toBe('');
    } catch (e) {
      expect(e.message).toBe('Tag and Person not have many to many relationship');
    }
  });

  test('remove all siblings', async () => {
    const Product = await ORM.import('Product');
    const Tag = await ORM.import('Tag');
    const p = ORM.create(Product);

    try {
      await p.removeAll(Tag);
      expect('not run').toBe('');
    } catch (e) {
      expect(e.message).toBe('Cannot remove Tag. Product not have id');
    }

    p.id = 1;
    await p.removeAll(Tag);
  });

  test('static methods', async () => {
    const Product = await ORM.import('Product');
    const noResult = await ORM.readAll(Product);
    expect(noResult).toStrictEqual(null);

    const result = await ORM.readAll(Product, { kv: new Map([['name', 'one']]) });
    expect(result.id).toBe(55);

    const results = await ORM.readAll(Product, { kv: new Map([['name', 'test']]) });
    expect(results.length).toBe(3);

    const r4 = await ORM.readBy(Product, 'name', ['empty']);
    expect(r4).toStrictEqual(null);

    const r5 = await ORM.readBy(Product, 'name', ['test']);
    expect(r5.length).toBe(2);

    const r6 = await ORM.readWith(Product, [['', 'price', 'EQUAL', '1'], ['AND', 'name', 'EQUAL', 'peter']]);
    expect(r6).toStrictEqual(null);

    const r7 = await ORM.readWith(Product, [['', 'price', 'EQUAL', '100'], ['AND', 'name', 'EQUAL', 'peter']]);
    expect(r7.length).toBe(2);

    const c = await ORM.count(Product);
    expect(c).toBe(0);

    await ORM.deleteAll(Product);
    await ORM.deleteBy(Product, 'name', ['test']);
    await ORM.deleteWith(Product, [['', 'price', 'EQUAL', '100'], ['AND', 'name', 'EQUAL', 'peter']]);
    await ORM.updateAll(Product, new Map([['name', ['test', 'one']]]), new Map([['price', 100]]));
    await ORM.updateBy(Product, 'name', ['test', 'one'], new Map([['price', 100]]));
    await ORM.updateWith(Product, [['', 'price', 'EQUAL', '1'], ['AND', 'name', 'EQUAL', 'peter']], new Map([['price', 100]]));

    await ORM.insertAll(Product, ['name', 'available'], [['foo', true], ['bar', true], ['tar', false]]);
  });

  test('static eager load', async () => {
    await KohanaJS.init({ EXE_PATH: `${__dirname}/orm` });
    const Address = await ORM.import('Address');

    const orms = [];
    orms.push(await ORM.factory(Address, 2));
    orms.push(await ORM.factory(Address, 3));
    orms.push(await ORM.factory(Address, 11));

    await ORM.eagerLoad(orms, {with :["Person"]}, {});

    console.log(orms);
  })
});
