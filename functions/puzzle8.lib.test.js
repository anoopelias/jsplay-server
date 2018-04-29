const puzzle8Lib = require('./puzzle8.lib.js');

describe("diff", () => {
  it("should do the diff", () => {
    const boardA = [[2, 1, 3], [4, 2, 9], [7, 8, 6]];
    const boardB = [[0, 1, 3], [4, 2, 5], [7, 8, 6]];

    const diff = puzzle8Lib.diff(boardA, boardB);
    expect(diff.length).toEqual(2);

    expect(diff[0]).toEqual([0, 0]);
    expect(diff[1]).toEqual([1, 2]);
  });
});

describe("neighbor", () => {
  it("should find a horizontal neighbor", () => {
    const boardA = [[1, 0, 3], [4, 2, 5], [7, 8, 6]];
    const boardB = [[0, 1, 3], [4, 2, 5], [7, 8, 6]];

    expect(puzzle8Lib.isNeighbor(boardA, boardB)).toEqual(true);
  });

  it("should find a vertical neighbor", () => {
    const boardA = [[1, 2, 3], [4, 0, 5], [7, 8, 6]];
    const boardB = [[1, 2, 3], [4, 8, 5], [7, 0, 6]];

    expect(puzzle8Lib.isNeighbor(boardA, boardB)).toEqual(true);
  });

  it("should not find more than 2 diffs as a neighbor", () => {
    const boardA = [[1, 0, 3], [4, 2, 5], [7, 8, 6]];
    const boardB = [[4, 1, 3], [0, 2, 5], [7, 8, 6]];

    expect(puzzle8Lib.isNeighbor(boardA, boardB)).toEqual(false);
  });

  it("should not find far away diffs in same row", () => {
    const boardA = [[0, 1, 3], [4, 2, 5], [7, 8, 6]];
    const boardB = [[3, 1, 0], [4, 2, 5], [7, 8, 6]];

    expect(puzzle8Lib.isNeighbor(boardA, boardB)).toEqual(false);
  });

  it("should make sure that the values are swapped", () => {
    const boardA = [[0, 1, 3], [4, 2, 5], [7, 8, 6]];
    const boardB = [[1, 2, 3], [4, 2, 5], [7, 8, 6]];

    expect(puzzle8Lib.isNeighbor(boardA, boardB)).toEqual(false);
  });

  it("should make sure that zero is swapped", () => {
    const boardA = [[0, 1, 3], [4, 2, 5], [7, 8, 6]];
    const boardB = [[0, 3, 1], [4, 2, 5], [7, 8, 6]];

    expect(puzzle8Lib.isNeighbor(boardA, boardB)).toEqual(false);
  });

});

describe("finalBoard", () => {
  it("should produce a final board", () => {
    const board = [[1, 2, 3], [4, 5, 6], [7, 8, 0]];

    expect(puzzle8Lib.finalBoard(3)).toEqual(board);
  });
});
