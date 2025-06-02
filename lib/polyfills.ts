import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';

// Polyfill for Node.js built-in modules
if (typeof global.process === 'undefined') {
  global.process = {
    env: {},
    version: '',
    platform: 'react-native',
  } as any;
}

// Polyfill for stream module
if (typeof global.require === 'undefined') {
  global.require = (moduleName: string) => {
    if (moduleName === 'stream') {
      return {
        Duplex: class Duplex {
          constructor() {}
        },
        Readable: class Readable {
          constructor() {}
        },
        Writable: class Writable {
          constructor() {}
        },
        Transform: class Transform {
          constructor() {}
        },
      };
    }
    return {};
  };
}

// Polyfill for ReadableStream
if (typeof global.ReadableStream === 'undefined') {
  global.ReadableStream = class ReadableStream {
    constructor() {}
  };
} 