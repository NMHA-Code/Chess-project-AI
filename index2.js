// ====== Globals & UI elements ======
var board = null;
var game = new Chess();
var gameOver = false;
var timerInterval = null;
var timeLeft = 0;
var thinking = false;
// Map dùng để lưu trạng thái bàn cờ nhé, kiểu nút undo ấy
var tt = new Map();

// chess.fen() dùng để lưu vị trí hiện tại nhé
// -> 'rnbqkbnr/pppp1ppp/8/4p3/4PP2/8/PPPP2PP/RNBQKBNR b KQkq - 0 2'

//.findPiece
// Hàm này trả về một danh sách chứa các ô vuông nơi quân cờ được yêu cầu đang nằm.
// Trả về một danh sách rỗng nếu quân cờ không có trên bàn cờ.

// .get(square)
// Trả lại giá trị chứa ô vuông, trả lại undefined nếu ô đó trống

//.history([option])
// Trả ra một danh sách chứa những quân đang duy chuyển trong game, lưu các tham số chi tiết về cờ
// .move() sẽ mô tả chi tiết di chuyển của cờ

// game_over()
// Trả lại true nếu hết game 

//.load(fen: string, { skipValidation = false, preserveHeaders = false } = {})
// Làm sạch bảng và load chuỗi fen đã được cập nhật

// remove()
// di chuyển và trả về giá trị ô vuông, undefined nếu ô đó trống 

// undo()
// Lấy lại các nước đã đi từ lưu trữ nhé
var statusEl = document.getElementById('status');
var fenEl = document.getElementById('fen');
var pgnEl = document.getElementById('pgn');
var timerEl = document.getElementById('timer');
var modeSelect = document.getElementById('mode');
var diffSelect = document.getElementById('difficulty');
var timeSelect = document.getElementById('time');
var startBtn = document.getElementById('startBtn');
var undoBtn = document.getElementById('undoBtn');
var flipBtn = document.getElementById('flipBtn');
var playerSideSelect = document.getElementById('playerSide');

var capturedByWhiteEl = document.getElementById('capturedByWhite');
var capturedByBlackEl = document.getElementById('capturedByBlack');

var PIECE_UNI = { p: { w: '♙', b: '♟' }, n: { w: '♘', b: '♞' }, b: { w: '♗', b: '♝' }, r: { w: '♖', b: '♜' }, q: { w: '♕', b: '♛' }, k: { w: '♔', b: '♚' } };
var pieceValue = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

// ====== Chessboard config (with highlighting) ======
var config = {
  draggable: true,
  position: 'start',
  onDragStart: onDragStart,
  onDrop: onDrop,
  onSnapEnd: onSnapEnd,
  onMouseoverSquare: onMouseoverSquare,
  onMouseoutSquare: onMouseoutSquare
};
board = Chessboard('board', config);

// ====== UI events ======
modeSelect.addEventListener('change', function () {
  diffSelect.disabled = (modeSelect.value !== 'pvc');
});

startBtn.addEventListener('click', function () {
  clearInterval(timerInterval);
  tt.clear();
  game = new Chess();
  gameOver = false;
  board.start();
  clearHighlights();
  updateDisplay();

  var totalMinutes = parseInt(timeSelect.value);
  timeLeft = totalMinutes * 60;
  updateTimerDisplay();
  timerInterval = setInterval(function () {
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      gameOver = true;
      statusEl.innerText = 'Trạng thái: Hết giờ! Hòa cờ.';
      return;
    }
    timeLeft--;
    updateTimerDisplay();
  }, 1000);

  if (modeSelect.value === 'pvc' && playerSideSelect.value === 'black') {
    setTimeout(requestAIMove, 200);
  }
});

undoBtn.addEventListener('click', function () {
  safeUndo();
});

flipBtn.addEventListener('click', function () {
  board.flip();
});

