/**
 * 모드 관리 UI를 생성하고 이벤트를 처리합니다.
 */
export function setupModManagementUI() {
  // 1. 모드 관리 패널 HTML 생성 및 body에 추가
  const panelHTML = `
    <div id="mod-management-panel" class="control-panel">
      <button id="mod-panel-close-button" class="control-panel-close-button">&times;</button>
      <h2>모드 관리</h2>
      <p style="font-size: 12px; color: #ccc;">변경사항을 적용하려면 앱을 재시작해야 합니다.</p>
      <div id="mod-list-container" style="margin-top: 15px;">
        <!-- 모드 목록이 여기에 동적으로 추가됩니다 -->
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', panelHTML);

  // 2. UI 요소 가져오기
  const modManagementPanel = document.getElementById('mod-management-panel');
  const closeButton = document.getElementById('mod-panel-close-button');
  const modListContainer = document.getElementById('mod-list-container');
  
  // 3. 사이드바에 "모드 관리" 버튼 추가
  const sidebar = document.getElementById('sidebar');
  if (sidebar) {
    const modButton = document.createElement('button');
    modButton.id = 'open-mod-management-button';
    modButton.className = 'menu-button';
    modButton.textContent = '모드 관리';
    sidebar.appendChild(modButton);

    modButton.addEventListener('click', () => {
      populateModList();
      modManagementPanel.style.display = 'block';
    });
  }

  // 4. 닫기 버튼 이벤트 리스너
  closeButton.addEventListener('click', () => {
    modManagementPanel.style.display = 'none';
  });

  // 5. 모드 목록을 채우는 함수
  async function populateModList() {
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
}
