
export function makePanelsDraggable() {
  const panels = document.querySelectorAll('.control-panel') as NodeListOf<HTMLDivElement>;

  panels.forEach(panel => {
    let isDragging = false;
    let offsetX: number, offsetY: number;

    const onMouseDown = (e: MouseEvent) => {
      // Only drag when clicking on the panel itself, not its children (buttons, sliders, etc.)
      if (e.target !== panel && e.target !== panel.querySelector('h3')) {
        return;
      }
      
      isDragging = true;
      offsetX = e.clientX - panel.offsetLeft;
      offsetY = e.clientY - panel.offsetTop;

      // A high z-index ensures the dragged panel is on top of others
      panel.style.zIndex = '10000'; 

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      let newX = e.clientX - offsetX;
      let newY = e.clientY - offsetY;

      // Constrain panel within the window bounds
      const maxX = window.innerWidth - panel.offsetWidth;
      const maxY = window.innerHeight - panel.offsetHeight;

      newX = Math.max(0, Math.min(newX, maxX));
      newY = Math.max(0, Math.min(newY, maxY));

      panel.style.left = `${newX}px`;
      panel.style.top = `${newY}px`;
    };

    const onMouseUp = () => {
      isDragging = false;
      // Reset z-index when dragging is finished
      panel.style.zIndex = '2002'; 
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    panel.addEventListener('mousedown', onMouseDown);
  });
}
