const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

function source(name, replacements = {}, append = '') {
  const mod = new Module(__filename); mod.paths = module.paths;
  mod.require = name => Object.hasOwn(replacements, name) ? replacements[name] : require(name);
  const text = fs.readFileSync(path.join(__dirname, '../src', name), 'utf8');
  mod._compile(ts.transpileModule(text + append, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020,
  } }).outputText, __filename);
  return mod.exports;
}

const photos = source('services/matrimonyPhotos.ts');
const file = (name = 'portrait.png', type = 'image/png', content = 'photo') => new File([content], name, { type, lastModified: 123 });
const flush = () => new Promise(resolve => setImmediate(resolve));
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };

async function browser(options, work) {
  const original = { Image: global.Image, document: global.document, create: URL.createObjectURL, revoke: URL.revokeObjectURL };
  const urls = new Map(), created = [], revoked = [], draws = [], encodes = [], images = [], canvases = [];
  let counter = 0, decoding = 0, peak = 0;
  URL.createObjectURL = value => { const url = 'blob:test-' + ++counter; urls.set(url, value); created.push(url); return url; };
  URL.revokeObjectURL = url => { revoked.push(url); urls.delete(url); };
  global.Image = class {
    naturalWidth = options.width || 3200;
    naturalHeight = options.height || 2400;
    constructor() { images.push(this); }
    set src(url) {
      const value = urls.get(url);
      decoding++; peak = Math.max(peak, decoding);
      const done = () => { decoding--; if (options.badName === value.name) this.onerror?.(); else this.onload?.(); };
      if (options.decode) options.decode(done); else queueMicrotask(done);
    }
    removeAttribute(name) { assert.equal(name, 'src'); this.removed = true; }
  };
  global.document = { createElement(name) {
    assert.equal(name, 'canvas');
    const context = {
      fillRect(...args) { draws.push(['fill', this.fillStyle, ...args]); },
      drawImage(...args) { draws.push(['draw', ...args]); },
    };
    const canvas = { width: 0, height: 0,
      getContext: () => options.noContext ? null : context,
      toBlob(callback, type, quality) {
        encodes.push({ width: this.width, height: this.height, type, quality });
        const size = options.size ? options.size(quality) : 700;
        const done = () => callback(options.nullBlob ? null : new Blob([new Uint8Array(size)], { type }));
        if (options.encode) options.encode(done); else queueMicrotask(done);
      },
    };
    canvases.push(canvas); return canvas;
  } };
  try { await work({ urls, created, revoked, draws, encodes, images, canvases, peak: () => peak }); }
  finally { global.Image = original.Image; global.document = original.document; URL.createObjectURL = original.create; URL.revokeObjectURL = original.revoke; }
}

test('validation allows optional photos, supported MIME aliases, filename fallback and the exact original size limit', () => {
  photos.validateMatrimonyPhotos([]);
  for (const [name, type] of [['p.jpg', 'image/jpeg'], ['p.jpg', 'image/jpg'], ['p.png', 'image/png'], ['p.webp', 'image/webp'], ['P.JPEG', ''], ['p.PNG', ''], ['p.WEBP', '']]) {
    photos.validateMatrimonyPhotos([file(name, type)]);
  }
  photos.validateMatrimonyPhotos([{ name: 'big.jpg', type: 'image/jpeg', size: 20 * 1024 * 1024 }]);
  photos.validateMatrimonyPhotos([file()], 4);
  assert.throws(() => photos.validateMatrimonyPhotos([file()], 5), /5 photos in total.*Remove/);
  assert.throws(() => photos.validateMatrimonyPhotos([file('p.heic', 'image/heic')]), /JPEG, PNG or WebP/);
  assert.throws(() => photos.validateMatrimonyPhotos([file('p.jpg', 'application/octet-stream')]), /supported/);
  assert.throws(() => photos.validateMatrimonyPhotos([file('p.txt', '')]), /supported/);
  assert.throws(() => photos.validateMatrimonyPhotos([file('p.png', 'image/png', '')]), /empty/);
  assert.throws(() => photos.validateMatrimonyPhotos([{ name: 'big.jpg', type: 'image/jpeg', size: 20 * 1024 * 1024 + 1 }]), /20 MB.*smaller/);
});

test('all files are validated before browser decoding, including count limits', async () => {
  await assert.rejects(photos.processMatrimonyPhotos([file(), file('bad.gif', 'image/gif')]), /supported/);
  await assert.rejects(photos.processMatrimonyPhotos(Array.from({ length: 6 }, () => file())), /5 photos/);
  assert.deepEqual(await photos.processMatrimonyPhotos([]), []);
});

