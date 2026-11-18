/* Mô phỏng bộ nhớ cho Buổi 4. Các trạng thái được tính lại khi đổi dữ liệu. */
(() => {
  const options = (items) => Object.entries(items)
    .map(([value, label]) => `<option value="${value}">${label}</option>`).join('');

  function mount(root, lab) {
    const headingId = `${root.id}-ten`;
    root.classList.add('sim', 'memory-lab');
    root.setAttribute('role', 'region');
    root.setAttribute('aria-labelledby', headingId);
    root.innerHTML = `
      <header class="sim-h">
        <h4 class="ttl" id="${headingId}">${lab.title}<small>${lab.prompt}</small></h4>
        <div class="sim-ctl">
          <div class="mem-selects">${lab.selects.map(([name, label, items]) =>
            `<label>${label}<select name="${name}">${options(items)}</select></label>`).join('')}</div>
          <button type="button" data-control="prev">Bước trước</button>
          <button type="button" data-control="reset">Làm lại</button>
          <button type="button" class="primary" data-control="next">Bước tiếp</button>
          <span class="sim-step"></span>
        </div>
      </header>
      <p class="sim-note" aria-live="polite" aria-atomic="true"></p>
      <div class="sim-illustration"></div>`;

    const controls = [...root.querySelectorAll('select')];
    const previous = root.querySelector('[data-control="prev"]');
    const reset = root.querySelector('[data-control="reset"]');
    const next = root.querySelector('[data-control="next"]');
    const progress = root.querySelector('.sim-step');
    const note = root.querySelector('.sim-note');
    const visual = root.querySelector('.sim-illustration');
    let states;
    let cursor = 0;

    function show() {
      const state = states[cursor];
      progress.textContent = `Bước ${cursor}/${states.length - 1}`;
      previous.disabled = cursor === 0;
      reset.disabled = cursor === 0;
      next.disabled = cursor === states.length - 1;
      note.textContent = state.note;
      visual.innerHTML = lab.render(state);
    }

    function restart() {
      states = lab.steps(Object.fromEntries(controls.map(({ name, value }) => [name, value])));
      cursor = 0;
      show();
    }

    previous.addEventListener('click', () => { cursor -= 1; show(); });
    next.addEventListener('click', () => { cursor += 1; show(); });
    reset.addEventListener('click', () => { cursor = 0; show(); });
    controls.forEach((control) => control.addEventListener('change', restart));
    restart();
  }

  function card(label, value, tone = '') {
    return `<div class="mem-card ${tone}"><span>${label}</span><strong>${value}</strong></div>`;
  }

  const fitRules = { first: 'First fit', best: 'Best fit', worst: 'Worst fit' };
  const allocationEvents = {
    queue: [{ name: 'A', size: 4 }, { name: 'B', size: 8 }, { name: 'C', size: 10 }],
    release: [{ name: 'A', size: 4 }, { name: 'B', size: 3 }, { name: 'A' }, { name: 'B' }, { name: 'C', size: 10 }]
  };

  function mergeHoles(blocks) {
    const merged = [];
    for (const block of blocks) {
      const last = merged.at(-1);
      if (last?.type === 'free' && block.type === 'free') last.size += block.size;
      else merged.push({ ...block });
    }
    return merged;
  }

  const allocation = {
    title: 'Mô phỏng cấp phát liên tục',
    prompt: 'Nhìn vùng trống lớn nhất trước khi dự đoán yêu cầu tiếp theo.',
    selects: [
      ['rule', 'Thuật toán', fitRules],
      ['scenario', 'Tình huống', { queue: 'Cấp 4, 8 rồi 10 KiB', release: 'Cấp phát rồi trả A và B' }]
    ],
    steps({ rule, scenario }) {
      const events = allocationEvents[scenario];
      let blocks = [
        { start: 0, size: 8, type: 'free' },
        { start: 8, size: 3, type: 'used', name: 'X' },
        { start: 11, size: 5, type: 'free' },
        { start: 16, size: 2, type: 'used', name: 'Y' },
        { start: 18, size: 12, type: 'free' }
      ];
      const states = [{ blocks, events, index: -1, note: 'RAM có ba vùng trống, ngăn bởi hai vùng đang dùng X và Y. Các địa chỉ tính từ 0 KiB.' }];
      events.forEach(({ name, size }, index) => {
        let note;
        let active;
        let waiting = false;
        if (size === undefined) {
          const released = blocks.find((block) => block.name === name);
          blocks = mergeHoles(blocks.map((block) =>
            block === released ? { start: block.start, size: block.size, type: 'free' } : block));
          const hole = blocks.find((block) =>
            block.start <= released.start && released.start < block.start + block.size);
          active = hole.start;
          note = hole.size > released.size
            ? `Trả ${name} rồi gộp với vùng trống kề. Vùng trống bắt đầu ở ${hole.start} KiB nay dài ${hole.size} KiB.`
            : `Trả ${name}. Hai bên không có vùng trống kề để gộp, nên khối dài ${hole.size} KiB trở thành một vùng trống riêng.`;
        } else {
          const choices = blocks.filter((block) => block.type === 'free' && block.size >= size);
          if (rule === 'best') choices.sort((a, b) => a.size - b.size);
          if (rule === 'worst') choices.sort((a, b) => b.size - a.size);
          const hole = choices[0];
          if (hole) {
            const allocated = { start: hole.start, size, type: 'new', name };
            const remainder = hole.size - size;
            blocks = blocks.flatMap((block) => {
              if (block !== hole) return [block];
              if (!remainder) return [allocated];
              return [allocated, { start: hole.start + size, size: remainder, type: 'free' }];
            });
            active = hole.start;
            note = `${fitRules[rule]} chọn vùng ${hole.size} KiB ở mốc ${hole.start}. Cấp ${size} KiB cho ${name}${remainder ? ` và để lại ${remainder} KiB trống liền sau` : ', vừa đủ vùng trống'}.`;
          } else {
            const holes = blocks.filter((block) => block.type === 'free');
            const total = holes.reduce((sum, block) => sum + block.size, 0);
            const largest = Math.max(0, ...holes.map((block) => block.size));
            waiting = true;
            note = `${name} cần ${size} KiB và phải chờ. Tổng trống ${total} KiB nhưng vùng liền lớn nhất chỉ ${largest} KiB.`;
          }
        }
        states.push({ blocks, events, index, active, waiting, note });
      });
      return states;
    },
    render({ blocks, events, index, active, waiting }) {
      const holes = blocks.filter(({ type }) => type === 'free');
      const free = holes.reduce((sum, block) => sum + block.size, 0);
      const largest = Math.max(0, ...holes.map(({ size }) => size));
      return `
        <ol class="sim-path mem-events" aria-label="Thứ tự yêu cầu">${events.map(({ name, size }, i) =>
          `<li${i === index ? ' aria-current="step"' : ''} class="${i < index ? 'done' : ''} ${i === index && waiting ? 'mem-waiting' : ''}">${size === undefined ? `Trả ${name}` : `${name} xin ${size} KiB`}${i === index && waiting ? ' · chờ' : ''}</li>`).join('')}</ol>
          <div class="mem-group-title">RAM theo địa chỉ tăng dần (KiB)</div>
        <div class="mem-strip" aria-hidden="true">${blocks.map(({ start, size, type, name }) =>
          `<span class="mem-block ${type} ${start === active ? 'mem-active' : ''}" style="flex-grow:${size}">${name || ''}</span>`).join('')}</div>
        <div class="mem-cards">${blocks.map(({ start, size, type, name }) =>
          card(`${start}–${start + size - 1}`, `${name || 'Trống'} · ${size}`, `${type === 'free' ? 'mem-free' : ''} ${active === start ? 'mem-active' : ''}`)).join('')}</div>
        <div class="mem-stats">Tổng trống <b>${free} KiB</b> <span aria-hidden="true">·</span> Vùng trống lớn nhất <b>${largest} KiB</b></div>`;
    }
  };

  const pageSize = 256;
  const pageTable = [
    { frame: 6, write: true },
    { frame: 2, write: false },
    { frame: 9, write: true },
    { frame: null, write: true }
  ];
  const references = {
    nearby: [{ address: 585 }, { address: 600 }],
    boundary: [{ address: 255 }, { address: 256 }],
    denied: [{ address: 273, write: true }],
    absent: [{ address: 788 }]
  };
  const accessName = (write) => write ? 'Ghi' : 'Đọc';
  const permissions = (entry) => entry.write ? 'Đọc, ghi' : 'Chỉ đọc';

  const translation = {
    title: 'Mô phỏng dịch địa chỉ qua TLB',
    prompt: 'Trang 256 byte. Tách số trang và độ lệch rồi theo dõi đường tra.',
    selects: [['scenario', 'Tình huống', {
      nearby: 'Hai địa chỉ trong cùng trang',
      boundary: 'Hai địa chỉ qua ranh giới trang',
      denied: 'Ghi vào trang chỉ đọc',
      absent: 'Đọc trang chưa có trong RAM'
    }]],
    steps({ scenario }) {
      const requests = references[scenario];
      const cache = new Map();
      const states = [{ requests, index: -1, cache: [], note: 'TLB đang trống. Bảng trang thuộc ứng dụng xem ảnh.' }];
      requests.forEach(({ address, write }, index) => {
        const page = Math.floor(address / pageSize);
        const offset = address % pageSize;
        const lookup = cache.has(page) ? 'Trúng TLB' : 'Trượt TLB';
        const current = { requests, index, page, offset, address };
        const add = (stage, note, extra = {}) =>
          states.push({ ...current, stage, note, cache: [...cache], ...extra });

        add('split', `${accessName(write)} địa chỉ ${address}. Chia cho ${pageSize} được số trang ${page}, dư ${offset}.`);
        add('tlb', cache.has(page)
          ? `TLB có sẵn ánh xạ cho trang ${page}. Dùng khung và quyền từ mục này.`
          : `TLB chưa có mục cho trang ${page}. MMU chuyển sang tra bảng trang.`, { lookup });
        const entry = cache.get(page) ?? pageTable[page];
        const { frame } = entry;
        if (!cache.has(page)) {
          const finding = frame === null ? 'trang hợp lệ nhưng đang vắng' : `khung ${frame}, quyền ${permissions(entry).toLowerCase()}`;
          add('table', `Mục trang ${page} cho biết ${finding}.`, { lookup, entry });
        }
        if (frame === null) {
          add('stop', 'Phần cứng báo lỗi trang. Kernel sẽ xử lý trước khi có thể dịch lại.', { lookup, entry, outcome: 'Trang vắng' });
        } else if (write && !entry.write) {
          add('stop', 'Quyền của trang chỉ cho phép đọc. Phép ghi bị chặn và không tới RAM.', { lookup, entry, outcome: 'Vi phạm quyền' });
        } else {
          const physical = frame * pageSize + offset;
          cache.set(page, entry);
          add('ram', `Truy cập byte ${offset} trong khung ${frame}. Địa chỉ vật lý là ${frame} × ${pageSize} + ${offset} = ${physical}.`, { lookup, entry, outcome: physical });
        }
      });
      return states;
    },
    render({ requests, index, page, offset, stage, lookup, cache, entry, outcome }) {
      const styleFor = (target) => stage === target ? 'mem-active' : '';
      return `
        <ol class="sim-path mem-events" aria-label="Các yêu cầu bộ nhớ">${requests.map(({ address, write }, i) =>
          `<li${i === index ? ' aria-current="step"' : ''} class="${i < index ? 'done' : ''}">${accessName(write)} ${address}</li>`).join('')}</ol>
        <div class="mem-cards mem-translate">
          ${card('Tách địa chỉ', index < 0 ? 'Chưa tách' : `p = ${page} · d = ${offset}`, styleFor('split'))}
          ${card('Tra TLB', lookup || 'Chưa tra', styleFor('tlb'))}
          ${card('Ánh xạ và quyền', entry ? `${entry.frame === null ? 'Vắng' : `f = ${entry.frame}`} · ${permissions(entry)}` : 'Chưa có', styleFor('table'))}
          ${card('Kết quả', outcome ?? 'Đang chờ', stage === 'stop' ? 'mem-error' : styleFor('ram'))}
        </div>
        <p class="mem-stats">Mục đã lưu trong TLB <b>${cache.map(([p, pte]) =>
          `p${p} → f${pte.frame}`).join(' · ') || 'Trống'}</b></p>
        <div class="tbl-wrap mem-table">
          <table class="tbl mem-lab-table">
            <caption>Bảng trang của ứng dụng xem ảnh</caption>
            <thead><tr><th scope="col">Trang</th><th scope="col">Có mặt</th><th scope="col">Khung</th><th scope="col">Quyền</th></tr></thead>
            <tbody>${pageTable.map((row, p) => `
              <tr class="${p === page && stage === 'table' ? 'mem-active' : ''}"><th scope="row">${p}</th>
                <td>${row.frame === null ? 'Không' : 'Có'}</td><td>${row.frame ?? '—'}</td><td>${permissions(row)}</td>
              </tr>`).join('')}</tbody>
          </table>
        </div>`;
    }
  };

  const fault = {
    title: 'Mô phỏng xử lý lỗi trang',
    prompt: 'Quan sát khung F2, bảng trang và lúc tiến trình phải chờ.',
    selects: [['scenario', 'Tình huống', {
      free: 'Đọc từ tệp, còn khung trống',
      clean: 'Thu hồi một trang sạch',
      dirty: 'Thu hồi một trang bẩn',
      zero: 'Cấp trang toàn số 0',
      illegal: 'Đọc địa chỉ ngoài ánh xạ'
    }]],
    steps({ scenario }) {
      const illegal = scenario === 'illegal';
      const zero = scenario === 'zero';
      const dirty = scenario === 'dirty';
      const victim = dirty || scenario === 'clean';
      const page = illegal ? 'E' : 'D';
      const origin = zero ? 'Vùng mới' : 'Tệp ảnh';
      let current = {
        stage: 'start', victim, dirty, page, origin, mapped: false, illegal,
        oldMapping: victim, frame: victim ? `B · ${dirty ? 'bẩn' : 'sạch'}` : 'Trống',
        process: 'Đang chạy', reads: 0, writes: 0,
        note: illegal ? 'Địa chỉ yêu cầu thuộc trang E nằm ngoài các vùng đã ánh xạ.'
          : `Ứng dụng sắp đọc D. Trang thuộc ${zero ? 'một vùng mới được cấp' : 'tệp ảnh'} và chưa có trong RAM.`
      };
      const states = [current];
      const set = (stage, note, changes = {}) => {
        current = { ...current, stage, note, ...changes };
        states.push(current);
      };
      set('trap', `CPU báo lỗi trang khi dịch địa chỉ thuộc ${page}. Kernel nhận quyền điều khiển.`, {
        process: 'Trong kernel'
      });
      if (illegal) {
        set('reject', 'Kernel xác định địa chỉ nằm ngoài vùng đã ánh xạ. Tiến trình nhận lỗi truy cập, khung và bộ đếm I/O giữ nguyên.', {
          process: 'Nhận lỗi truy cập'
        });
        return states;
      }

      set('check', `Kernel xác nhận D hợp lệ và được đọc. ${zero ? 'Nội dung ban đầu toàn số 0.' : 'Nội dung cần đọc nằm trong tệp ảnh.'}`);
      if (victim) {
        set('select', `RAM trong mô hình đã kín. Kernel chọn F2 chứa B làm khung thu hồi. B ${dirty ? 'đã bị sửa' : 'còn bản gốc trong tệp'}.`);
        if (dirty) {
          set('write', 'Kernel chặn ánh xạ cũ của B, vô hiệu hóa mục TLB tương ứng và bắt đầu ghi B ra vùng hoán đổi. Tiến trình đợi I/O.', {
            oldMapping: false, frame: 'Đang ghi B', process: 'Chờ ghi B', writes: 1
          });
        }
        set('reserve', dirty
          ? 'Ghi xong B. F2 đã có thể dùng cho D, còn B có bản trong vùng hoán đổi.'
          : 'Kernel gỡ ánh xạ của B và vô hiệu hóa mục TLB cũ. Có thể đọc lại B từ tệp, nên F2 được dùng ngay mà không cần ghi B.', {
          oldMapping: false, frame: 'Dành cho D', process: 'Trong kernel'
        });
      } else {
        set('reserve', 'Kernel lấy F2 từ danh sách khung trống và dành cho trang D.', { frame: 'Dành cho D' });
      }

      if (zero) {
        set('zero', 'Kernel đặt mọi byte trong F2 về 0. Chưa cần đọc thiết bị hay đánh dấu bảng trang có mặt.', { frame: 'D · toàn số 0' });
      } else {
        set('read', 'Kernel yêu cầu thiết bị đọc trang D vào F2. Ứng dụng chờ dữ liệu. CPU có thể chạy tiến trình khác.', {
          frame: 'Đang nạp D', process: 'Chờ đọc D', reads: 1
        });
      }
      set('map', zero
        ? 'Khung đã được khởi tạo. Kernel cập nhật mục bảng trang để D trỏ tới F2.'
        : 'Đọc xong. Kernel đặt D có mặt ở F2 và đưa ứng dụng vào hàng đợi sẵn sàng.', {
        mapped: true, frame: 'D', process: zero ? 'Trong kernel' : 'Sẵn sàng'
      });
      set('retry', zero
        ? 'CPU trở lại lệnh đang dở, dịch D sang F2 và đọc byte đã được khởi tạo.'
        : 'Khi được cấp CPU, ứng dụng thử lại lệnh đọc. Lần này trang D đã có mặt ở F2.', { process: 'Đang chạy' });
      return states;
    },
    render(state) {
      const { stage, victim, dirty, page, origin, mapped, illegal, oldMapping, frame, process, reads, writes } = state;
      const frameStage = ['select', 'write', 'reserve', 'read', 'zero'].includes(stage);
      return `
        <div class="mem-cards">
          ${card('Tiến trình xem ảnh', process, stage === 'reject' ? 'mem-error'
            : ['read', 'write'].includes(stage) ? 'mem-waiting' : 'mem-active')}
          ${card('Khung RAM F2', frame, frameStage ? 'mem-active' : '')}
          ${card('I/O đã yêu cầu', `${reads} đọc · ${writes} ghi`, ['read', 'write'].includes(stage) ? 'mem-active' : '')}
        </div>
        <div class="tbl-wrap mem-table">
          <table class="tbl mem-lab-table">
            <caption>Bảng trang rút gọn của tình huống</caption>
            <thead><tr><th scope="col">Trang</th><th scope="col">Trạng thái</th><th scope="col">Khung</th><th scope="col">Nguồn dữ liệu</th></tr></thead>
            <tbody>
              ${victim ? `<tr class="${['write', 'reserve'].includes(stage) ? 'mem-active' : ''}">
                <th scope="row">B</th><td>${oldMapping ? 'Có mặt' : 'Vắng'}</td><td>${oldMapping ? 'F2' : '—'}</td>
                <td>${dirty ? (oldMapping ? 'Bản sửa trong RAM' : stage === 'write' ? 'Đang ghi ra vùng hoán đổi' : 'Vùng hoán đổi') : 'Tệp gốc'}</td>
              </tr>` : ''}
              <tr class="${stage === 'reject' ? 'mem-error' : ['check', 'map', 'retry'].includes(stage) ? 'mem-active' : ''}">
                <th scope="row">${page}</th><td>${illegal ? 'Ngoài ánh xạ' : mapped ? 'Có mặt' : 'Vắng'}</td>
                <td>${mapped ? 'F2' : '—'}</td><td>${illegal ? '—' : origin}</td>
              </tr>
            </tbody>
          </table>
        </div>`;
    }
  };

  const replacementRules = { fifo: 'FIFO', opt: 'OPT', lru: 'LRU', clock: 'Clock' };
  const pageTraces = {
    scan: 'B C E D A F E D E C E D B A B C'.split(' '),
    locality: 'A B A C B C A B D E D E D E'.split(' ')
  };
  const nextUse = (trace, page, index) => {
    const next = trace.indexOf(page, index + 1);
    return next < 0 ? Infinity : next + 1;
  };

  function runReplacement(trace, capacity, rule) {
    const frames = Array(capacity).fill(null);
    let faults = 0;
    let hand = 0;
    const snapshot = (slot = -1, message = 'Mọi khung đều trống.') => ({
      frames: frames.map((entry) => entry && { ...entry }), faultCount: faults, hand, slot, message
    });
    const states = [snapshot()];

    trace.forEach((page, index) => {
      const turn = index + 1;
      let slot = frames.findIndex((entry) => entry?.page === page);
      if (slot >= 0) {
        frames[slot].last = turn;
        frames[slot].referenced = 1;
        const effect = {
          fifo: 'Giữ nguyên thứ tự nạp.',
          opt: 'Giữ nguyên các trang.',
          lru: `Cập nhật lượt dùng gần nhất của ${page} thành ${turn}.`,
          clock: `Đặt R của ${page} thành 1. Kim giữ nguyên.`
        };
        states.push(snapshot(slot, `Trúng F${slot}. ${effect[rule]}`));
        return;
      }

      faults += 1;
      slot = frames.indexOf(null);
      let message;
      if (slot >= 0) {
        message = `Lỗi trang. Nạp ${page} vào F${slot} còn trống.`;
      } else if (rule === 'clock') {
        const cleared = [];
        while (frames[hand].referenced) {
          frames[hand].referenced = 0;
          cleared.push(frames[hand].page);
          hand = (hand + 1) % capacity;
        }
        slot = hand;
        message = `Lỗi trang. ${cleared.length ? `Xóa R của ${cleared.join(', ')}. ` : ''}${frames[slot].page} có R = 0 nên nhường F${slot} cho ${page}.`;
      } else {
        // Khi bằng nhau, giữ ứng viên có chỉ số khung nhỏ hơn.
        slot = 0;
        for (let i = 1; i < capacity; i += 1) {
          const candidate = frames[i];
          const victim = frames[slot];
          const earlier = (rule === 'fifo' && candidate.loaded < victim.loaded)
            || (rule === 'lru' && candidate.last < victim.last);
          const later = rule === 'opt' && nextUse(trace, candidate.page, index) > nextUse(trace, victim.page, index);
          if (earlier || later) slot = i;
        }
        const victim = frames[slot];
        let reason;
        if (rule === 'fifo') reason = `vào sớm nhất (lượt ${victim.loaded})`;
        if (rule === 'lru') reason = `lâu nhất chưa dùng (lần cuối ở lượt ${victim.last})`;
        if (rule === 'opt') {
          const use = nextUse(trace, victim.page, index);
          reason = Number.isFinite(use) ? `có lần dùng tiếp xa nhất (lượt ${use})` : 'không còn lượt dùng';
        }
        message = `Lỗi trang. ${victim.page} ${reason}, nhường F${slot} cho ${page}.`;
      }

      frames[slot] = { page, loaded: turn, last: turn, referenced: 1 };
      if (rule === 'clock') hand = (slot + 1) % capacity;
      states.push(snapshot(slot, message));
    });
    return states;
  }

  const replacement = {
    title: 'Mô phỏng thay trang với 3 và 4 khung',
    prompt: 'Hai hàng xử lý cùng một chuỗi. Hãy đoán bên nào sẽ lỗi ở lượt tới.',
    selects: [
      ['rule', 'Thuật toán', replacementRules],
      ['scenario', 'Chuỗi tham chiếu', { scan: 'Quét ảnh rồi quay lại', locality: 'Xem kỹ hai vùng ảnh' }]
    ],
    steps({ rule, scenario }) {
      const trace = pageTraces[scenario];
      const runs = [3, 4].map((capacity) => runReplacement(trace, capacity, rule));
      return runs[0].map((first, cursor) => {
        const second = runs[1][cursor];
        const index = cursor - 1;
        let note = cursor === 0 ? 'Cả hai bên bắt đầu trống. Chọn một thuật toán rồi tiến từng lượt.'
          : `CPU tham chiếu trang ${trace[index]} ở lượt ${cursor}.`;
        if (cursor === trace.length) {
          note += ` Kết thúc chuỗi với ${first.faultCount} lỗi ở 3 khung và ${second.faultCount} lỗi ở 4 khung.`;
          if (rule === 'fifo' && first.faultCount < second.faultCount) {
            note += ' Thêm một khung làm tăng số lỗi, đúng như nghịch lý Belady.';
          }
        }
        return { rule, trace, index, panels: [first, second], note };
      });
    },
    render({ rule, trace, index, panels }) {
      return `
        <ol class="sim-path mem-trace" aria-label="Chuỗi trang theo thứ tự tham chiếu">${trace.map((page, i) =>
          `<li${i === index ? ' aria-current="step"' : ''} class="${i < index ? 'done' : ''}" aria-label="Lượt ${i + 1}, trang ${page}">${page}</li>`).join('')}</ol>
        ${panels.map(({ frames, faultCount, hand, slot, message }) => `
          <div class="mem-panel" data-capacity="${frames.length}">
            <div class="mem-panel-heading"><h5>${frames.length} khung</h5><p>Lỗi trang <b class="mem-fault-count">${faultCount}</b></p></div>
            <div class="mem-cards mem-frames">${frames.map((entry, i) => {
              const pointer = rule === 'clock' && hand === i ? ' · Kim' : '';
              const position = `F${i}${pointer}`;
              if (!entry) return card(position, 'Trống', 'mem-free');
              const use = nextUse(trace, entry.page, index);
              const label = {
                fifo: `Nạp ở lượt ${entry.loaded}`,
                lru: `Dùng ở lượt ${entry.last}`,
                opt: Number.isFinite(use) ? `Dùng tiếp lượt ${use}` : 'Không dùng lại',
                clock: `R = ${entry.referenced}`
              };
              return card(position, `${entry.page}<small>${label[rule]}</small>`, i === slot ? 'mem-active' : '');
            }).join('')}</div>
            <p class="mem-result">${message}</p>
          </div>`).join('')}`;
    }
  };

  const labs = { allocation, translation, fault, replacement };
  document.querySelectorAll('[data-memory-lab]').forEach((root) => mount(root, labs[root.dataset.memoryLab]));
})();
