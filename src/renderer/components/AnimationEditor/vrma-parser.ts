import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { VRM, VRMHumanBoneName } from '@pixiv/three-vrm';
import { VRMAnimationLoaderPlugin, VRMAnimation, createVRMAnimationClip } from '@pixiv/three-vrm-animation';

// ---------------------------------------------
// RDP (keyframe reduction)
// ---------------------------------------------
const TOLERANCE_POSITION = 0.001; // 1mm
const TOLERANCE_QUATERNION_DOT = 0.9999;

function rdpVector(
  times: number[],
  values: number[],
  valueSize: number,
  start: number,
  end: number,
  outIndices: Set<number>,
) {
  if (start >= end - 1) return;

  const startVec = new THREE.Vector3().fromArray(values, start * valueSize);
  const endVec = new THREE.Vector3().fromArray(values, end * valueSize);

  let maxDist = -1;
  let maxDistIndex = -1;

  const line = new THREE.Line3(startVec, endVec);
  const tempVec = new THREE.Vector3();
  const closestPoint = new THREE.Vector3();

  for (let i = start + 1; i < end; i++) {
    const currentVec = tempVec.fromArray(values, i * valueSize);
    line.closestPointToPoint(currentVec, true, closestPoint);
    const dist = currentVec.distanceTo(closestPoint);
    if (dist > maxDist) {
      maxDist = dist;
      maxDistIndex = i;
    }
  }

  if (maxDist > TOLERANCE_POSITION) {
    outIndices.add(maxDistIndex);
    rdpVector(times, values, valueSize, start, maxDistIndex, outIndices);
    rdpVector(times, values, valueSize, maxDistIndex, end, outIndices);
  }
}

function rdpQuaternion(
  times: number[],
  values: number[],
  valueSize: number,
  start: number,
  end: number,
  outIndices: Set<number>,
) {
  if (start >= end - 1) return;

  const startTime = times[start];
  const endTime = times[end];
  const startQuat = new THREE.Quaternion().fromArray(values, start * valueSize);
  const endQuat = new THREE.Quaternion().fromArray(values, end * valueSize);

  let maxDist = -1;
  let maxDistIndex = -1;

  const tempQuat = new THREE.Quaternion();

  for (let i = start + 1; i < end; i++) {
    const t = (times[i] - startTime) / (endTime - startTime);
    const interpolatedQuat = startQuat.clone().slerp(endQuat, t);
    const currentQuat = tempQuat.fromArray(values, i * valueSize);
    const dist = 1.0 - Math.abs(interpolatedQuat.dot(currentQuat));
    if (dist > maxDist) {
      maxDist = dist;
      maxDistIndex = i;
    }
  }

  if (maxDist > (1.0 - TOLERANCE_QUATERNION_DOT)) {
    outIndices.add(maxDistIndex);
    rdpQuaternion(times, values, valueSize, start, maxDistIndex, outIndices);
    rdpQuaternion(times, values, valueSize, maxDistIndex, end, outIndices);
  }
}

function optimizeTrack<T extends THREE.KeyframeTrack>(track: T, rdpFunc: Function): T {
  const times = track.times;
  const values = track.values;
  const valueSize = track.getValueSize();

  if (times.length < 3) return track;

  const keptIndices = new Set<number>([0, times.length - 1]);
  rdpFunc(times, values, valueSize, 0, times.length - 1, keptIndices);

  const sortedIndices = Array.from(keptIndices).sort((a, b) => a - b);
  const newTimes = new Float32Array(sortedIndices.length);
  const newValues = new Float32Array(sortedIndices.length * valueSize);

  for (let i = 0; i < sortedIndices.length; i++) {
    const index = sortedIndices[i];
    newTimes[i] = times[index];
    const valueOffset = index * valueSize;
    const newValueOffset = i * valueSize;
    for (let j = 0; j < valueSize; j++) {
      newValues[newValueOffset + j] = values[valueOffset + j];
    }
  }

  // @ts-ignore
  return new (track.constructor as any)(track.name, newTimes, newValues);
}

// ---------------------------------------------
// Utils (sanity / padding / mapping)
// ---------------------------------------------
function ensureFiniteFloat32(a: Float32Array, fill = 0) {
  for (let i = 0; i < a.length; i++) {
    const v = a[i];
    if (!Number.isFinite(v)) a[i] = fill;
  }
}

