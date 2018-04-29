
const puzzle8Lib = require('./puzzle8.lib');
const size = process.argv[2] || 3;
const moves = process.argv[3] || 5;

// Fisher-Yates shuffle
function shuffle(array) {
  var currentIndex = array.length, temporaryValue, randomIndex;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}

function copy(board) {
  const newBoard = [];
  for(let i=0; i<board.length; i++) {
    newBoard.push(board[i].slice());
  }

  return newBoard;
}

function findZero(board) {
  for(let i=0; i<board.length; i++) {
    for(let j=0; j<board[i].length; j++) {
      if (board[i][j] === 0) {
        return [i, j];
      }
    }
  }
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

function generateBoard(size, moves) {
  let board = puzzle8Lib.finalBoard(size);

  for (let i=0; i<moves; i++) {
    let neighbors = neighborBoards(board);
    board = shuffle(neighbors).pop();
  }

  return board;
}

let board = generateBoard(size, moves);

console.log(size);
for (let i=0; i<size; i++) {
  console.log(board[i].join(' '));
}
