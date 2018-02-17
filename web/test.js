(function() {
    async function readInput(filename) {
        const input = await $.get(filename);
        const lines = input.split('\n');
        const length = parseInt(lines.shift());
        console.log('length', length);
        let points = [];

        for (let i=0; i<length; i++) {
            let line = lines[i];
            let values = line.split(' ').filter(val => val.length);
            points.push({
                x: values[0],
                y: values[1],
            })
        }
        return {
            points: points,
            length: length,
        };
    }

    function errMessage(err) {
        let message = '';
        if (!err) {
            return message;
        }

        if (err.message) {
            message += err.message;
        }

        if (err.stack) {
            message += '\n' + err.stack;
        }

        return message;
    }

    readInput('input8.txt').then(input => {
        const startTime = performance.now();
        const startMem = performance.memory.usedJSHeapSize;
        let error = false;

        try {
            if (typeof collinear) {
                collinear(input);
            } else {
                throw Error('Function collinear not found');
            }
        } catch (err) {
            console.info('::::ERROR::::' + errMessage(err));
            console.info('::::END::::');
            error = true;
        }

        if (!error) {
            const mem = performance.memory.usedJSHeapSize - startMem;
            const time = performance.now() - startTime;

            console.info('::::TIME::::', time);
            console.info('::::MEMORY::::', mem);
            console.info('::::END::::', mem);
        }
    });

})();

