import path from 'node:path';
export default path.dirname(import.meta.url).replace(/^file:\/\/\//, '');