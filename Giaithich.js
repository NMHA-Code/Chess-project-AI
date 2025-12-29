// ====== Globals & UI elements ======
var board = null;
// board: sẽ chứa instance của Chessboard.js (UI bàn cờ). Khởi null vì chưa khởi tạo.

var game = new Chess();
// game: instance của chess.js (logic cờ). Tham khảo: https://github.com/jhlywa/chess.js
// chess.js chịu trách nhiệm luật chơi, FEN, PGN, move(), undo(), in_checkmate(), moves({verbose:true})...

var gameOver = false;
// gameOver: flag cờ đã kết thúc (dùng để chặn thao tác UI).

var timerInterval = null;
// timerInterval: lưu ID trả về từ setInterval để có thể clearInterval khi cần.

var timeLeft = 0;
// timeLeft: số giây còn lại trong ván (được set khi start).

var thinking = false;
// thinking: đánh dấu AI đang tính toán (tránh gọi nhiều lần).

// Map dùng để lưu trạng thái bàn cờ nhé, kiểu nút undo ấy
var tt = new Map();
// tt (transposition table): ES6 Map dùng cache giá trị evaluate của các trạng thái (key: fen_depth_side).
// Tăng tốc minimax bằng memoization. Key thường là position.fen() + '_' + depth + '_' + side.

var statusEl = document.getElementById('status');
// statusEl: DOM element hiển thị trạng thái ván (id="status"). API: document.getElementById (DOM chuẩn).

var fenEl = document.getElementById('fen');
// fenEl: DOM element để show FEN string.

var pgnEl = document.getElementById('pgn');
// pgnEl: DOM element để show PGN (chuỗi nước đi).

var timerEl = document.getElementById('timer');
// timerEl: DOM element hiển thị đồng hồ ván.

var modeSelect = document.getElementById('mode');
// modeSelect: select control để chọn mode (ví dụ 'pvp' hoặc 'pvc').

var diffSelect = document.getElementById('difficulty');
// diffSelect: select control chọn độ khó (độ sâu search cho AI).

var timeSelect = document.getElementById('time');
// timeSelect: select control chọn thời gian ván (phút).

var startBtn = document.getElementById('startBtn');
// startBtn: nút bắt đầu ván (id="startBtn").

var undoBtn = document.getElementById('undoBtn');
// undoBtn: nút undo.

var flipBtn = document.getElementById('flipBtn');
// flipBtn: nút lật bàn cờ (Chessboard.js cung cấp .flip()).

var playerSideSelect = document.getElementById('playerSide');
// playerSideSelect: select để chọn người chơi là 'white' hay 'black'.

var capturedByWhiteEl = document.getElementById('capturedByWhite');
// capturedByWhiteEl: vùng hiển thị các quân bị Trắng bắt.

var capturedByBlackEl = document.getElementById('capturedByBlack');
// capturedByBlackEl: vùng hiển thị các quân bị Đen bắt.

// Unicode để hiển thị quân (dùng cho vùng captured, không ảnh hưởng chessboard images)
var PIECE_UNI = { p: { w: '♙', b: '♟' }, n: { w: '♘', b: '♞' }, b: { w: '♗', b: '♝' }, r: { w: '♖', b: '♜' }, q: { w: '♕', b: '♛' }, k: { w: '♔', b: '♚' } };
// PIECE_UNI: map loại quân -> ký tự Unicode cho Trắng/Đen. Tiện dùng khi không muốn dùng ảnh.

var pieceValue = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };
// pieceValue: giá trị heuristic cho mỗi loại quân dùng trong evaluatePosition.
// Lưu ý: các giá trị chuẩn tham khảo (pawn ~100, knight ~320...). King có giá trị lớn để tránh mất king.

// ====== Chessboard config (with highlighting) ======
var config = {
  draggable: true, // cho phép kéo/thả quân (chessboard.js)
  position: 'start', // đặt vị trí khởi tạo (start = setup ban đầu)
  onDragStart: onDragStart, // callback khi bắt đầu kéo (định nghĩa phía dưới)
  onDrop: onDrop, // callback khi thả (định nghĩa phía dưới)
  onSnapEnd: onSnapEnd, // callback khi animation "snap" kết thúc
  onMouseoverSquare: onMouseoverSquare, // hover ô (để show moves)
  onMouseoutSquare: onMouseoutSquare // rời ô (clear highlight)
};
// config: object truyền vào Chessboard('board', config). Thư viện UI đề xuất các callback này.