test('native dimensions are resized sequentially, painted white and encoded at JPEG quality 0.82', async () => {
  await browser({}, async state => {
    const result = await photos.processMatrimonyPhotos([file('one.PNG'), file('two.webp', 'image/webp')]);
    assert.equal(state.peak(), 1);
    assert.deepEqual(result.map(item => [item.name, item.type, item.size, item.lastModified]), [['one.jpg', 'image/jpeg', 700, 123], ['two.jpg', 'image/jpeg', 700, 123]]);
    assert.deepEqual(state.encodes, Array(2).fill({ width: 1600, height: 1200, type: 'image/jpeg', quality: 0.82 }));
    assert.deepEqual(state.draws[0], ['fill', '#ffffff', 0, 0, 1600, 1200]);
    assert.equal(state.draws[1][0], 'draw');
    assert.deepEqual(state.created, state.revoked);
    assert.ok(state.images.every(image => image.removed));
    assert.ok(state.canvases.every(canvas => !canvas.width && !canvas.height));
  });
});

test('portrait orientation follows decoded dimensions and small photos are never enlarged', async () => {
  await browser({ width: 1200, height: 4000 }, async state => {
    await photos.processMatrimonyPhotos([file()]);
    assert.deepEqual([state.encodes[0].width, state.encodes[0].height], [480, 1600]);
  });
  await browser({ width: 300, height: 450 }, async state => {
    await photos.processMatrimonyPhotos([file()]);
    assert.deepEqual([state.encodes[0].width, state.encodes[0].height], [300, 450]);
  });
});

test('output lowers JPEG quality only when needed and never returns more than 1 MB', async () => {
  await browser({ size: quality => quality > 0.62 ? 1024 * 1024 + 1 : 1024 * 1024 }, async state => {
    const [result] = await photos.processMatrimonyPhotos([file()]);
    assert.equal(result.size, photos.MAX_MATRIMONY_PHOTO_BYTES);
    assert.deepEqual(state.encodes.map(item => item.quality), [0.82, 0.72, 0.62]);
  });
  await browser({ size: () => 1024 * 1024 + 1 }, async state => {
    await assert.rejects(photos.processMatrimonyPhotos([file()]), /below 1 MB.*smaller/);
    assert.deepEqual(state.created, state.revoked);
  });
});

test('decode, canvas and encode failures are actionable and release browser resources', async () => {
  for (const [options, message] of [[{ badName: 'portrait.png' }, /Export it as JPEG/], [{ noContext: true }, /updated browser/], [{ nullBlob: true }, /encode/]]) {
    await browser(options, async state => {
      await assert.rejects(photos.processMatrimonyPhotos([file()]), message);
      assert.deepEqual(state.created, state.revoked);
      assert.equal(state.urls.size, 0);
    });
  }
});

test('abort during decoding or encoding discards results, stops the batch and cleans resources', async () => {
  for (const phase of ['decode', 'encode']) {
    const controller = new AbortController(); let finish;
    await browser({ [phase]: done => { finish = done; } }, async state => {
      const processing = photos.processMatrimonyPhotos([file(), file('second.png')], controller.signal);
      await flush(); controller.abort(); finish();
      await assert.rejects(processing, { name: 'AbortError' });
      assert.equal(state.created.length, 1);
      assert.deepEqual(state.created, state.revoked);
    });
  }
});

function store() {
  let state = { user: { uid: 'account-a', _id: 'member-a' } };
  const listeners = new Set();
  const useAppStore = selector => selector(state);
  useAppStore.getState = () => state;
  useAppStore.subscribe = listener => { listeners.add(listener); return () => listeners.delete(listener); };
  return { useAppStore, listeners, user(user) { state = { user }; for (const listener of [...listeners]) listener(state); } };
}

function descendants(tree) {
  if (!tree || typeof tree !== 'object') return [];
  return [tree, ...React.Children.toArray(tree.props?.children).flatMap(descendants)];
}
const find = (tree, type, predicate = () => true) => descendants(tree).find(node => node.type === type && predicate(node.props));

