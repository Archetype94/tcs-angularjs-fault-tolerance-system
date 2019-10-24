console.log('Initializing...')

const
  MongoClient = require('mongodb').MongoClient,
  express = require('express'),
  app = express()

var
  db

tryFunction(() => {
  MongoClient.connect('mongodb://localhost/',
    (error, client) => {
      if (error)
        console.error(error)
      else {
        db = client.db('tcs-fault-tolerance-system')
        db.createCollection('forms')
        db.command({
          collMod: 'forms',
          validator: {
            $jsonSchema: {
              required: ['name']
            }
          }
        })
      }
    })
})

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

  tryUpdate(() => {
    db.collection('forms').insertOne(request.body,
      (error, result) => {
        if (error) {
          console.error('Submission invalid')
          response.status(400).send(error)
        }
        else {
          console.log('Database updated')
          response.status(200).send()
        }
      })
  })
})

app.listen(8081, function () {
  console.log('Server has successfully started')
})

function tryFunction(f) {
  try {
    return f();
  }
  catch (error) {
    console.error(error)
  }
}

function tryUpdate(f) {
  try {
    return f();
  }
  catch (error) {
    console.error(error)
    response.status(500).send()
  }
}
