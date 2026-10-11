import { prepareAssetIcons } from './asset-icons';
import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { ASSET_CATALOG, type AssetId } from './asset-catalog';

const models = new Map<AssetId, T.Group>();
const materials = new Map<string, T.MeshLambertMaterial>();
const converted = new WeakMap<T.Material, T.MeshLambertMaterial>();
const pixels = new Map<string, ReturnType<typeof materialPixels>>();
let loading: Promise<void> | undefined;
const listeners = new Set<(progress: number) => void>();

function materialPixels(material: T.MeshLambertMaterial) {
  const color = document.createElement('canvas');
  const emissive = document.createElement('canvas');
  color.width = color.height = emissive.width = emissive.height = 16;
  const c = color.getContext('2d')!,
    e = emissive.getContext('2d')!;
  c.fillStyle = `#${material.color.getHexString()}`;
  c.fillRect(0, 0, 16, 16);
  if (material.map) {
    c.clearRect(0, 0, 16, 16);
    c.drawImage(material.map.image as CanvasImageSource, 0, 0, 16, 16);
  }
  e.fillStyle = '#000';
  e.fillRect(0, 0, 16, 16);
  if (material.emissiveMap)
    e.drawImage(material.emissiveMap.image as CanvasImageSource, 0, 0, 16, 16);
  return {
    color,
    emissive,
    glow: !!material.emissiveMap,
    alpha: material.alphaTest > 0,
  };
}
function packMaterial(source: T.MeshStandardMaterial, pack: string) {
  const key = `${pack}:${source.name}`;
  const previous = converted.get(source);
  if (previous) return previous;
  const existing = materials.get(key);
  if (existing) {
    for (const value of Object.values(source))
      if (value instanceof T.Texture) value.dispose();
    source.dispose();
    converted.set(source, existing);
    return existing;
  }
  const material = new T.MeshLambertMaterial({
    name: source.name,
    color: source.color,
    map: source.map,
    emissive: source.emissive,
    emissiveMap: source.emissiveMap,
    emissiveIntensity: source.emissiveMap ? 1.15 : 0,
    alphaTest: source.alphaTest,
    side: source.side,
    transparent: source.transparent,
    depthWrite: !source.transparent,
    opacity: source.opacity,
  });
  for (const texture of [material.map, material.emissiveMap]) {
    if (!texture) continue;
    texture.magFilter = texture.minFilter = T.NearestFilter;
    texture.generateMipmaps = false;
    texture.wrapS = texture.wrapT = T.RepeatWrapping;
    texture.colorSpace = T.SRGBColorSpace;
    texture.userData.assetPack = true;
    texture.needsUpdate = true;
  }
  material.userData.assetPack = true;
  materials.set(key, material);
  converted.set(source, material);
  pixels.set(
    `${pack}:${source.name.replace(/^m_/, '')}`,
    materialPixels(material),
  );
  source.dispose();
  return material;
}
export function loadAssetPack(
  onProgress: (progress: number) => void = () => {},
) {
  listeners.add(onProgress);
  const ids = Object.keys(ASSET_CATALOG) as AssetId[];
  onProgress(Math.round((models.size / ids.length) * 100));
  if (!loading) {
    loading = (async () => {
      const pending = ids.filter((id) => !models.has(id));
      const errors: unknown[] = [];
      await Promise.all(
        Array.from({ length: 6 }, async () => {
          const loader = new GLTFLoader();
          while (pending.length) {
            const id = pending.shift()!;
            try {
              const gltf = await loader.loadAsync(
                `/assets/${ASSET_CATALOG[id].pack}/${ASSET_CATALOG[id].file}`,
              );
              gltf.scene.traverse((o) => {
                if (!(o instanceof T.Mesh)) return;
                o.geometry.userData.assetPack = true;
                o.material = Array.isArray(o.material)
                  ? o.material.map((m) =>
                      packMaterial(
                        m as T.MeshStandardMaterial,
                        ASSET_CATALOG[id].pack,
                      ),
                    )
                  : packMaterial(
                      o.material as T.MeshStandardMaterial,
                      ASSET_CATALOG[id].pack,
                    );
                o.castShadow = o.receiveShadow = true;
              });
              models.set(id, gltf.scene);
              listeners.forEach((fn) =>
                fn(Math.round((models.size / ids.length) * 100)),
              );
            } catch (error) {
              errors.push(error);
            }
          }
        }),
      );
      if (errors.length)
        throw new Error(
          'Some world assets could not load. Check your connection and try again.',
        );
      prepareAssetIcons(assetModel);
    })().catch((error) => {
      loading = undefined;
      throw error;
    });
  }
  return loading.finally(() => listeners.delete(onProgress));
}
export function assetModel(id: AssetId) {
  const model = models.get(id);
  if (!model) throw new Error(`Asset not loaded: ${id}`);
  return model.clone(true);
}
export function assetPixels(name: string, pack = 'scream') {
  const aliases: Record<string, string> = {
    window: 'window_lit',
    moonwin: 'moon_window',
    shelf_side: 'shelf',
    spike: 'iron',
    chest_open: 'chest_front',
  };
  const value = pixels.get(`${pack}:${aliases[name] ?? name}`);
  if (!value) throw new Error(`Missing asset texture: ${name}`);
  return value;
}
