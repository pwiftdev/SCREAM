import { globSync, mkdirSync } from 'node:fs';
import { NodeIO, type Document, type Node } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import {
  mergeDocuments,
  unpartition,
  prune,
  dedup,
  textureCompress,
  meshopt,
} from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import sharp from 'sharp';
import * as THREE from 'three';
await MeshoptEncoder.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({
    'meshopt.encoder': MeshoptEncoder,
    'meshopt.decoder': MeshoptDecoder,
  });
const root = '.asset-work/quaternius';
const locate = (pattern: string) => {
  const path = globSync(`${root}/${pattern}`)[0];
  if (!path)
    throw new Error(
      `Missing free source pack: ${pattern}. Run scripts/download-characters.py.`,
    );
  return path;
};
const motions = await io.read(
  locate('universal-animation-library/**/UAL1_Standard.glb'),
);
const aliases: Record<string, string> = {
  idle: 'Idle_Loop',
  walk: 'Walk_Loop',
  run: 'Jog_Fwd_Loop',
  sprint: 'Sprint_Loop',
  injured_run: 'Jog_Fwd_Loop',
  injured_idle: 'Idle_Loop',
  crouch_idle: 'Crouch_Idle_Loop',
  crouch_walk: 'Crouch_Fwd_Loop',
  downed_crawl: 'Swim_Fwd_Loop',
  carried_struggle: 'Hit_Chest',
  caged_idle: 'Sitting_Idle_Loop',
  repair: 'Fixing_Kneeling',
  heal: 'Fixing_Kneeling',
  revive: 'Fixing_Kneeling',
  unhook: 'Interact',
  rescue: 'Interact',
  pick_up: 'PickUp_Table',
  cage_drop: 'Push_Loop',
  kick_generator: 'Interact',
  locker_in: 'Crouch_Idle_Loop',
  locker_out: 'Interact',
  pallet_break: 'Sword_Attack',
  pallet_drop: 'Push_Loop',
  gate_switch: 'Interact',
  vault_fast: 'Jump_Loop',
  vault_slow: 'Jump_Loop',
  attack: 'Sword_Attack',
  hit: 'Hit_Chest',
  death: 'Death01',
  stun: 'Hit_Head',
  scream: 'Idle_Talking_Loop',
  ability: 'Spell_Simple_Shoot',
  struggle: 'Hit_Chest',
};
function colorFactor(hex: string): [number, number, number, number] {
  const color = new THREE.Color(hex);
  return [color.r, color.g, color.b, 1];
}
function animateRig(doc: Document, prefix: string) {
  const nodes = new Map(
    doc
      .getRoot()
      .listNodes()
      .map((n) => [n.getName(), n]),
  );
  const motionNodes = new Map(
    motions
      .getRoot()
      .listNodes()
      .map((n) => [n.getName(), n]),
  );
  for (const [name, sourceName] of Object.entries(aliases)) {
    const source = motions
      .getRoot()
      .listAnimations()
      .find((a) => a.getName() === sourceName)!;
    const animation = doc.createAnimation(name),
      buffer = doc.getRoot().listBuffers()[0];
    for (const channel of source.listChannels()) {
      const sourceNode = channel.getTargetNode()!,
        target = nodes.get(sourceNode.getName()),
        path = channel.getTargetPath();
      if (
        !target ||
        !path ||
        (path !== 'rotation' && sourceNode.getName() !== 'pelvis')
      )
        continue;
      const sampler = channel.getSampler()!,
        input = sampler.getInput()!,
        output = sampler.getOutput()!;
      const values = new Float32Array(output.getArray()!);
      if (path === 'translation') {
        const rest = target.getTranslation(),
          sourceRest = motionNodes.get('pelvis')!.getTranslation();
        for (let j = 0; j < values.length; j++)
          values[j] =
            rest[j % 3] +
            (values[j] - sourceRest[j % 3]) * 0.85 -
            (name === 'downed_crawl' && j % 3 === 1 ? 0.35 : 0);
      }
      const copied = doc
        .createAnimationSampler()
        .setInterpolation(sampler.getInterpolation())
        .setInput(
          doc
            .createAccessor()
            .setType(input.getType())
            .setArray(new Float32Array(input.getArray()!))
            .setBuffer(buffer),
        )
        .setOutput(
          doc
            .createAccessor()
            .setType(output.getType())
            .setArray(values)
            .setBuffer(buffer),
        );
      animation
        .addSampler(copied)
        .addChannel(
          doc
            .createAnimationChannel()
            .setTargetNode(target)
            .setTargetPath(path)
            .setSampler(copied),
        );
    }
  }
  for (const node of nodes.values()) node.setName(`${prefix}${node.getName()}`);
}
mkdirSync('public/assets/characters', { recursive: true });
for (let i = 0; i < 5; i++) {
  const female = i === 0 || i === 3,
    gender = female ? 'Female' : 'Male';
  const doc = await io.read(
    locate(
      `modular-character-outfits-fantasy/**/Outfits/${gender}_Peasant.gltf`,
    ),
  );
  for (const mesh of doc.getRoot().listMeshes())
    for (const p of mesh.listPrimitives()) {
      const mat = p.getMaterial()!.clone();
      if (!/Regular/.test(mat.getName()))
        mat.setBaseColorFactor(
          colorFactor(
            ['#9b7270', '#759490', '#bcaa85', '#798893', '#747e66'][i],
          ),
        );
      p.setMaterial(mat);
    }
  animateRig(doc, 'body_');
  const base = await io.read(
    locate(`universal-base-characters/**/Superhero_${gender}_FullBody.gltf`),
  );
  for (const mesh of base.getRoot().listMeshes())
    for (const p of mesh.listPrimitives()) {
      const pos = p.getAttribute('POSITION')!,
        indices = p.getIndices()!;
      if (pos.getMin([])[1] < 1.3) {
        const kept: number[] = [];
        const arr = indices.getArray()!;
        for (let t = 0; t < arr.length; t += 3)
          if (
            [arr[t], arr[t + 1], arr[t + 2]].every(
              (v) => pos.getElement(v, [])[1] > (female ? 1.43 : 1.48),
            )
          )
            kept.push(arr[t], arr[t + 1], arr[t + 2]);
        indices.setArray(new Uint32Array(kept));
      }
    }
  const head = base
    .getRoot()
    .listNodes()
    .find((n) => n.getName() === 'Head')!;
  {
    const hair = await io.read(
      locate(
        `universal-base-characters/**/Origin at 0/**/${['Hair_Long', 'Hair_Buzzed', 'Hair_SimpleParted', 'Hair_Buns', 'Hair_Beard'][i]}.gltf`,
      ),
    );
    for (const material of hair.getRoot().listMaterials())
      material.setBaseColorFactor(
        colorFactor(['#382820', '#201b17', '#816443', '#854122', '#37271d'][i]),
      );
    const map = mergeDocuments(base, hair);
    for (const node of hair.getRoot().listScenes()[0].listChildren()) {
      const copy = map.get(node) as Node;
      copy.setMatrix(
        new THREE.Matrix4()
          .fromArray(head.getWorldMatrix())
          .invert()
          .multiply(new THREE.Matrix4().fromArray(copy.getWorldMatrix()))
          .toArray() as ReturnType<Node['getMatrix']>,
      );
      head.addChild(copy);
    }
  }
  animateRig(base, 'face_');
  mergeDocuments(doc, base);
  const scene = doc.getRoot().listScenes()[0];
  for (const other of doc.getRoot().listScenes().slice(1)) {
    for (const node of other.listChildren()) scene.addChild(node);
    other.dispose();
  }
  const animations = new Map<string, ReturnType<Document['createAnimation']>>();
  for (const animation of doc.getRoot().listAnimations()) {
    const existing = animations.get(animation.getName());
    if (existing) {
      for (const s of animation.listSamplers()) existing.addSampler(s);
      for (const c of animation.listChannels()) existing.addChannel(c);
      animation.dispose();
    } else animations.set(animation.getName(), animation);
  }
  await doc.transform(
    unpartition(),
    prune(),
    dedup(),
    textureCompress({
      encoder: sharp,
      targetFormat: 'webp',
      resize: [1024, 1024],
      quality: 88,
    }),
    meshopt({ encoder: MeshoptEncoder, level: 'high' }),
  );
  await io.write(`public/assets/characters/${i}.glb`, doc);
  console.log(
    `Prepared ${['Mara', 'Dez', 'Ollie', 'Juniper', 'Teo', 'The Hollow'][i]}`,
  );
}