// ====== Drag/Drop handlers ======
// khi cầm lên lấy dữ liệu nhé source lưu vị trí cũ (vd: e2), price(vd: wP)
function onDragStart(source, piece, position, orientation) {
  if (gameOver || game.game_over()) return false;

  if ((game.turn() === 'w' && piece.charAt(0) === 'b') ||
    (game.turn() === 'b' && piece.charAt(0) === 'w')) {
    return false;
  }

  if (modeSelect.value === 'pvc') {
    var playerSide = playerSideSelect.value;
    if ((piece.charAt(0) === 'w' && playerSide === 'black') ||
      (piece.charAt(0) === 'b' && playerSide === 'white')) {
      return false;
    }
  }

  // add piece highlight on drag start (highlight the piece being dragged)
  var sq = source;
  var sqEl = document.querySelector('.square-' + sq);
  if (sqEl) {
    var img = sqEl.querySelector('img.piece');
    if (img) img.classList.add('piece-highlight');
  }

  return true;
}

// khi thả xuống mới lấy dữ liệu nhé source lưu vị trí cũ (vd: e2), target lưu vị trí mới(vd: e4)
function onDrop(source, target) {
  clearHighlights();
  var move = game.move({ from: source, to: target, promotion: 'q' });
  if (move === null) return 'snapback';
  board.position(game.fen());
  updateDisplay();

  tt.clear();

  if (modeSelect.value === 'pvc' && !game.game_over()) {
    requestAIMove();
  }
}

function onSnapEnd() {
  // remove piece highlights after snap end
  document.querySelectorAll('img.piece.piece-highlight').forEach(img => img.classList.remove('piece-highlight'));
  board.position(game.fen());
}

// ====== Highlight functions ======
var lastMoveSquares = [];
function onMouseoverSquare(square, piece) {
  if (game.game_over()) return;
  if (!piece) return;
  if (modeSelect.value === 'pvc') {
    var playerSide = playerSideSelect.value;
    if ((piece.charAt(0) === 'w' && playerSide === 'black') ||
      (piece.charAt(0) === 'b' && playerSide === 'white')) return;
  }
  showPossibleMoves(square);
}

function onMouseoutSquare(square, piece) {
  clearHighlights();
  lastMoveSquares.forEach(sq => {
    var el = document.querySelector('.square-' + sq);
    if (el) el.classList.add('last-move');
  });
}

function showPossibleMoves(square) {
  clearHighlights();
  var moves = game.moves({ square: square, verbose: true });
  if (!moves || moves.length === 0) return;
  var fromEl = document.querySelector('.square-' + square);
  if (fromEl) {
    fromEl.classList.add('highlight');
    var img = fromEl.querySelector('img.piece');
    if (img) img.classList.add('piece-highlight'); // <-- highlight the piece itself
  }
  moves.forEach(m => {
    var toEl = document.querySelector('.square-' + m.to);
    if (!toEl) return;
    toEl.classList.add('highlight');
    var dot = document.createElement('div');
    dot.className = 'highlight-dot';
    toEl.appendChild(dot);
  });
}

function clearHighlights() {
  document.querySelectorAll('.square-55d63.highlight').forEach(el => el.classList.remove('highlight'));
  document.querySelectorAll('.square-55d63 .highlight-dot').forEach(el => el.remove());
  document.querySelectorAll('.square-55d63.last-move').forEach(el => el.classList.remove('last-move'));
  // remove piece highlight class from all piece images
  document.querySelectorAll('img.piece.piece-highlight').forEach(img => img.classList.remove('piece-highlight'));
}

function highlightLastMove(moveObj) {
  clearHighlights();
  lastMoveSquares = [moveObj.from, moveObj.to];
  lastMoveSquares.forEach(sq => {
    var el = document.querySelector('.square-' + sq);
    if (el) el.classList.add('last-move');
  });
}

// ====== Display & captured pieces ======
function updateDisplay() {
  fenEl.innerText = 'FEN: ' + game.fen();
  var pgn = game.history().length > 0 ? game.pgn() : '';
  pgnEl.innerText = 'PGN: ' + pgn;
  updateStatus();
  updateCaptured();
}

