/* Mỗi mô phỏng là một dấu vết. Mô phỏng cache tính dấu vết từ chuỗi yêu cầu. */
(() => {
  function cacheTrace(requests, capacity) {
    const cache = [];
    let hits = 0;
    return requests.map((block, index) => {
      const position = cache.indexOf(block);
      const hit = position !== -1;
      let evicted;
      if (hit) {
        hits += 1;
        cache.splice(position, 1);
      } else if (cache.length === capacity) {
        evicted = cache.shift();
      }
      cache.push(block);
      const result = hit
        ? 'Hit. Dùng bản đã có trong cache.'
        : 'Miss. Lấy khối từ tầng lưu trữ bên dưới.';
      const replacement = evicted ? ` Loại ${evicted} vì đã lâu nhất chưa được dùng.` : '';
      return [
        `Đọc ${block}`,
        `${result}${replacement} ${block} trở thành khối dùng gần nhất.`,
        [cache.join(' → '), hit ? 'Hit' : 'Miss', `${hits}/${index + 1}`],
        { blocks: cache.slice(), requested: block, evicted },
      ];
    });
  }

  const lessons = {
    io: {
      title: 'Đường dữ liệu và đường báo ngắt',
      subtitle: 'Đọc một khối của baihoc.txt. Theo dõi hướng mũi tên ở mỗi bước.',
      fields: ['CPU', 'Controller', 'Trình soạn thảo'],
      scenarios: [
        ['Dùng DMA', [
          ['Đặt lệnh đọc', 'CPU chạy driver để chuẩn bị vùng đệm và đặt lệnh cho controller.', ['Chạy driver', 'Nhận địa chỉ vùng đệm và lệnh đọc', 'Đang gửi yêu cầu'], 'command'],
          ['Ổ lấy dữ liệu', 'Tiến trình đọc phải đợi. CPU có thể chuyển sang trình phát nhạc trong khi controller làm việc với ổ lưu trữ.', ['Chạy trình phát nhạc', 'Lấy dữ liệu từ ổ', 'Đang chờ I/O'], 'device'],
          ['DMA ghi vào RAM', 'Dữ liệu đi từ controller vào vùng đệm RAM. CPU vẫn có thể xử lý công việc của trình phát nhạc.', ['Chạy trình phát nhạc', 'Phần cứng DMA chuyển khối', 'Đang chờ I/O'], 'dma'],
          ['Phát ngắt', 'Controller báo đã chuyển xong. CPU vào trình xử lý ngắt. Kernel ghi nhận kết quả và đánh thức tiến trình đọc.', ['Xử lý ngắt trong kernel', 'Báo I/O hoàn tất', 'Sẵn sàng'], 'interrupt'],
          ['Dùng dữ liệu', 'Khi tiến trình được cấp CPU, lời gọi đọc có thể hoàn tất với dữ liệu đã có trong RAM.', ['Tiếp tục phục vụ lần đọc', 'Đã hoàn tất', 'Đang chạy'], 'resume'],
        ]],
        ['CPU chuyển dữ liệu', [
          ['Đặt lệnh đọc', 'CPU chạy driver để đặt lệnh đọc. Kiểu chuyển khối này dùng CPU để sao dữ liệu vào RAM.', ['Chạy driver', 'Nhận lệnh đọc', 'Đang gửi yêu cầu'], 'command'],
          ['Ổ lấy dữ liệu', 'Controller đưa dữ liệu từ ổ vào bộ đệm thiết bị. CPU có thể làm việc khác trong lúc đợi.', ['Chạy trình phát nhạc', 'Lấy dữ liệu từ ổ', 'Đang chờ I/O'], 'device'],
          ['Phát ngắt', 'Controller báo rằng bộ đệm thiết bị đã có dữ liệu. Khối vẫn chưa được đưa vào RAM.', ['Vào trình xử lý ngắt', 'Báo có dữ liệu', 'Đang chờ I/O'], 'interrupt'],
          ['CPU chép khối', 'Driver chạy trên CPU, lấy khối qua giao diện controller rồi ghi vào RAM. Sau đó kernel đánh thức tiến trình đọc.', ['Tự chuyển khối qua các lệnh đọc và ghi', 'Cấp dữ liệu qua giao diện I/O', 'Sẵn sàng'], 'pio'],
          ['Dùng dữ liệu', 'Khi được cấp CPU, tiến trình tiếp tục lời gọi đọc với dữ liệu trong RAM.', ['Tiếp tục phục vụ lần đọc', 'Đã hoàn tất', 'Đang chạy'], 'resume'],
        ]],
      ],
    },
    cpu: {
      title: 'Một lõi CPU đổi lượt thế nào?',
      subtitle: 'A là trình soạn thảo. B là trình phát nhạc.',
      fields: ['Chế độ CPU', 'Trạng thái A', 'Trạng thái B'],
      scenarios: [
        ['A chờ thiết bị', [
          ['A đang chạy', 'A xử lý yêu cầu mở tệp. B có thể chạy ngay khi đến lượt.', ['User', 'Đang chạy', 'Sẵn sàng'], 'A'],
          ['A gọi read', 'CPU bắt đầu chạy mã kernel để phục vụ A. A vẫn là tiến trình hiện tại.', ['Kernel', 'Đang xử lý lời gọi', 'Sẵn sàng'], 'Kernel'],
          ['A phải chờ', 'Dữ liệu chưa có. Kernel lưu trạng thái A và chọn B từ hàng sẵn sàng.', ['Kernel', 'Đang chờ I/O', 'Được chọn'], 'Kernel'],
          ['B phát nhạc', 'Sau khi khôi phục trạng thái B, CPU về user mode và chạy B trong lúc thiết bị làm việc.', ['User', 'Đang chờ I/O', 'Đang chạy'], 'B'],
          ['Thiết bị báo xong', 'CPU tạm dừng mã của B để xử lý ngắt. A trở lại hàng sẵn sàng.', ['Kernel', 'Sẵn sàng', 'Tạm dừng do ngắt'], 'Kernel'],
          ['B tiếp tục', 'Trong lượt này, kernel cho B chạy tiếp. CPU đã qua kernel mode trong lúc xử lý ngắt và vẫn trả lượt chạy cho B.', ['User', 'Sẵn sàng', 'Đang chạy'], 'B'],
        ]],
        ['A dùng hết lượt', [
          ['Đặt timer', 'Kernel đặt thời điểm có ngắt và chuẩn bị trả lượt chạy cho A.', ['Kernel', 'Được chọn', 'Sẵn sàng'], 'Kernel'],
          ['A thực thi', 'A đang tính toán. Công việc chưa kết thúc và A chưa tự đi vào kernel.', ['User', 'Đang chạy', 'Sẵn sàng'], 'A'],
          ['Timer phát ngắt', 'Hết lượt thời gian. CPU vào kernel dù A đang tính toán.', ['Kernel', 'Tạm dừng do ngắt', 'Sẵn sàng'], 'Kernel'],
          ['B được chọn', 'Chính sách của ví dụ đưa A về hàng sẵn sàng và chọn B. Kernel lưu trạng thái A để có thể khôi phục sau.', ['Kernel', 'Sẵn sàng', 'Được chọn'], 'Kernel'],
          ['B bắt đầu chạy', 'Kernel đặt timer cho lượt của B, khôi phục trạng thái B và trở về user mode.', ['User', 'Sẵn sàng', 'Đang chạy'], 'B'],
        ]],
      ],
    },
    cache: {
      title: 'Cache nào còn giữ được Y?',
      subtitle: 'Cùng chuỗi X, Y, X, Z, Y. Cache bắt đầu rỗng và thay khối theo LRU.',
      fields: ['Từ cũ đến mới', 'Lần đọc này', 'Hit / số lần đọc'],
      scenarios: [2, 3].map((capacity) => [
        capacity + ' ô cache',
        cacheTrace(['X', 'Y', 'X', 'Z', 'Y'], capacity),
        { capacity },
      ]),
    },
    syscall: {
      title: 'Cùng một yêu cầu, hai kết quả',
      subtitle: 'Tiến trình yêu cầu mở baihoc.txt chỉ để đọc.',
      fields: ['Chế độ CPU', 'Xử lý', 'Kết quả'],
      scenarios: [
        ['Có quyền đọc', [
          ['Gọi API', 'Trình soạn thảo truyền tên tệp và chế độ chỉ đọc cho hàm open.', ['User', 'open(baihoc.txt, O_RDONLY)', 'Đang gọi'], 0],
          ['Vào kernel', 'Thư viện chuẩn bị tham số theo quy ước của hệ thống. CPU bắt đầu chạy trình xử lý trong kernel.', ['Kernel', 'Chọn trình xử lý mở tệp', 'Đang xử lý'], 1],
          ['Xét quyền', 'Kernel tra tệp và kiểm tra quyền với danh tính của tiến trình. Yêu cầu được chấp nhận.', ['Kernel', 'Tạo mục mô tả tệp', 'Ô số 4 được cấp'], 1],
          ['Trở về ứng dụng', 'Hàm open trả về 4. Tiến trình có thể dùng read với số này để lấy dữ liệu.', ['User', 'open hoàn tất', 'fd = 4'], 2],
        ]],
        ['Thiếu quyền đọc', [
          ['Gọi API', 'Tiến trình truyền cùng tên tệp và cùng yêu cầu chỉ đọc.', ['User', 'open(baihoc.txt, O_RDONLY)', 'Đang gọi'], 0],
          ['Vào kernel', 'CPU chuyển chế độ và chạy trình xử lý. Kernel xét quyền theo danh tính của tiến trình gọi.', ['Kernel', 'Tra tệp và danh tính', 'Đang xử lý'], 1],
          ['Xét quyền', 'Tệp tồn tại. Quyền hiện hành không cho tiến trình mở để đọc, nên không có mục mô tả tệp mới.', ['Kernel', 'Từ chối yêu cầu', 'EACCES'], 1],
          ['Trở về ứng dụng', 'Thư viện trả -1 và đặt errno thành EACCES. Trình soạn thảo có thể báo lỗi truy cập cho người dùng.', ['User', 'open thất bại', '-1 · EACCES'], 2],
        ], { failed: true }],
      ],
    },
    loader: {
      title: 'Lỗi ở linker hay lúc chạy?',
      subtitle: 'main gọi dem_dong, một hàm được viết trong tệp khác.',
      fields: ['Giai đoạn', 'Đầu ra hoặc lỗi'],
      scenarios: [
        ['Đủ thành phần', [
          ['Biên dịch', 'Mã nguồn được biên dịch riêng. Tệp main.o còn tham chiếu tới dem_dong, còn demdong.o chứa định nghĩa.', ['Compiler', 'main.o và demdong.o'], 0],
          ['Liên kết', 'Linker giải quyết tham chiếu và ghi phụ thuộc vào thư viện dùng chung.', ['Linker', 'Tệp thực thi'], 1],
          ['Nạp', 'Hệ điều hành ánh xạ tệp thực thi. Trình liên kết động tìm thư viện cần dùng.', ['Loader và trình liên kết động', 'Mã và thư viện đã sẵn sàng'], 2],
          ['Chạy', 'Mã khởi động chuẩn bị môi trường rồi gọi main.', ['Chương trình', 'main bắt đầu thực thi'], 3],
        ]],
        ['Thiếu demdong.o', [
          ['Biên dịch', 'Bản xây dựng chỉ tạo hoặc cung cấp main.o cho bước tiếp theo.', ['Compiler', 'main.o'], 0],
          ['Liên kết dừng', 'Linker chưa tìm được định nghĩa của dem_dong, nên chưa tạo được tệp thực thi.', ['Linker', 'Ký hiệu chưa được định nghĩa'], 1],
        ], { failed: true }],
        ['Máy chạy thiếu thư viện', [
          ['Biên dịch', 'Hai tệp đối tượng được tạo đầy đủ trên máy xây dựng.', ['Compiler', 'main.o và demdong.o'], 0],
          ['Liên kết', 'Máy xây dựng có đủ thành phần để tạo tệp thực thi.', ['Linker', 'Tệp thực thi có khai báo thư viện'], 1],
          ['Nạp dừng', 'Máy đích thiếu thư viện dùng chung cần ngay lúc nạp. Trình liên kết động dừng trước khi main chạy.', ['Loader và trình liên kết động', 'Thiếu thư viện dùng chung'], 2],
        ], { failed: true }],
      ],
    },
    structure: {
      title: 'Cùng lần đọc, dịch vụ chạy ở đâu?',
      subtitle: 'Khối dữ liệu chưa có trong RAM.',
      fields: ['Thành phần xử lý', 'Nơi chạy', 'Cách chuyển yêu cầu'],
      scenarios: [
        ['Kernel nguyên khối', [
          ['Ứng dụng gọi read', 'Ứng dụng yêu cầu đọc qua một mô tả tệp đã mở. CPU chuyển sang điểm vào của system call trong kernel.', ['Ứng dụng → kernel', 'User → kernel', 'System call']],
          ['Tìm khối trên thiết bị', 'Hệ thống tệp tìm khối cần lấy. Đường I/O gọi driver trong cùng miền đặc quyền.', ['Hệ thống tệp → driver', 'Kernel mode', 'Lời gọi hàm trong kernel']],
          ['Xử lý kết quả thiết bị', 'Driver gửi lệnh. Khi thiết bị báo xong, mã trong kernel ghi nhận kết quả.', ['Driver và thiết bị', 'Kernel khi chạy driver', 'Lệnh thiết bị và ngắt']],
          ['Trở về ứng dụng', 'Kernel đưa dữ liệu vào vùng đệm. Khi tiến trình tiếp tục, read trả số byte đã đọc.', ['Kernel → ứng dụng', 'Kernel → user', 'Trả kết quả system call']],
        ]],
        ['Vi nhân', [
          ['Ứng dụng gọi read', 'Thư viện gửi yêu cầu qua vi nhân đến tiến trình làm dịch vụ hệ thống tệp.', ['Ứng dụng → hệ thống tệp', 'User → kernel → user', 'IPC qua vi nhân']],
          ['Tìm khối trên thiết bị', 'Tiến trình hệ thống tệp tìm khối và gửi một thông điệp khác tới tiến trình driver.', ['Hệ thống tệp → driver', 'User → kernel → user', 'IPC qua vi nhân']],
          ['Xử lý kết quả thiết bị', 'Driver dùng quyền điều khiển thiết bị đã cấp. Vi nhân nhận ngắt và báo cho driver. Driver báo lại cho hệ thống tệp.', ['Driver và thiết bị', 'User cho driver, kernel cho ngắt', 'Thông báo ngắt và IPC']],
          ['Trở về ứng dụng', 'Tiến trình dịch vụ phản hồi với dữ liệu và số byte đã đọc qua cơ chế trao đổi đã thiết kế.', ['Hệ thống tệp → ứng dụng', 'User → kernel → user', 'Phản hồi IPC qua vi nhân']],
        ]],
      ],
    },
    boot: {
      title: 'Ai trao quyền cho ai khi bật máy?',
      subtitle: 'Một máy Linux dùng UEFI, GRUB và systemd.',
      fields: ['Đang thực hiện', 'Hệ thống tệp gốc'],
      scenarios: [
        ['Khởi động bình thường', [
          ['Bật máy', 'Firmware khởi tạo phần cứng đủ để tìm chương trình EFI đã chọn.', ['UEFI', 'Chưa gắn'], 0],
          ['Nạp ảnh', 'GRUB đưa kernel và initramfs vào RAM rồi chuyển điều khiển.', ['GRUB', 'Chưa gắn'], 1],
          ['Chuẩn bị ổ hệ thống', 'Kernel dựng bộ nhớ và ngắt. Môi trường initramfs nạp driver để kernel thấy thiết bị chứa root.', ['Kernel và initramfs', 'Root tạm trong RAM'], 2],
          ['Gắn root và mở dịch vụ', 'Tiến trình khởi tạo chuyển sang root thật rồi chạy systemd ở PID 1. Các dịch vụ bắt đầu chạy.', ['systemd', 'Root thật đã gắn'], 3],
        ]],
        ['Thiếu driver lưu trữ', [
          ['Bật máy', 'Firmware vẫn tìm và chạy được trình nạp khởi động.', ['UEFI', 'Chưa gắn'], 0],
          ['Nạp ảnh', 'GRUB đọc được ảnh kernel và initramfs qua đường truy cập của trình nạp.', ['GRUB', 'Chưa gắn'], 1],
          ['Chuẩn bị ổ hệ thống', 'Kernel bắt đầu khởi tạo. Driver cần để nhận thiết bị root thiếu trong cả kernel và initramfs của ví dụ.', ['Kernel và initramfs', 'Root tạm trong RAM'], 2],
          ['Dừng trước khi gắn root', 'Kernel chưa thấy thiết bị chứa root. Hệ thống dừng hoặc vào môi trường phục hồi, tùy cấu hình.', ['Môi trường khởi tạo', 'Root thật chưa gắn'], 3],
        ], { failed: true }],
      ],
    },
  };

  function ioDiagram(steps, position) {
    const stage = steps[position]?.[3] ?? 'initial';
    const signal = {
      command: ['→', 'Lệnh đọc'],
      interrupt: ['←', 'Ngắt'],
      pio: ['←', 'Khối dữ liệu'],
    }[stage] ?? ['↔', 'Lệnh / ngắt'];
    const cpuReadsRam = stage === 'resume';
    return `
      <div class="io-circuit" data-stage="${stage}">
        <div class="lab-node io-cpu"><strong>CPU</strong><small>Chạy mã driver</small></div>
        <div class="lab-edge io-signal"><b>${signal[0]}</b><small>${signal[1]}</small></div>
        <div class="lab-node io-controller"><strong>Controller</strong><small>Cùng ổ lưu trữ</small></div>
        <div class="lab-edge io-write"><b>${cpuReadsRam ? '↑' : '↓'}</b><small>${cpuReadsRam ? 'Đọc vùng đệm' : 'CPU ghi'}</small></div>
        <div class="lab-edge io-dma"><b>↓</b><small>DMA ghi</small></div>
        <div class="lab-node io-ram"><strong>RAM</strong><small>Vùng đệm dữ liệu</small></div>
      </div>`;
  }

  function cpuDiagram(steps, position) {
    const slots = steps.map((step, index) => {
      const actor = index <= position ? step[3] : '';
      const current = index === position ? 'is-active' : '';
      return `<li data-actor="${actor}" class="${current}"><small>${index + 1}</small><strong>${actor || '·'}</strong></li>`;
    });
    return `<div class="lab-caption">Hoạt động trên một lõi qua từng mốc</div><ol class="lab-timeline">${slots.join('')}</ol>`;
  }

  function cacheDiagram(steps, position, { capacity }) {
    const { blocks = [], requested, evicted } = steps[position]?.[3] ?? {};
    const slots = Array.from({ length: capacity }, (_, index) => {
      const block = blocks[index];
      return `<li class="lab-node${block && block === requested ? ' is-active' : ''}"><strong>${block ?? 'Trống'}</strong></li>`;
    });
    return `
      <div class="lab-caption cache-order"><span>Cũ nhất</span><span>Mới nhất →</span></div>
      <ol class="lab-cache">${slots.join('')}</ol>
      <div class="lab-caption cache-eviction">${evicted ? `Loại khối ${evicted}` : 'Chưa loại khối ở bước này'}</div>`;
  }

  function phaseDiagram(phases, steps, position, { failed }) {
    const current = steps[position]?.[3] ?? -1;
    const error = failed && position === steps.length - 1;
    return `<ol class="lab-phases">${phases.map(([name, label], index) => {
      let status = '';
      if (index < current) status = ' is-complete';
      if (index === current) status = error ? ' is-error' : ' is-active';
      return `<li class="lab-node${status}"><strong>${name}</strong><small>${label}</small></li>`;
    }).join('')}</ol>`;
  }

  const graphics = {
    io: ioDiagram,
    cpu: cpuDiagram,
    cache: cacheDiagram,
    syscall: (steps, position, settings) => phaseDiagram([
      ['User mode', 'Gửi lời gọi'],
      ['Kernel mode', 'Tra tệp và xét quyền'],
      ['User mode', 'Nhận kết quả'],
    ], steps, position, settings),
    loader: (steps, position, settings) => phaseDiagram([
      ['Compiler', 'Tệp đối tượng'],
      ['Linker', 'Tệp thực thi'],
      ['Loader', 'Ảnh tiến trình'],
      ['Chương trình', 'Vào main'],
    ], steps, position, settings),
    boot: (steps, position, settings) => phaseDiagram([
      ['UEFI', 'Chọn mục khởi động'],
      ['GRUB', 'Nạp ảnh vào RAM'],
      ['Kernel', 'Tìm thiết bị'],
      ['Root và PID 1', 'Mở dịch vụ'],
    ], steps, position, settings),
  };

  for (const mount of document.querySelectorAll('[data-sim]')) {
    const id = mount.dataset.sim;
    const lesson = lessons[id];
    const graphic = graphics[id];
    mount.className = 'sim';
    mount.setAttribute('role', 'group');
    mount.setAttribute('aria-labelledby', `sim-${id}-title`);
    mount.innerHTML = `
      <div class="sim-h">
        <div class="ttl" id="sim-${id}-title">${lesson.title}<small>${lesson.subtitle}</small></div>
        <div class="sim-ctl">
          <label>Tình huống <select>${lesson.scenarios.map(([label]) => `<option>${label}</option>`).join('')}</select></label>
          <button type="button" data-action="reset">Làm lại</button>
          <button type="button" data-action="back">Bước trước</button>
          <button type="button" class="primary" data-action="next">Bước tiếp ▶</button>
        </div>
      </div>
      ${graphic ? '<div class="sim-illustration" aria-hidden="true"></div>' : ''}
      <ol class="sim-path" aria-label="Các bước mô phỏng"></ol>
      <p class="sim-note" role="status"></p>
      <dl class="sim-state"></dl>`;

    const select = mount.querySelector('select');
    const illustration = mount.querySelector('.sim-illustration');
    const path = mount.querySelector('.sim-path');
    const state = mount.querySelector('.sim-state');
    const note = mount.querySelector('.sim-note');
    const reset = mount.querySelector('[data-action="reset"]');
    const back = mount.querySelector('[data-action="back"]');
    const next = mount.querySelector('[data-action="next"]');
    let position = -1;

    function render() {
      const [, steps, settings = {}] = lesson.scenarios[select.selectedIndex];
      if (graphic) illustration.innerHTML = graphic(steps, position, settings);
      path.innerHTML = steps.map(([title], index) => {
        const current = index === position ? ' aria-current="step"' : '';
        const complete = index < position ? ' class="done"' : '';
        return `<li${current}${complete}>${title}</li>`;
      }).join('');
      const values = steps[position]?.[2];
      state.innerHTML = lesson.fields.map((field, index) => (
        `<div><dt>${field}</dt><dd>${values?.[index] ?? '—'}</dd></div>`
      )).join('');
      note.textContent = position < 0
        ? 'Bạn dự đoán điều gì xảy ra ở bước đầu? Bấm Bước tiếp để xem.'
        : `Bước ${position + 1}/${steps.length} · ${steps[position][1]}`;
      back.disabled = position < 0;
      reset.disabled = position < 0;
      next.disabled = position === steps.length - 1;
    }

    select.addEventListener('change', () => { position = -1; render(); });
    reset.addEventListener('click', () => { position = -1; render(); next.focus(); });
    back.addEventListener('click', () => {
      position -= 1;
      render();
      if (back.disabled) next.focus();
    });
    next.addEventListener('click', () => {
      position += 1;
      render();
      if (next.disabled) back.focus();
    });
    render();
  }
})();
