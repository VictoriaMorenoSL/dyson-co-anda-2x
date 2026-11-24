import './viewer.css';
import { createScene } from './scene/createScene.js';

const container = document.querySelector('#scene-container');
const resetButton = document.querySelector('#reset-view');
const attachmentButtons = [...document.querySelectorAll('[data-attachment]')];
const attachmentStatus = document.querySelector('#attachment-status');

const studio = createScene(container);
resetButton.addEventListener('click', studio.reset);

const attachmentNames = {
  curling: 'Rizador',
  fastDryer: 'Secador rápido',
  roundBrush: 'Cepillo voluminizador',
  airSmooth: 'AirSmooth2x',
};

attachmentButtons.forEach((button) => {
  button.addEventListener('click', () => {
    studio.model.setAttachment(button.dataset.attachment);
  });
});

studio.model.onAttachmentChange((activeKey) => {
  attachmentButtons.forEach((button) => {
    const isActive = button.dataset.attachment === activeKey;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });
  attachmentStatus.textContent = `${attachmentNames[activeKey]} conectado`;
});

window.addEventListener('pagehide', studio.destroy, { once: true });