board = Chessboard('board', config);
// board: khởi tạo Chessboard.js trên element có id 'board'.
// Chessboard.js chịu trách nhiệm vẽ bàn, các ô, ảnh quân, xử lý drag & drop UI.
// Tham khảo: https://chessboardjs.com/ hoặc repo tương tự.

// ====== UI events ======
modeSelect.addEventListener('change', function () {
  diffSelect.disabled = (modeSelect.value !== 'pvc');
});
// Khi mode thay đổi: nếu không phải 'pvc' thì disable chọn difficulty.
// Sử dụng DOM addEventListener (sự kiện 'change').

startBtn.addEventListener('click', function () {
  clearInterval(timerInterval);
  // stop bất kỳ interval timer cũ (để tránh chồng interval khi ấn start nhiều lần)

  tt.clear();
  // xóa cache transposition table khi bắt đầu ván mới để tránh dùng giá trị cũ.

  game = new Chess();
  // reset lại chess.js state (ván mới)

  gameOver = false;
  // đánh dấu ván chưa kết thúc

  board.start();
  // Chessboard.js: set board về vị trí 'start' (hàm helper của library)

  clearHighlights();
  // xóa mọi highlight (hàm tự định nghĩa)

  updateDisplay();
  // update FEN/PGN/status/captured lên UI

  var totalMinutes = parseInt(timeSelect.value);
  // lấy giá trị phút từ select; parseInt để convert string -> số

  timeLeft = totalMinutes * 60;
  // set timeLeft bằng số giây

  updateTimerDisplay();
  // cập nhật hiển thị đồng hồ ngay lập tức

  timerInterval = setInterval(function () {
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      // dừng timer khi hết giờ

      gameOver = true;
      // đánh dấu ván kết thúc do hết giờ

      statusEl.innerText = 'Trạng thái: Hết giờ! Hòa cờ.';
      // cập nhật status UI (có thể điều chỉnh logic: ai thua khi hết giờ tuỳ luật)

      return;
    }
    timeLeft--;
    // giảm 1 giây

    updateTimerDisplay();
    // cập nhật UI mỗi giây
  }, 1000);
  // setInterval chạy mỗi 1000ms (1s)

  if (modeSelect.value === 'pvc' && playerSideSelect.value === 'black') {
    setTimeout(requestAIMove, 200);
    // nếu người chơi chọn chơi Đen (AI là Trắng) thì AI cần đi trước.
    // setTimeout để cho UI render trước khi AI tính (200ms).
  }
});

undoBtn.addEventListener('click', function () {
  safeUndo();
  // gọi hàm safeUndo() để undo phù hợp (PvC undo 2 nước, PvP undo 1 nước)
});

flipBtn.addEventListener('click', function () {
  board.flip();
  // Chessboard.js: flip() lật orientation bàn cờ 180 độ.
});

// ====== Drag/Drop handlers ======
// khi cầm lên lấy dữ liệu nhé source lưu vị trí cũ (vd: e2), price(vd: wP)
function onDragStart(source, piece, position, orientation) {
  if (gameOver || game.game_over()) return false;
  // nếu ván đã kết thúc (flag hoặc chess.js báo) thì cấm kéo -> trả false cho chessboard.

  if ((game.turn() === 'w' && piece.charAt(0) === 'b') ||
    (game.turn() === 'b' && piece.charAt(0) === 'w')) {
    return false;
  }
  // kiểm tra lượt: nếu hiện là lượt Trắng nhưng cố kéo quân Đen (hoặc ngược lại) thì cấm.

  if (modeSelect.value === 'pvc') {
    var playerSide = playerSideSelect.value;
    if ((piece.charAt(0) === 'w' && playerSide === 'black') ||
      (piece.charAt(0) === 'b' && playerSide === 'white')) {
      return false;
    }
  }
  // nếu chế độ PvC và quân bạn kéo không thuộc màu người chơi (ví dụ bạn chọn black nhưng kéo white) -> cấm.

  // add piece highlight on drag start (highlight the piece being dragged)
  var sq = source;
  var sqEl = document.querySelector('.square-' + sq);
  if (sqEl) {
    var img = sqEl.querySelector('img.piece');
    if (img) img.classList.add('piece-highlight');
  }
  // thao tác DOM: tìm ô bằng class '.square-e2' (chessboard.js tạo class dạng này)
  // rồi thêm class 'piece-highlight' cho img.piece để style CSS (ví dụ thêm shadow).

  return true;
  // cho phép kéo
}

