import { useThree } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import { OrthographicCamera, Vector3 } from 'three';

/**
 * Build a true-isometric ortho camera transform.
 *
 * Canonical isometric: azimuth 45°, elevation arctan(1/√2) ≈ 35.264°.
 * That maps the world basis vectors (1,0,0) and (0,0,1) to screen vectors
 * of equal length and 60° apart — the hexagonal look.
 *
 * @param distance How far the camera sits from the focal point along the iso ray.
 *                 Larger = sees more world. Default sized for the 50x50 grid.
 */
export function buildIsometricTransform(distance = 60): {
  position: [number, number, number];
  target: [number, number, number];
} {
  // Azimuth 45° around Y axis, elevation arctan(1/√2) above horizon.
  // Direction from origin to camera, unit length:
  //   (cos(elev)*sin(az), sin(elev), cos(elev)*cos(az))
  // For az = 45°: sin(az) = cos(az) = 1/√2
  // For elev ≈ 35.264°: sin = 1/√3, cos = √(2/3)
  const sinElev = 1 / Math.sqrt(3);
  const cosElev = Math.sqrt(2 / 3);
  const invSqrt2 = 1 / Math.sqrt(2);
  return {
    position: [distance * cosElev * invSqrt2, distance * sinElev, distance * cosElev * invSqrt2],
    target: [0, 0, 0],
  };
}

interface IsometricCameraProps {
  /** Half-height of the orthographic viewport in world units. */
  zoom?: number;
  distance?: number;
}

/**
 * Drop-in <IsometricCamera /> for an R3F <Canvas>. Mounts an OrthographicCamera
 * at the canonical isometric angle, makes it the default camera, and rebuilds
 * its frustum on resize.
 */
export function IsometricCamera({ zoom = 18, distance = 60 }: IsometricCameraProps) {
  const { camera, set, size } = useThree();

  const cam = useMemo(() => {
    const c = new OrthographicCamera();
    const { position, target } = buildIsometricTransform(distance);
    c.position.set(position[0], position[1], position[2]);
    c.lookAt(new Vector3(target[0], target[1], target[2]));
    c.near = 0.1;
    c.far = 1000;
    return c;
  }, [distance]);

  useEffect(() => {
    const aspect = size.width / Math.max(1, size.height);
    cam.left = -zoom * aspect;
    cam.right = zoom * aspect;
    cam.top = zoom;
    cam.bottom = -zoom;
    cam.updateProjectionMatrix();
  }, [cam, size.width, size.height, zoom]);

  useEffect(() => {
    const previous = camera;
    set({ camera: cam });
    return () => {
      set({ camera: previous });
    };
  }, [cam, camera, set]);

  return null;
}
