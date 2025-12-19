// // ====== Globals & UI elements ======
//     var board = null;
//     var game = new Chess();
//     var gameOver = false;
//     var timerInterval = null;
//     var timeLeft = 0;
//     var thinking = false;
//     var tt = new Map();

//     var statusEl = document.getElementById('status');
//     var fenEl = document.getElementById('fen');
//     var pgnEl = document.getElementById('pgn');
//     var timerEl = document.getElementById('timer');
//     var modeSelect = document.getElementById('mode');
//     var diffSelect = document.getElementById('difficulty');
//     var timeSelect = document.getElementById('time');
//     var startBtn = document.getElementById('startBtn');
//     var undoBtn = document.getElementById('undoBtn');
//     var flipBtn = document.getElementById('flipBtn');
//     var playerSideSelect = document.getElementById('playerSide');

//     var capturedByWhiteEl = document.getElementById('capturedByWhite');
//     var capturedByBlackEl = document.getElementById('capturedByBlack');

//     var PIECE_UNI = { p: {w:'♙', b:'♟'}, n:{w:'♘', b:'♞'}, b:{w:'♗', b:'♝'}, r:{w:'♖', b:'♜'}, q:{w:'♕', b:'♛'}, k:{w:'♔', b:'♚'} };
//     var pieceValue = { p:100, n:320, b:330, r:500, q:900, k:20000 };

//     // ====== Chessboard config (with highlighting) ======
//     var config = {
//       draggable: true,
//       position: 'start',
//       onDragStart: onDragStart,
//       onDrop: onDrop,
//       onSnapEnd: onSnapEnd,
//       onMouseoverSquare: onMouseoverSquare,
//       onMouseoutSquare: onMouseoutSquare
//     };
//     board = Chessboard('board', config);

//     // ====== UI events ======
//     modeSelect.addEventListener('change', function() {
//       diffSelect.disabled = (modeSelect.value !== 'pvc');
//     });

//     startBtn.addEventListener('click', function() {
//       clearInterval(timerInterval);
//       tt.clear();
//       game = new Chess();
//       gameOver = false;
//       board.start();
//       clearHighlights();
//       updateDisplay();

//       var totalMinutes = parseInt(timeSelect.value);
//       timeLeft = totalMinutes * 60;
//       updateTimerDisplay();
//       timerInterval = setInterval(function() {
//         if (timeLeft <= 0) {
//           clearInterval(timerInterval);
//           gameOver = true;
//           statusEl.innerText = 'Trạng thái: Hết giờ! Hòa cờ.';
//           return;
//         }
//         timeLeft--;
//         updateTimerDisplay();
//       }, 1000);

//       if (modeSelect.value === 'pvc' && playerSideSelect.value === 'black') {
//         setTimeout(requestAIMove, 200);
//       }
//     });

//     undoBtn.addEventListener('click', function() {
//       safeUndo();
//     });

//     flipBtn.addEventListener('click', function() {
//       board.flip();
//     });

//     // ====== Drag/Drop handlers ======
//     function onDragStart(source, piece, position, orientation) {
//       if (gameOver || game.game_over()) return false;

//       if ((game.turn() === 'w' && piece.charAt(0) === 'b') ||
//           (game.turn() === 'b' && piece.charAt(0) === 'w')) {
//         return false;
//       }

//       if (modeSelect.value === 'pvc') {
//         var playerSide = playerSideSelect.value;
//         if ((piece.charAt(0) === 'w' && playerSide === 'black') ||
//             (piece.charAt(0) === 'b' && playerSide === 'white')) {
//           return false;
//         }
//       }

//       // add piece highlight on drag start (highlight the piece being dragged)
//       var sq = source;
//       var sqEl = document.querySelector('.square-' + sq);
//       if (sqEl) {
//         var img = sqEl.querySelector('img.piece');
//         if (img) img.classList.add('piece-highlight');
//       }

//       return true;
//     }