function ensureStrictlyIncreasingTimes(times: Float32Array, values: Float32Array, valueSize: number) {
  // drop duplicates (t[i] === t[i+1]) conservatively
  if (times.length <= 1) return { times, values };
  const t: number[] = [];
  const v: number[] = [];
  t.push(times[0]);
  for (let j = 0; j < valueSize; j++) v.push(values[j]);

  for (let i = 1; i < times.length; i++) {
    if (times[i] > t[t.length - 1]) {
      t.push(times[i]);
      const base = i * valueSize;
      for (let j = 0; j < valueSize; j++) v.push(values[base + j]);
    }
    // else: drop duplicate or non-increasing
  }
  return { times: new Float32Array(t), values: new Float32Array(v) };
}

function computeMinMaxScalar(a: Float32Array): [number, number] {
  let mn = Infinity, mx = -Infinity;
  for (let i = 0; i < a.length; i++) {
    const v = a[i];
    if (v < mn) mn = v;
    if (v > mx) mx = v;
  }
  if (!Number.isFinite(mn) || !Number.isFinite(mx)) return [0, 0];
  return [mn, mx];
}

const NormalizedToHuman: Record<string, VRMHumanBoneName> = {
  Normalized_Hips: 'hips',
  Normalized_Spine: 'spine',
  Normalized_Chest: 'chest',
  Normalized_UpperChest: 'upperChest',
  Normalized_Neck: 'neck',
  Normalized_Head: 'head',
  Normalized_LeftEye: 'leftEye',
  Normalized_RightEye: 'rightEye',
  Normalized_LeftShoulder: 'leftShoulder',
  Normalized_LeftArm: 'leftUpperArm',
  Normalized_LeftForeArm: 'leftLowerArm',
  Normalized_LeftHand: 'leftHand',
  Normalized_RightShoulder: 'rightShoulder',
  Normalized_RightArm: 'rightUpperArm',
  Normalized_RightForeArm: 'rightLowerArm',
  Normalized_RightHand: 'rightHand',
  Normalized_LeftUpLeg: 'leftUpperLeg',
  Normalized_LeftLeg: 'leftLowerLeg',
  Normalized_LeftFoot: 'leftFoot',
  Normalized_LeftToes: 'leftToes',
  Normalized_RightUpLeg: 'rightUpperLeg',
  Normalized_RightLeg: 'rightLowerLeg',
  Normalized_RightFoot: 'rightFoot',
  Normalized_RightToes: 'rightToes',
  Normalized_LeftHandIndex1: 'leftIndexProximal',
  Normalized_LeftHandIndex2: 'leftIndexIntermediate',
  Normalized_LeftHandIndex3: 'leftIndexDistal',
  Normalized_LeftHandLittle1: 'leftLittleProximal',
  Normalized_LeftHandLittle2: 'leftLittleIntermediate',
  Normalized_LeftHandLittle3: 'leftLittleDistal',
  Normalized_LeftHandMiddle1: 'leftMiddleProximal',
  Normalized_LeftHandMiddle2: 'leftMiddleIntermediate',
  Normalized_LeftHandMiddle3: 'leftMiddleDistal',
  Normalized_LeftHandRing1: 'leftRingProximal',
  Normalized_LeftHandRing2: 'leftRingIntermediate',
  Normalized_LeftHandRing3: 'leftRingDistal',
  Normalized_LeftHandThumb1: 'leftThumbMetacarpal',
  Normalized_LeftHandThumb2: 'leftThumbProximal',
  Normalized_LeftHandThumb3: 'leftThumbDistal',
  Normalized_RightHandIndex1: 'rightIndexProximal',
  Normalized_RightHandIndex2: 'rightIndexIntermediate',
  Normalized_RightHandIndex3: 'rightIndexDistal',
  Normalized_RightHandLittle1: 'rightLittleProximal',
  Normalized_RightHandLittle2: 'rightLittleIntermediate',
  Normalized_RightHandLittle3: 'rightLittleDistal',
  Normalized_RightHandMiddle1: 'rightMiddleProximal',
  Normalized_RightHandMiddle2: 'rightMiddleIntermediate',
  Normalized_RightHandMiddle3: 'rightMiddleDistal',
  Normalized_RightHandRing1: 'rightRingProximal',
  Normalized_RightHandRing2: 'rightRingIntermediate',
  Normalized_RightHandRing3: 'rightRingDistal',
  Normalized_RightHandThumb1: 'rightThumbMetacarpal',
  Normalized_RightHandThumb2: 'rightThumbProximal',
  Normalized_RightHandThumb3: 'rightThumbDistal',
};