// khi thả xuống mới lấy dữ liệu nhé source lưu vị trí cũ (vd: e2), target lưu vị trí mới(vd: e4)
function onDrop(source, target) {
  clearHighlights();
  // xóa highlight tạm trước khi xử lý nước đi

  var move = game.move({ from: source, to: target, promotion: 'q' });
  // gọi chess.js move bằng object {from, to, promotion}
  // promotion: 'q' là mặc định thăng chức thành hậu nếu có (bạn có thể thay UI chọn promotion).

  if (move === null) return 'snapback';
  // nếu move bất hợp lệ chess.js trả null, trả 'snapback' cho Chessboard.js để trả quân về ô cũ.

  board.position(game.fen());
  // cập nhật UI chessboard theo FEN mới từ chess.js để chắc chắn UI khớp logic.

  updateDisplay();
  // cập nhật FEN/PGN/status/captured

  tt.clear();
  // xóa cache transposition table vì state đã thay đổi (không hợp lệ với cache cũ).

  if (modeSelect.value === 'pvc' && !game.game_over()) {
    requestAIMove();
    // nếu PvC và ván chưa kết thúc, gọi AI đi.
  }
}

function onSnapEnd() {
  // remove piece highlights after snap end
  document.querySelectorAll('img.piece.piece-highlight').forEach(img => img.classList.remove('piece-highlight'));
  // xóa class highlight trên các ảnh quân (reset UI)

  board.position(game.fen());
  // set lại position UI từ FEN (đảm bảo đồng bộ sau animation)
}

// ====== Highlight functions ======
var lastMoveSquares = [];
// lastMoveSquares: lưu 2 ô [from,to] của nước đi gần nhất để highlight.

function onMouseoverSquare(square, piece) {
  if (game.game_over()) return;
  if (!piece) return;
  // nếu ván kết thúc hoặc ô không có quân thì không show moves

  if (modeSelect.value === 'pvc') {
    var playerSide = playerSideSelect.value;
    if ((piece.charAt(0) === 'w' && playerSide === 'black') ||
      (piece.charAt(0) === 'b' && playerSide === 'white')) return;
  }
  // nếu PvC và quân không thuộc người chơi (ví dụ rê quân AI) thì return

  showPossibleMoves(square);
  // gọi hàm showPossibleMoves để highlight các ô đến
}

function onMouseoutSquare(square, piece) {
  clearHighlights();
  lastMoveSquares.forEach(sq => {
    var el = document.querySelector('.square-' + sq);
    if (el) el.classList.add('last-move');
  });
  // khi out: clear highlight tạm, nhưng nếu có lastMoveSquares thì phục hồi class 'last-move' cho chúng.
}

function showPossibleMoves(square) {
  clearHighlights();
  // xóa highlight trước khi vẽ highlight mới

  var moves = game.moves({ square: square, verbose: true });
  // chess.js: lấy danh sách nước đi hợp lệ cho ô 'square'; verbose:true trả object chi tiết gồm 'to','san','captured'...

  if (!moves || moves.length === 0) return;
  // nếu không có nước đi hợp lệ thì thôi

  var fromEl = document.querySelector('.square-' + square);
  if (fromEl) {
    fromEl.classList.add('highlight');
    var img = fromEl.querySelector('img.piece');
    if (img) img.classList.add('piece-highlight'); // <-- highlight the piece itself
  }
  // highlight ô nguồn và ảnh quân

  moves.forEach(m => {
    var toEl = document.querySelector('.square-' + m.to);
    if (!toEl) return;
    toEl.classList.add('highlight');
    var dot = document.createElement('div');
    dot.className = 'highlight-dot';
    toEl.appendChild(dot);
  });
  // với mỗi ô đích, thêm class 'highlight' và chèn một div.dot để hiển thị chấm (dot).
  // CSS cần định nghĩa cho .highlight và .highlight-dot.
}