//     function onDrop(source, target) {
//       clearHighlights();
//       var move = game.move({ from: source, to: target, promotion: 'q' });
//       if (move === null) return 'snapback';
//       board.position(game.fen());
//       updateDisplay();

//       tt.clear();

//       if (modeSelect.value === 'pvc' && !game.game_over()) {
//         requestAIMove();
//       }
//     }

//     function onSnapEnd() {
//       // remove piece highlights after snap end
//       document.querySelectorAll('img.piece.piece-highlight').forEach(img => img.classList.remove('piece-highlight'));
//       board.position(game.fen());
//     }

//     // ====== Highlight functions ======
//     var lastMoveSquares = [];
//     function onMouseoverSquare(square, piece) {
//       if (game.game_over()) return;
//       if (!piece) return;
//       if (modeSelect.value === 'pvc') {
//         var playerSide = playerSideSelect.value;
//         if ((piece.charAt(0) === 'w' && playerSide === 'black') ||
//             (piece.charAt(0) === 'b' && playerSide === 'white')) return;
//       }
//       showPossibleMoves(square);
//     }

//     function onMouseoutSquare(square, piece) {
//       clearHighlights();
//       lastMoveSquares.forEach(sq => {
//         var el = document.querySelector('.square-' + sq);
//         if (el) el.classList.add('last-move');
//       });
//     }

//     function showPossibleMoves(square) {
//       clearHighlights();
//       var moves = game.moves({ square: square, verbose: true });
//       if (!moves || moves.length === 0) return;
//       var fromEl = document.querySelector('.square-' + square);
//       if (fromEl) {
//         fromEl.classList.add('highlight');
//         var img = fromEl.querySelector('img.piece');
//         if (img) img.classList.add('piece-highlight'); // <-- highlight the piece itself
//       }
//       moves.forEach(m => {
//         var toEl = document.querySelector('.square-' + m.to);
//         if (!toEl) return;
//         toEl.classList.add('highlight');
//         var dot = document.createElement('div');
//         dot.className = 'highlight-dot';
//         toEl.appendChild(dot);
//       });
//     }

//     function clearHighlights() {
//       document.querySelectorAll('.square-55d63.highlight').forEach(el => el.classList.remove('highlight'));
//       document.querySelectorAll('.square-55d63 .highlight-dot').forEach(el => el.remove());
//       document.querySelectorAll('.square-55d63.last-move').forEach(el => el.classList.remove('last-move'));
//       // remove piece highlight class from all piece images
//       document.querySelectorAll('img.piece.piece-highlight').forEach(img => img.classList.remove('piece-highlight'));
//     }

//     function highlightLastMove(moveObj) {
//       clearHighlights();
//       lastMoveSquares = [moveObj.from, moveObj.to];
//       lastMoveSquares.forEach(sq => {
//         var el = document.querySelector('.square-' + sq);
//         if (el) el.classList.add('last-move');
//       });
//     }

//     // ====== Display & captured pieces ======
//     function updateDisplay() {
//       fenEl.innerText = 'FEN: ' + game.fen();
//       var pgn = game.history().length > 0 ? game.pgn() : '';
//       pgnEl.innerText = 'PGN: ' + pgn;
//       updateStatus();
//       updateCaptured();
//     }

//     function updateStatus() {
//       if (game.in_checkmate()) {
//         var winner = (game.turn() === 'w') ? 'Đen' : 'Trắng';
//         statusEl.innerText = 'Trạng thái: Chiếu hết! ' + winner + ' thắng.';
//         gameOver = true;
//         clearInterval(timerInterval);
//       } else if (game.in_draw() || game.in_stalemate() || game.in_threefold_repetition() || game.insufficient_material()) {
//         statusEl.innerText = 'Trạng thái: Hòa!';
//         gameOver = true;
//         clearInterval(timerInterval);
//       } else {
//         var turnColor = (game.turn() === 'w') ? 'Trắng' : 'Đen';
//         statusEl.innerText = 'Trạng thái: ' + turnColor + ' đi lượt kế' + (game.in_check() ? ' (đang chiếu)!' : '.');
//       }
//     }

