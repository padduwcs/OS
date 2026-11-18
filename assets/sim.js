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
      ];
    });
  }

  const lessons = {
    io: {
      title: 'Ai chuyển khối dữ liệu vào RAM?',
      subtitle: 'Hai cách chuyển một khối dữ liệu trong mô hình thiết bị đơn giản.',
      fields: ['CPU', 'Controller', 'Tiến trình đọc'],
      scenarios: [
        ['Dùng DMA', [
          ['Gửi lệnh', 'Driver chuẩn bị vùng đệm và lập trình controller cho một khối dữ liệu.', ['Kernel đang gửi yêu cầu', 'Nhận lệnh', 'Đang chạy trong kernel']],
          ['Chờ dữ liệu', 'Tiến trình đọc chờ I/O. Bộ lập lịch cho ứng dụng phát nhạc chạy trên CPU.', ['Chạy ứng dụng khác', 'Lấy khối từ SSD', 'Đang chờ']],
          ['Chuyển khối', 'Phần cứng DMA ghi dữ liệu vào vùng RAM đã chuẩn bị. CPU vẫn có thể chạy ứng dụng khác.', ['Chạy ứng dụng khác', 'DMA → RAM', 'Đang chờ']],
          ['Báo hoàn tất', 'Controller phát ngắt. Trình xử lý của kernel ghi nhận I/O đã xong và đánh thức tiến trình đọc.', ['Xử lý ngắt', 'Báo kết quả', 'Sẵn sàng']],
          ['Tiếp tục', 'Khi được lập lịch, tiến trình đọc có thể nhận dữ liệu. Trong tình huống này, kernel chọn nó chạy tiếp.', ['Chạy tiến trình đọc', 'Rỗi', 'Đang chạy']],
        ]],
        ['CPU chuyển dữ liệu', [
          ['Gửi lệnh', 'Driver yêu cầu controller đọc thiết bị. Trong tình huống này, CPU sẽ chép khối từ controller vào RAM.', ['Kernel đang gửi yêu cầu', 'Nhận lệnh', 'Đang chạy trong kernel']],
          ['Chờ dữ liệu', 'Trong lúc thiết bị lấy khối vào bộ đệm cục bộ, CPU chuyển sang ứng dụng khác.', ['Chạy ứng dụng khác', 'Lấy khối từ SSD', 'Đang chờ']],
          ['Báo có dữ liệu', 'Controller phát ngắt để báo khối đã ở bộ đệm của thiết bị. CPU chuyển vào kernel.', ['Xử lý ngắt', 'Khối ở bộ đệm thiết bị', 'Đang chờ']],
          ['Chép vào RAM', 'Driver dùng CPU đọc dữ liệu qua giao diện controller và chép vào RAM. Khi đã chép xong, kernel đánh thức tiến trình đọc.', ['Kernel trực tiếp chép', 'Cấp dữ liệu qua giao diện I/O', 'Sẵn sàng']],
          ['Tiếp tục', 'Tiến trình đọc được cấp CPU. Khác biệt nằm ở chỗ CPU dành thời gian trực tiếp chuyển dữ liệu.', ['Chạy tiến trình đọc', 'Rỗi', 'Đang chạy']],
        ]],
      ],
    },
    cpu: {
      title: 'Khi nào kernel đổi tiến trình?',
      subtitle: 'Một lõi CPU, hai tiến trình A và B.',
      fields: ['Chế độ CPU', 'A', 'B'],
      scenarios: [
        ['A đợi I/O', [
          ['A đang chạy', 'A thực thi mã ứng dụng. B có thể chạy nhưng đang đợi được cấp lõi.', ['User', 'Đang chạy', 'Sẵn sàng']],
          ['A gọi read', 'Lời gọi đưa CPU vào kernel. A vẫn là tiến trình hiện tại trong bước này.', ['Kernel', 'Đang chạy trong kernel', 'Sẵn sàng']],
          ['A bị chặn', 'A cần chờ thiết bị. Kernel lưu ngữ cảnh A, chọn B rồi khôi phục ngữ cảnh B.', ['Kernel', 'Đang chờ', 'Được chọn']],
          ['B chạy', 'CPU quay về user mode để chạy mã của B trong lúc thiết bị xử lý yêu cầu của A.', ['User', 'Đang chờ', 'Đang chạy']],
          ['I/O hoàn tất', 'Ngắt thiết bị đưa CPU vào kernel và A trở lại hàng sẵn sàng. Kernel có thể cho B tiếp tục.', ['Kernel', 'Sẵn sàng', 'Đang bị ngắt tạm thời']],
          ['B tiếp tục', 'Trong ví dụ này, kernel trả CPU cho B. Có đổi chế độ, và không cần chuyển sang tiến trình khác sau ngắt.', ['User', 'Sẵn sàng', 'Đang chạy']],
        ]],
        ['A chạy đến hết lượt', [
          ['Chuẩn bị timer', 'Kernel đặt timer cho lượt chạy của A. B đang ở hàng sẵn sàng.', ['Kernel', 'Được chọn', 'Sẵn sàng']],
          ['A chạy', 'CPU về user mode. A thực hiện tính toán và chưa yêu cầu thiết bị.', ['User', 'Đang chạy', 'Sẵn sàng']],
          ['Timer phát ngắt', 'CPU vào kernel ngay cả khi A chưa tự nhường CPU. Tại đây vẫn chưa có quyết định đổi tiến trình.', ['Kernel', 'Đang bị ngắt tạm thời', 'Sẵn sàng']],
          ['Chọn B', 'Chính sách của ví dụ đưa A trở về hàng sẵn sàng và cho B lượt tiếp theo.', ['Kernel', 'Sẵn sàng', 'Được chọn']],
          ['B chạy', 'Kernel chuẩn bị timer cho B, khôi phục trạng thái của B và trở về user mode.', ['User', 'Sẵn sàng', 'Đang chạy']],
        ]],
      ],
    },
    cache: {
      title: 'Khối nào còn trong cache?',
      subtitle: 'Cache bắt đầu rỗng. Khi đầy, loại khối lâu nhất chưa dùng (LRU).',
      fields: ['Cache từ cũ đến mới', 'Lần đọc này', 'Hit / tổng số lần đọc'],
      scenarios: [
        ['2 ô · A, B, A, C, B', cacheTrace(['A', 'B', 'A', 'C', 'B'], 2)],
        ['3 ô · A, B, A, C, B', cacheTrace(['A', 'B', 'A', 'C', 'B'], 3)],
      ],
    },
    syscall: {
      title: 'Theo dấu lời gọi mở tệp',
      subtitle: 'Chọn quyền của tiến trình và theo dõi điều gì được trả về.',
      fields: ['Chế độ CPU', 'Yêu cầu', 'Kết quả'],
      scenarios: [
        ['Được phép đọc', [
          ['Ứng dụng gọi API', 'Chương trình gọi hàm open với đường dẫn và cờ chỉ đọc.', ['User', 'open(ghichu.txt, O_RDONLY)', 'Chưa có']],
          ['Vào kernel', 'Thư viện chuẩn bị lời gọi. CPU đổi chế độ và kernel xác định trình xử lý.', ['Kernel', 'Mở tệp với quyền đọc', 'Chưa có']],
          ['Kiểm tra quyền', 'Kernel tra đường dẫn, xác định tệp và kiểm tra quyền của tiến trình.', ['Kernel', 'Đọc được phép', 'Chưa trả về']],
          ['Gán mô tả tệp', 'Kernel đặt đối tượng tệp đã mở vào bảng mô tả của tiến trình. Trong ví dụ, số 3 còn trống.', ['Kernel', 'Cài mô tả tệp', 'fd = 3']],
          ['Trả về', 'Ứng dụng nhận số 3. Nó có thể dùng số đó ở lần gọi read sau.', ['User', 'open hoàn tất', '3']],
        ]],
        ['Bị từ chối', [
          ['Ứng dụng gọi API', 'Chương trình gọi cùng một hàm open với cùng đường dẫn.', ['User', 'open(ghichu.txt, O_RDONLY)', 'Chưa có']],
          ['Vào kernel', 'CPU đổi chế độ theo cùng giao diện lời gọi. Kernel dùng danh tính của tiến trình hiện tại.', ['Kernel', 'Mở tệp với quyền đọc', 'Chưa có']],
          ['Kiểm tra quyền', 'Tệp tồn tại, nhưng quyền hiện hành không cho tiến trình đọc. Kernel dừng yêu cầu.', ['Kernel', 'Truy cập bị từ chối', 'EACCES']],
          ['Trả lỗi', 'Thư viện trả -1 và đặt errno thành EACCES. Ứng dụng có thể hiển thị lỗi và chờ người dùng chọn tệp khác.', ['User', 'open thất bại', '-1; errno = EACCES']],
        ]],
      ],
    },
    loader: {
      title: 'Chương trình bị dừng ở bước nào?',
      subtitle: 'So sánh lỗi ở lúc xây dựng với lỗi ở lúc bắt đầu chạy.',
      fields: ['Giai đoạn', 'Mã hoặc dữ liệu hiện có'],
      scenarios: [
        ['Đủ tệp và thư viện', [
          ['Biên dịch', 'Compiler tạo hai tệp đối tượng, một tệp gọi tong và một tệp định nghĩa tong.', ['Compiler', 'main.o, tinh.o']],
          ['Liên kết', 'Linker nối lời gọi tới tong và ghi phụ thuộc vào một thư viện dùng chung.', ['Linker', 'Tệp thực thi']],
          ['Nạp', 'Loader ánh xạ chương trình. Trình liên kết động tìm và chuẩn bị thư viện đã khai báo.', ['Loader và trình liên kết động', 'Mã và thư viện trong không gian địa chỉ']],
          ['Thực thi', 'Điều khiển đi tới mã khởi động của chương trình, sau đó tới main.', ['Chương trình', 'Tiến trình đang chạy']],
        ]],
        ['Thiếu tệp đối tượng', [
          ['Biên dịch', 'main đã được biên dịch. Bước xây dựng không đưa tinh.o vào đầu vào của linker.', ['Compiler', 'main.o']],
          ['Liên kết thất bại', 'Tham chiếu tới tong không có định nghĩa để liên kết. Quá trình xây dựng dừng ở linker.', ['Linker', 'Lỗi ký hiệu chưa được định nghĩa']],
        ]],
        ['Thiếu thư viện lúc chạy', [
          ['Biên dịch', 'Hai tệp đối tượng đều được tạo trong môi trường xây dựng.', ['Compiler', 'main.o, tinh.o']],
          ['Liên kết', 'Môi trường xây dựng có thư viện cần dùng. Linker tạo được tệp thực thi và ghi phụ thuộc.', ['Linker', 'Tệp thực thi']],
          ['Nạp thất bại', 'Máy đích thiếu thư viện động đã khai báo. Trình liên kết động dừng trước khi main chạy.', ['Loader và trình liên kết động', 'Lỗi thiếu thư viện dùng chung']],
        ]],
      ],
    },
    structure: {
      title: 'Một yêu cầu đọc đi qua những đâu?',
      subtitle: 'Cùng một lần đọc tệp trong hai cách tổ chức kernel.',
      fields: ['Thành phần xử lý', 'Chế độ CPU', 'Đường đi của yêu cầu'],
      scenarios: [
        ['Kernel nguyên khối', [
          ['Gửi yêu cầu', 'Ứng dụng gọi read. CPU vào kernel ở điểm vào của system call.', ['Ứng dụng → kernel', 'User → kernel', 'System call']],
          ['Tìm khối tệp', 'Hệ thống tệp tra vị trí của khối rồi gọi đường I/O trong kernel để chuyển yêu cầu cho driver.', ['Hệ thống tệp', 'Kernel', 'Lời gọi hàm trong kernel']],
          ['Đọc thiết bị', 'Driver gửi lệnh cho thiết bị. Khi nhận thông báo hoàn tất, mã trong kernel chuyển kết quả về đường đọc tệp.', ['Driver và thiết bị', 'Kernel khi chạy driver', 'Yêu cầu và ngắt thiết bị']],
          ['Trả kết quả', 'Kernel đưa dữ liệu vào vùng đệm của ứng dụng. Khi tiến trình tiếp tục, read trả số byte đã đọc.', ['Kernel → ứng dụng', 'Kernel → user', 'Trở về từ system call']],
        ]],
        ['Vi nhân', [
          ['Gửi yêu cầu', 'Thư viện gửi yêu cầu qua IPC. Vi nhân kiểm tra rồi chuyển thông điệp đến dịch vụ hệ thống tệp.', ['Ứng dụng → hệ thống tệp', 'User → kernel → user', 'Thông điệp qua vi nhân']],
          ['Tìm khối tệp', 'Dịch vụ hệ thống tệp tra vị trí của khối rồi dùng IPC để yêu cầu tiến trình driver đọc thiết bị.', ['Hệ thống tệp → driver', 'User → kernel → user', 'Thông điệp qua vi nhân']],
          ['Đọc thiết bị', 'Driver dùng quyền thiết bị đã được cấp. Vi nhân tiếp nhận ngắt và thông báo cho driver. Driver gửi kết quả cho dịch vụ tệp.', ['Driver và thiết bị', 'User cho driver, kernel cho ngắt', 'Thông báo sự kiện và IPC']],
          ['Trả kết quả', 'Dịch vụ hệ thống tệp phản hồi. Ứng dụng tiếp tục với dữ liệu và số byte đã đọc. Mỗi dịch vụ vẫn có không gian địa chỉ riêng.', ['Hệ thống tệp → ứng dụng', 'User → kernel → user', 'Phản hồi qua vi nhân']],
        ]],
      ],
    },
    boot: {
      title: 'Từ UEFI đến dịch vụ người dùng',
      subtitle: 'Ví dụ giả lập với Linux, GRUB và systemd.',
      fields: ['Đang chạy', 'Root filesystem'],
      scenarios: [
        ['Khởi động thành công', [
          ['Bật máy', 'UEFI khởi tạo đủ phần cứng và tìm mục khởi động EFI.', ['Firmware UEFI', 'Chưa gắn']],
          ['Nạp hệ thống', 'GRUB nạp ảnh kernel và initramfs vào RAM, truyền tham số rồi chuyển điều khiển.', ['GRUB', 'Chưa gắn']],
          ['Kernel khởi tạo', 'Kernel dựng bộ nhớ và ngắt. Môi trường ban đầu trong RAM nạp driver cần để truy cập ổ hệ thống.', ['Kernel và initramfs', 'Root tạm trong RAM']],
          ['Gắn root', 'Thiết bị xuất hiện. Hệ thống tìm đúng phân vùng, gắn root thật và chuyển sang nó.', ['Môi trường khởi tạo', 'Root thật đã gắn']],
          ['Chạy dịch vụ', 'systemd chạy với PID 1 và khởi động các dịch vụ đã cấu hình. Sau đó có thể đến màn hình đăng nhập.', ['systemd và dịch vụ', 'Root thật đang dùng']],
        ]],
        ['Thiếu driver ổ hệ thống', [
          ['Bật máy', 'UEFI khởi tạo phần cứng đủ để tìm và chạy GRUB.', ['Firmware UEFI', 'Chưa gắn']],
          ['Nạp hệ thống', 'GRUB đọc được kernel và initramfs bằng đường truy cập của trình nạp. Kernel bắt đầu chạy.', ['GRUB → kernel', 'Chưa gắn']],
          ['Tìm thiết bị', 'Kernel cần driver phù hợp cho bộ điều khiển. Driver cần thiết không có sẵn trong kernel hoặc initramfs của ví dụ.', ['Kernel và initramfs', 'Root tạm trong RAM']],
          ['Không tìm thấy root', 'Thiết bị chứa root không xuất hiện với kernel. Quá trình chưa thể chuyển sang root thật hay khởi động dịch vụ từ đó.', ['Môi trường khởi tạo', 'Root thật chưa gắn']],
        ]],
      ],
    },
  };

  for (const mount of document.querySelectorAll('[data-sim]')) {
    const id = mount.dataset.sim;
    const lesson = lessons[id];
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
      <ol class="sim-path" aria-label="Các bước mô phỏng"></ol>
      <p class="sim-note" role="status"></p>
      <dl class="sim-state"></dl>`;

    const select = mount.querySelector('select');
    const path = mount.querySelector('.sim-path');
    const state = mount.querySelector('.sim-state');
    const note = mount.querySelector('.sim-note');
    const reset = mount.querySelector('[data-action="reset"]');
    const back = mount.querySelector('[data-action="back"]');
    const next = mount.querySelector('[data-action="next"]');
    let position = -1;

    function render() {
      const steps = lesson.scenarios[select.selectedIndex][1];
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