function clearHighlights() {
  document.querySelectorAll('.square-55d63.highlight').forEach(el => el.classList.remove('highlight'));
  // xóa class highlight khỏi các ô. Lưu ý: '.square-55d63' là prefix class do Chessboard.js tạo.
  // Nếu bạn dùng phiên bản khác, kiểm tra DOM class prefix hoặc sử dụng selector khác ổn định hơn.

  document.querySelectorAll('.square-55d63 .highlight-dot').forEach(el => el.remove());
  // remove tất cả highlight-dot đã append

  document.querySelectorAll('.square-55d63.last-move').forEach(el => el.classList.remove('last-move'));
  // xóa class last-move

  // remove piece highlight class from all piece images
  document.querySelectorAll('img.piece.piece-highlight').forEach(img => img.classList.remove('piece-highlight'));
  // remove class piece-highlight khỏi tất cả ảnh quân
}

function highlightLastMove(moveObj) {
  clearHighlights();
  lastMoveSquares = [moveObj.from, moveObj.to];
  lastMoveSquares.forEach(sq => {
    var el = document.querySelector('.square-' + sq);
    if (el) el.classList.add('last-move');
  });
  // lưu hai ô last move và thêm class 'last-move' để style khác (ví dụ background sáng)
}

// ====== Display & captured pieces ======
function updateDisplay() {
  fenEl.innerText = 'FEN: ' + game.fen();
  // hiển thị FEN hiện tại. FEN = Forsyth-Edwards Notation (chuẩn mô tả board).

  var pgn = game.history().length > 0 ? game.pgn() : '';
  // nếu có lịch sử nước đi, lấy PGN (game.pgn()) — Portable Game Notation.

  pgnEl.innerText = 'PGN: ' + pgn;
  updateStatus();
  updateCaptured();
  // cập nhật status và captured pieces
}

function updateStatus() {
  if (game.in_checkmate()) {
    var winner = (game.turn() === 'w') ? 'Đen' : 'Trắng';
    // Nếu in_checkmate() true thì bên sắp đi là bên thua, nên winner = bên còn lại.
    statusEl.innerText = 'Trạng thái: Chiếu hết! ' + winner + ' thắng.';
    gameOver = true;
    clearInterval(timerInterval);
  } else if (game.in_draw() || game.in_stalemate() || game.in_threefold_repetition() || game.insufficient_material()) {
    statusEl.innerText = 'Trạng thái: Hòa!';
    gameOver = true;
    clearInterval(timerInterval);
  } else {
    var turnColor = (game.turn() === 'w') ? 'Trắng' : 'Đen';
    statusEl.innerText = 'Trạng thái: ' + turnColor + ' đi lượt kế' + (game.in_check() ? ' (đang chiếu)!' : '.');
  }
  // updateStatus dùng các API chess.js: in_checkmate(), in_check(), in_draw(), in_stalemate(),
  // in_threefold_repetition(), insufficient_material(), game.turn()...
}

function updateTimerDisplay() {
  var minutes = Math.floor(timeLeft / 60);
  var seconds = timeLeft % 60;
  timerEl.innerText = 'Thời gian còn lại: ' + minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
  // format MM:SS, với padding số 0 cho giây < 10
}

function updateCaptured() {
  var moves = game.history({ verbose: true });
  // history({verbose:true}) trả mảng các move object với property captured (nếu có).

  var capturedByWhite = [];
  var capturedByBlack = [];

  moves.forEach(m => {
    if (m.captured) {
      if (m.color === 'w') capturedByWhite.push({ type: m.captured, color: 'b' });
      else capturedByBlack.push({ type: m.captured, color: 'w' });
    }
  });
  // Duyệt lịch sử: nếu move có 'captured' thì biết quân bị bắt thuộc bên nào.
  // Lưu ý: m.color = màu bên đã đi; nếu m.color === 'w' và có m.captured thì quân bị trắng bắt là quân đen.

  capturedByWhiteEl.innerHTML = (capturedByWhite.length === 0) ? '—' :
    capturedByWhite.map(p => '<span class="cap-piece">' + PIECE_UNI[p.type][p.color === 'w' ? 'w' : 'b'] + '</span>').join('');
  // hiển thị các quân Trắng đã bắt (dùng PIECE_UNI). Nếu rỗng hiển —.

  capturedByBlackEl.innerHTML = (capturedByBlack.length === 0) ? '—' :
    capturedByBlack.map(p => '<span class="cap-piece">' + PIECE_UNI[p.type][p.color === 'w' ? 'w' : 'b'] + '</span>').join('');
  // hiển thị các quân Đen đã bắt.
}

