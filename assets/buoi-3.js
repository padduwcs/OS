/* Mỗi lần chạy xây lại các bước từ dữ liệu. Các nút chỉ di chuyển con trỏ. */
(() => {
  const empty = '—';
  const thread = (id) => `Luồng ${id}`;

  function node(label, detail, state = '') {
    return `<div class="lab-node ${state}"><b>${label}</b><small>${detail}</small></div>`;
  }

  function row(label, nodes) {
    return `<p class="lab-heading">${label}</p><div class="lab-row">${nodes.join('')}</div>`;
  }

  function summary(label, value, state = '') {
    return `<p class="lab-summary ${state}"><b>${label}</b> · ${value}</p>`;
  }

  function value(content) {
    return `<span class="lab-value">${content}</span>`;
  }

  function counterTrace(mode) {
    const frames = [];
    const local = { A: null, B: null };
    const status = { A: 'Chưa đọc', B: 'Chưa đọc' };
    const initial = 40;
    let count = initial;
    let owner = '';

    function record(title, note, active = '', result = '') {
      const actors = Object.keys(local).map((id) => {
        const register = local[id] === null ? empty : value(local[id]);
        const state = status[id] === 'Chờ mutex' ? 'is-waiting' : id === active ? 'is-active' : '';
        return node(thread(id), `${status[id]} · Giá trị riêng ${register}`, state);
      });
      const memory = [node('count', value(count), active === 'count' ? 'is-active' : '')];
      if (mode === 'mutex') {
        memory.push(node('Chủ mutex', owner || 'Rảnh', owner ? 'is-active' : ''));
      }
      frames.push({
        title, note,
        visual: row('Bộ nhớ dùng chung', memory) + row('Thao tác của hai luồng', actors) + result,
      });
    }

    function read(id) {
      local[id] = count;
      status[id] = 'Đã đọc';
      record(`${id} đọc ${count}`, `Luồng ${id} giữ một bản số vừa đọc để tự tính.`, id);
    }

    function add(id) {
      local[id] += 1;
      status[id] = 'Đã cộng';
      record(`${id} tính ra ${local[id]}`, 'Phép cộng thay đổi giá trị riêng. Bộ nhớ dùng chung vẫn giữ số cũ.', id);
    }

    function write(id) {
      count = local[id];
      status[id] = 'Đã ghi';
      record(`${id} ghi ${count}`, `Bộ đếm nhận giá trị đã tính của ${id}.`, 'count');
    }

    function takeLock(id) {
      status[id] = owner ? 'Chờ mutex' : 'Đã lấy mutex';
      if (owner) {
        record(`${id} phải chờ`, `${owner} đang giữ mutex nên ${id} chưa được đọc.`, id);
        return;
      }
      owner = id;
      record(`${id} lấy mutex`, `Chỉ ${id} có quyền thực hiện lần cập nhật này.`, id);
    }

    function release(id) {
      owner = '';
      status[id] = 'Đã trả khóa';
      const wake = status.B === 'Chờ mutex';
      if (wake) status.B = 'Sẵn sàng lấy khóa';
      record(`${id} trả mutex`, wake ? 'B được đánh thức và có thể chạy tiếp để lấy khóa.' : 'Vùng tới hạn đã rảnh.', id);
    }

    function compareAndSwap(id) {
      const expected = local[id];
      if (count === expected) {
        count = expected + 1;
        status[id] = 'CAS thành công';
        record(`CAS của ${id} ghi ${count}`, `Bộ đếm vẫn là ${expected} lúc so sánh, nên CAS thay giá trị trong cùng thao tác.`, 'count');
        return;
      }
      status[id] = 'CAS thất bại';
      record(`CAS của ${id} thất bại`, `${id} dự kiến ${expected}, nhưng bộ đếm đã là ${count}. CAS giữ nguyên bộ đếm.`, id);
    }

    record('Hai lượt nộp đến cùng lúc', 'Mỗi luồng cần tăng bộ đếm một lần. Hãy đoán giá trị cuối.');
    if (mode === 'mutex') {
      takeLock('A');
      read('A');
      takeLock('B');
      add('A');
      write('A');
      release('A');
      takeLock('B');
      read('B');
      add('B');
      write('B');
      release('B');
    } else {
      read('A');
      read('B');
      if (mode === 'cas') {
        compareAndSwap('A');
        compareAndSwap('B');
        read('B');
        compareAndSwap('B');
      } else {
        add('A');
        add('B');
        write('A');
        write('B');
      }
    }
    const correct = count === initial + Object.keys(local).length;
    record(
      correct ? 'Đếm đủ hai bài' : 'Một lượt tăng bị ghi đè',
      correct ? 'Kết quả khớp với hai lượt tăng thành công.' : 'B đã ghi lại 41 từ bản đọc cũ, làm mất một lượt tăng.',
      'count',
      summary('Kết quả', `${count} thực tế · ${initial + Object.keys(local).length} mong đợi`, correct ? 'is-complete' : 'is-error'),
    );
    return frames;
  }

  function conditionTrace(mode) {
    const frames = [];
    const queue = [];
    const waiting = [];
    const contenders = [];
    const received = [];
    let owner = '';

    function record(title, note) {
      frames.push({
        title, note,
        visual: row('Bên trong monitor', [
          node('Chủ mutex', owner || 'Rảnh', owner ? 'is-active' : ''),
          node('Hàng chấm', queue.join(' → ') || 'Trống', queue.length ? 'is-active' : ''),
        ]) + row('Bên ngoài monitor', [
          node('Chờ có bài', waiting.join(', ') || empty, waiting.length ? 'is-waiting' : ''),
          node('Đã báo, đợi khóa', contenders.join(', ') || empty, contenders.length ? 'is-active' : ''),
        ]) + summary('Đã lấy', received.join(' · ') || 'Chưa có bài nào'),
      });
    }

    record('Hàng chấm trống', 'U đang muốn lấy một bài để chấm.');
    owner = 'U';
    record('U vào monitor', 'U giữ mutex nên có thể kiểm tra hàng.');
    function waitU() {
      owner = '';
      waiting.push('U');
      record('U chờ có bài', 'Hàng trống. U nhả mutex và vào hàng chờ điều kiện, mở đường cho bên gửi.');
    }
    waitU();

    owner = 'P';
    queue.push('X');
    record('P thêm bài X', 'Bên gửi P lấy được mutex và cập nhật hàng. U vẫn đang chờ thông báo.');
    contenders.push(waiting.shift());
    record('P báo có bài', 'U chuyển sang đợi lấy lại khóa. P vẫn giữ khóa cho đến lúc rời monitor.');
    owner = '';
    record('P mở khóa', 'Bây giờ một luồng khác có thể vào monitor.');

    if (mode === 'other') {
      owner = 'V';
      received.push(`V lấy ${queue.shift()}`);
      record('V vào trước U', 'V lấy bài X trong khi U vẫn đang chờ lấy lại khóa.');
      owner = '';
      record('V mở khóa', 'U đã được báo trước đó và giờ có thể lấy mutex.');
    }
    owner = contenders.shift();
    record('U lấy lại mutex', 'Lần gọi wait trả về. U kiểm tra lại hàng trong khi vẫn giữ mutex.');
    if (queue.length) {
      received.push(`U lấy ${queue.shift()}`);
      record('U lấy X', 'Điều kiện đúng, U lấy bài trong khi giữ khóa.');
      owner = '';
      record('U rời monitor', 'Bài được xử lý ngoài vùng giữ khóa.');
    } else {
      waitU();
    }
    return frames;
  }

  function bufferTrace(capacity) {
    const frames = [];
    const queue = [];
    const taken = [];
    const permits = { empty: capacity, full: 0 };
    const actors = {
      P: { name: 'Bên nhận P', phase: 'Sẵn sàng' },
      C: { name: 'Bên chấm C', phase: 'Sẵn sàng' },
    };
    let owner = '';

    function record(title, note) {
      const slots = Array.from({ length: capacity }, (_, index) => {
        const item = queue[index];
        return node(`Ô ${index + 1}`, item || 'Trống', item ? 'is-active' : '');
      });
      const workers = Object.values(actors).map(({ name, phase, waiting }) => {
        return node(name, phase, waiting ? 'is-waiting' : '');
      });
      frames.push({
        title, note,
        visual: row('Bộ đệm FIFO · đầu hàng ở bên trái', slots)
          + row('Số lượt còn rảnh và chủ khóa', [
            node('empty', value(permits.empty)),
            node('full', value(permits.full)),
            node('Mutex m', owner || 'Rảnh', owner ? 'is-active' : ''),
          ]) + row('Trạng thái luồng', workers) + summary('Đã lấy', taken.join(' → ') || empty),
      });
    }

    function requestPermit(id, permit, operation) {
      const actor = actors[id];
      if (permits[permit] === 0) {
        actor.waiting = permit;
        actor.phase = `Đang chờ ${permit} để ${operation}`;
        record(`${id} gọi wait(${permit}) và phải chờ`, 'Chưa có lượt rảnh. Luồng ngủ ở semaphore mà chưa lấy mutex.');
        return false;
      }
      permits[permit] -= 1;
      actor.phase = `Đã dành lượt ${permit}`;
      record(`${id} lấy lượt ${permit}`, `Một lượt được dành cho thao tác ${operation}. Hàng chưa thay đổi.`);
      return true;
    }

    function transfer(id, item, signal) {
      const actor = actors[id];
      owner = id;
      if (id === 'P') {
        queue.push(item);
        actor.phase = `Đã ghi ${item}`;
      } else {
        item = queue.shift();
        taken.push(item);
        actor.phase = `Đã lấy ${item}`;
      }
      record(`${id} ${id === 'P' ? 'ghi' : 'lấy'} ${item}`, 'Luồng giữ m trong thao tác này. Semaphore phía bên kia chưa được báo.');

      owner = '';
      actor.phase = 'Sẵn sàng';
      const waiting = Object.values(actors).find((entry) => entry.waiting === signal);
      if (waiting) {
        delete waiting.waiting;
        waiting.phase = `Đã được báo, có lượt ${signal}`;
        record(`${id} nhả m rồi báo ${signal}`, `Lượt được dành cho ${waiting.name}. Luồng đó sẵn sàng để tiếp tục.`);
      } else {
        permits[signal] += 1;
        record(`${id} nhả m rồi báo ${signal}`, `Không có người chờ ${signal}, nên lượt mới được giữ lại.`);
      }
    }

    function send(item) {
      if (requestPermit('P', 'empty', `gửi ${item}`)) transfer('P', item, 'full');
    }

    function take() {
      if (requestPermit('C', 'full', 'lấy bài')) transfer('C', null, 'empty');
    }

    record(`Bộ đệm có ${capacity} ô`, 'P sẽ lần lượt gửi X và Y trước khi C thử lấy bài.');
    send('X');
    send('Y');
    const pending = Boolean(actors.P.waiting);
    take();
    if (pending) transfer('P', 'Y', 'full');
    take();
    take();
    send('Z');
    transfer('C', null, 'empty');
    return frames;
  }

  function lockTrace(mode) {
    const frames = [];
    const owner = { K: '', T: '' };
    const waiting = { A: '', B: '' };
    const finished = [];
    const descriptions = { A: 'K → T', B: mode === 'ordered' ? 'K → T' : 'T → K' };
    let retries = 0;

    function record(title, note, result = '') {
      const actors = Object.entries(descriptions).map(([id, order]) => {
        const wanted = waiting[id];
        const done = finished.includes(id);
        if (done) return node(thread(id), 'Đã chấm xong', 'is-complete');
        if (!wanted) return node(thread(id), `Thứ tự xin ${order}`);
        return owner[wanted]
          ? node(thread(id), `Chờ ${wanted}`, 'is-waiting')
          : node(thread(id), `Sẵn sàng lấy ${wanted}`, 'is-active');
      });
      const locks = Object.entries(owner).map(([lock, id]) => node(
        `Khóa ${lock}`, id ? `${id} đang giữ` : 'Rảnh', id ? 'is-active' : '',
      ));
      const edges = Object.entries(waiting)
        .filter(([, lock]) => lock && owner[lock])
        .map(([id, lock]) => `${id} → ${owner[lock]} (qua ${lock})`);
      const progress = mode === 'retry' ? `${finished.length} bài xong · ${retries} vòng thử` : `${finished.length} bài xong`;
      frames.push({
        title, note,
        visual: row('Tài nguyên', locks) + row('Luồng chấm', actors)
          + summary('Cung chờ', edges.join(' · ') || 'Chưa có')
          + summary('Tiến độ', result || progress, result ? 'is-error' : ''),
      });
    }

    function acquire(id, lock) {
      if (owner[lock]) {
        waiting[id] = lock;
        record(`${id} xin ${lock} và phải chờ`, `${owner[lock]} đang giữ ${lock}. Cung chờ trỏ đến chủ khóa.`);
        return;
      }
      owner[lock] = id;
      waiting[id] = '';
      record(`${id} lấy ${lock}`, `Khóa ${lock} đang rảnh nên được cấp cho ${id}.`);
    }

    function finish(id) {
      finished.push(id);
      owner.K = '';
      owner.T = '';
      record(`${id} hoàn tất và trả hai khóa`, `Luồng ${id} đã chấm xong, K và T có thể được cấp tiếp.`);
    }

    record('Cả hai khóa đều rảnh', 'A xin K trước. Hãy theo dõi thứ tự xin của B.');
    if (mode === 'retry') {
      for (let round = 1; round <= 2; round += 1) {
        owner.K = 'A';
        owner.T = 'B';
        record(`Lượt ${round} · Mỗi bên lấy khóa đầu`, 'A giữ K, B giữ T. Cả hai thử lấy khóa thứ hai trước khi ai kịp trả khóa đầu.');
        owner.K = '';
        owner.T = '';
        retries += 1;
        record(
          `Lượt ${round} · Thử thất bại, cả hai trả khóa`,
          'Hai luồng vẫn chạy. Cùng nhịp thử lại có thể khiến mẫu này lặp mãi.',
          round === 2 ? `${retries} vòng thử, chưa chấm xong bài nào` : '',
        );
      }
    } else if (mode === 'ordered') {
      acquire('A', 'K');
      acquire('B', 'K');
      acquire('A', 'T');
      finish('A');
      acquire('B', 'K');
      acquire('B', 'T');
      finish('B');
    } else {
      acquire('A', 'K');
      acquire('B', 'T');
      acquire('A', 'T');
      acquire('B', 'K');
      record('Bế tắc', 'Hai cung chờ tạo vòng. Mỗi luồng cần khóa do chính luồng đang chờ mình nắm giữ.', '0 bài xong · A và B bế tắc');
    }
    return frames;
  }

  const vector = (items) => `(${items.join(', ')})`;
  const plus = (left, right) => left.map((unit, index) => unit + right[index]);
  const minus = (left, right) => left.map((unit, index) => unit - right[index]);
  const fits = (needed, free) => needed.every((unit, index) => unit <= free[index]);

  function available(total, rows) {
    return rows.reduce((free, entry) => minus(free, entry.allocation), total);
  }

  function resourceTable(rows, columns, stateFor, candidate = '') {
    const header = columns.map(([heading]) => `<th scope="col">${heading}</th>`).join('');
    const body = rows.map((entry) => {
      const [status, color] = stateFor(entry);
      const cells = columns.map(([, field]) => `<td>${value(vector(entry[field]))}</td>`).join('');
      return `<tr class="${entry.id === candidate ? 'is-active' : color}"><th scope="row">${entry.id}</th>${cells}<td>${status}</td></tr>`;
    }).join('');
    return `<div class="tbl-wrap"><table class="tbl course-matrix">
      <caption>Mỗi cặp có thứ tự (K, T)</caption>
      <thead><tr><th scope="col">Luồng</th>${header}<th scope="col">Trạng thái</th></tr></thead>
      <tbody>${body}</tbody>
    </table></div>`;
  }

  function finishable(rows, requirement, free, ignore, onStep) {
    let work = free;
    const done = new Set(ignore);
    const sequence = [];
    while (done.size < rows.length) {
      const candidate = rows.find((entry) => {
        if (done.has(entry.id)) return false;
        const need = entry[requirement];
        const canFinish = fits(need, work);
        onStep({
          title: `Xét ${entry.id}`,
          note: canFinish
            ? `${vector(need)} ≤ ${vector(work)} theo từng thành phần. ${entry.id} có thể hoàn tất giả lập.`
            : `Ít nhất một thành phần của ${vector(need)} vượt ${vector(work)}. Tiếp tục quét bảng.`,
          candidate: entry.id, work, sequence, check: canFinish ? 'Đủ cho lượt xét' : 'Chưa đủ cho lượt xét',
        });
        return canFinish;
      });
      if (!candidate) break;
      const { id, allocation } = candidate;
      const previous = work;
      work = plus(work, allocation);
      done.add(id);
      sequence.push(id);
      onStep({
        title: `Giả lập ${id} hoàn tất`,
        note: `Cộng phần vốn giữ của ${id}. Work = ${vector(previous)} + ${vector(allocation)} = ${vector(work)}.`,
        work, sequence, check: `${id} đã hoàn tất giả lập`,
      });
    }
    return rows.filter(({ id }) => !done.has(id)).map(({ id }) => id);
  }

  function bankerTrace(mode) {
    const frames = [];
    const total = [6, 4];
    const jobs = [
      { id: 'A', allocation: [1, 1], max: [3, 2] },
      { id: 'B', allocation: [2, 1], max: [4, 3] },
      { id: 'C', allocation: [1, 1], max: [5, 2] },
    ].map((entry) => ({ ...entry, need: minus(entry.max, entry.allocation) }));
    const scenarios = {
      safe: ['A', [1, 1]],
      unsafe: ['B', [1, 0]],
      scarce: ['B', [0, 2]],
      limit: ['A', [0, 2]],
    };
    const request = scenarios[mode];
    const free = available(total, jobs);
    const columns = [['Đang giữ', 'allocation'], ['Tối đa', 'max'], ['Còn thiếu', 'need']];

    function record({
      title, note, rows = jobs, remaining = free, work, sequence = [],
      candidate = '', check = '', color = '',
    }) {
      const cells = [node('Available', value(vector(remaining))), node('Work', work ? value(vector(work)) : empty)];
      if (request) cells.push(node(`Yêu cầu của ${request[0]}`, value(vector(request[1]))));
      const table = resourceTable(rows, columns, ({ id }) => sequence.includes(id)
        ? ['Xong giả lập', 'is-complete'] : ['Chưa xong giả lập', ''], candidate);
      frames.push({
        title, note,
        visual: row('Tài nguyên', cells) + table
          + summary('Chuỗi thử', sequence.join(' → ') || empty) + summary('Kiểm tra', check, color),
      });
    }

    record({
      title: 'Ảnh chụp ban đầu',
      note: 'Tính Need bằng Max trừ Allocation. Available là số còn rảnh sau khi trừ phần mọi luồng đang giữ.',
      check: 'Cấp phát hiện tại',
    });

    let trial = jobs;
    let trialFree = free;
    if (request) {
      const [id, amount] = request;
      const job = jobs.find((entry) => entry.id === id);
      if (!fits(amount, job.need)) {
        record({
          title: 'Từ chối yêu cầu vượt mức đã khai',
          note: `${id} chỉ còn được xin tối đa ${vector(job.need)}. Yêu cầu ${vector(amount)} vượt mức ở ít nhất một loại.`,
          candidate: id, check: 'Request vượt Need', color: 'is-error',
        });
        return frames;
      }
      record({
        title: 'Yêu cầu nằm trong mức đã khai',
        note: `Request ${vector(amount)} ≤ Need ${vector(job.need)} ở cả hai loại. Tiếp theo kiểm tra lượng đang rảnh.`,
        candidate: id, check: 'Request ≤ Need',
      });
      if (!fits(amount, free)) {
        record({
          title: 'Phải chờ đơn vị còn thiếu',
          note: `Request ${vector(amount)} vượt Available ${vector(free)} ở ít nhất một loại. Lần này chưa thể cấp thử.`,
          candidate: id, check: 'Thiếu tài nguyên rảnh', color: 'is-waiting',
        });
        return frames;
      }
      trialFree = minus(free, amount);
      trial = jobs.map((entry) => entry.id === id ? {
        ...entry,
        allocation: plus(entry.allocation, amount),
        need: minus(entry.need, amount),
      } : entry);
      record({
        title: 'Đủ đơn vị rảnh để cấp thử',
        note: `Trừ ${vector(amount)} khỏi Available, chuyển nó sang Allocation của ${id} và giảm Need tương ứng.`,
        rows: trial, remaining: trialFree, candidate: id, check: 'Đang xem bản cấp thử',
      });
    }
    record({
      title: 'Chép Available vào Work',
      note: 'Work theo dõi lượng có thể dùng ở từng bước kiểm tra. Thử lần lượt A, B, C và quét lại sau mỗi lần giả lập hoàn tất.',
      rows: trial, remaining: trialFree, work: trialFree, check: 'Bắt đầu xét an toàn',
    });

    let work = trialFree;
    let sequence = [];
    const stuck = finishable(trial, 'need', trialFree, [], (step) => {
      ({ work, sequence } = step);
      record({ rows: trial, remaining: trialFree, ...step });
    });
    if (stuck.length) {
      record({
        title: 'Hoãn yêu cầu và bỏ bản cấp thử',
        note: `Không tìm được thứ tự để phục vụ hết ${stuck.join(', ')} theo mức tối đa. Bảng trở về cấp phát ban đầu.`,
        check: 'Trạng thái thử không an toàn', color: 'is-waiting',
      });
    } else {
      record({
        title: request ? 'An toàn, xác nhận cấp' : 'Cấp phát ban đầu an toàn',
        note: `Chuỗi ${sequence.join(' → ')} đủ để mọi luồng có thể hoàn tất. Work là kết quả giả lập, còn Available vẫn cho biết số rảnh sau lần cấp.`,
        rows: trial, remaining: trialFree, work, sequence, check: 'Có chuỗi an toàn', color: 'is-complete',
      });
    }
    return frames;
  }

  function detectorTrace(mode) {
    const frames = [];
    const total = [4, 2];
    const jobs = [
      { id: 'A', allocation: [2, 0], request: [1, 0] },
      { id: 'B', allocation: [1, 1], request: [1, 0] },
      { id: 'C', allocation: [1, 0], request: mode === 'deadlock' ? [1, 0] : [0, 1] },
      { id: 'D', allocation: [0, 0], request: [1, 0] },
    ];
    const free = available(total, jobs);
    const ignored = jobs.filter((entry) => entry.allocation.every((unit) => unit === 0)).map(({ id }) => id);
    const columns = [['Đang giữ', 'allocation'], ['Đang xin', 'request']];

    function record({ title, note, work, sequence = [], candidate = '', check, stuck }) {
      const table = resourceTable(jobs, columns, ({ id }) => {
        if (sequence.includes(id)) return ['Xong giả lập', 'is-complete'];
        if (work && ignored.includes(id)) return ['Không giữ tài nguyên', ''];
        if (stuck?.includes(id)) return ['Bế tắc', 'is-error'];
        return ['Đang chờ', ''];
      }, candidate);
      frames.push({
        title, note,
        visual: row('Tài nguyên', [node('Available', value(vector(free))), node('Work', work ? value(vector(work)) : empty)])
          + table + summary('Thứ tự giả lập', sequence.join(' → ') || empty)
          + summary('Kiểm tra', check, stuck ? (stuck.length ? 'is-error' : 'is-complete') : ''),
      });
    }

    record({
      title: 'Ảnh chụp khi có luồng đang chờ',
      note: 'Cột Đang xin là yêu cầu hiện tại. Thử đổi yêu cầu của C để xem tập bế tắc có đổi hay không.',
      check: 'Chưa chạy phát hiện',
    });
    record({
      title: 'Khởi tạo Work và đánh dấu luồng không giữ tài nguyên',
      note: `Work lấy từ Available. ${ignored.join(', ')} không giữ đơn vị nào nên có thể bỏ qua khi tìm nhóm bế tắc.`,
      work: free, check: 'Bắt đầu quét các luồng còn lại',
    });
    let work = free;
    let sequence = [];
    const stuck = finishable(jobs, 'request', free, ignored, (step) => {
      ({ work, sequence } = step);
      record(step);
    });
    record({
      title: stuck.length ? 'Phát hiện nhóm bế tắc' : 'Không phát hiện bế tắc',
      note: stuck.length
        ? `${stuck.join(', ')} giữ tài nguyên nhưng không ai đủ phần đang xin để hoàn tất và trả lại tài nguyên.`
        : 'C có thể kết thúc trước, trả đủ khe K cho A. Sau A, B cũng có thể kết thúc. D có thể lấy một khe K đã trả.',
      work, sequence, stuck,
      check: stuck.length ? `Luồng bế tắc: ${stuck.join(', ')}` : 'Mọi luồng giữ tài nguyên đều có thể hoàn tất',
    });
    return frames;
  }

  const labs = {
    counter: {
      title: 'Mô phỏng · Hai lượt tăng bộ đếm',
      options: [['plain', 'Đọc rồi ghi, chưa đồng bộ'], ['mutex', 'Dùng mutex'], ['cas', 'Thử lại với CAS']],
      trace: counterTrace,
    },
    condition: {
      title: 'Mô phỏng · Sau khi báo có bài',
      options: [['first', 'U lấy lại khóa trước'], ['other', 'Luồng V lấy bài trước']],
      trace: conditionTrace,
    },
    buffer: {
      title: 'Mô phỏng · Lấy và trả lượt trong bộ đệm',
      options: [['1', 'Bộ đệm một ô'], ['2', 'Bộ đệm hai ô']],
      trace: (mode) => bufferTrace(Number(mode)),
    },
    locks: {
      title: 'Mô phỏng · Hai luồng và thứ tự xin khóa',
      options: [['reverse', 'Khác thứ tự'], ['ordered', 'Cùng thứ tự K → T'], ['retry', 'Thử lại cùng nhịp']],
      trace: lockTrace,
    },
    banker: {
      title: 'Mô phỏng · Thuật toán chủ ngân hàng',
      options: [
        ['initial', 'Kiểm tra trạng thái đầu'], ['safe', 'A xin (1, 1)'],
        ['unsafe', 'B xin (1, 0)'], ['scarce', 'B xin (0, 2)'], ['limit', 'A xin (0, 2)'],
      ],
      trace: bankerTrace,
    },
    detector: {
      title: 'Mô phỏng · Phát hiện bế tắc khi có nhiều đơn vị',
      options: [['clear', 'C xin (0, 1)'], ['deadlock', 'C xin (1, 0)']],
      trace: detectorTrace,
    },
  };

  for (const lab of document.querySelectorAll('[data-sync-lab]')) {
    const { title, options, trace } = labs[lab.dataset.syncLab];
    const titleId = `${lab.id}-title`;
    lab.className = 'sim sync-lab';
    lab.setAttribute('role', 'region');
    lab.setAttribute('aria-labelledby', titleId);
    lab.innerHTML = `
      <div class="sim-h">
        <div class="ttl" id="${titleId}">${title}</div>
        <div class="sim-ctl">
          <label>Tình huống <select>${options.map(([id, label]) => `<option value="${id}">${label}</option>`).join('')}</select></label>
          <button type="button" data-prev>Bước trước</button>
          <button type="button" class="primary" data-next>Bước tiếp</button>
          <button type="button" data-reset>Làm lại</button>
          <span class="sim-step" aria-hidden="true"></span>
        </div>
      </div>
      <p class="sim-note" role="status" aria-atomic="true"></p>
      <div class="sim-illustration"></div>
    `;
    const select = lab.querySelector('select');
    const prev = lab.querySelector('[data-prev]');
    const next = lab.querySelector('[data-next]');
    const reset = lab.querySelector('[data-reset]');
    const step = lab.querySelector('.sim-step');
    const visual = lab.querySelector('.sim-illustration');
    const note = lab.querySelector('.sim-note');
    let frames;
    let index;

    function show() {
      const frame = frames[index];
      const position = `Bước ${index + 1}/${frames.length}`;
      step.textContent = position;
      visual.innerHTML = frame.visual;
      note.innerHTML = `<span class="lab-sr-only">${position}. </span><b>${frame.title}.</b> ${frame.note}`;
      prev.disabled = index === 0;
      next.disabled = index === frames.length - 1;
    }

    function restart() {
      frames = trace(select.value);
      index = 0;
      show();
    }

    prev.addEventListener('click', () => { index -= 1; show(); });
    next.addEventListener('click', () => { index += 1; show(); });
    reset.addEventListener('click', restart);
    select.addEventListener('change', restart);
    restart();
  }
})();
