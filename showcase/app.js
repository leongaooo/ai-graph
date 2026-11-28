const scenes = window.showcaseCatalog;
const sceneOptions = document.querySelector('#scene-options');
const paletteOptions = document.querySelector('#palette-options');
const deviceOptions = document.querySelector('.devices');
const frame = document.querySelector('#preview-frame');
const preview = document.querySelector('#preview');
const previewSize = document.querySelector('#preview-size');
const previewStatus = document.querySelector('#preview-status');
const download = document.querySelector('#download-svg');
const briefLink = document.querySelector('#brief-link');
const sceneLink = document.querySelector('#scene-link');
const command = document.querySelector('#scene-command');

const preferences = new Map();
let scene = scenes[0];
let device = matchMedia('(max-width: 720px)').matches ? 'mobile' : 'desktop';

function element(tag, className, content) {
  const node = document.createElement(tag);
  node.className = className;
  if (content) node.textContent = content;
  return node;
}

function setScene(next) {
  scene = next;
  for (const option of sceneOptions.children) {
    option.setAttribute('aria-pressed', String(option.dataset.scene === scene.id));
  }
  document.querySelector('#scene-context').textContent = scene.industry + ' / ' + scene.placement;
  document.querySelector('#scene-title').textContent = scene.label;
  const example = document.querySelector('#case-' + scene.id).content.cloneNode(true);
  preview.replaceChildren(example);

  paletteOptions.replaceChildren(...scene.palettes.map((palette, index) => {
    const button = element('button', 'swatch-button');
    button.type = 'button';
    const swatch = element('span', 'swatch');
    swatch.style.setProperty('--swatch-base', palette.background);
    swatch.style.setProperty('--swatch-accent', palette.accent);
    swatch.setAttribute('aria-hidden', 'true');
    button.append(swatch, element('span', '', palette.name));
    button.addEventListener('click', () => setPalette(index));
    return button;
  }));
  setPalette(preferences.get(scene.id) ?? 0);
}

function embeddedFile(path) {
  const type = path.endsWith('.svg') ? 'image/svg+xml' : 'application/json';
  return 'data:' + type + ';charset=utf-8,' + encodeURIComponent(window.showcaseDownloads[path]);
}

function setDownload(link, path) {
  link.href = embeddedFile(path);
  link.download = path.split('/').at(-1);
}

function setPalette(index) {
  const palette = scene.palettes[index];
  preferences.set(scene.id, index);
  for (const [position, button] of [...paletteOptions.children].entries()) {
    button.setAttribute('aria-pressed', String(position === index));
  }
  const artwork = preview.querySelector('img');
  artwork.src = embeddedFile(palette.svg);
  artwork.alt = palette.description ?? scene.description;
  document.querySelector('#scene-description').textContent = artwork.alt;
  preview.style.setProperty('--mock-base', palette.background);
  preview.style.setProperty('--mock-ink', palette.highlight);
  preview.style.setProperty('--mock-accent', palette.accent);
  setDownload(download, palette.svg);
  setDownload(briefLink, palette.brief);
  setDownload(sceneLink, scene.scene);

  const briefPath = palette.brief.startsWith('../') ? palette.brief.slice(3) : 'showcase/' + palette.brief;
  command.textContent = [
    'npm run illustrate -- \\',
    '  --brief ' + briefPath + ' \\',
    '  --scene ' + scene.scene.slice(3) + ' \\',
    '  --outScene out/' + scene.id + '.scene.json \\',
    '  --outSvg out/' + scene.id + '.svg',
  ].join('\n');
  announce();
}

function announce() {
  const mode = device === 'mobile' ? '手机预览' : '桌面预览';
  const palette = scene.palettes[preferences.get(scene.id)];
  previewStatus.textContent = scene.label + '，' + palette.name + '，' + mode;
}

function updateWidth() {
  const width = Math.round(frame.getBoundingClientRect().width);
  const scaleDesktop = device === 'desktop' && width <= 522;
  const desktopWidth = 800;
  if (scaleDesktop) {
    const scale = frame.clientWidth / desktopWidth;
    preview.style.width = desktopWidth + 'px';
    preview.style.transform = 'scale(' + scale + ')';
    frame.style.height = Math.ceil(preview.offsetHeight * scale + 2) + 'px';
  } else {
    preview.style.width = '';
    preview.style.transform = '';
    frame.style.height = '';
  }
  const mode = device === 'mobile' ? '手机预览' : '桌面预览';
  previewSize.textContent = mode + ' · ' + (scaleDesktop ? desktopWidth + 'px / 缩放' : width + 'px');
}

for (const entry of scenes) {
  const button = element('button', 'scene-option', entry.placement);
  button.type = 'button';
  button.dataset.scene = entry.id;
  button.addEventListener('click', () => setScene(entry));
  sceneOptions.append(button);

  const link = document.querySelector('[data-gallery-scene="' + entry.id + '"]');
  link.href = '#studio';
  link.removeAttribute('download');
  link.querySelector('.gallery-arrow').textContent = '↗';
  link.addEventListener('click', () => setScene(entry));
}

const deviceButtons = deviceOptions.querySelectorAll('button');
function setDevice(next) {
  device = next;
  frame.dataset.device = device;
  for (const button of deviceButtons) {
    button.setAttribute('aria-pressed', String(button.dataset.device === device));
  }
  updateWidth();
  announce();
}
for (const button of deviceButtons) {
  button.addEventListener('click', () => setDevice(button.dataset.device));
}

setScene(scene);
setDevice(device);
const previewObserver = new ResizeObserver(updateWidth);
previewObserver.observe(frame);
previewObserver.observe(preview);

document.querySelector('#studio').hidden = false;
for (const link of document.querySelectorAll('[data-studio-link]')) link.hidden = false;
document.querySelector('#gallery-help').textContent = '选择插画，查看它在产品页面里的效果。';
updateWidth();
if (location.hash === '#studio') document.querySelector('#studio').scrollIntoView();
