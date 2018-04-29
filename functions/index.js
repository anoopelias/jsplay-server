const functions = require('firebase-functions');

exports.ping = functions.https.onRequest((req, res) => {
  const name = req.query.name || '<Unknown>';

  console.log('Responding to ping from', name);
  return res.send('Response to ping for ' + name + ' at ' + new Date());
});

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//  response.send("Hello from Firebase!");
// });
