
const collinear = require('./collinear');

function isEqual(pointA, pointB) {
    // console.log('isEqual', pointA.x === pointB.x && pointA.y === pointB.y);
    return pointA.x === pointB.x && pointA.y === pointB.y;
}

function outputContainsLine(output, pointA, pointB) {
    for (let line of output) {
        if (line.length === 2 &&
            line.find(point => isEqual(point, pointA)) &&
            line.find(point => isEqual(point, pointB))) {
            console.log('Returning true::::')

            return true;
        }
    }

    return false;
}

describe('Collinear', () => {
    it('should find collinear points', () => {
        const input ={};
        input.points = [
            {x: 10000, y:0},
            {x: 0, y:10000},
            {x: 3000, y:7000},
            {x: 7000, y:3000},
            {x: 20000, y:21000},
            {x: 3000, y:4000},
            {x: 14000, y:15000},
            {x: 6000, y:7000},
        ];

        const output = collinear(input);
        expect(outputContainsLine(output, {x: 10000, y: 0}, {x:0, y:10000}))
            .toEqual(true);
        expect(outputContainsLine(output, {x: 3000, y: 4000}, {x:20000, y:21000}))
            .toEqual(true);
    });
});