// The repository's hook harness convention exercises effects without adding a DOM dependency.
function lifecycle(name, replacements, localPreview = false) {
  let slots = [], deps = [], cleanups = [], effects = [], cursor = 0, props, key, tree, alive = true;
  let refs = [];
  const hooks = {
    useState(initial) { const at = cursor++; if (!(at in slots)) slots[at] = typeof initial === 'function' ? initial() : initial;
      return [slots[at], value => { assert.ok(alive, 'no state writes after unmount'); slots[at] = typeof value === 'function' ? value(slots[at]) : value; }]; },
    useRef(initial) { const at = cursor++; return slots[at] ||= { current: initial }; },
    useId() { cursor++; return 'test-photos'; },
    useEffect(work, next) { const at = cursor++; if (!deps[at] || next.some((value, index) => value !== deps[at][index])) {
      deps[at] = next; effects.push(() => { cleanups[at]?.(); cleanups[at] = work(); });
    } },
  };
  const compiled = source(name, { ...replacements, react: hooks }, localPreview ? '\nexport { LocalPhoto };' : '');
  const Component = localPreview ? compiled.LocalPhoto : compiled.default;
  const cleanup = () => { for (const work of cleanups) work?.(); cleanups = []; };
  return {
    render(next = props) {
      props = next;
      const wrapper = localPreview ? React.createElement(Component, props) : Component(props);
      if (key !== undefined && key !== wrapper.key) { cleanup(); slots = []; deps = []; }
      key = wrapper.key; cursor = 0;
      tree = wrapper.type(wrapper.props);
      for (const ref of refs) ref.current = null;
      refs = [];
      for (const node of descendants(tree)) if (typeof node.type === 'string' && node.props.ref) {
        const element = { src: node.props.src, removeAttribute(name) { delete this[name]; }, click() {} };
        node.props.ref.current = element; refs.push(node.props.ref);
      }
      while (effects.length) effects.shift()();
      return tree;
    },
    unmount() { cleanup(); alive = false; },
  };
}

const protectedSrc = '/matrimony/photos/0123456789abcdef01234567';
function components(session, api, extra = {}) {
  const replacements = { '@/services/api': { api }, '@/store/useAppStore': session, ...extra };
  const Image = source('components/MatrimonyImage.tsx', replacements).default;
  return { Image, replacements: { ...replacements, '@/components/MatrimonyImage': { default: Image, __esModule: true }, '@/services/matrimonyPhotos': photos } };
}

test('real React renders HTTPS legacy images directly and denies unsupported or credential URLs', () => {
  const session = store(); let requests = 0;
  const { Image } = components(session, { get() { requests++; } });
  const render = src => renderToStaticMarkup(React.createElement(Image, { src, alt: 'Member', className: 'aspect-[4/5]' }));
  assert.match(render('https://images.example.test/portrait.jpg'), /<img[^>]+src="https:\/\/images.example.test\/portrait.jpg"/);
  for (const src of [protectedSrc, '//example.test/p.jpg', 'http://example.test/p.jpg', 'blob:old', 'data:image/png;base64,a', 'javascript:alert(1)', '/matrimony/photos/bad', protectedSrc + '?token=secret', protectedSrc + '/extra', '/other', 'https://example.test/p.jpg?access_token=secret', 'https://user:password@example.test/p.jpg']) {
    const html = render(src);
    assert.doesNotMatch(html, /<img|secret|password/);
    assert.match(html, /photo placeholder/);
    assert.match(html, /aspect-\[4\/5\]/);
  }
  assert.equal(requests, 0);
});

test('image effects never send authenticated requests for legacy, unsupported or signed-out sources', () => {
  const session = store(), calls = [];
  const { replacements } = components(session, { get(src) { calls.push(src); return new Promise(() => {}); } });
  for (const src of ['https://images.example.test/portrait.jpg', '//example.test/p.jpg', 'http://example.test/p.jpg', 'data:image/png;base64,a', '/matrimony/photos/bad', protectedSrc + '?token=secret', protectedSrc + '/extra', protectedSrc.toUpperCase(), '/other']) {
    const view = lifecycle('components/MatrimonyImage.tsx', replacements);
    view.render({ src, alt: 'Member' }); view.unmount();
  }
  session.user(null);
  const view = lifecycle('components/MatrimonyImage.tsx', replacements);
  view.render({ src: protectedSrc, alt: 'Member' }); view.unmount();
  assert.deepEqual(calls, []);
});

