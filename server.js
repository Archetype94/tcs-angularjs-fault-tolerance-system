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
app.use(express.json())

app.get('/', function (req, res) {
  res.render('index')
})
app.get('/*', function (req, res) {
  res.sendFile(__dirname)
})

app.post('/submit', function (request, response) {
  console.log('Submit request received', request.body)

  try {
    db.collection('forms').insertOne(request.body,
      function (error, result) {
        if (error) {
          console.error('Submission invalid')
          response.status(400).send(error)
        }
        else {
          console.log('Database updated')
          response.status(200).send()
        }
      })
  }
  catch (error) {
    console.error(error)
    response.status(500).send()
  }
})

app.listen(8081, function () {
  console.log('Server has successfully started')
})