function updateStatus() {
  if (game.in_checkmate()) {
    var winner = (game.turn() === 'w') ? 'Đen' : 'Trắng';
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
}

function updateTimerDisplay() {
  var minutes = Math.floor(timeLeft / 60);
  var seconds = timeLeft % 60;
  timerEl.innerText = 'Thời gian còn lại: ' + minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
}

function updateCaptured() {
  var moves = game.history({ verbose: true });
  var capturedByWhite = [];
  var capturedByBlack = [];
  moves.forEach(m => {
    if (m.captured) {
      if (m.color === 'w') capturedByWhite.push({ type: m.captured, color: 'b' });
      else capturedByBlack.push({ type: m.captured, color: 'w' });
    }
  });
  capturedByWhiteEl.innerHTML = (capturedByWhite.length === 0) ? '—' :
    capturedByWhite.map(p => '<span class="cap-piece">' + PIECE_UNI[p.type][p.color === 'w' ? 'w' : 'b'] + '</span>').join('');
  capturedByBlackEl.innerHTML = (capturedByBlack.length === 0) ? '—' :
    capturedByBlack.map(p => '<span class="cap-piece">' + PIECE_UNI[p.type][p.color === 'w' ? 'w' : 'b'] + '</span>').join('');
}

// ====== AI code (same optimized approach) ======
function requestAIMove() {
  if (thinking) return;
  if (modeSelect.value !== 'pvc') return;
  var playerSide = playerSideSelect.value;
  var aiColor = (playerSide === 'white') ? 'b' : 'w';
  if (game.turn() !== aiColor) return;

  thinking = true;
  updateStatus();
  setTimeout(() => {
    try {
      var depth = parseInt(diffSelect.value) || 1;
      var best = findBestMoveRoot(depth, game, (game.turn() === 'w'));
      if (best) {
        game.move(best);
        board.position(game.fen());
        var last = game.history({ verbose: true }).slice(-1)[0];
        if (last) highlightLastMove(last);
        tt.clear();
        updateDisplay();
      }
    } catch (e) {
      console.error('AI error', e);
    } finally {
      thinking = false;
      updateStatus();
    }
  }, 200);
}

function findBestMoveRoot(depth, position, isWhite) {
  var moves = position.moves({ verbose: true });
  if (!moves || moves.length === 0) return null;
  moves.sort((a, b) => {
    var va = a.captured ? pieceValue[a.captured] : 0;
    var vb = b.captured ? pieceValue[b.captured] : 0;
    return vb - va;
  });

  var bestMove = null;
  var bestValue = isWhite ? -Infinity : Infinity;

  for (var i = 0; i < moves.length; i++) {
    var m = moves[i];
    position.move(m.san);
    var key = position.fen() + '_' + (depth - 1) + '_' + (!isWhite);
    var value;
    if (tt.has(key)) {
      value = tt.get(key);
    } else {
      // Sau khi AI di chuyen, doi thu se di (dao luot)
      value = minimax(position, depth - 1, -Infinity, Infinity, !isWhite);
      tt.set(key, value);
    }
    position.undo();

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
}

// Ham minimax - Tim nuoc di tot nhat
// isMaximizing = true: Tim gia tri lon nhat (Trang)
// isMaximizing = false: Tim gia tri nho nhat (Den)
function minimax(position, depth, alpha, beta, isMaximizing) {
  var key = position.fen() + '_' + depth + '_' + isMaximizing;
  if (tt.has(key)) return tt.get(key);

  if (depth === 0 || position.game_over()) {
    var evalScore = evaluatePosition(position);
    tt.set(key, evalScore);
    return evalScore;
  }

  var moves = position.moves({ verbose: true });
  moves.sort((a, b) => {
    var va = a.captured ? pieceValue[a.captured] : 0;
    var vb = b.captured ? pieceValue[b.captured] : 0;
    return vb - va;
  });

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

function evaluatePosition(position) {
  if (position.in_checkmate()) return (position.turn() === 'w') ? -9999 : 9999;
  if (position.in_draw() || position.in_stalemate() || position.in_threefold_repetition() || position.insufficient_material()) return 0;
  var boardState = position.board();
  var total = 0;
  for (var i = 0; i < 8; i++) {
    for (var j = 0; j < 8; j++) {
      var piece = boardState[i][j];
      if (piece !== null) {
        total += (piece.color === 'w') ? pieceValue[piece.type] : -pieceValue[piece.type];
      }
    }
  }
  total += (position.moves().length) * 2 * (position.turn() === 'w' ? 1 : -1);
  return total;
}

function safeUndo() {
  if (modeSelect.value === 'pvc') {
    if (game.history().length >= 2) { game.undo(); game.undo(); }
    else game.undo();
  } else {
    game.undo();
  }
  tt.clear();
  board.position(game.fen());
  updateDisplay();
}

// initial update
updateDisplay();


