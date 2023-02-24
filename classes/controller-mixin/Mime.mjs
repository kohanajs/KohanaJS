import { ControllerMixin } from '@kohana/mvc';
import mime from 'mime';

class Mime extends ControllerMixin {
  static init(state) {
    const client = state.get('client');
    const { request } = client;
    client.headers['Content-Type'] = `${mime.getType(request.url) || 'text/html'}; charset=utf-8`;
  }
}

export default Mime;