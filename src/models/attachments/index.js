import { createNormalizedCurlingBarrel } from './CurlingBarrel.js';
import { createFastDryer } from './FastDryer.js';
import { createRoundBrush } from './RoundBrush.js';
import { createAirSmooth } from './AirSmooth.js';

export const ATTACHMENT_LABELS = Object.freeze({
  curling: 'Rizador Co-anda2x™',
  fastDryer: 'Secador rápido',
  roundBrush: 'Cepillo voluminizador',
  airSmooth: 'AirSmooth2x™',
});

export function createAttachmentCatalog(materials) {
  return new Map([
    ['curling', createNormalizedCurlingBarrel(materials)],
    ['fastDryer', createFastDryer(materials)],
    ['roundBrush', createRoundBrush(materials)],
    ['airSmooth', createAirSmooth(materials)],
  ]);
}