test('protected fetch uses the API blob transport; source change and unmount abort and revoke URLs', async () => {
  await browser({}, async state => {
    const session = store(), calls = [];
    const api = { get(src, config) { const work = deferred(); calls.push({ src, config, ...work }); return work.promise; } };
    const { replacements } = components(session, api);
    const view = lifecycle('components/MatrimonyImage.tsx', replacements);
    const props = { src: protectedSrc, alt: 'Member', className: 'aspect-[4/5]' };
    let tree = view.render(props);
    assert.equal(find(tree, 'img'), undefined);
    assert.equal(calls[0].src, protectedSrc);
    assert.equal(calls[0].config.responseType, 'blob');
    assert.ok(calls[0].config.signal instanceof AbortSignal);
    calls[0].resolve({ data: new Blob(['jpeg'], { type: 'image/jpeg' }) }); await flush();
    tree = view.render(); assert.match(find(tree, 'img').props.src, /^blob:/);
    tree = view.render({ ...props, src: '/matrimony/photos/abcdef0123456789abcdef01' });
    assert.equal(find(tree, 'img'), undefined);
    assert.equal(calls[0].config.signal.aborted, true);
    assert.deepEqual(state.revoked, [state.created[0]]);
    calls[1].resolve({ data: new Blob(['jpeg'], { type: 'image/jpeg' }) }); await flush(); view.render();
    view.unmount();
    assert.equal(calls[1].config.signal.aborted, true);
    assert.deepEqual(state.revoked, state.created);
    assert.equal(session.listeners.size, 0);
  });
});

test('account changes synchronously clear loaded images, cancel requests and reject late old-account blobs', async () => {
  await browser({}, async state => {
    const session = store(), calls = [];
    const { replacements } = components(session, { get(src, config) { const work = deferred(); calls.push({ config, ...work }); return work.promise; } });
    const view = lifecycle('components/MatrimonyImage.tsx', replacements);
    view.render({ src: protectedSrc, alt: 'Member' });
    session.user({ uid: 'account-b', _id: 'member-b' });
    assert.equal(calls[0].config.signal.aborted, true);
    calls[0].resolve({ data: new Blob(['old'], { type: 'image/jpeg' }) }); await flush();
    assert.equal(state.created.length, 0);
    assert.equal(find(view.render(), 'img'), undefined);
    calls[1].resolve({ data: new Blob(['new'], { type: 'image/jpeg' }) }); await flush();
    const image = find(view.render(), 'img');
    assert.ok(image.props.ref.current.src);
    session.user(null);
    assert.equal(image.props.ref.current.src, undefined);
    assert.deepEqual(state.revoked, state.created);
    assert.equal(find(view.render(), 'img'), undefined);
    assert.equal(calls.length, 2);
    view.unmount();
  });
});

test('failed requests and image decoding keep the avatar visible and expose a working retry', async () => {
  await browser({}, async state => {
    const session = store(), calls = [];
    const { replacements } = components(session, { get() { const work = deferred(); calls.push(work); return work.promise; } });
    const view = lifecycle('components/MatrimonyImage.tsx', replacements);
    view.render({ src: protectedSrc, alt: 'Member' });
    calls[0].reject(new Error('offline')); await flush();
    let tree = view.render();
    assert.equal(find(tree, 'img'), undefined);
    const retry = find(tree, 'button', props => props['aria-label'] === 'Retry photo');
    assert.ok(retry); retry.props.onClick(); view.render();
    calls[1].resolve({ data: new Blob(['jpg'], { type: 'image/jpeg' }) }); await flush();
    tree = view.render(); find(tree, 'img').props.onError(); tree = view.render();
    assert.ok(find(tree, 'button', props => props['aria-label'] === 'Retry photo'));
    assert.deepEqual(state.revoked, state.created);
    view.unmount();
  });
});

test('real React renders optional editor, existing/new removals, compressed sizes and total limit', () => {
  const { replacements } = components(store(), { get() { throw new Error('No requests during server render'); } });
  const Editor = source('components/MatrimonyPhotoEditor.tsx', replacements).default;
  const props = { existing: [protectedSrc], files: [file()], onExistingChange() {}, onFilesChange() {} };
  const html = renderToStaticMarkup(React.createElement(Editor, props));
  for (const value of ['optional', '2/5', 'Remove existing photo 1', 'Remove new photo 1', '1 KB', 'Add photos']) assert.ok(html.includes(value));
  assert.doesNotMatch(html, /required=""/);
  const full = renderToStaticMarkup(React.createElement(Editor, { ...props, existing: Array(4).fill(protectedSrc) }));
  assert.match(full, /type="file"[^>]+disabled=""/);
  assert.match(full, /<button type="button" disabled=""[^>]+>.*Add photos<\/button>/);
});

