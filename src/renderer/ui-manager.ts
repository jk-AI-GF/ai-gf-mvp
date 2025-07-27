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
      // Clear any existing floating messages
      if (window.floatingMessages && window.floatingMessages.length > 0) {
        window.floatingMessages.forEach(msg => msg.element.remove());
        window.floatingMessages = []; // Clear the array
      }

      const msgDiv = document.createElement('div');
      msgDiv.className = 'floating-chat-message assistant entering';
      msgDiv.textContent = text;
      Object.assign(msgDiv.style, {
        position: 'absolute', // Position is set in the animation loop
        background: 'rgba(0, 0, 0, 0.7)',
        color: 'white',
        padding: '8px 12px',
        borderRadius: '15px',
        maxWidth: '250px',
        textAlign: 'center',
        pointerEvents: 'none',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      });
      floatingContainer.appendChild(msgDiv);
      
      // Add the new message to the global array so the renderer can position it
      window.floatingMessages.push({ element: msgDiv, timestamp: performance.now() });

      // Animation trigger
      setTimeout(() => {
        msgDiv.classList.remove('entering');
        msgDiv.style.opacity = '1';
      }, 10);
    }
  } else {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'chat-message ' + role;
    msgDiv.textContent = (role === 'user' ? '🙋‍♂️ ' : '🤖 ') + text;
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
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

export function clearMeshList() {
  const meshListDisplay = document.getElementById('mesh-list');
  if (meshListDisplay) {
    meshListDisplay.innerHTML = '<p style="color: white;">VRM을 로드해주세요.</p>';
  }
}

export async function createModList() {
  const modListContainer = document.getElementById('mod-list-container');
  // 기존 목록 초기화
  modListContainer.innerHTML = '<p>모드를 불러오는 중...</p>';

  try {
    const [allMods, modSettings] = await Promise.all([
      window.electronAPI.getAllMods(),
      window.electronAPI.getModSettings()
    ]);

    modListContainer.innerHTML = ''; // 로딩 메시지 제거

    if (allMods.length === 0) {
      modListContainer.innerHTML = '<p>설치된 모드가 없습니다.</p>';
      return;
    }

    allMods.forEach(mod => {
      const isEnabled = modSettings[mod.name] !== false; // 설정에 없으면 기본값 true

      const modElement = document.createElement('div');
      modElement.style.display = 'flex';
      modElement.style.alignItems = 'center';
      modElement.style.justifyContent = 'space-between';
      modElement.style.padding = '8px 0';
      modElement.style.borderBottom = '1px solid #444';

      const label = document.createElement('label');
      label.htmlFor = `mod-toggle-${mod.name}`;
      label.textContent = `${mod.name} (v${mod.version})`;
      label.style.cursor = 'pointer';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = `mod-toggle-${mod.name}`;
      checkbox.checked = isEnabled;
      checkbox.style.cursor = 'pointer';

      checkbox.addEventListener('change', async (e) => {
        const target = e.target as HTMLInputElement;
        await window.electronAPI.setModEnabled(mod.name, target.checked);
        // 사용자에게 재시작이 필요함을 다시 한번 알릴 수 있습니다.
        const restartMessage = document.getElementById('mod-restart-message');
        if (restartMessage) {
          restartMessage.style.display = 'block';
        }
      });
      
      modElement.appendChild(label);
      modElement.appendChild(checkbox);
      modListContainer.appendChild(modElement);
    });

    // 재시작 안내 메시지 (처음엔 숨김)
    const restartMessage = document.createElement('p');
    restartMessage.id = 'mod-restart-message';
    restartMessage.textContent = 'ℹ️ 앱을 재시작하여 변경사항을 적용하세요.';
    restartMessage.style.display = 'none';
    restartMessage.style.marginTop = '15px';
    restartMessage.style.padding = '8px';
    restartMessage.style.background = 'rgba(255, 255, 0, 0.1)';
    restartMessage.style.border = '1px solid rgba(255, 255, 0, 0.3)';
    restartMessage.style.borderRadius = '4px';
    modListContainer.appendChild(restartMessage);

  } catch (error) {
    modListContainer.innerHTML = `<p style="color: red;">모드 목록을 불러오는 데 실패했습니다: ${error.message}</p>`;
  }
}