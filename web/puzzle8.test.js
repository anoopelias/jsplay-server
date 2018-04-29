const puzzle8 = require('./puzzle8');
const puzzle8Lib = require('./puzzle8.lib');

function assertPath(boards) {
  for (let i = 0; i < boards.length - 1; i++) {
    if (!puzzle8Lib.isNeighbor(boards[i], boards[i + 1])) {
      return false;
    }
  }

  return true;
}

const boards3 = [{
  board: [
    [1, 5, 2],
    [4, 0, 3],
    [7, 8, 6]
  ],
  solutionSize: 5
}, {
  board: [
    [4, 1, 3],
    [7, 2, 5],
    [0, 8, 6]
  ],
  solutionSize: 7
}, {
  board: [
    [1, 3, 5],
    [4, 0, 2],
    [7, 8, 6]
  ],
  solutionSize: 7
}, {
  board: [
    [0, 4, 3],
    [2, 1, 5],
    [7, 8, 6]
  ],
  solutionSize: 9
}, ];

const boards4 = [{
  board: [
    [5, 1, 2, 4],
    [9, 6, 3, 8],
    [0, 11, 7, 12],
    [13, 10, 14, 15]
  ],
  solutionSize: 11
}, {
  board: [
    [1, 2, 0, 3],
    [5, 6, 7, 4],
    [9, 10, 12, 8],
    [13, 14, 11, 15]
  ],
  solutionSize: 7
}, {
  board: [
    [1, 2, 3, 4],
    [5, 6, 7, 8],
    [9, 11, 0, 14],
    [13, 10, 15, 12]
  ],
  solutionSize: 9
}, {
  board: [
    [1, 7, 2, 4],
    [5, 0, 3, 8],
    [9, 6, 10, 12],
    [13, 14, 11, 15]
  ],
  solutionSize: 9
}, ];

describe('8 Puzzle', () => {
  it('should solve a 3x3 board', () => {
    const input = {};
    input.board = [
      [0, 1, 3],
      [4, 2, 5],
      [7, 8, 6]
    ];
    const output = puzzle8(input);

    output.push(puzzle8Lib.finalBoard(input.board.length));
    expect(output.length).toEqual(5);
    assertPath(output);
  });

  it('should return null for a board that cannot be solved', () => {
    const input = {};
    input.board = [
      [0, 1, 3],
      [4, 5, 2],
      [7, 8, 6]
    ];
    const output = puzzle8(input);
    expect(output).toEqual(null);
  });

  it('should solve a single element board', () => {
    const input = {};
    input.board = [
      [0]
    ];
    const output = puzzle8(input);
    expect(output).toEqual([]);
  });

  it('should solve a board of size 2', () => {
    const input = {};
    input.board = [
      [3, 1],
      [2, 0]
    ];
    const output = puzzle8(input);

    output.push(puzzle8Lib.finalBoard(input.board.length));
    expect(output.length).toEqual(5);
    assertPath(output);
  });

  it('should return empty array for a solved board', () => {
    const input = {};
    input.board = [
      [1, 2, 3],
      [4, 5, 6],
      [7, 8, 0]
    ];
    const output = puzzle8(input);
    expect(output).toEqual([]);
  });

  it('should solve size 3 board tests', () => {
    for (let i = 0; i < boards3.length; i++) {
      const board3 = boards3[i];
      console.log('Running', i, board3.board);
      const output = puzzle8({
        board: board3.board
      });

      output.push(puzzle8Lib.finalBoard(board3.board.length));
      expect(output.length).toEqual(board3.solutionSize);
      assertPath(output);
    }
  });

  it('should solve size 4 board tests', () => {
    for (let i = 0; i < boards4.length; i++) {
      const board4 = boards4[i];
      console.log('Running', i, board4.board);
      const output = puzzle8({
        board: board4.board
      });

      output.push(puzzle8Lib.finalBoard(board4.board.length));
      expect(output.length).toEqual(board4.solutionSize);
      assertPath(output);
    }
  });

});
