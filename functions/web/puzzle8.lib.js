function diff(boardA, boardB) {
  const len = boardA.length;
  const diffs = [];

  for(let i=0; i<len; i++) {
    for(let j=0; j<len; j++) {
      if(boardA[i][j] !== boardB[i][j]) {
        diffs.push([i, j]);
      }
    }
  }

  return diffs;
}

function isNeighbor(boardA, boardB) {
  const diffs = diff(boardA, boardB);

  if(diffs.length !== 2) {
    return false;
  }

  // Same row
  if (diffs[0][0] === diffs[1][0]) {
    // But not neighbors
    if (diffs[0][1] !== diffs[1][1] - 1 && diffs[0][1] !== diffs[1][1] + 1) {
      return false;
    }
  }

  // Same column
  if (diffs[0][1] === diffs[1][1]) {
    // But not neighbors
    if (diffs[0][0] !== diffs[1][0] - 1 && diffs[0][0] !== diffs[1][0] + 1) {
      return false;
    }
  }

  const valA = [
    boardA[diffs[0][0]][diffs[0][1]],
    boardA[diffs[1][0]][diffs[1][1]],
  ];

  const valB = [
    boardB[diffs[0][0]][diffs[0][1]],
    boardB[diffs[1][0]][diffs[1][1]],
  ];

  // Values has to be swapped
  if (valA[0] !== valB[1] || valA[1] !== valB[0]) {
    return false;
  }

  // One of them has to be zero
  if (valA[0] !== 0 && valA[1] !== 0) {
    return false;
  }

  return true;
}

function finalBoard(boardSize) {
  const board = [];
  let num = 1;

  for (let i=0; i<boardSize; i++) {
    board.push([]);
    for (let j=0; j<boardSize; j++) {
      board[i].push(num++);
    }
  }

  board[boardSize - 1][boardSize - 1] = 0;

  return board;
}

if (typeof module !== 'undefined') {
    module.exports = {
      diff: diff,
      isNeighbor: isNeighbor,
      finalBoard: finalBoard,
    };
}

