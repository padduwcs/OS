/* Mô phỏng Buổi 2. Lùi và làm lại bằng cách đọc lại các ảnh chụp trạng thái. */
(() => {
  const number = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 });
  const dash = '—';
  const join = (items) => items.length ? items.join(' → ') : dash;

  function node(label, detail, active = false) {
    return `<div class="lab-node${active ? ' is-active' : ''}"><b>${label}</b><small>${detail}</small></div>`;
  }

  function stats(entries) {
    return `<dl class="sim-state">${entries.map(([key, value]) => `<div><dt>${key}</dt><dd>${value}</dd></div>`).join('')}</dl>`;
  }

  const processTraces = [
    [
      ['Mở trình soạn thảo', 'A mới được tạo. B đang chạy trên lõi duy nhất.', 'B', [], [], 'A mới'],
      ['A vào hàng sẵn sàng', 'Kernel tiếp nhận A. Ở lượt này B tiếp tục chạy.', 'B', ['A'], [], 'A có ngữ cảnh ban đầu'],
      ['A được cấp CPU', 'B nhường lượt. Kernel lưu ngữ cảnh B và khôi phục ngữ cảnh của A.', 'A', ['B'], [], 'Lưu B'],
      ['A phải chờ đọc tệp', 'Dữ liệu chưa có. A rời CPU sang hàng chờ thiết bị. Kernel khôi phục ngữ cảnh B để tiếp tục phát nhạc.', 'B', [], ['A'], 'Lưu A ở lần đọc'],
      ['Thiết bị báo xong', 'Kernel xử lý ngắt và đưa A sang sẵn sàng. Chính sách ở đây cho B tiếp tục sau ngắt.', 'B', ['A'], [], 'A có thể được chọn'],
      ['A tiếp tục lần đọc', 'B nhường lượt. Kernel lưu B, khôi phục A, rồi A dùng dữ liệu đã đọc.', 'A', ['B'], [], 'Khôi phục A'],
      ['A hoàn tất', 'A thoát. Kernel chọn B từ hàng sẵn sàng.', 'B', [], [], 'A kết thúc'],
    ],
    [
      ['A dùng CPU', 'A đang tính chỉ mục, B có thể chạy ngay khi được cấp CPU.', 'A', ['B'], [], 'A đang thực thi'],
      ['Hết lượng tử của A', 'Timer báo hết lượt. Kernel lưu A, đưa A về cuối hàng và khôi phục B.', 'B', ['A'], [], 'Lưu A giữa phép tính'],
      ['B đợi thiết bị âm thanh', 'B chưa thể tiếp tục. Kernel đưa B sang hàng chờ và cho A tính tiếp từ điểm đã lưu.', 'A', [], ['B'], 'Lưu B, khôi phục A'],
      ['Thiết bị đánh thức B', 'B vào hàng sẵn sàng. Chính sách cho A dùng nốt lượt hiện tại.', 'A', ['B'], [], 'B có thể được chọn'],
      ['A dùng hết lượt tiếp theo', 'A lại vào hàng sẵn sàng. B tiếp tục phục vụ âm thanh.', 'B', ['A'], [], 'Khôi phục B'],
    ],
  ];

  function processFrame([title, note, cpu, ready, waiting, context]) {
    return {
      title, note,
      visual: `<div class="process-board">${node('Sẵn sàng', join(ready), ready.length > 0)}${node('CPU đang cấp cho', cpu, true)}${node('Chờ thiết bị', join(waiting), waiting.length > 0)}</div>${stats([['Ngữ cảnh và vòng đời', context]])}`,
    };
  }

  function ipcTrace(capacity) {
    const frames = [];
    const queue = [];
    const received = [];
    let pending = '';
    let waiting = false;

    function record(title, note) {
      const slots = Array.from({ length: capacity }, (_, index) => node(`Ô ${index + 1}`, queue[index] || 'Trống', Boolean(queue[index])));
      const producer = pending
        ? (queue.length === capacity ? `Đang chờ ô cho ${pending}` : `Sẵn sàng gửi tiếp ${pending}`)
        : 'Có thể gửi';
      const consumer = waiting ? 'Đang chờ tin' : 'Có thể nhận';
      frames.push({
        title, note,
        visual: `<div class="mailbox-board"><div>${node('Tiện ích', producer)}</div><div class="mailbox"><strong>Hộp thư FIFO</strong><div>${slots.join('')}</div></div><div>${node('Soạn thảo', consumer)}</div></div>${stats([['Đã lấy theo thứ tự', join(received)]])}`,
      });
    }

    function send(item) {
      if (queue.length === capacity) {
        pending = item;
        record(`Gửi ${item} gặp hộp thư đầy`, 'Bên gửi bị chặn. Tin mới đợi phía nhận giải phóng một ô.');
        return;
      }
      queue.push(item);
      const wake = waiting ? ' Kênh đánh thức bên nhận để nó có thể tiếp tục lời gọi.' : '';
      waiting = false;
      record(`Gửi ${item}`, `Tin ${item} được thêm vào cuối hộp thư.${wake}`);
    }

    function receive() {
      const item = queue.shift();
      if (!item) {
        waiting = true;
        record('Nhận khi hộp thư trống', 'Lần nhận chặn phải đợi tin mới.');
        return;
      }
      received.push(item);
      const wake = pending ? ' Ô trống cho phép bên gửi tiếp tục lời gọi khi được chạy.' : '';
      record(`Nhận ${item}`, `Phía nhận lấy tin cũ nhất và trả lại một ô trống.${wake}`);
    }

    record('Hộp thư trống', 'Tiện ích sẽ gửi lần lượt X và Y. Hãy đoán lần gửi nào có thể phải đợi.');
    send('X');
    send('Y');
    receive();
    if (pending) {
      const item = pending;
      pending = '';
      send(item);
    }
    receive();
    receive();
    send('Z');
    receive();
    return frames;
  }

  function parallelTrace(coreCount) {
    const tasks = ['A', 'B', 'C', 'D'];
    const chunkTime = 2;
    const mergeTime = 2;
    const serialTime = tasks.length * chunkTime + mergeTime;
    const lanes = Array.from({ length: coreCount }, () => []);
    const frames = [];
    const finished = [];
    const pending = tasks.map((id) => ({ id, left: chunkTime }));
    const running = Array(coreCount).fill(null);
    let mergeLeft = mergeTime;
    let time = 0;

    function record(title, note) {
      const rows = lanes.map((lane, index) => `
        <div><b>Lõi ${index + 1}</b><ol aria-label="Lịch lõi ${index + 1}" style="--ticks:${serialTime}">${lane.map((id, tick) => `<li data-task="${id}" title="${tick}–${tick + 1}" aria-label="${tick} đến ${tick + 1}: ${id === dash ? 'rỗi' : id}">${id}</li>`).join('')}</ol></div>`).join('');
      const status = mergeLeft === 0 ? `${number.format(serialTime / time)} lần` : 'Tính khi ghép xong';
      frames.push({
        title, note,
        visual: `<div class="parallel-example lab-parallel">${rows}<div class="timeline-direction">Thời gian → · G là ghép · Mỗi ô là 1 đơn vị</div></div>${stats([['Đoạn đã quét xong', join(finished)], ['Thời gian đã chạy', time], ['Tăng tốc so với 1 lõi', status]])}`,
      });
    }

    record('Chờ cấp việc', 'Bốn đoạn A, B, C, D độc lập. Mỗi đoạn cần 2 đơn vị. Ghép kết quả cần thêm 2 đơn vị sau khi đã quét đủ bốn đoạn.');
    while (finished.length < tasks.length) {
      const started = time;
      for (const [index, lane] of lanes.entries()) {
        running[index] ??= pending.shift() ?? null;
        const task = running[index];
        lane.push(task?.id ?? dash);
        if (task && --task.left === 0) {
          finished.push(task.id);
          running[index] = null;
        }
      }
      time += 1;
      const assignments = lanes.map((lane, index) => `lõi ${index + 1} ${lane.at(-1) === dash ? 'rỗi' : `quét ${lane.at(-1)}`}`);
      record(`Quét · ${started}–${time}`, `Trong khoảng này, ${assignments.join(', ')}.`);
    }
    while (mergeLeft > 0) {
      lanes.forEach((lane, index) => lane.push(index === 0 ? 'G' : dash));
      time += 1;
      mergeLeft -= 1;
      record(`Ghép · ${time - 1}–${time}`, mergeLeft ? 'Lõi 1 bắt đầu ghép các kết quả. Bước ghép chỉ dùng một lõi trong ví dụ.' : `Chỉ mục đã hoàn tất sau ${time} đơn vị, so với ${serialTime} đơn vị trên một lõi.`);
    }
    return frames;
  }

  const workloads = [
    { label: 'Việc nền đến trước', jobs: [['A', 0, 8, 3], ['B', 1, 4, 2], ['C', 2, 2, 1], ['M', 5, 1, 1]] },
    { label: 'Hai việc đến cùng lúc', jobs: [['A', 2, 7, 3], ['B', 2, 2, 2], ['C', 4, 3, 2], ['M', 10, 1, 1]] },
  ];

  const policies = {
    fcfs: { label: 'FCFS', rule: 'Đến trước chạy trước. Một đợt đã bắt đầu sẽ chạy đến hết.' },
    sjf: { label: 'SJF', rank: 'remaining', rule: 'Khi CPU rảnh, chọn đợt CPU ngắn nhất đã đến.' },
    srtf: { label: 'SRTF', rank: 'remaining', preempt: true, rule: 'Thu hồi khi có việc đã đến với thời gian còn lại ngắn hơn.' },
    rr: { label: 'RR', rule: 'Cấp tối đa một lượng tử, rồi đưa việc còn dở về cuối hàng.' },
    priority: { label: 'Ưu tiên · không thu hồi', rank: 'priority', rule: 'Khi CPU rảnh, chọn số ưu tiên nhỏ nhất.' },
    preemptivePriority: { label: 'Ưu tiên · có thu hồi', rank: 'priority', preempt: true, rule: 'Thu hồi nếu một việc có số ưu tiên nhỏ hơn đã đến.' },
    mlq: { label: 'MLQ', levels: ['Cao · RR 2', 'Thấp · FCFS'], slices: [2, Infinity], rule: 'Ưu tiên 1 vào hàng cao. Các việc khác ở hàng thấp. Hàng cao được chọn trước.' },
    mlfq: { label: 'MLFQ', levels: ['Q0 · RR 2', 'Q1 · RR 4', 'Q2 · FCFS'], slices: [2, 4, Infinity], demote: true, rule: 'Vào Q0, hạ một hàng khi dùng hết lượt mà vẫn còn việc. Hàng cao được chọn trước.' },
  };

  function scheduleTrace(workload, policy, quantum) {
    const jobs = workload.jobs.map(([id, arrival, burst, priority]) => ({
      id, arrival, burst, priority, remaining: burst, level: 0, slice: null,
      arrived: false, first: null, finish: null,
    }));
    const queues = Array.from({ length: policy.levels?.length ?? 1 }, () => []);
    const rank = (job) => policy.rank ? job[policy.rank] : 0;
    const ordered = (queue) => queue.slice().sort((a, b) => rank(a) - rank(b));
    let clock = 0;
    let turn = 0;
    let current = null;
    const segments = [];
    const frames = [];

    function arrivals() {
      const entering = jobs.filter((job) => !job.arrived && job.arrival === clock);
      for (const job of entering) {
        job.arrived = true;
        job.level = policy === policies.mlq && job.priority !== 1 ? 1 : 0;
        queues[job.level].push(job);
      }
      return entering.map((job) => job.id);
    }

    function record(title, note, lastRun = '') {
      frames.push({
        title, note, lastRun, clock, current: current?.id, slice: current?.slice,
        queues: queues.map((queue) => ordered(queue).map((job) => job.id)),
        jobs: jobs.map((job) => ({ ...job })), segments: segments.slice(),
      });
    }

    record('Trước khi cấp lượt đầu', 'Đọc mốc đến và số đơn vị CPU của từng việc, rồi dự đoán việc nào sẽ chạy trước.');
    const initial = arrivals();
    while (jobs.some((job) => job.finish === null)) {
      const events = clock === 0 && initial.length ? [`${initial.join(', ')} vào hàng tại 0.`] : [];
      const bestLevel = queues.findIndex((queue) => queue.length > 0);
      const best = bestLevel < 0 ? null : ordered(queues[bestLevel])[0];
      const higherQueue = current && best && bestLevel < current.level;
      const higherRank = current && best && policy.preempt && rank(best) < rank(current);

      if (higherQueue || higherRank) {
        const previous = current;
        if (higherQueue) queues[previous.level].unshift(previous);
        else queues[previous.level].push(previous);
        current = null;
        events.push(`${best.id} có quyền chạy trước. ${previous.id} trở lại hàng${higherQueue && Number.isFinite(previous.slice) ? ` với ${previous.slice} đơn vị lượng tử còn lại` : ''}.`);
      }
      if (!current && best) {
        const queue = queues[bestLevel];
        queue.splice(queue.indexOf(best), 1);
        current = best;
        current.slice ??= policy === policies.rr ? quantum : policy.slices?.[current.level] ?? Infinity;
        current.first ??= clock;
        turn += 1;
      }

      const nextArrival = jobs.find((job) => !job.arrived)?.arrival ?? Infinity;
      const duration = Math.min(current?.remaining ?? Infinity, current?.slice ?? Infinity, nextArrival - clock);
      const end = clock + duration;
      const id = current?.id ?? dash;
      const segment = { id, start: clock, end, turn };
      const last = segments.at(-1);
      if (last?.id === id && last.turn === turn) segments[segments.length - 1] = { ...last, end };
      else segments.push(segment);
      const span = `${clock}–${end}`;
      events.push(current ? `${id} chạy ${span}.` : `CPU rỗi ${span} vì chưa có việc sẵn sàng.`);
      clock = end;
      if (current) {
        current.remaining -= duration;
        current.slice -= duration;
        if (current.remaining === 0) {
          current.finish = clock;
          events.push(`${id} hoàn tất.`);
          current = null;
        }
      }

      const entering = arrivals();
      if (entering.length) events.push(`${entering.join(', ')} đến tại ${clock} và vào hàng.`);
      if (current?.slice === 0) {
        const prior = current.level;
        if (policy.demote) current.level += 1;
        current.slice = null;
        queues[current.level].push(current);
        events.push(`${id} hết lượt và vào cuối ${policy.demote ? `Q${current.level} từ Q${prior}` : 'hàng của mình'}.`);
        current = null;
      }
      const done = jobs.every((job) => job.finish !== null);
      const label = id === dash ? 'CPU rỗi' : id;
      record(done ? 'Tất cả công việc đã hoàn tất' : `${label} · ${span}`, events.join(' '), `${label} · ${span}`);
    }
    return frames.map((frame) => scheduleFrame(frame, policy, clock));
  }

  function scheduleFrame(frame, policy, totalTime) {
    const { jobs, segments, queues, clock, current, slice, lastRun, ...text } = frame;
    const timeline = segments.map(({ id, start, end }) => `<li data-task="${id}" style="--span:${end - start}" title="${start}–${end}" aria-label="${start} đến ${end}: ${id === dash ? 'rỗi' : id}">${id}</li>`).join('');
    const axis = `<div class="schedule-axis"><span>0</span><span>${totalTime} đơn vị</span></div>`;
    const timelineLabels = segments.length ? segments.map(({ id, start, end }) => `<span>${id === dash ? 'Rỗi' : id} ${start}–${end}</span>`).join('') : dash;
    const ready = queues.map((ids, index) => node(policy.levels?.[index] ?? 'Hàng sẵn sàng', join(ids), ids.length > 0));
    const workRows = jobs.map(({ id, arrival, burst, priority, remaining, arrived }) => `<tr><th scope="row">${id}</th><td>${arrival}</td><td>${burst}</td><td>${priority}</td><td>${arrived ? remaining : dash}</td></tr>`).join('');
    const workTable = `<table class="schedule-table"><caption>Dữ liệu công việc và số đơn vị CPU còn lại</caption><thead><tr><th scope="col">Việc</th><th scope="col">Đến</th><th scope="col">CPU</th><th scope="col">Ưu tiên</th><th scope="col">Còn</th></tr></thead><tbody>${workRows}</tbody></table>`;
    const running = current ? `${current}${Number.isFinite(slice) ? ` · lượng tử còn ${slice}` : ''}` : dash;
    return {
      ...text,
      visual: `<div class="schedule-board">
        <div class="schedule-rule">${policy.rule}</div>
        <ol class="schedule-timeline" aria-label="Trục thời gian CPU" style="--ticks:${totalTime}">${timeline}</ol>${axis}
        <div class="schedule-segments" aria-label="Các đoạn đã chạy">${timelineLabels}</div>
        <div class="schedule-queues">${ready.join('')}</div>
        ${workTable}${jobs.every((job) => job.finish !== null) ? results(jobs, totalTime) : ''}
      </div>${stats([['Đồng hồ', clock], ['Lượt vừa quan sát', lastRun || dash], ['Vẫn giữ CPU tại mốc này', running]])}`,
    };
  }

  function results(jobs, totalTime) {
    const metrics = jobs.map(({ id, arrival, burst, first, finish }) => ({
      id, first, finish, turnaround: finish - arrival, waiting: finish - arrival - burst, response: first - arrival,
    }));
    const avg = (key) => number.format(metrics.reduce((sum, job) => sum + job[key], 0) / jobs.length);
    const utilization = jobs.reduce((sum, job) => sum + job.burst, 0) * 100 / totalTime;
    const rows = metrics.map(({ id, first, finish, turnaround, waiting, response }) => `<tr><th scope="row">${id}</th><td>${first}</td><td>${finish}</td><td>${turnaround}</td><td>${waiting}</td><td>${response}</td></tr>`).join('');
    return `<table class="schedule-table schedule-results">
      <caption>Kết quả tính từ lịch chạy</caption>
      <thead><tr><th scope="col">Việc</th><th scope="col">Chạy đầu</th><th scope="col">Kết thúc</th><th scope="col">Hoàn tất</th><th scope="col">Chờ</th><th scope="col">Đáp ứng</th></tr></thead>
      <tbody>${rows}</tbody><tfoot><tr><th scope="row" colspan="3">Trung bình</th><td>${avg('turnaround')}</td><td>${avg('waiting')}</td><td>${avg('response')}</td></tr></tfoot>
    </table><div class="schedule-totals">CPU bận ${number.format(utilization)}% · Thông lượng ${number.format(jobs.length / totalTime)} việc mỗi đơn vị</div>`;
  }

  const quantumControl = { name: 'Lượng tử RR', options: ['2', '4'] };
  const labs = {
    process: {
      title: 'Theo dõi một lõi qua các lần đổi lượt',
      subtitle: 'A là trình soạn thảo, B là trình phát nhạc. Mỗi bước là một sự kiện, độ dài các bước có thể khác nhau.',
      controls: [{ name: 'Tình huống', options: ['A chờ đọc tệp', 'A hết lượt CPU'] }],
      trace: (scenario) => processTraces[scenario].map(processFrame),
    },
    ipc: {
      title: 'Khi nào bên gửi hoặc bên nhận phải đợi?',
      subtitle: 'Hộp thư hữu hạn. Cả gửi và nhận đều chặn. Các ô hiện nội dung từ đầu đến cuối hàng.',
      controls: [{ name: 'Dung lượng', options: ['1 ô', '2 ô'] }],
      trace: (capacity) => ipcTrace(capacity + 1),
    },
    parallel: {
      title: 'Quét bốn đoạn rồi ghép chỉ mục',
      subtitle: 'Đổi số lõi và nhìn những hàng chạy cùng cột. Ví dụ bỏ qua chi phí chia việc và chuyển lượt.',
      controls: [{ name: 'Số lõi', options: ['1 lõi', '2 lõi', '4 lõi'] }],
      trace: (scenario) => parallelTrace([1, 2, 4][scenario]),
    },
    schedule: {
      title: 'Tính và so sánh lịch CPU',
      subtitle: 'A lập chỉ mục, B và C xử lý tệp, M giải mã nhạc. Một đợt CPU cho mỗi việc, một lõi, bỏ qua chi phí chuyển ngữ cảnh.',
      controls: [
        { name: 'Tập công việc', options: workloads.map(({ label }) => label) },
        { name: 'Thuật toán', options: Object.values(policies).map(({ label }) => label) },
        quantumControl,
      ],
      trace: (workload, algorithm, quantum) => scheduleTrace(workloads[workload], Object.values(policies)[algorithm], [2, 4][quantum]),
      convention: 'Việc đến đúng mốc hết lượt vào hàng trước việc hết lượt. Nếu bằng hạng thì theo thứ tự vào hàng và giữ nguyên việc đang chạy. Các việc đến cùng lúc vào hàng theo thứ tự bảng.',
    },
  };

  function mount(host, lab) {
    const titleId = `${host.id}-title`;
    const controls = lab.controls.map(({ name, options }) => `<label>${name} <select>${options.map((option) => `<option>${option}</option>`).join('')}</select></label>`).join('');
    host.innerHTML = `<section class="sim lesson-two-lab" aria-labelledby="${titleId}">
      <div class="sim-h">
        <div class="ttl" id="${titleId}">${lab.title}<small>${lab.subtitle}</small></div>
        <div class="sim-ctl lab-options">${controls}</div>
      </div>
      ${lab.convention ? `<p class="lab-convention">${lab.convention}</p>` : ''}
      <div class="sim-ctl lab-navigation">
        <button type="button" data-prev>Bước trước</button>
        <button type="button" class="primary" data-next>Bước tiếp</button>
        <button type="button" data-reset>Làm lại</button>
        <span class="sim-step"></span>
      </div>
      <p class="sim-note" aria-live="polite" aria-atomic="true"></p>
      <div class="lab-view"></div>
    </section>`;

    const selects = [...host.querySelectorAll('select')];
    const view = host.querySelector('.lab-view');
    const status = host.querySelector('.sim-note');
    const counter = host.querySelector('.sim-step');
    const previous = host.querySelector('[data-prev]');
    const next = host.querySelector('[data-next]');
    let frames;
    let index = 0;

    function render() {
      const { title, note, visual } = frames[index];
      view.innerHTML = visual;
      status.innerHTML = `<b>${title}.</b> ${note}`;
      counter.textContent = `${index + 1} / ${frames.length}`;
      previous.disabled = index === 0;
      next.disabled = index === frames.length - 1;
    }

    function load() {
      const settings = selects.map(({ selectedIndex }) => selectedIndex);
      const quantumIndex = lab.controls.indexOf(quantumControl);
      if (quantumIndex !== -1) {
        const quantum = selects[quantumIndex];
        quantum.disabled = selects[1].value !== 'RR';
        quantum.closest('label').hidden = quantum.disabled;
      }
      frames = lab.trace(...settings);
      index = 0;
      render();
    }

    selects.forEach((select) => select.addEventListener('change', load));
    previous.addEventListener('click', () => { index -= 1; render(); });
    next.addEventListener('click', () => { index += 1; render(); });
    host.querySelector('[data-reset]').addEventListener('click', () => { index = 0; render(); });
    load();
  }

  document.querySelectorAll('[data-lab]').forEach((host) => mount(host, labs[host.dataset.lab]));
})();