// ====== AI code (same optimized approach) ======
function requestAIMove() {
  if (thinking) return;
  // nếu AI đang tính toán thì không gọi lại

  if (modeSelect.value !== 'pvc') return;
  // chỉ chạy AI khi ở chế độ Player vs Computer

  var playerSide = playerSideSelect.value;
  var aiColor = (playerSide === 'white') ? 'b' : 'w';
  // xác định màu AI dựa trên lựa chọn người chơi

  if (game.turn() !== aiColor) return;
  // nếu không phải lượt của AI thì return

  thinking = true;
  updateStatus();
  // đánh dấu thinking và cập nhật UI (có thể hiển thị "AI đang suy nghĩ")

  setTimeout(() => {
    try {
      var depth = parseInt(diffSelect.value) || 1;
      // depth: độ sâu search (độ khó). Default 1 nếu parse lỗi.

      var best = findBestMoveRoot(depth, game, (game.turn() === 'w'));
      // tìm best move ở root; tham số isWhite = (game.turn() === 'w')

      if (best) {
        game.move(best);
        // thực hiện nước đi bằng SAN (ở code này findBestMoveRoot trả m.san)

        board.position(game.fen());
        // cập nhật UI

        var last = game.history({ verbose: true }).slice(-1)[0];
        if (last) highlightLastMove(last);
        // highlight nước đi cuối

        tt.clear();
        // clear transposition table (ở đây tác giả chọn clear để tránh cache cũ; có thể giữ nếu muốn)

        updateDisplay();
      }
    } catch (e) {
      console.error('AI error', e);
      // log lỗi nếu xảy ra (giúp debug)
    } finally {
      thinking = false;
      updateStatus();
      // đảm bảo reset thinking và cập nhật status
    }
  }, 200);
  // setTimeout 200ms để không block UI ngay lập tức (cho animation render)
}

function findBestMoveRoot(depth, position, isWhite) {
  var moves = position.moves({ verbose: true });
  if (!moves || moves.length === 0) return null;
  // lấy danh sách nước đi hợp lệ (chess.js)

  moves.sort((a, b) => {
    var va = a.captured ? pieceValue[a.captured] : 0;
    var vb = b.captured ? pieceValue[b.captured] : 0;
    return vb - va;
  });
  // sắp xếp theo heuristic: ưu tiên các nước ăn quân giá trị lớn (move ordering giúp alpha-beta prune tốt hơn)

  var bestMove = null;
  var bestValue = isWhite ? -Infinity : Infinity;
  // nếu AI là trắng thì maximize, ngược lại minimize

  for (var i = 0; i < moves.length; i++) {
    var m = moves[i];
    position.move(m.san);
    // thực hiện thử nước đi (chess.js hỗ trợ move bằng SAN). Lưu ý bạn cũng có thể dùng {from,to}.

    var key = position.fen() + '_' + (depth - 1) + '_' + (!isWhite);
    var value;
    if (tt.has(key)) {
      value = tt.get(key);
    } else {
      // Sau khi AI di chuyen, doi thu se di (dao luot)
      value = minimax(position, depth - 1, -Infinity, Infinity, !isWhite);
      tt.set(key, value);
    }
    // dùng transposition table để tránh tính lại cùng trạng thái-depth

    position.undo();
    // undo để trả lại position gốc

    if (isWhite) {
      // AI la Trang, muon tim gia tri lon nhat
      if (value > bestValue) {
        bestValue = value;
        bestMove = m.san;
      }
    } else {
      // AI la Den, muon tim gia tri nho nhat
      if (value < bestValue) {
        bestValue = value;
        bestMove = m.san;
      }
    }
  }
  return bestMove;
  // trả về SAN của nước best
}