test('editor preserves previous selection on invalid/failed batches and appends only fully prepared files', async () => {
  await browser({ badName: 'broken.png' }, async () => {
    const session = store(), changes = [], busy = [];
    const { replacements } = components(session, {});
    const view = lifecycle('components/MatrimonyPhotoEditor.tsx', replacements);
    const previous = file('previous.jpg', 'image/jpeg');
    const props = { existing: [protectedSrc], files: [previous], onExistingChange() {}, onFilesChange: files => changes.push(files), onProcessingChange: value => busy.push(value) };
    let tree = view.render(props);
    const choose = async selected => { const target = { files: selected, value: 'selected' }; find(tree, 'input').props.onChange({ currentTarget: target }); assert.equal(target.value, ''); await flush(); tree = view.render(); };
    await choose([file('bad.gif', 'image/gif')]);
    assert.equal(changes.length, 0); assert.equal(busy.length, 0);
    assert.match(find(tree, 'p', props => props.role === 'alert').props.children, /supported/);
    await choose(Array.from({ length: 4 }, () => file()));
    assert.equal(changes.length, 0); assert.equal(busy.length, 0);
    assert.match(find(tree, 'p', props => props.role === 'alert').props.children, /5 photos in total/);
    await choose([file('good.png'), file('broken.png')]);
    assert.equal(changes.length, 0); assert.deepEqual(busy, [true, false]);
    await choose([file('good.png')]);
    assert.equal(changes.length, 1); assert.equal(changes[0][0], previous); assert.equal(changes[0][1].type, 'image/jpeg');
    assert.deepEqual(busy, [true, false, true, false]);
    view.unmount();
  });
});

test('editor cancels processing on unmount, prop resets and account switches without late selection updates', async () => {
  for (const action of ['unmount', 'reset', 'account']) {
    await browser({ decode() {} }, async state => {
      const session = store(), changes = [], busy = [];
      const { replacements } = components(session, {});
      const view = lifecycle('components/MatrimonyPhotoEditor.tsx', replacements);
      const props = { existing: [], files: [], onExistingChange() {}, onFilesChange: files => changes.push(files), onProcessingChange: value => busy.push(value) };
      const tree = view.render(props);
      find(tree, 'input').props.onChange({ currentTarget: { files: [file()], value: 'selected' } });
      if (action === 'unmount') view.unmount();
      if (action === 'reset') view.render({ ...props, files: [] });
      if (action === 'account') session.user({ uid: 'account-b', _id: 'member-b' });
      await flush();
      assert.equal(changes.length, 0); assert.deepEqual(busy, [true, false]);
      assert.deepEqual(state.created, state.revoked);
      if (action !== 'unmount') view.unmount();
    });
  }
});

test('editor removals are controlled and disabled controls cannot open another processing batch', () => {
  const { replacements } = components(store(), {});
  const existingChanges = [], fileChanges = [];
  const view = lifecycle('components/MatrimonyPhotoEditor.tsx', replacements);
  const props = { existing: [protectedSrc], files: [file()], onExistingChange: value => existingChanges.push(value), onFilesChange: value => fileChanges.push(value) };
  let tree = view.render(props);
  find(tree, 'button', props => props['aria-label'] === 'Remove existing photo 1').props.onClick();
  find(tree, 'button', props => props['aria-label'] === 'Remove new photo 1').props.onClick();
  assert.deepEqual(existingChanges, [[]]); assert.deepEqual(fileChanges, [[]]);
  tree = view.render({ ...props, disabled: true });
  assert.ok(find(tree, 'input').props.disabled);
  find(tree, 'input').props.onChange({ currentTarget: { files: [file()], value: 'selected' } });
  assert.equal(fileChanges.length, 1);
  view.unmount();
});

test('new preview effects revoke object URLs on replacement, retry and unmount', async () => {
  await browser({}, async state => {
    const { replacements } = components(store(), {});
    const editor = lifecycle('components/MatrimonyPhotoEditor.tsx', replacements);
    const tree = editor.render({ existing: [], files: [file()], onExistingChange() {}, onFilesChange() {} });
    const preview = descendants(tree).find(node => typeof node.type === 'function' && node.props.file);
    assert.ok(preview);
    const view = lifecycle('components/MatrimonyPhotoEditor.tsx', replacements, true);
    let local = view.render(preview.props);
    assert.equal(state.created.length, 1);
    find(local, 'img').props.onError(); local = view.render();
    find(local, 'button').props.onClick(); view.render();
    assert.equal(state.revoked.length, 1);
    view.render({ ...preview.props, file: file('another.png') });
    assert.equal(state.revoked.length, 2);
    view.unmount(); editor.unmount();
    assert.deepEqual(state.revoked, state.created);
  });
});