//     function updateTimerDisplay() {
//       var minutes = Math.floor(timeLeft / 60);
//       var seconds = timeLeft % 60;
//       timerEl.innerText = 'Thời gian còn lại: ' + minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
//     }

//     function updateCaptured() {
//       var moves = game.history({ verbose: true });
//       var capturedByWhite = [];
//       var capturedByBlack = [];
//       moves.forEach(m => {
//         if (m.captured) {
//           if (m.color === 'w') capturedByWhite.push({ type: m.captured, color: 'b' });
//           else capturedByBlack.push({ type: m.captured, color: 'w' });
//         }
//       });
//       capturedByWhiteEl.innerHTML = (capturedByWhite.length === 0) ? '—' :
//         capturedByWhite.map(p => '<span class="cap-piece">' + PIECE_UNI[p.type][p.color==='w'?'w':'b'] + '</span>').join('');
//       capturedByBlackEl.innerHTML = (capturedByBlack.length === 0) ? '—' :
//         capturedByBlack.map(p => '<span class="cap-piece">' + PIECE_UNI[p.type][p.color==='w'?'w':'b'] + '</span>').join('');
//     }

//     // ====== AI code (same optimized approach) ======
//     function requestAIMove() {
//       if (thinking) return;
//       if (modeSelect.value !== 'pvc') return;
//       var playerSide = playerSideSelect.value;
//       var aiColor = (playerSide === 'white') ? 'b' : 'w';
//       if (game.turn() !== aiColor) return;

//       thinking = true;
//       updateStatus();
//       setTimeout(() => {
//         try {
//           var depth = parseInt(diffSelect.value) || 1;
//           var best = findBestMoveRoot(depth, game, (game.turn() === 'w'));
//           if (best) {
//             game.move(best);
//             board.position(game.fen());
//             var last = game.history({verbose:true}).slice(-1)[0];
//             if (last) highlightLastMove(last);
//             tt.clear();
//             updateDisplay();
//           }
//         } catch (e) {
//           console.error('AI error', e);
//         } finally {
//           thinking = false;
//           updateStatus();
//         }
//       }, 200);
//     }

//     function findBestMoveRoot(depth, position, isWhite) {
//       var moves = position.moves({ verbose: true });
//       if (!moves || moves.length === 0) return null;
//       moves.sort((a,b) => {
//         var va = a.captured ? pieceValue[a.captured] : 0;
//         var vb = b.captured ? pieceValue[b.captured] : 0;
//         return vb - va;
//       });

//       var bestMove = null;
//       var bestValue = -Infinity;
//       for (var i = 0; i < moves.length; i++) {
//         var m = moves[i];
//         position.move(m.san);
//         var key = position.fen() + '_' + (depth-1) + '_' + (!isWhite);
//         var value;
//         if (tt.has(key)) value = tt.get(key);
//         else {
//           value = -negamax(position, depth - 1, -Infinity, Infinity, !isWhite);
//           tt.set(key, value);
//         }
//         position.undo();
//         if (value > bestValue) {
//           bestValue = value;
//           bestMove = m.san;
//         }
//       }
//       return bestMove;
//     }

//     function negamax(position, depth, alpha, beta, isWhite) {
//       var key = position.fen() + '_' + depth + '_' + isWhite;
//       if (tt.has(key)) return tt.get(key);

//       if (depth === 0 || position.game_over()) {
//         var eval = evaluatePosition(position) * (isWhite ? 1 : -1);
//         tt.set(key, eval);
//         return eval;
//       }
//       var moves = position.moves({ verbose: true });
//       moves.sort((a,b) => {
//         var va = a.captured ? pieceValue[a.captured] : 0;
//         var vb = b.captured ? pieceValue[b.captured] : 0;
//         return vb - va;
//       });

