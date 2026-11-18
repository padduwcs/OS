/* Điều khiển chung. Mỗi bài tự tính các trạng thái và vẽ trạng thái hiện tại. */
(() => {
  let stopCurrent;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopCurrent?.();
  });

  window.mountLabSteps = (host, draw, { play = false } = {}) => {
    const toolbar = host.querySelector('.lab-steps');
    toolbar.innerHTML = `
      <span class="sim-step"></span>
      <div class="lab-step-actions">
        <button type="button" data-prev>Bước trước</button>
        <button type="button" class="primary" data-next>Bước tiếp</button>
        ${play ? '<button type="button" data-play>Phát tự động</button>' : ''}
        <button type="button" data-reset>Làm lại</button>
      </div>`;

    const progress = toolbar.querySelector('.sim-step');
    const previous = toolbar.querySelector('[data-prev]');
    const next = toolbar.querySelector('[data-next]');
    const reset = toolbar.querySelector('[data-reset]');
    const player = toolbar.querySelector('[data-play]');
    let index = 0;
    let last = 0;
    let timer;

    function updatePlayLabel() {
      if (player) player.textContent = timer ? 'Tạm dừng' : index === last ? 'Phát lại' : 'Phát tự động';
    }

    function pause() {
      clearInterval(timer);
      timer = undefined;
      if (stopCurrent === pause) stopCurrent = undefined;
      updatePlayLabel();
    }

    function show() {
      progress.textContent = index ? `Bước ${index} / ${last}` : `Bắt đầu · ${last} bước`;
      const focused = document.activeElement;
      previous.disabled = reset.disabled = index === 0;
      next.disabled = index === last;
      if (focused === next && next.disabled) previous.focus();
      if ((focused === previous || focused === reset) && index === 0) next.focus();
      updatePlayLabel();
      draw(index);
    }

    function goTo(position) {
      pause();
      index = position;
      show();
    }

    previous.addEventListener('click', () => goTo(index - 1));
    next.addEventListener('click', () => goTo(index + 1));
    reset.addEventListener('click', () => goTo(0));
    player?.addEventListener('click', () => {
      if (timer) {
        pause();
        return;
      }
      stopCurrent?.();
      stopCurrent = pause;
      if (index === last) index = 0;
      timer = setInterval(() => {
        index += 1;
        if (index === last) pause();
        show();
      }, 1600);
      show();
    });

    return (length) => {
      last = length - 1;
      goTo(0);
    };
  };
})();
