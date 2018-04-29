
function findZero(board) {
  for(let i=0; i<board.length; i++) {
    for(let j=0; j<board[i].length; j++) {
      if (board[i][j] === 0) {
        return [i, j];
      }
    }
  }
}

function hash(board) {
  let len = board.length;
  let hash = '_';
  for(let i=0; i<len; i++) {
    for(let j=0; j<len; j++) {
      hash += board[i][j] + '_';
    }
  }

  return hash;
}

function copy(board) {
  const newBoard = [];
  for(let i=0; i<board.length; i++) {
    newBoard.push(board[i].slice());
  }

  return newBoard;
}

function isSolved(board) {
  const len = board.length;

  for(let i=0; i<len; i++) {
    for(let j=0; j<len; j++) {
      if (i === len - 1 && j === len - 1) {
        if (board[i][j] !== 0) {
          return false;
        }
      } else {
        if (board[i][j] !== (len * i) + j + 1) {
          return false;
        }
      }
    }
  }

  return true;
}

function getNeighbors(pos, len) {
  return [[pos[0] + 1, pos[1]],
    [pos[0] - 1, pos[1]],
    [pos[0], pos[1] + 1],
    [pos[0], pos[1] - 1]].filter(p => {
      return p[0] >= 0 &&
        p[0] < len &&
        p[1] >= 0 &&
        p[1] < len;
    });
}

function neighborBoards(board) {
  const zeroPos = findZero(board);
  return getNeighbors(zeroPos, board.length).map(neighborPos => {
    const neighborBoard = copy(board);

    neighborBoard[zeroPos[0]][zeroPos[1]] = board[neighborPos[0]][neighborPos[1]];
    neighborBoard[neighborPos[0]][neighborPos[1]] = 0;

    return neighborBoard;
  });
}

function puzzle8(input) {

  const queue = [{ board: input.board, prev: [] }];
  let next;

  const prevBoards = {};
  prevBoards[hash(input.board)] = true;

  // Using BFS for shortest path to solution
  while (queue.length) {
    next = queue.shift();

    if (isSolved(next.board)) {
      break;
    }
    let neighbors = neighborBoards(next.board);
    const prev = next.prev.slice();
    prev.push(next.board);

    for (let neighbor of neighbors) {
      if (!prevBoards[hash(neighbor)]) {
        prevBoards[hash(neighbor)] = true;
        queue.push({
          board: neighbor,
          prev: prev,
        })
      }
    }
  }

  return next.prev;
}

if (typeof module !== 'undefined') {
    module.exports = puzzle8;
}

