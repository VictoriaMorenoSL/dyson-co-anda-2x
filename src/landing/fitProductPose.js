import { Vector3 } from 'three';

// A shared envelope accommodates every attachment and horizontal rotation.
const productCorners = [-1.35, 1.35].flatMap((x) =>
  [-5.5, 9.7].flatMap((y) => [-1.35, 1.35].map((z) => new Vector3(x, y, z))),
);

export function fitProductPose(
  scene,
  stage,
  slot,
  pose,
  { airflow = false, breakpoint = 1024, bottomOverflow = 0 } = {},
) {
  if (window.innerWidth >= breakpoint || !scene.camera || !slot) return pose;

  const canvas = scene.renderer.domElement.getBoundingClientRect();
  const frame = stage.getBoundingClientRect();
  const target = slot.getBoundingClientRect();
  if (!canvas.width || !canvas.height || !target.width || !target.height) return pose;

  const camera = scene.camera;
  camera.updateMatrixWorld();
  const topEdge = Math.max(target.top - frame.top, canvas.top + 8);
  const bottomEdge = Math.min(target.bottom - frame.top, canvas.bottom - 8) + canvas.height * bottomOverflow;
  if (bottomEdge <= topEdge) return pose;

  const centerX = ((target.left + target.width / 2 - canvas.left) / canvas.width) * 2 - 1;
  const centerY = 1 - (((topEdge + bottomEdge) / 2 - canvas.top) / canvas.height) * 2;
  const maxWidth = target.width / canvas.width * (airflow ? 0.87 : 0.97);
  const maxHeight = (bottomEdge - topEdge) / canvas.height * (airflow ? 0.84 : 0.95);
  const axis = new Vector3(0, 0, 1);
  const planePoint = (x, y) => {
    const direction = new Vector3(x, y, 0).unproject(camera).sub(camera.position);
    return direction.multiplyScalar(-camera.position.z / direction.z).add(camera.position);
  };
  let scale = pose.scale;
  let position = planePoint(centerX, centerY);

  // Fit and recenter the projected envelope, accounting for perspective.
  for (let pass = 0; pass < 5; pass += 1) {
    const projected = productCorners.map((corner) =>
      corner.clone().applyAxisAngle(axis, pose.zRotation).multiplyScalar(scale)
        .add(position).project(camera),
    );
    const xs = projected.map((point) => point.x);
    const ys = projected.map((point) => point.y);
    const left = Math.min(...xs);
    const right = Math.max(...xs);
    const bottom = Math.min(...ys);
    const top = Math.max(...ys);
    const adjustment = Math.min(2 * maxWidth / (right - left), 2 * maxHeight / (top - bottom));
    scale = Math.min(pose.scale, scale * adjustment);
    position.add(planePoint(centerX, centerY).sub(planePoint((left + right) / 2, (bottom + top) / 2)));
  }

  return { ...pose, x: position.x, y: position.y, scale };
}
