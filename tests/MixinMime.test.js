import { Controller } from '@kohana/mvc';
import ControllerMixinMime from '../classes/controller-mixin/Mime';

class C extends Controller {
  static mixins = [ControllerMixinMime];
}

describe('ControllerMime test', () => {
  test('constructor', async () => {
    const c = new C({ url: '/articles/recent.aspx' });
    const r = await c.execute();
    expect(r.headers['Content-Type']).toBe('text/html; charset=utf-8');
  });

  test('javascript', async () => {
    const c = new C({ url: '/articles/recent.js' });
    const r = await c.execute();
    expect(r.headers['Content-Type']).toBe('application/javascript; charset=utf-8');
  });

  test('html', async () => {
    const c = new C({ url: '/articles/recent' });
    const r = await c.execute();
    expect(r.headers['Content-Type']).toBe('text/html; charset=utf-8');
  });

  test('javascript', async () => {
    const c = new C({ url: '/articles/recent.json' });
    const r = await c.execute();
    expect(r.headers['Content-Type']).toBe('application/json; charset=utf-8');
  });
});