// Ham minimax - Tim nuoc di tot nhat
// isMaximizing = true: Tim gia tri lon nhat (Trang)
// isMaximizing = false: Tim gia tri nho nhat (Den)
function minimax(position, depth, alpha, beta, isMaximizing) {
  var key = position.fen() + '_' + depth + '_' + isMaximizing;
  if (tt.has(key)) return tt.get(key);
  // kiểm tra cache trước khi tính

  if (depth === 0 || position.game_over()) {
    var evalScore = evaluatePosition(position);
    tt.set(key, evalScore);
    return evalScore;
  }
  // nếu leaf node hoặc game over -> evaluate và lưu cache

  var moves = position.moves({ verbose: true });
  moves.sort((a, b) => {
    var va = a.captured ? pieceValue[a.captured] : 0;
    var vb = b.captured ? pieceValue[b.captured] : 0;
    return vb - va;
  });
  // move ordering: ưu tiên nước ăn

  if (isMaximizing) {
    // Luot cua Trang - tim gia tri lon nhat
    var maxEval = -Infinity;
    for (var i = 0; i < moves.length; i++) {
      position.move(moves[i].san);
      var evalScore = minimax(position, depth - 1, alpha, beta, false);
      position.undo();

      if (evalScore > maxEval) maxEval = evalScore;
      if (evalScore > alpha) alpha = evalScore;
      if (beta <= alpha) break; // Alpha-beta pruning
    }
    tt.set(key, maxEval);
    return maxEval;
  } else {
    // Luot cua Den - tim gia tri nho nhat
    var minEval = Infinity;
    for (var i = 0; i < moves.length; i++) {
      position.move(moves[i].san);
      var evalScore = minimax(position, depth - 1, alpha, beta, true);
      position.undo();

      if (evalScore < minEval) minEval = evalScore;
      if (evalScore < beta) beta = evalScore;
      if (beta <= alpha) break; // Alpha-beta pruning
    }
    tt.set(key, minEval);
    return minEval;
  }
}
// Ghi chú: alpha-beta pruning giúp giảm số node được duyệt so với minimax thuần tuý.
// Map tt dùng để memoize, key bao gồm fen+depth+side.

function evaluatePosition(position) {
  if (position.in_checkmate()) return (position.turn() === 'w') ? -9999 : 9999;
  // nếu checkmate: trả giá trị lớn (dương/âm) để ưu tiên thắng/thua.
  // position.turn() là bên sắp đi; nếu bị checkmate thì bên sắp đi là thua.

  if (position.in_draw() || position.in_stalemate() || position.in_threefold_repetition() || position.insufficient_material()) return 0;
  // nếu hòa theo các điều kiện chess.js -> 0

  var boardState = position.board();
  // chess.js .board() trả mảng 8x8 (rows) chứa objects {type:'p',color:'w'} hoặc null

  var total = 0;
  for (var i = 0; i < 8; i++) {
    for (var j = 0; j < 8; j++) {
      var piece = boardState[i][j];
      if (piece !== null) {
        total += (piece.color === 'w') ? pieceValue[piece.type] : -pieceValue[piece.type];
      }
    }
  }
  // tổng vật liệu: trắng +, đen -

  total += (position.moves().length) * 2 * (position.turn() === 'w' ? 1 : -1);
  // thêm yếu tố mobility: số nước đi hợp lệ * hệ số 2; cộng cho bên sắp đi (gia tăng ưu thế)
  // Đây là heuristic bổ sung; có thể mở rộng bằng piece-square tables, king safety, pawn structure...

  return total;
}

function safeUndo() {
  if (modeSelect.value === 'pvc') {
    if (game.history().length >= 2) { game.undo(); game.undo(); }
    else game.undo();
  } else {
    game.undo();
  }
  // Nếu PvC: undo 2 nước để hoàn nguyên cả lượt người và lượt AI (nếu có).
  // Nếu PvP: undo 1 nước.

  tt.clear();
  // clear transposition table sau undo (cache cũ không còn hợp lệ)

  board.position(game.fen());
  // cập nhật UI theo fen sau undo

  updateDisplay();
  // cập nhật UI các vùng FEN/PGN/status/captured
}

// initial update
updateDisplay();
// gọi lần đầu để populate UI khi trang load (FEN, PGN, status, captured)