//       var max = -Infinity;
//       for (var i = 0; i < moves.length; i++) {
//         position.move(moves[i].san);
//         var score = -negamax(position, depth - 1, -beta, -alpha, !isWhite);
//         position.undo();
//         if (score > max) max = score;
//         if (score > alpha) alpha = score;
//         if (alpha >= beta) break;
//       }
//       tt.set(key, max);
//       return max;
//     }

//     function evaluatePosition(position) {
//       if (position.in_checkmate()) return (position.turn() === 'w') ? -9999 : 9999;
//       if (position.in_draw() || position.in_stalemate() || position.in_threefold_repetition() || position.insufficient_material()) return 0;
//       var boardState = position.board();
//       var total = 0;
//       for (var i = 0; i < 8; i++) {
//         for (var j = 0; j < 8; j++) {
//           var piece = boardState[i][j];
//           if (piece !== null) {
//             total += (piece.color === 'w') ? pieceValue[piece.type] : -pieceValue[piece.type];
//           }
//         }
//       }
//       total += (position.moves().length) * 2 * (position.turn() === 'w' ? 1 : -1);
//       return total;
//     }

//     function safeUndo() {
//       if (modeSelect.value === 'pvc') {
//         if (game.history().length >= 2) { game.undo(); game.undo(); }
//         else game.undo();
//       } else {
//         game.undo();
//       }
//       tt.clear();
//       board.position(game.fen());
//       updateDisplay();
//     }

//     // initial update
//     updateDisplay();

