import * as THREE from 'three';
import { VRM, VRMHumanBoneName, VRMPose } from '@pixiv/three-vrm';

// currentVrm은 renderer.ts에서 전역으로 관리되므로, ui-manager.ts에서는 인자로 받거나,
// window 객체를 통해 접근하도록 변경해야 합니다. 여기서는 일단 인자로 받는 형태로 작성합니다.
// 실제 구현 시에는 window.currentVrm을 사용하거나, 더 나은 의존성 주입 방법을 고려해야 합니다.

export function appendMessage(role: string, text: string) {
  const chatMessages = document.getElementById('chat-messages');
  if (role === 'assistant') {
    const floatingContainer = document.getElementById('floating-chat-messages-container');
    if (floatingContainer) {
      const msgDiv = document.createElement('div');
      msgDiv.className = 'floating-chat-message assistant entering'; // entering 클래스 추가
      msgDiv.textContent = text;
      Object.assign(msgDiv.style, {
        position: 'absolute',
        background: 'rgba(0, 0, 0, 0.7)',
        color: 'white',
        padding: '8px 12px',
        borderRadius: '15px',
        maxWidth: '250px',
        textAlign: 'center',
        pointerEvents: 'none',
        whiteSpace: 'pre-wrap', // Preserve whitespace and allow wrapping
        wordBreak: 'break-word', // Break long words
      });
      floatingContainer.appendChild(msgDiv);
      (window as any).floatingMessages.push({ element: msgDiv, timestamp: performance.now() });

      // 애니메이션 트리거
      setTimeout(() => {
        msgDiv.classList.remove('entering');
        msgDiv.style.opacity = '1'; // opacity만 설정하여 CSS transition이 transform을 처리하도록 합니다.
      }, 10); // 짧은 지연 후 클래스 제거
    }
  } else {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'chat-message ' + role;
    msgDiv.textContent = (role === 'user' ? '🙋‍♂️ ' : '🤖 ') + text;
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
}

export function updateJointSliders() {
  const currentVrm = (window as any).currentVrm;
  if (!currentVrm) return;
  const slidersContainer = document.getElementById('joint-sliders');
  if (!slidersContainer) return;
  Object.values(VRMHumanBoneName).forEach(boneName => {
    const bone = currentVrm.humanoid.getNormalizedBoneNode(boneName);
    if (bone) {
      const boneControl = slidersContainer.querySelector(`div[data-bone-name="${boneName}"]`);
      if (boneControl) {
        const currentEuler = new THREE.Euler().setFromQuaternion(bone.quaternion, 'XYZ');
        ['x', 'y', 'z'].forEach(axis => {
          const slider = boneControl.querySelector<HTMLInputElement>(`.slider-${axis}`);
          if (slider) {
            slider.value = THREE.MathUtils.radToDeg(currentEuler[axis as 'x' | 'y' | 'z']).toFixed(0);
          }
        });
      }
    }
  });
}

export function createJointSliders() {
  const currentVrm = (window as any).currentVrm;
  if (!currentVrm) return;
  const slidersContainer = document.getElementById('joint-sliders');
  if (!slidersContainer) return;
  slidersContainer.innerHTML = '';
  Object.values(VRMHumanBoneName).forEach(boneName => {
    const bone = currentVrm.humanoid.getNormalizedBoneNode(boneName);
    if (bone) {
      const boneControl = document.createElement('div');
      boneControl.style.marginBottom = '15px';
      boneControl.setAttribute('data-bone-name', boneName);
      const label = document.createElement('label');
      label.textContent = boneName;
      label.style.display = 'block';
      boneControl.appendChild(label);
      ['x', 'y', 'z'].forEach(axis => {
        const sliderContainer = document.createElement('div');
        sliderContainer.style.display = 'flex';
        const axisLabel = document.createElement('span');
        axisLabel.textContent = axis.toUpperCase();
        sliderContainer.appendChild(axisLabel);
        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = '-180';
        slider.max = '180';
        const currentEuler = new THREE.Euler().setFromQuaternion(bone.quaternion, 'XYZ');
        slider.value = THREE.MathUtils.radToDeg(currentEuler[axis as 'x' | 'y' | 'z']).toFixed(0);
        slider.oninput = () => {
          const x = (boneControl.querySelector('.slider-x') as HTMLInputElement).value;
          const y = (boneControl.querySelector('.slider-y') as HTMLInputElement).value;
          const z = (boneControl.querySelector('.slider-z') as HTMLInputElement).value;
          const euler = new THREE.Euler(
            THREE.MathUtils.degToRad(parseFloat(x)),
            THREE.MathUtils.degToRad(parseFloat(y)),
            THREE.MathUtils.degToRad(parseFloat(z)),
            'XYZ'
          );
          bone.setRotationFromEuler(euler);
        };
        slider.className = `slider-${axis}`;
        sliderContainer.appendChild(slider);
        boneControl.appendChild(sliderContainer);
      });

      // 초기화 버튼 추가
      const resetButton = document.createElement('button');
      resetButton.textContent = '초기화';
      Object.assign(resetButton.style, {
        marginTop: '5px',
        padding: '5px 10px',
        backgroundColor: '#dc3545',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer', 
        fontSize: '0.8rem',
      });
      resetButton.onclick = () => {
        if (bone) {
          bone.quaternion.set(0, 0, 0, 1); // 쿼터니언 초기화 (회전 없음)
          // 슬라이더 값도 초기화된 값으로 업데이트
          const resetEuler = new THREE.Euler().setFromQuaternion(bone.quaternion, 'XYZ');
          ['x', 'y', 'z'].forEach(axis => {
            const slider = boneControl.querySelector<HTMLInputElement>(`.slider-${axis}`);
            if (slider) {
              slider.value = THREE.MathUtils.radToDeg(resetEuler[axis as 'x' | 'y' | 'z']).toFixed(0);
            }
          });
        }
      };
      boneControl.appendChild(resetButton);

      slidersContainer.appendChild(boneControl);
    }
  });
}

export function createExpressionSliders() {
  if (!window.currentVrm || !window.currentVrm.expressionManager) {
    console.warn('createExpressionSliders: currentVrm or expressionManager is not available. Returning.');
    return;
  }
  const slidersContainer = document.getElementById('expression-sliders');
  if (!slidersContainer) {
    console.warn('createExpressionSliders: slidersContainer not found. Returning.');
    return;
  }
  slidersContainer.innerHTML = ''; // Clear previous sliders

  const expressionManager = window.currentVrm.expressionManager;
  const expressionMap = expressionManager.expressionMap;

  if (!expressionMap || Object.keys(expressionMap).length === 0) {
    console.warn('createExpressionSliders: No expressions found in VRM model. Returning.');
    return;
  }

  // `expressionMap`'s keys are the correct names for `setValue`
  for (const expressionName in expressionMap) {
    const expressionControl = document.createElement('div');
    expressionControl.style.marginBottom = '15px';
    expressionControl.setAttribute('data-expression-name', expressionName);

    const label = document.createElement('label');
    label.textContent = expressionName;
    label.style.display = 'block';
    expressionControl.appendChild(label);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '0';
    slider.max = '100'; // 0.0 to 1.0, so 0 to 100 for slider
    const initialValue = expressionManager.getValue(expressionName) || 0;
    slider.value = (initialValue * 100).toFixed(0);

    slider.oninput = () => {
      const weight = parseFloat(slider.value) / 100;
      // The key from expressionMap is the correct one to use.
      expressionManager.setValue(expressionName, weight);
      expressionManager.update();
    };
    slider.className = 'expression-slider';
    expressionControl.appendChild(slider);
    slidersContainer.appendChild(expressionControl);
  }
}

export function updateExpressionSliderValue(expressionName: string, currentWeight: number) {
  const slider = document.querySelector<HTMLInputElement>(`#expression-sliders [data-expression-name="${expressionName}"] .expression-slider`);
  if (slider) {
    slider.value = (currentWeight * 100).toFixed(0);
  }
}

export function setupPosePanelButton(electronAPI: any, onFileSelect: (filePath: string) => void) {
  const openPosePanelButton = document.getElementById('open-pose-panel-button');
  if (openPosePanelButton) {
    openPosePanelButton.onclick = async () => {
      const poseSidePanel = document.getElementById('pose-side-panel');
      if (poseSidePanel.style.display === 'flex') {
        poseSidePanel.style.display = 'none';
      } else {
        poseSidePanel.style.display = 'flex';
        try {
          const result = await electronAPI.listDirectory('Pose');
          console.log('listDirectory result for Pose:', result);
          if (result.error) {
            throw new Error(result.error);
          }
          const vrmaFiles = result.files.filter((file: string) => file.endsWith('.vrma'));
          
          const poseListDisplay = document.getElementById('pose-list-display');
          if (poseListDisplay) {
            poseListDisplay.innerHTML = ''; // Clear previous list
            if (vrmaFiles.length === 0) {
              const noFilesMessage = document.createElement('p');
              noFilesMessage.textContent = '저장된 포즈 파일(.vrma)이 없습니다.';
              noFilesMessage.style.color = 'white';
              poseListDisplay.appendChild(noFilesMessage);
            } else {
              vrmaFiles.forEach((file: string) => {
                const button = document.createElement('button');
                button.textContent = file;
                Object.assign(button.style, {
                  padding: '10px 15px', backgroundColor: 'transparent', color: 'white',
                  border: 'none', borderRadius: '8px', cursor: 'pointer',
                  marginBottom: '8px', width: '100%', textAlign: 'left',
                  fontSize: '1rem', transition: 'background-color 0.2s ease'
                });
                button.onmouseover = () => { button.style.backgroundColor = 'rgba(0,123,255,0.2)'; };
                button.onmouseout = () => { button.style.backgroundColor = 'transparent'; };
                button.onclick = () => {
                  onFileSelect(file);
                };
                poseListDisplay.appendChild(button);
              });
            }
          }
        } catch (error) {
          console.error('Failed to list VRMA poses for panel:', error);
          alert('포즈 목록을 불러오는 데 실패했습니다.');
        }
      }
    };
  }
}

export function setupAnimationPanelButton(electronAPI: any, onFileSelect: (filePath: string) => void) {
  const openAnimationPanelButton = document.getElementById('open-animation-panel-button');
  if (openAnimationPanelButton) {
    openAnimationPanelButton.onclick = async () => {
      const animationSidePanel = document.getElementById('animation-side-panel');
      if (animationSidePanel.style.display === 'flex') {
        animationSidePanel.style.display = 'none';
      } else {
        animationSidePanel.style.display = 'flex';
        try {
          const result = await electronAPI.listDirectory('Animation');
          if (result.error) {
            throw new Error(result.error);
          }
          const vrmaFiles = result.files.filter((file: string) => file.endsWith('.vrma') || file.endsWith('.fbx'));
          
          const animationListDisplay = document.getElementById('animation-list-display');
          if (animationListDisplay) {
            animationListDisplay.innerHTML = ''; // Clear previous list
            if (vrmaFiles.length === 0) {
              const noFilesMessage = document.createElement('p');
              noFilesMessage.textContent = '저장된 애니메이션 파일(.vrma)이 없습니다.';
              noFilesMessage.style.color = 'white';
              animationListDisplay.appendChild(noFilesMessage);
            }
            else {
              vrmaFiles.forEach((file: string) => {
                const button = document.createElement('button');
                button.textContent = file;
                Object.assign(button.style, {
                  padding: '10px 15px', backgroundColor: 'transparent', color: 'white',
                  border: 'none', borderRadius: '8px', cursor: 'pointer',
                  marginBottom: '8px', width: '100%', textAlign: 'left',
                  fontSize: '1rem', transition: 'background-color 0.2s ease'
                });
                button.onmouseover = () => { button.style.backgroundColor = 'rgba(0,123,255,0.2)'; };
                button.onmouseout = () => { button.style.backgroundColor = 'transparent'; };
                button.onclick = () => {
                  onFileSelect(file);
                };
                animationListDisplay.appendChild(button);
              });
            }
          }
        } catch (error) {
          console.error('Failed to list VRMA animations for panel:', error);
          alert('애니메이션 목록을 불러오는 데 실패했습니다.');
        }
      }
    };
  }
}

export function setupSavePoseButton(getVrm: () => VRM | null, electronAPI: any) {
  const savePoseButton = document.getElementById('save-pose-button');
  if (savePoseButton) {
    savePoseButton.onclick = () => {
      const currentVrm = getVrm(); // 함수를 호출하여 VRM 객체를 가져옵니다.
      if (!currentVrm) {
        alert('VRM 모델이 로드되지 않았습니다.');
        return;
      }

      // 1. Get the current pose from the VRM model.
      const pose: VRMPose = currentVrm.humanoid.getNormalizedPose();

      // 2. Export the pose as a JSON Blob and save it.
      const jsonString = JSON.stringify(pose, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      
      // Create a temporary URL to pass to the main process for saving
      const reader = new FileReader();
      reader.onload = async (event) => {
          if (event.target?.result instanceof ArrayBuffer) {
              const result = await electronAPI.saveVrmaPose(event.target.result);
              if (result.success) {
                  console.log(`Pose saved successfully: ${result.message}`);
              } else if (result.message !== 'Save operation canceled.') {
                  console.error(`Failed to save pose: ${result.message}`);
              }
          } else {
              console.error('Failed to read blob as ArrayBuffer.');
              alert('포즈 파일 변환에 실패했습니다.');
          }
      };
      reader.onerror = (error) => {
          console.error('FileReader error:', error);
      };
      reader.readAsArrayBuffer(blob);
    };
  }
}

export function setupLoadPoseFileButton(electronAPI: any, onFileSelect: (filePath: string) => void) {
  const loadPoseFileButton = document.getElementById('load-pose-file-button');
  if (loadPoseFileButton) {
    loadPoseFileButton.onclick = async () => {
      const filePath = await electronAPI.openVrmaFile();
      if (filePath) {
        const url = `file://${filePath.replace(/\\/g, '/')}`;
        onFileSelect(url);
      }
    };
  }
}

export function setupLoadVrmButton(electronAPI: any, loadVRM: (filePathOrUrl: string) => void) {
  const loadVrmButton = document.getElementById('load-vrm-button');
  if (loadVrmButton) {
    loadVrmButton.onclick = async () => {
      const filePath = await electronAPI.openVrmFile();
      if (filePath) {
        const url = `file://${filePath.replace(/\\/g, '/')}`;
        loadVRM(url);
      }
    };
  }
}

export function logVrmBoneNames(currentVrm: VRM | null) {
  if (!currentVrm) return;
  console.log('--- VRM Humanoid Bone Names ---');
  Object.entries(currentVrm.humanoid.humanBones).forEach(([boneName, bone]) => {
    if (bone?.node) console.log(`HumanBoneName: ${boneName}, Node Name: ${bone.node.name}`);
  });
  console.log('-------------------------------');
}

export function listVrmMeshes(currentVrm: VRM | null): string[] {
  if (!currentVrm) {
    console.warn('VRM model not loaded. Cannot list meshes.');
    return [];
  }
  const meshNames: string[] = [];
  currentVrm.scene.traverse((object) => {
    if ((object as THREE.Mesh).isMesh) {
      meshNames.push(object.name);
    }
  });
  return meshNames;
}

export function toggleVrmMeshVisibility(currentVrm: VRM | null, meshName: string, visible: boolean): void {
  if (!currentVrm) {
    console.warn('VRM model not loaded. Cannot toggle mesh visibility.');
    return;
  }
  let found = false;
  currentVrm.scene.traverse((object) => {
    if ((object as THREE.Mesh).isMesh && object.name === meshName) {
      object.visible = visible;
      found = true;
      console.log(`Mesh '${meshName}' visibility set to ${visible}`);
    }
  });
  if (!found) {
    console.warn(`Mesh '${meshName}' not found in VRM model.`);
  }
}

export function createMeshList(currentVrm: VRM | null, toggleVrmMeshVisibility: (currentVrm: VRM | null, meshName: string, visible: boolean) => void) {
  const meshListDisplay = document.getElementById('mesh-list');
  if (!meshListDisplay) {
    console.warn('Mesh list display element not found.');
    return;
  }

  meshListDisplay.innerHTML = ''; // Clear previous list

  if (!currentVrm) {
    const noModelMessage = document.createElement('p');
    noModelMessage.textContent = 'VRM 모델이 로드되지 않았습니다.';
    noModelMessage.style.color = 'white';
    meshListDisplay.appendChild(noModelMessage);
    return;
  }

  const meshNames = listVrmMeshes(currentVrm);

  if (meshNames.length === 0) {
    const noMeshesMessage = document.createElement('p');
    noMeshesMessage.textContent = '모델에 메시가 없습니다.';
    noMeshesMessage.style.color = 'white';
    meshListDisplay.appendChild(noMeshesMessage);
    return;
  }

  meshNames.forEach((meshName) => {
    const meshItem = document.createElement('div');
    meshItem.style.marginBottom = '10px';
    meshItem.style.display = 'flex';
    meshItem.style.alignItems = 'center';

    const label = document.createElement('span');
    label.textContent = meshName;
    label.style.color = 'white';
    label.style.marginRight = '10px';
    meshItem.appendChild(label);

    const toggleButton = document.createElement('button');
    toggleButton.textContent = 'Toggle Visibility';
    Object.assign(toggleButton.style, {
      padding: '5px 10px', backgroundColor: '#007bff', color: 'white',
      border: 'none', borderRadius: '5px', cursor: 'pointer',
      fontSize: '0.8rem', transition: 'background-color 0.2s ease'
    });
    toggleButton.onmouseover = () => { toggleButton.style.backgroundColor = '#0056b3'; };
    toggleButton.onmouseout = () => { toggleButton.style.backgroundColor = '#007bff'; };
    toggleButton.onclick = () => {
      const mesh = currentVrm.scene.getObjectByName(meshName);
      if (mesh) {
        toggleVrmMeshVisibility(currentVrm, meshName, !mesh.visible);
      }
    };
    meshItem.appendChild(toggleButton);

    meshListDisplay.appendChild(meshItem);
  });
}