// ---------------------------------------------
// parse (loader)
// ---------------------------------------------
export async function parseVrma(arrayBuffer: ArrayBuffer, fileName: string, vrm: VRM): Promise<THREE.AnimationClip> {
  const loader = new GLTFLoader();
  loader.register((parser) => new VRMAnimationLoaderPlugin(parser));

  try {
    const gltf = await loader.parseAsync(arrayBuffer, '');
    const vrmAnim = (gltf.userData as any).vrmAnimations?.[0] as VRMAnimation | undefined;

    let clip: THREE.AnimationClip;
    if (vrmAnim) {
      clip = createVRMAnimationClip(vrmAnim, vrm);
    } else if (gltf.animations && gltf.animations.length > 0) {
      clip = gltf.animations[0].clone();
    } else {
      throw new Error('파일에 유효한 애니메이션 데이터가 없습니다.');
    }

    if (!clip.name) clip.name = fileName.replace(/\.[^/.]+$/, '');

    // RDP 최적화
    const before = clip.tracks.reduce((s, t) => s + t.times.length, 0);
    clip.tracks = clip.tracks.map((track) => {
      if (track instanceof THREE.VectorKeyframeTrack) return optimizeTrack(track, rdpVector);
      if (track instanceof THREE.QuaternionKeyframeTrack) return optimizeTrack(track, rdpQuaternion);
      return track;
    });
    const after = clip.tracks.reduce((s, t) => s + t.times.length, 0);
    console.log(`Keyframes reduced ${before} -> ${after}`);

    return clip;
  } catch (err) {
    console.error('VRMA parsing failed:', err);
    throw new Error(`애니메이션 파일(${fileName})을 파싱하는 데 실패했습니다.`);
  }
}
// ---- serializeVrma: VRM 무시, Normalized_* 트랙만으로 VRMA 작성 ----
export async function serializeVrma(clip: THREE.AnimationClip, _vrm: VRM): Promise<ArrayBuffer> {
  // 0) Normalized_* -> VRMHumanBoneName 매핑 (네가 쓰던 테이블 그대로)
  const MapNormToHuman: Record<string, VRMHumanBoneName> = {
    "Normalized_Hips":"hips","Normalized_Spine":"spine","Normalized_Chest":"chest","Normalized_UpperChest":"upperChest",
    "Normalized_Neck":"neck","Normalized_Head":"head","Normalized_LeftEye":"leftEye","Normalized_RightEye":"rightEye",
    "Normalized_LeftShoulder":"leftShoulder","Normalized_LeftArm":"leftUpperArm","Normalized_LeftForeArm":"leftLowerArm","Normalized_LeftHand":"leftHand",
    "Normalized_RightShoulder":"rightShoulder","Normalized_RightArm":"rightUpperArm","Normalized_RightForeArm":"rightLowerArm","Normalized_RightHand":"rightHand",
    "Normalized_LeftUpLeg":"leftUpperLeg","Normalized_LeftLeg":"leftLowerLeg","Normalized_LeftFoot":"leftFoot","Normalized_LeftToes":"leftToes",
    "Normalized_RightUpLeg":"rightUpperLeg","Normalized_RightLeg":"rightLowerLeg","Normalized_RightFoot":"rightFoot","Normalized_RightToes":"rightToes",
    "Normalized_LeftHandIndex1":"leftIndexProximal","Normalized_LeftHandIndex2":"leftIndexIntermediate","Normalized_LeftHandIndex3":"leftIndexDistal",
    "Normalized_LeftHandLittle1":"leftLittleProximal","Normalized_LeftHandLittle2":"leftLittleIntermediate","Normalized_LeftHandLittle3":"leftLittleDistal",
    "Normalized_LeftHandMiddle1":"leftMiddleProximal","Normalized_LeftHandMiddle2":"leftMiddleIntermediate","Normalized_LeftHandMiddle3":"leftMiddleDistal",
    "Normalized_LeftHandRing1":"leftRingProximal","Normalized_LeftHandRing2":"leftRingIntermediate","Normalized_LeftHandRing3":"leftRingDistal",
    "Normalized_LeftHandThumb1":"leftThumbMetacarpal","Normalized_LeftHandThumb2":"leftThumbProximal","Normalized_LeftHandThumb3":"leftThumbDistal",
    "Normalized_RightHandIndex1":"rightIndexProximal","Normalized_RightHandIndex2":"rightIndexIntermediate","Normalized_RightHandIndex3":"rightIndexDistal",
    "Normalized_RightHandLittle1":"rightLittleProximal","Normalized_RightHandLittle2":"rightLittleIntermediate","Normalized_RightHandLittle3":"rightLittleDistal",
    "Normalized_RightHandMiddle1":"rightMiddleProximal","Normalized_RightHandMiddle2":"rightMiddleIntermediate","Normalized_RightHandMiddle3":"rightMiddleDistal",
    "Normalized_RightHandRing1":"rightRingProximal","Normalized_RightHandRing2":"rightRingIntermediate","Normalized_RightHandRing3":"rightRingDistal",
    "Normalized_RightHandThumb1":"rightThumbMetacarpal","Normalized_RightHandThumb2":"rightThumbProximal","Normalized_RightHandThumb3":"rightThumbDistal",
  };

  // --- helpers ---
  function finite(a: Float32Array, fill = 0){ for(let i=0;i<a.length;i++) if(!Number.isFinite(a[i])) a[i]=fill; }
  function strictInc(times: Float32Array, values: Float32Array, stride: number){
    if(times.length<=1) return {times,values};
    const T:number[]=[], V:number[]=[];
    T.push(times[0]); for(let j=0;j<stride;j++) V.push(values[j]);
    for(let i=1;i<times.length;i++){
      if(times[i]>T[T.length-1]){ T.push(times[i]); const b=i*stride; for(let j=0;j<stride;j++) V.push(values[b+j]); }
    }
    return {times:new Float32Array(T), values:new Float32Array(V)};
  }
  function fixQuat(values: Float32Array){
    const n=values.length/4; if(n<=1) return;
    let px=values[0],py=values[1],pz=values[2],pw=values[3];
    { const l=Math.hypot(px,py,pz,pw)||1; px/=l;py/=l;pz/=l;pw/=l; values[0]=px;values[1]=py;values[2]=pz;values[3]=pw; }
    for(let i=1;i<n;i++){
      const o=i*4; let x=values[o],y=values[o+1],z=values[o+2],w=values[o+3];
      if(px*x+py*y+pz*z+pw*w<0){ x=-x;y=-y;z=-z;w=-w; } // hemisphere
      const l=Math.hypot(x,y,z,w)||1; x/=l;y/=l;z/=l;w/=l;
      values[o]=x;values[o+1]=y;values[o+2]=z;values[o+3]=w;
      px=x;py=y;pz=z;pw=w;
    }
  }
  function minmax(a: Float32Array){ let mn=Infinity,mx=-Infinity; for(let i=0;i<a.length;i++){const v=a[i]; if(v<mn)mn=v; if(v>mx)mx=v;} return [Number.isFinite(mn)?mn:0, Number.isFinite(mx)?mx:0] as [number,number]; }

  // 1) 트랙 정리 (Normalized_*만 사용, VRM은 안 봄)
  const usable: THREE.KeyframeTrack[] = [];
  for(const t of clip.tracks){
    const [node, prop] = t.name.split('.');
    if(!node || !prop) continue;
    if(!(prop==='position'||prop==='quaternion')) continue;
    const human = MapNormToHuman[node];
    if(!human) continue; // Normalized_*가 아니면 버림

    let times = t.times as Float32Array;
    let values = t.values as Float32Array;
    finite(times); finite(values);

    if(prop==='quaternion'){
      const c = strictInc(times, values, 4);
      const n = Math.min(c.times.length, Math.floor(c.values.length/4));
      if(n<=0) continue;
      times = c.times.subarray(0,n);
      values = c.values.subarray(0,n*4);
      fixQuat(values);
      usable.push(new (t.constructor as any)(t.name, times, values));
    }else{
      const c = strictInc(times, values, 3);
      const n = Math.min(c.times.length, Math.floor(c.values.length/3));
      if(n<=0) continue;
      times = c.times.subarray(0,n);
      values = c.values.subarray(0,n*3);
      usable.push(new (t.constructor as any)(t.name, times, values));
    }
  }
  if(usable.length===0) throw new Error('serializeVrma: no Normalized_* tracks.');

  // 2) "독립" 노드 생성 (VRM 의존 X, 평면 구조)
  const nodes:any[] = [];
  const humanToNode = new Map<VRMHumanBoneName, number>();
  for(const t of usable){
    const human = MapNormToHuman[t.name.split('.')[0]];
    if(!humanToNode.has(human)){
      const idx = nodes.length;
      humanToNode.set(human, idx);
      nodes.push({ name: human }); // 메시 없음, 더미 노드
    }
  }
  const rootNodes = Array.from(humanToNode.values());
  if(rootNodes.length===0){ const i=nodes.length; nodes.push({name:'Root'}); rootNodes.push(i); }

  // 3) BIN 작성(4바이트 정렬)
  const binChunks:Uint8Array[]=[]; let binLen=0;
  const push=(u8:Uint8Array)=>{ const pad=(4-(binLen%4))%4; if(pad){binChunks.push(new Uint8Array(pad)); binLen+=pad;}
    const off=binLen; binChunks.push(u8); binLen+=u8.byteLength; return off; };

  const bufferViews:any[]=[]; const accessors:any[]=[]; const samplers:any[]=[]; const channels:any[]=[];
  const addTimes=(times:Float32Array)=>{ const u8=new Uint8Array(times.buffer,times.byteOffset,times.byteLength); const off=push(u8);
    const bv=bufferViews.length; bufferViews.push({buffer:0,byteOffset:off,byteLength:u8.byteLength});
    const [mn,mx]=minmax(times); const acc=accessors.length;
    accessors.push({bufferView:bv,componentType:5126,count:times.length,type:'SCALAR',min:[mn],max:[mx]}); return acc; };
  const addVals=(vals:Float32Array,type:'VEC3'|'VEC4',stride:number)=>{ const u8=new Uint8Array(vals.buffer,vals.byteOffset,vals.byteLength); const off=push(u8);
    const bv=bufferViews.length; bufferViews.push({buffer:0,byteOffset:off,byteLength:u8.byteLength});
    const acc=accessors.length; accessors.push({bufferView:bv,componentType:5126,count:vals.length/stride,type}); return acc; };

  let wroteHipsPos=false;
  for(const t of usable){
    const [node, prop] = t.name.split('.');
    const human = MapNormToHuman[node];
    const nodeIndex = humanToNode.get(human)!;

    let times = t.times as Float32Array;
    let values = t.values as Float32Array;

    if(prop==='quaternion'){
      const n=Math.min(times.length,Math.floor(values.length/4)); if(n<=0) continue;
      times=times.subarray(0,n); values=values.subarray(0,n*4);
      fixQuat(values); finite(times); finite(values);
      const ia=addTimes(times), oa=addVals(values,'VEC4',4);
      const s=samplers.length; samplers.push({input:ia,output:oa,interpolation:'LINEAR'});
      channels.push({sampler:s,target:{node:nodeIndex,path:'rotation'}});
    }else{ // position -> translation
      const n=Math.min(times.length,Math.floor(values.length/3)); if(n<=0) continue;
      times=times.subarray(0,n); values=values.subarray(0,n*3);
      finite(times); finite(values);
      const ia=addTimes(times), oa=addVals(values,'VEC3',3);
      const s=samplers.length; samplers.push({input:ia,output:oa,interpolation:'LINEAR'});
      channels.push({sampler:s,target:{node:nodeIndex,path:'translation'}});
      if(node==='Normalized_Hips') wroteHipsPos=true;
    }
  }
  if(!wroteHipsPos) console.warn('[serializeVrma] hips.position not written');

  // BIN 끝 패딩
  const endPad=(4-(binLen%4))%4; if(endPad){binChunks.push(new Uint8Array(endPad)); binLen+=endPad;}

  // 4) VRM 익스텐션(휴머노이드 매핑)
  const humanBones:Record<string,{node:number}>={};
  for(const [hb,idx] of humanToNode.entries()){ humanBones[hb]={node:idx}; }

  // 5) glTF JSON
  const json = {
    asset:{version:'2.0',generator:'normalized-vrma-exporter'},
    extensionsUsed:['VRMC_vrm_animation'],
    extensionsRequired:['VRMC_vrm_animation'],
    scene:0,
    scenes:[{nodes:rootNodes}],
    nodes,
    animations:[{name:clip.name||'animation',channels,samplers}],
    accessors, bufferViews,
    buffers:[{byteLength:binLen}],
    extensions:{ VRMC_vrm_animation:{ humanoid:{ humanBones } } },
  };

  // 6) GLB 패킹
  const jb = new TextEncoder().encode(JSON.stringify(json));
  const jpad=(4-(jb.length%4))%4, jlen=jb.length+jpad;
  const blen=binLen;
  const total = 12 + 8 + jlen + (blen? (8+blen):0);
  const out = new ArrayBuffer(total); const dv=new DataView(out); let p=0;
  dv.setUint32(p,0x46546c67,true); p+=4; dv.setUint32(p,2,true); p+=4; dv.setUint32(p,total,true); p+=4;
  dv.setUint32(p,jlen,true); p+=4; dv.setUint32(p,0x4e4f534a,true); p+=4; new Uint8Array(out,p).set(jb); p+=jb.length;
  for(let i=0;i<jpad;i++) new Uint8Array(out,p+i)[0]=0x20; p+=jpad;
  if(blen){ dv.setUint32(p,blen,true); p+=4; dv.setUint32(p,0x004e4942,true); p+=4;
    let c=0; for(const ch of binChunks){ new Uint8Array(out,p+c).set(ch); c+=ch.byteLength; } p+=blen; }
  return out;
}
