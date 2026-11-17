// Unidades relativas: definen proporciones visuales, no medidas oficiales.
export const PRODUCT = Object.freeze({
  body: {
    height: 6.7,
    radius: 0.7,
    shoulderRadius: 0.685,
    baseRadius: 0.735,
    segments: 96,
  },
  connector: {
    height: 0.43,
    radius: 0.735,
  },
  attachment: {
    height: 5.15,
    radius: 0.745,
    capHeight: 0.16,
    pinHeight: 0.44,
    pinRadius: 0.16,
  },
  filter: {
    height: 1.62,
    radius: 0.755,
  },
  colors: {
    body: 0xead3cc,
    bodyWarm: 0xe4c4bc,
    graphite: 0x171818,
    graphiteSoft: 0x282929,
    copper: 0xb97872,
    darkCopper: 0x754d50,
  },
});

export const CAMERA = Object.freeze({
  desktop: { position: [7.6, 6.5, 19], fov: 31 },
  mobile: { position: [6.5, 6.1, 27], fov: 36 },
  target: [0, 2.6, 0],
  minDistance: 10,
  maxDistance: 28,
});
