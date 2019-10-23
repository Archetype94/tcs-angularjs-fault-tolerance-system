console.log('Initializing...')

const
  MongoClient = require('mongodb').MongoClient,
  express = require('express'),
  app = express()

var
  db

try {
  MongoClient.connect('mongodb://localhost/',
    function (error, client) {
      if (error)
        console.error(error)
      else {
        db = client.db('tcs-fault-tolerance-system')
      }
    })
}
catch (error) {
  console.error(error)
}

app.use('/', express.static(__dirname))

app.get('/', function (req, res) {
  res.render('index')
})
app.get('/*', function (req, res) {
  res.sendFile(__dirname)
})

app.listen(8081, function () {
  console.log('Server has successfully started')
})
