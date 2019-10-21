var http = require('http')
var url = require('url')
var fs = require('fs')

http.createServer(function (req, res) {
    var pathname = url.parse(req.url, true).pathname
    var filename = "." + pathname

    if (pathname == '/') {
        filename = './index.html'
    }

    fs.readFile(filename, function (e, data) {
        if (e) {
            res.writeHead(res.statusCode, {
                'Content-Type': 'text/plain'
            })

            return res.end(e.toString())
        }

        res.writeHead(res.statusCode, {
            'Content-Type': req.headers
        })
        res.write(data)

        return res.end()
    })
}).listen(8081)

console.log('Server has successfully started')
