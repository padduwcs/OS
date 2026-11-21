/* Mô phỏng lưu trữ và vào/ra cho Buổi 5. Các trạng thái được tính lại khi đổi lựa chọn. */
(() => {
  const options = (items) => Object.entries(items)
    .map(([value, label]) => `<option value="${value}">${label}</option>`).join('');

  function mount(root, lab) {
    const headingId = `${root.id}-ten`;
    root.classList.add('sim', 'b5-lab');
    root.setAttribute('role', 'region');
    root.setAttribute('aria-labelledby', headingId);
    root.innerHTML = `
      <header class="sim-h">
        <h4 class="ttl" id="${headingId}">${lab.title}<small>${lab.prompt}</small></h4>
        ${lab.selects.length ? `<div class="sim-ctl"><div class="b5-selects">${lab.selects.map(([name, label, items]) =>
          `<label>${label}<select name="${name}">${options(items)}</select></label>`).join('')}</div></div>` : ''}
      </header>
      <div class="sim-ctl lab-steps"></div>
      <p class="sim-note" aria-live="polite" aria-atomic="true"></p>
      <div class="sim-illustration"></div>`;

    const controls = [...root.querySelectorAll('select')];
    const note = root.querySelector('.sim-note');
    const visual = root.querySelector('.sim-illustration');
    let states;
    const reset = window.mountLabSteps(root, (cursor) => {
      const state = states[cursor];
      note.innerHTML = state.note;
      visual.innerHTML = lab.render(state);
    }, { play: true });

    function restart() {
      states = lab.steps(Object.fromEntries(controls.map(({ name, value }) => [name, value])));
      reset(states.length);
    }

    controls.forEach((control) => control.addEventListener('change', restart));
    restart();
  }

  /* ---------- 1. Lập lịch ổ đĩa cứng ---------- */
  const LAST_CYLINDER = 199;
  const diskQueues = {
    book: { head: 53, queue: [98, 183, 37, 122, 14, 124, 65, 67] },
    photo: { head: 120, queue: [30, 145, 10, 170, 125, 60, 190, 95] }
  };
  const diskNames = {
    fcfs: 'FCFS', scan: 'SCAN', cscan: 'C-SCAN', sstf: 'SSTF', look: 'LOOK', clook: 'C-LOOK'
  };

  function planDisk(algo, direction, head, queue) {
    const pending = [...queue];
    const moves = [];
    let position = head;
    let heading = direction;
    const go = (to, kind) => {
      if (to === position && kind !== 'serve') return;
      moves.push({ from: position, to, kind, distance: Math.abs(to - position) });
      position = to;
      if (kind === 'serve' || kind === 'jump-serve') pending.splice(pending.indexOf(to), 1);
    };

    if (algo === 'fcfs') {
      queue.forEach((cylinder) => go(cylinder, 'serve'));
      return moves;
    }
    if (algo === 'sstf') {
      while (pending.length) {
        const best = [...pending].sort((a, b) => {
          const gap = Math.abs(a - position) - Math.abs(b - position);
          if (gap) return gap;
          return heading < 0 ? a - b : b - a;
        })[0];
        heading = best < position ? -1 : best > position ? 1 : heading;
        go(best, 'serve');
      }
      return moves;
    }

    while (pending.length) {
      const ahead = pending
        .filter((cylinder) => (heading < 0 ? cylinder <= position : cylinder >= position))
        .sort((a, b) => (heading < 0 ? b - a : a - b));
      ahead.forEach((cylinder) => go(cylinder, 'serve'));
      if (!pending.length) break;
      const edge = heading < 0 ? 0 : LAST_CYLINDER;
      if (algo === 'scan') {
        go(edge, 'edge');
        heading = -heading;
      } else if (algo === 'look') {
        heading = -heading;
      } else if (algo === 'cscan') {
        go(edge, 'edge');
        go(heading < 0 ? LAST_CYLINDER : 0, 'jump');
      } else {
        go(heading < 0 ? Math.max(...pending) : Math.min(...pending), 'jump-serve');
      }
    }
    return moves;
  }

  const disk = {
    title: 'Mô phỏng lập lịch ổ đĩa cứng',
    prompt: 'Trụ đánh số 0–199. Theo dõi đường đi của đầu đọc và quãng đường cộng dồn.',
    selects: [
      ['algo', 'Thuật toán', {
        fcfs: 'FCFS', scan: 'SCAN', cscan: 'C-SCAN',
        sstf: 'SSTF (ngoài ấn bản 10)', look: 'LOOK (ngoài ấn bản 10)', clook: 'C-LOOK (ngoài ấn bản 10)'
      }],
      ['direction', 'Hướng ban đầu', { down: 'Về phía trụ 0', up: 'Về phía trụ 199' }],
      ['queue', 'Hàng đợi', { book: 'Giáo trình, đầu đọc ở 53', photo: 'Ảnh của An, đầu đọc ở 120' }]
    ],
    steps({ algo, direction, queue }) {
      const { head, queue: requests } = diskQueues[queue];
      const moves = planDisk(algo, direction === 'down' ? -1 : 1, head, requests);
      const base = { algo, head, requests, moves };
      const states = [{
        ...base, cursor: 0,
        note: `Đầu đọc đang ở trụ <b>${head}</b>. Hàng đợi theo thứ tự đến: ${requests.join(', ')}.${
          ['fcfs', 'sstf'].includes(algo) ? ` ${diskNames[algo]} không dùng hướng ban đầu.` : ''}`
      }];
      let total = 0;
      let jumps = 0;
      moves.forEach((move, index) => {
        total += move.distance;
        if (move.kind.startsWith('jump')) jumps += move.distance;
        let note;
        if (move.kind === 'serve') {
          note = `Đi từ ${move.from} tới <b>${move.to}</b> (${move.distance} trụ) và phục vụ yêu cầu ở trụ ${move.to}.`;
          if (algo === 'sstf') note += ' Đây là yêu cầu gần đầu đọc nhất lúc này.';
        } else if (move.kind === 'edge') {
          note = `Không còn yêu cầu nào phía trước. ${algo === 'scan' ? 'SCAN' : 'C-SCAN'} vẫn đi tiếp tới mép đĩa, trụ <b>${move.to}</b> (${move.distance} trụ).`;
        } else if (move.kind === 'jump') {
          note = `C-SCAN quay ngay về đầu kia, trụ <b>${move.to}</b> (${move.distance} trụ), và không phục vụ gì trên đường về.`;
        } else {
          note = `C-LOOK nhảy thẳng tới yêu cầu xa nhất ở phía kia, trụ <b>${move.to}</b> (${move.distance} trụ), rồi phục vụ nó.`;
        }
        if (index === moves.length - 1) {
          note += ` Xong cả ${requests.length} yêu cầu. Tổng quãng đường <b>${total} trụ</b>${
            jumps ? `, trong đó chặng quay về là ${jumps} trụ. Nếu quy ước không tính chặng quay về thì còn ${total - jumps} trụ` : ''}.`;
        }
        states.push({ ...base, cursor: index + 1, total, jumps, note });
      });
      return states;
    },
    render({ head, requests, moves, cursor, total = 0, jumps = 0 }) {
      const x = (cylinder) => 22 + cylinder * (316 / LAST_CYLINDER);
      const rowY = (row) => 52 + row * 21;
      const height = rowY(moves.length) + 16;
      const shown = moves.slice(0, cursor);
      const served = new Set(shown.filter((m) => m.kind === 'serve' || m.kind === 'jump-serve').map((m) => m.to));
      const points = [{ to: head, kind: 'start' }, ...shown];
      const ticks = [0, 50, 100, 150, LAST_CYLINDER].map((c) =>
        `<path class="b5-tick" d="M${x(c)} 22v5"/><text class="b5-axis-label" x="${x(c)}" y="16" text-anchor="middle">${c}</text>`).join('');
      const marks = requests.map((c) =>
        `<path class="${served.has(c) ? 'b5-req-done' : 'b5-req'}" d="M${x(c)} 31l-4 7h8z"/>`).join('');
      const segments = shown.map((move, i) => {
        const dashed = move.kind.startsWith('jump') ? ' b5-jump' : '';
        return `<path class="b5-path${dashed}" d="M${x(move.from)} ${rowY(i)}L${x(move.to)} ${rowY(i + 1)}"/>`;
      }).join('');
      const dots = points.map((point, i) => {
        const cx = x(point.to);
        const cy = rowY(i);
        const current = i === points.length - 1;
        const kind = point.kind === 'serve' || point.kind === 'jump-serve' ? 'b5-dot-serve'
          : point.kind === 'start' ? 'b5-dot-start' : 'b5-dot-edge';
        const label = `<text class="b5-dot-label" x="${cx > 290 ? cx - 8 : cx + 8}" y="${cy + 4}" text-anchor="${cx > 290 ? 'end' : 'start'}">${point.to}</text>`;
        return `<circle class="${kind}${current ? ' b5-dot-now' : ''}" cx="${cx}" cy="${cy}" r="${current ? 5.5 : 4}"/>${label}`;
      }).join('');
      const chart = `<svg class="b5-chart" viewBox="0 0 360 ${height}" role="img" aria-label="Đường đi của đầu đọc qua các trụ">
        <path class="b5-axis" d="M${x(0)} 27H${x(LAST_CYLINDER)}"/>${ticks}${marks}${segments}${dots}</svg>`;
      const trail = moves.map((move, i) => `<li class="${i < cursor - 1 ? 'done' : ''}"${i === cursor - 1 ? ' aria-current="step"' : ''}>${
        move.kind.startsWith('jump') ? '↺ ' : ''}${move.to}<small> · ${move.distance}</small></li>`).join('');
      return `${chart}
        <ol class="sim-path b5-trail" aria-label="Thứ tự đầu đọc đi qua">${trail}</ol>
        <p class="b5-stats">Đã phục vụ <b>${served.size}/${requests.length}</b> yêu cầu <span aria-hidden="true">·</span> Quãng đường cộng dồn <b>${total} trụ</b>${
          jumps ? ` <span aria-hidden="true">·</span> chặng quay về <b>${jumps}</b>` : ''}</p>`;
    }
  };

  /* ---------- 2. Bộ điều khiển NAND: FTL, thu gom rác, TRIM ---------- */
  const PAGES = 4;
  const ftlScenarios = {
    overwrite: [
      { op: 'write', lbas: [0, 1, 2, 3] }, { op: 'write', lbas: [4, 5, 6, 7] },
      { op: 'write', lbas: [1, 2] }, { op: 'write', lbas: [5, 6] },
      { op: 'write', lbas: [4] }, { op: 'write', lbas: [7] }
    ],
    trim: [
      { op: 'write', lbas: [0, 1, 2, 3] }, { op: 'write', lbas: [4, 5, 6, 7] },
      { op: 'write', lbas: [1, 2] }, { op: 'write', lbas: [5, 6] },
      { op: 'trim', lbas: [3] }, { op: 'write', lbas: [4] }, { op: 'write', lbas: [7] }
    ]
  };

  const ftl = {
    title: 'Mô phỏng bộ điều khiển NAND trong SSD',
    prompt: '4 khối × 4 trang. Máy tính chỉ thấy 8 khối logic (ảnh 0–7), phần còn lại là vùng dự phòng.',
    selects: [['scenario', 'Tình huống', {
      overwrite: 'Ghi đè vài ảnh tới khi đầy',
      trim: 'Như trên, nhưng An xóa ảnh 3 và hệ thống tệp báo TRIM'
    }]],
    steps({ scenario }) {
      const blocks = Array.from({ length: 4 }, () => ({ pages: Array(PAGES).fill(null), erases: 0 }));
      const map = new Map();
      let active = -1;
      let pool = [0, 1, 2, 3];
      const stats = { host: 0, nand: 0, erases: 0 };
      const states = [];
      const snapshot = (note, touched = [], extra = {}) => states.push({
        blocks: blocks.map((b) => ({ erases: b.erases, pages: b.pages.map((p) => p && { ...p }) })),
        map: new Map(map), active, pool: [...pool], stats: { ...stats }, touched, note, ...extra
      });
      const freeSlot = () => (active >= 0 ? blocks[active].pages.findIndex((p) => p === null) : -1);
      const validCount = (b) => blocks[b].pages.filter((p) => p?.valid).length;
      const program = (lba, touched) => {
        const slot = freeSlot();
        const old = map.get(lba);
        if (old) blocks[old.block].pages[old.page].valid = false;
        blocks[active].pages[slot] = { lba, valid: true };
        map.set(lba, { block: active, page: slot });
        stats.nand += 1;
        touched.push(`${active}-${slot}`);
        if (old) touched.push(`${old.block}-${old.page}`);
      };
      const needBlock = () => {
        if (pool.length > 1) {
          active = pool.shift();
          return null;
        }
        return 'gc';
      };

      snapshot('SSD mới, mọi khối đã được xóa sạch. Vùng chứa khối trống: B0, B1, B2, B3.');
      ftlScenarios[scenario].forEach(({ op, lbas }) => {
        if (op === 'trim') {
          lbas.forEach((lba) => {
            const old = map.get(lba);
            blocks[old.block].pages[old.page].valid = false;
            map.delete(lba);
          });
          snapshot(`An xóa ảnh ${lbas.join(', ')}. Hệ thống tệp gửi lệnh TRIM, nên bộ điều khiển đánh dấu trang đó không còn hợp lệ mà không phải ghi gì.`);
          return;
        }
        const touched = [];
        const overwrites = lbas.filter((lba) => map.has(lba));
        lbas.forEach((lba) => {
          if (freeSlot() < 0) {
            if (needBlock() === 'gc') {
              const candidates = blocks.map((_, b) => b).filter((b) => b !== active && !pool.includes(b));
              const victim = candidates.sort((a, b) => validCount(a) - validCount(b) || a - b)[0];
              const keep = blocks[victim].pages.filter((p) => p?.valid).map((p) => p.lba);
              const reserve = pool.shift();
              snapshot(`Khối đang ghi đã đầy và chỉ còn khối dự phòng B${reserve}. Bộ điều khiển phải <b>thu gom rác</b>: chọn B${victim} vì nó có ít trang hợp lệ nhất (${keep.length}).`,
                [], { victim });
              active = reserve;
              const copied = [];
              keep.forEach((k) => program(k, copied));
              snapshot(keep.length
                ? `Chép ${keep.length} trang còn hợp lệ (ảnh ${keep.join(', ')}) từ B${victim} sang B${reserve}. Đây là ${keep.length} lần ghi NAND mà máy tính không hề yêu cầu.`
                : `B${victim} không còn trang hợp lệ nào, nên không phải chép gì.`, copied, { victim });
              blocks[victim].pages = Array(PAGES).fill(null);
              blocks[victim].erases += 1;
              stats.erases += 1;
              pool.push(victim);
              snapshot(`Xóa cả khối B${victim} trong một lần, rồi đưa nó về làm khối dự phòng mới.`, [], { erased: victim });
            }
          }
          stats.host += 1;
          program(lba, touched);
        });
        const target = `B${active}`;
        let note = `Máy tính ghi ảnh ${lbas.join(', ')}. Bộ điều khiển ghi vào trang trống kế tiếp của ${target} và cập nhật FTL.`;
        if (overwrites.length) {
          note = `Máy tính ghi lại ảnh ${overwrites.join(', ')}. NAND không ghi đè được, nên bản mới vào trang trống của ${target}, còn bản cũ chỉ bị đánh dấu <b>không hợp lệ</b>.`;
        }
        snapshot(note, touched);
      });
      const last = states.at(-1);
      const wa = (last.stats.nand / last.stats.host).toFixed(2).replace('.', ',');
      last.note += ` Kết thúc: ${last.stats.host} lần ghi từ máy tính thành ${last.stats.nand} lần ghi NAND, hệ số khuếch đại ghi ≈ <b>${wa}</b>.`;
      return states;
    },
    render({ blocks, map, active, pool, stats, touched, victim, erased }) {
      const cards = blocks.map((block, b) => {
        const role = b === active ? 'đang ghi' : pool.includes(b) ? 'trống' : 'đã ghi';
        const tone = b === victim ? ' b5-victim' : b === erased ? ' b5-erased' : b === active ? ' b5-active-block' : '';
        const pages = block.pages.map((page, p) => {
          const hot = touched.includes(`${b}-${p}`) ? ' b5-hot' : '';
          if (!page) return `<li class="b5-page b5-free${hot}"><span>trống</span></li>`;
          return `<li class="b5-page ${page.valid ? 'b5-valid' : 'b5-invalid'}${hot}"><span>ảnh ${page.lba}</span><small>${page.valid ? 'hợp lệ' : 'cũ'}</small></li>`;
        }).join('');
        return `<div class="b5-block${tone}"><div class="b5-block-h"><b>B${b}</b><span>${role}</span></div>
          <ol class="b5-pages">${pages}</ol><small class="b5-wear">đã xóa ${block.erases} lần</small></div>`;
      }).join('');
      const table = [...Array(8).keys()].map((lba) => {
        const at = map.get(lba);
        return `<span>${lba}→${at ? `B${at.block}.${at.page}` : '—'}</span>`;
      }).join('');
      const wa = stats.host ? (stats.nand / stats.host).toFixed(2).replace('.', ',') : '—';
      return `<div class="b5-blocks">${cards}</div>
        <p class="b5-ftl"><b>Bảng FTL</b> (ảnh → khối.trang) ${table}</p>
        <p class="b5-stats">Ghi từ máy tính <b>${stats.host}</b> <span aria-hidden="true">·</span> Ghi vào NAND <b>${stats.nand}</b> <span aria-hidden="true">·</span> Lần xóa khối <b>${stats.erases}</b> <span aria-hidden="true">·</span> Khuếch đại ghi <b>${wa}</b></p>`;
    }
  };

  /* ---------- 3. RAID dùng chẵn lẻ ---------- */
  const xor = (...values) => values.reduce((a, b) => a ^ b, 0);
  const bits = (value) => value.toString(2).padStart(4, '0');
  const stripesData = [[0b0110, 0b1011, 0b0011], [0b1100, 0b0101, 0b1010], [0b0001, 0b1110, 0b0111]];
  const blockNames = [['A', 'B', 'C'], ['D', 'E', 'F'], ['G', 'H', 'I']];

  function raidLayout(level, data) {
    return data.map((values, s) => {
      const parityDrive = level === 'raid4' ? 3 : 3 - s;
      const cells = [];
      let k = 0;
      for (let d = 0; d < 4; d += 1) {
        if (d === parityDrive) cells.push({ name: `P${s}`, value: xor(...values), parity: true });
        else {
          cells.push({ name: blockNames[s][k], value: values[k], index: k });
          k += 1;
        }
      }
      return cells;
    });
  }

  const raid = {
    title: 'Mô phỏng RAID có khối chẵn lẻ',
    prompt: '4 ổ, mỗi hàng là một stripe gồm 3 khối dữ liệu 4 bit và 1 khối chẵn lẻ P.',
    selects: [
      ['level', 'Mức RAID', { raid5: 'RAID 5 · chẵn lẻ xoay vòng', raid4: 'RAID 4 · một ổ chẵn lẻ' }],
      ['scenario', 'Tình huống', { fail: 'Ổ D1 hỏng, đọc và dựng lại', write: 'Hai lần ghi nhỏ vào hai stripe' }]
    ],
    steps({ level, scenario }) {
      const data = stripesData.map((row) => [...row]);
      const counts = [0, 0, 0, 0];
      const states = [];
      const push = (note, extra = {}) => states.push({
        layout: raidLayout(level, data), counts: [...counts], level, ...extra, note
      });
      const parityText = level === 'raid4' ? 'mọi khối P nằm trên ổ D3' : 'khối P xoay vòng qua các ổ';
      push(`Mỗi khối P là XOR của các khối dữ liệu cùng hàng, và ${parityText}. Dung lượng dùng được là 3 trên 4 ổ.`);

      if (scenario === 'fail') {
        const failed = 1;
        push('Ổ D1 hỏng. Hệ thống vẫn chạy tiếp ở chế độ suy giảm, vì mỗi hàng chỉ mất đúng một khối.', { failed });
        const layout = raidLayout(level, data);
        const lost = layout[0][failed];
        const survivors = [0, 1, 2, 3].filter((d) => d !== failed);
        const others = survivors.map((d) => layout[0][d]);
        const reading = survivors.map((d) => [0, d]);
        survivors.forEach((d) => { counts[d] += 1; });
        const value = xor(...others.map((c) => c.value));
        push(`An mở ảnh nằm trong khối ${lost.name} ở hàng 0, trên ổ hỏng. Bộ điều khiển đọc ${others.map((c) => c.name).join(', ')} từ ba ổ còn lại.`,
          { failed, reading });
        push(`XOR từng bit: ${others.map((c) => bits(c.value)).join(' ⊕ ')} = <b>${bits(value)}</b>, đúng bằng ${lost.name} = ${bits(lost.value)}. Ở mỗi vị trí bit, nếu số bit 1 còn lại là lẻ thì bit bị mất là 1.`,
          { failed, reading, recovered: [[0, failed]], formula: `${lost.name} = ${others.map((c) => c.name).join(' ⊕ ')}` });
        survivors.forEach((d) => { counts[d] += 2; });
        counts[failed] = 3;
        push('Lắp ổ mới (hoặc ổ dự phòng nóng tự vào thay). Dựng lại cả cột D1: mỗi hàng đọc 3 ổ còn lại rồi ghi kết quả vào ổ mới. Với ổ hàng chục TB, việc này kéo dài nhiều giờ, thậm chí nhiều ngày.',
          { rebuilt: failed, recovered: [[0, failed], [1, failed], [2, failed]] });
        states.at(-1).note += ` Trong lúc dựng lại, nếu thêm một ổ nữa hỏng thì ${level === 'raid4' ? 'RAID 4' : 'RAID 5'} mất dữ liệu. RAID 6 chịu được hai ổ hỏng.`;
        return states;
      }

      const writeBlock = (s, k, value, label) => {
        const before = raidLayout(level, data)[s];
        const dataDrive = before.findIndex((c) => c.index === k);
        const parityDrive = before.findIndex((c) => c.parity);
        const oldValue = data[s][k];
        const oldParity = xor(...data[s]);
        counts[dataDrive] += 1;
        counts[parityDrive] += 1;
        push(`${label} An sửa khối ${before[dataDrive].name} (hàng ${s}) từ ${bits(oldValue)} thành ${bits(value)}. Bước 1: đọc ${before[dataDrive].name} cũ trên D${dataDrive} và P${s} cũ trên D${parityDrive}.`,
          { reading: [[s, dataDrive], [s, parityDrive]] });
        const newParity = oldParity ^ oldValue ^ value;
        push(`Bước 2: P mới = P cũ ⊕ dữ liệu cũ ⊕ dữ liệu mới = ${bits(oldParity)} ⊕ ${bits(oldValue)} ⊕ ${bits(value)} = <b>${bits(newParity)}</b>. Không cần đọc hai khối còn lại của hàng.`,
          { reading: [[s, dataDrive], [s, parityDrive]], formula: `P${s} mới = ${bits(newParity)}` });
        data[s][k] = value;
        counts[dataDrive] += 1;
        counts[parityDrive] += 1;
        push(`Bước 3: ghi ${before[dataDrive].name} mới lên D${dataDrive} và P${s} mới lên D${parityDrive}. Một lần ghi nhỏ tốn 4 lần truy cập ổ: đọc, sửa, ghi.`,
          { writing: [[s, dataDrive], [s, parityDrive]] });
      };
      writeBlock(0, 0, 0b0100, 'Lần ghi thứ nhất.');
      writeBlock(1, 1, 0b0111, 'Lần ghi thứ hai.');
      const busiest = Math.max(...counts);
      states.at(-1).note += level === 'raid4'
        ? ` Đếm lại: ổ D3 phải phục vụ ${busiest} lần truy cập vì mọi P đều nằm ở đó, nên hai lần ghi nhỏ không thể chạy song song.`
        : ` Đếm lại: không ổ nào phải làm quá ${busiest} lần, vì hai khối P nằm trên hai ổ khác nhau. Hai lần ghi nhỏ có thể chạy song song.`;
      return states;
    },
    render({ layout, counts, failed, rebuilt, reading = [], writing = [], recovered = [], formula }) {
      const has = (list, s, d) => list.some(([a, b]) => a === s && b === d);
      const header = [0, 1, 2, 3].map((d) => `<th scope="col"${d === failed && rebuilt === undefined ? ' class="b5-failed"' : ''}>D${d}<small>${
        d === failed && rebuilt === undefined ? 'hỏng' : d === rebuilt ? `ổ mới · ${counts[d]} lần ghi` : `${counts[d]} lần truy cập`}</small></th>`).join('');
      const rows = layout.map((cells, s) => `<tr><th scope="row">Hàng ${s}</th>${cells.map((cell, d) => {
        let tone = cell.parity ? 'b5-parity' : '';
        if (d === failed && rebuilt === undefined && !has(recovered, s, d)) tone += ' b5-lost';
        if (has(reading, s, d)) tone += ' b5-read';
        if (has(writing, s, d)) tone += ' b5-write';
        if (has(recovered, s, d)) tone += ' b5-recovered';
        const hidden = d === failed && rebuilt === undefined && !has(recovered, s, d);
        return `<td class="${tone}"><b>${cell.name}</b><code>${hidden ? '????' : bits(cell.value)}</code></td>`;
      }).join('')}</tr>`).join('');
      return `<div class="tbl-wrap b5-raid-wrap"><table class="tbl b5-raid">
          <thead><tr><th scope="col">Stripe</th>${header}</tr></thead><tbody>${rows}</tbody></table></div>
        <p class="b5-legend"><span class="b5-key b5-read">đang đọc</span><span class="b5-key b5-write">đang ghi</span><span class="b5-key b5-parity">chẵn lẻ</span><span class="b5-key b5-recovered">dựng lại</span></p>
        ${formula ? `<p class="b5-formula">${formula}</p>` : ''}`;
    }
  };

  /* ---------- 4. Bắt tay giữa CPU và bộ điều khiển bằng thăm dò ---------- */
  const handshake = {
    title: 'Mô phỏng bắt tay bằng thăm dò',
    prompt: 'CPU gửi hai byte “An” ra một cổng nối tiếp qua thanh ghi của bộ điều khiển.',
    selects: [['scenario', 'Lúc bắt đầu', { idle: 'Bộ điều khiển đang rảnh', busy: 'Bộ điều khiển còn bận việc trước' }]],
    steps({ scenario }) {
      let current = {
        busy: scenario === 'busy' ? 1 : 0, ready: 0, write: 0, error: 0, dataOut: '—',
        output: '', polls: 0, actor: 'host', note: ''
      };
      const states = [];
      const set = (actor, stage, note, changes = {}) => {
        current = { ...current, ...changes, actor, stage, note };
        states.push(current);
      };
      set('none', 'start', scenario === 'busy'
        ? 'Bộ điều khiển đang gửi dở một byte của lệnh trước, nên bit <b>busy</b> đang bằng 1.'
        : 'Bộ điều khiển rảnh: bit <b>busy</b> trong thanh ghi trạng thái bằng 0.');
      ['A', 'n'].forEach((byte, i) => {
        if (scenario === 'busy' && i === 0) {
          set('host', 'poll', 'Bước 1. CPU đọc thanh ghi trạng thái: busy = 1. Nó quay lại đọc tiếp, tức là <b>chờ bận</b>.', { polls: current.polls + 1 });
          set('host', 'poll', 'Bước 1. Đọc lần 2: busy vẫn bằng 1. Mỗi vòng chỉ tốn ba lệnh: đọc, AND lấy bit, rẽ nhánh.', { polls: current.polls + 1 });
          set('host', 'poll', 'Bước 1. Đọc lần 3: busy = 0. Bộ điều khiển đã xong việc cũ, CPU thoát vòng lặp.', { polls: current.polls + 1, busy: 0 });
        } else {
          set('host', 'poll', `Bước 1. CPU đọc thanh ghi trạng thái, thấy busy = 0 ngay.`, { polls: current.polls + 1 });
        }
        set('host', 'command', `Bước 2. CPU đặt bit <b>write</b> trong thanh ghi lệnh và ghi byte “${byte}” vào thanh ghi <b>data-out</b>.`, { write: 1, dataOut: byte });
        set('host', 'ready', 'Bước 3. CPU đặt bit <b>command-ready</b> = 1 để báo có lệnh mới.', { ready: 1 });
        set('device', 'busy', 'Bước 4. Bộ điều khiển thấy command-ready = 1 nên đặt busy = 1.', { busy: 1 });
        set('device', 'transfer', `Bước 5. Bộ điều khiển đọc thanh ghi lệnh, thấy lệnh ghi, lấy “${byte}” trong data-out và đẩy ra thiết bị.`, { output: current.output + byte });
        set('device', 'done', `Bước 6. Bộ điều khiển xóa command-ready, xóa bit error để báo thành công, rồi xóa busy.${i === 0 ? ' Vòng lặp lặp lại cho byte tiếp theo.' : ''}`,
          { ready: 0, error: 0, busy: 0, write: 0 });
      });
      states.at(-1).note += ` Xong hai byte sau ${current.polls} lần CPU đọc thanh ghi trạng thái.`;
      return states;
    },
    render({ busy, ready, write, error, dataOut, output, polls, actor, stage }) {
      const bit = (name, value, hot) => `<span class="b5-bit${value ? ' on' : ''}${hot ? ' hot' : ''}"><small>${name}</small><b>${value}</b></span>`;
      return `<div class="b5-hs">
          <div class="b5-actor${actor === 'host' ? ' is-active' : ''}"><b>CPU (host)</b><small>chạy driver, đọc và ghi thanh ghi</small></div>
          <div class="b5-regs">
            <div class="b5-reg"><span>Thanh ghi trạng thái</span>${bit('busy', busy, ['poll', 'busy', 'done'].includes(stage))}${bit('error', error, stage === 'done')}</div>
            <div class="b5-reg"><span>Thanh ghi lệnh</span>${bit('command-ready', ready, ['ready', 'done'].includes(stage))}${bit('write', write, stage === 'command')}</div>
            <div class="b5-reg"><span>Thanh ghi data-out</span><span class="b5-bit wide${stage === 'command' ? ' hot' : ''}"><small>byte</small><b>${dataOut}</b></span></div>
          </div>
          <div class="b5-actor${actor === 'device' ? ' is-active' : ''}"><b>Bộ điều khiển</b><small>điều khiển cổng và thiết bị</small></div>
        </div>
        <p class="b5-stats">Thiết bị đã nhận <b class="b5-mono">${output || '—'}</b> <span aria-hidden="true">·</span> Số lần CPU đọc trạng thái <b>${polls}</b></p>`;
    }
  };

  /* ---------- 5. Vòng đời của một yêu cầu read() chặn ---------- */
  const layers = [
    ['user', 'Tiến trình xem ảnh', 'chế độ người dùng'],
    ['kernel', 'Hệ con I/O của kernel', 'kiểm tra, bộ đệm, lập lịch'],
    ['driver', 'Driver thiết bị', 'ra lệnh cho bộ điều khiển'],
    ['handler', 'Bộ xử lý ngắt', 'chạy khi có ngắt'],
    ['controller', 'Bộ điều khiển và DMA', 'phần cứng'],
    ['device', 'Ổ lưu trữ', 'phần cứng']
  ];

  const lifecycle = {
    title: 'Mô phỏng vòng đời một yêu cầu I/O',
    prompt: 'Ứng dụng xem ảnh gọi read() để đọc khối tiếp theo của tệp ảnh đã mở.',
    selects: [['scenario', 'Tình huống', { miss: 'Khối chưa có trong bộ đệm', hit: 'Khối đã nằm trong bộ đệm của kernel' }]],
    steps({ scenario }) {
      const states = [];
      let current = { active: [], process: 'Đang chạy', data: 'Trên ổ', mode: 'người dùng', step: 0 };
      const set = (step, active, note, changes = {}) => {
        current = { ...current, ...changes, step, active, note };
        states.push(current);
      };
      set(0, ['user'], 'Ứng dụng đang chạy và cần khối tiếp theo của tệp ảnh.', scenario === 'hit' ? { data: 'Ổ và bộ đệm kernel' } : {});
      set(1, ['user', 'kernel'], 'Bước 1. Tiến trình gọi <code>read()</code> chặn trên một mô tả tệp đã mở. Trap đưa CPU vào chế độ kernel.', { mode: 'kernel' });
      if (scenario === 'hit') {
        set(2, ['kernel'], 'Bước 2. Kernel kiểm tra tham số rồi tra bộ đệm: khối đã có sẵn. Kernel chép dữ liệu sang vùng nhớ của tiến trình và trả về ngay, không cần chạm tới thiết bị.',
          { data: 'Bộ nhớ của ứng dụng' });
        set(2, ['user'], 'Lời gọi kết thúc mà tiến trình không phải chờ: chép từ RAM mất cỡ micro giây, còn đọc HDD mất cỡ chục mili giây.', { mode: 'người dùng' });
        return states;
      }
      set(2, ['kernel'], 'Bước 2. Kernel kiểm tra tham số và tra bộ đệm: khối chưa có, phải đọc thiết bị thật.');
      set(3, ['kernel'], 'Bước 3. Tiến trình rời hàng đợi sẵn sàng sang <b>hàng đợi chờ của thiết bị</b>. Yêu cầu được xếp lịch rồi chuyển cho driver.', { process: 'Chờ I/O' });
      set(4, ['driver'], 'Bước 4. Driver cấp vùng đệm trong kernel và ghi lệnh vào các thanh ghi điều khiển của bộ điều khiển. CPU được trao cho tiến trình khác.');
      set(5, ['controller', 'device'], 'Bước 5. Bộ điều khiển vận hành ổ để đọc khối.');
      set(6, ['controller'], 'Bước 6. DMA chuyển khối vào vùng đệm kernel mà không cần CPU, rồi phát một ngắt khi xong.', { data: 'Bộ đệm kernel' });
      set(7, ['handler'], 'Bước 7. Bộ xử lý ngắt đúng được chọn qua bảng vectơ ngắt. Nó lưu thông tin cần thiết, báo cho driver rồi trở về.');
      set(8, ['driver'], 'Bước 8. Driver xác định yêu cầu nào vừa xong và trạng thái của nó, rồi báo cho hệ con I/O.');
      set(9, ['kernel'], 'Bước 9. Kernel chép dữ liệu sang không gian địa chỉ của tiến trình và chuyển tiến trình từ hàng đợi chờ về <b>hàng đợi sẵn sàng</b>.',
        { data: 'Bộ nhớ của ứng dụng', process: 'Sẵn sàng' });
      set(10, ['user'], 'Bước 10. Khi bộ lập lịch cấp CPU, tiến trình chạy tiếp ngay sau lời gọi <code>read()</code>, với dữ liệu đã nằm trong vùng đệm của nó.',
        { process: 'Đang chạy', mode: 'người dùng' });
      return states;
    },
    render({ active, process, data, mode, step }) {
      const rows = layers.map(([key, name, hint]) =>
        `<li class="b5-layer${active.includes(key) ? ' is-active' : ''}${['controller', 'device'].includes(key) ? ' hw' : ''}"><b>${name}</b><small>${hint}</small></li>`).join('');
      const tone = process === 'Chờ I/O' ? ' b5-wait' : process === 'Sẵn sàng' ? ' b5-ready' : '';
      return `<div class="b5-life">
          <ol class="b5-layers" aria-label="Các tầng mà yêu cầu đi qua">${rows}</ol>
          <dl class="b5-facts">
            <div><dt>Bước theo giáo trình</dt><dd>${step ? `${step} / 10` : 'chưa bắt đầu'}</dd></div>
            <div class="${tone.trim()}"><dt>Tiến trình</dt><dd>${process}</dd></div>
            <div><dt>CPU đang ở chế độ</dt><dd>${mode}</dd></div>
            <div><dt>Khối dữ liệu nằm ở</dt><dd>${data}</dd></div>
          </dl>
        </div>`;
    }
  };

  const labs = { disk, ftl, raid, handshake, lifecycle };
  document.querySelectorAll('[data-io-lab]').forEach((root) => mount(root, labs[root.dataset.ioLab]));
})();
