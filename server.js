var http = require('http');
var Static = require('node-static');
var app = http.createServer(handler);
var io = require('socket.io').listen(app);
var port = process.env.PORT || 8080;

var files = new Static.Server('./public');

function handler (request, response) {
	request.on('end', function() {
		files.serve(request, response);
	}).resume();
}

// delete to see more logs from sockets
io.set('log level', 1);

io.sockets.on('connection', function (socket) {
	console.log(socket.conn.transport.name);
	
	socket.on('send:coords', function (data) { 
		socket.broadcast.emit('load:coords', data);		
	});

	socket.on('send:chat', function (data) { 
		socket.broadcast.emit('load:chat', data);		
	});
});

// start app on specified port
app.listen(port);
console.log('Your server goes on localhost:' + port);