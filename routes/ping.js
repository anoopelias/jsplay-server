module.exports = function(req, res) {
    const name = req.query.name || '<Unknown>';
    console.log('Responding to ping from', name);
    res.send('Response to ping for ' + name + ' at ' + new Date());
};
