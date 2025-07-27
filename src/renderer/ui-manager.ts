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