var board = null;
    var game = new Chess();
    var gameOver = false;
    var timerInterval = null;
    var timeLeft = 0;

    // Các phần tử giao diện
    var statusEl = document.getElementById('status');
    var fenEl = document.getElementById('fen');
    var pgnEl = document.getElementById('pgn');
    var timerEl = document.getElementById('timer');
    var modeSelect = document.getElementById('mode');
    var diffSelect = document.getElementById('difficulty');
    var timeSelect = document.getElementById('time');
    var startBtn = document.getElementById('startBtn');

    // Cấu hình bàn cờ
    var config = {
      draggable: true,
      position: 'start',
      
      onDragStart: onDragStart,
      onDrop: onDrop,
      onSnapEnd: onSnapEnd
    };
    board = Chessboard('board', config);

    // Sự kiện chọn chế độ chơi: bật/tắt chọn độ khó
    modeSelect.addEventListener('change', function() {
      if (modeSelect.value === 'pvc') {
        diffSelect.disabled = false;
      } else {
        diffSelect.disabled = true;
      }
    });

    // Sự kiện nút Bắt đầu
    startBtn.addEventListener('click', function() {
      // Reset lại trạng thái trò chơi
      clearInterval(timerInterval);
      game = new Chess();
      gameOver = false;
      board.start();
      updateDisplay();
      // Thiết lập thời gian
      var totalMinutes = parseInt(timeSelect.value);
      timeLeft = totalMinutes * 60;
      updateTimerDisplay();
      // Bắt đầu đồng hồ đếm ngược
      timerInterval = setInterval(function() {
        if (timeLeft <= 0) {
          clearInterval(timerInterval);
          gameOver = true;
          statusEl.innerText = 'Trạng thái: Hết giờ! Hòa cờ.';
          return;
        }
        timeLeft--;
        updateTimerDisplay();
      }, 1000);
    });

    // Xử lý khi bắt đầu kéo một quân cờ
    function onDragStart(source, piece, position, orientation) {
      // Không được di chuyển nếu trò chơi kết thúc
      if (gameOver || game.game_over()) return false;
      // Chỉ được phép di chuyển quân của lượt đi
      if ((game.turn() === 'w' && piece.charAt(0) === 'b') ||
          (game.turn() === 'b' && piece.charAt(0) === 'w')) {
        return false;
      }
      // Nếu chơi vs Máy, không cho di chuyển quân đen
      if (modeSelect.value === 'pvc' && piece.charAt(0) === 'b') {
        return false;
      }
    }

    // Xử lý sau khi thả quân cờ
    function onDrop(source, target) {
      // Thực hiện nước đi
      var move = game.move({from: source, to: target, promotion: 'q'});
      if (move === null) return 'snapback'; // Không hợp lệ, trả về
      updateDisplay();
      // Nếu là chế độ Người vs Máy, máy đánh sau 0.5s
      if (modeSelect.value === 'pvc') {
        if (!game.game_over()) {
          window.setTimeout(makeAIMove, 500);
        }
      }
    }

    // Cập nhật bàn cờ sau khi di chuyển (cho trường hợp thăng cấp)
    function onSnapEnd() {
      board.position(game.fen());
    }

    // Cập nhật thông tin trạng thái, FEN, PGN
    function updateDisplay() {
      // Hiển thị FEN và PGN
      fenEl.innerText = 'FEN: ' + game.fen();
      var pgn = game.history().length > 0 ? game.pgn() : '';
      pgnEl.innerText = 'PGN: ' + pgn;
      // Cập nhật trạng thái trò chơi
      updateStatus();
    }

    // Cập nhật trạng thái hiện tại của ván cờ
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

    // Cập nhật hiển thị đồng hồ đếm ngược
    function updateTimerDisplay() {
      var minutes = Math.floor(timeLeft / 60);
      var seconds = timeLeft % 60;
      timerEl.innerText = 'Thời gian còn lại: ' + minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
    }

    // Thuật toán AI: minimax với alpha-beta pruning
    function makeAIMove() {
      var depth = parseInt(diffSelect.value);
      var maximizingPlayer = (game.turn() === 'w');
      var bestMove = minimax(game, depth, -Infinity, Infinity, maximizingPlayer)[0];
      if (bestMove === null) return;
      game.move(bestMove);
      board.position(game.fen());
      updateDisplay();
    }

    // Hàm đánh giá vị trí: căn cứ vào giá trị quân cờ
    function evaluatePosition(position) {
      if (position.in_checkmate()) {
        // Nếu đến lượt Trắng và bị chiếu hết, Trắng thua (-9999), ngược lại Đen thua (+9999)
        return (position.turn() === 'w') ? -9999 : 9999;
      }
      if (position.in_draw() || position.in_stalemate() || position.in_threefold_repetition() || position.insufficient_material()) {
        return 0;
      }
      var boardState = position.board();
      var values = {p: 10, n: 30, b: 30, r: 50, q: 90, k: 900};
      var total = 0;
      for (var i = 0; i < 8; i++) {
        for (var j = 0; j < 8; j++) {
          var piece = boardState[i][j];
          if (piece !== null) {
            total += (piece.color === 'w') ? values[piece.type] : -values[piece.type];
          }
        }
      }
      return total;
    }

    // Hàm Minimax với Alpha-Beta pruning
    function minimax(position, depth, alpha, beta, maximizingPlayer) {
      if (depth === 0 || position.in_checkmate() || position.in_draw()) {
        return [null, evaluatePosition(position)];
      }
      var moves = position.moves();
      var bestMove = null;
      if (maximizingPlayer) {
        var maxEval = -Infinity;
        for (var i = 0; i < moves.length; i++) {
          position.move(moves[i]);
          var result = minimax(position, depth - 1, alpha, beta, false);
          var eval = result[1];
          position.undo();
          if (eval > maxEval) {
            maxEval = eval;
            bestMove = moves[i];
          }
          alpha = Math.max(alpha, eval);
          if (beta <= alpha) {
            break; // Alpha-beta pruning
          }
        }
        return [bestMove, maxEval];
      } else {
        var minEval = Infinity;
        for (var i = 0; i < moves.length; i++) {
          position.move(moves[i]);
          var result = minimax(position, depth - 1, alpha, beta, true);
          var eval = result[1];
          position.undo();
          if (eval < minEval) {
            minEval = eval;
            bestMove = moves[i];
          }
          beta = Math.min(beta, eval);
          if (beta <= alpha) {
            break; // Alpha-beta pruning
          }
        }
        return [bestMove, minEval];
      }
    }