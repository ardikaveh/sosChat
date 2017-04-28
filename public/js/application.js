$(function() {
	// generate unique user id
	var userId = Math.random().toString(16).substring(2,15);
	var socket = io.connect('/', {transports: ['websocket']});
	var map;

	var info = $('#infobox');
	var doc = $(document);
	var chatinput = $('#chatinput');
	var snd = new Audio("blop.wav"); // buffers automatically when created
	
	$('#chatinput').focus();
	$("#chatoutput").append("<br/></br><br/><br/><br/></br><br/>");


	$('#chatinput').bind('touchmove', function(e){
		e.preventDefault()	
	})
	
	$('#chatoutput').bind('touchend', function(e){
		window.scrollTo(0, 0);
	})

	$('#map').on('click', function(e){ 
		e.preventDefault();
		return false; 
	});

	// custom marker's icon styles
	var tinyIcon = L.Icon.extend({
		options: {
			shadowUrl: '../assets/marker-shadow.png',
			iconSize: [25, 39],
			iconAnchor:   [12, 36],
			shadowSize: [41, 41],
			shadowAnchor: [12, 38],
			popupAnchor: [0, -30]
		}
	});
	var redIcon = new tinyIcon({ iconUrl: '../assets/marker-red.png' });
	var yellowIcon = new tinyIcon({ iconUrl: '../assets/marker-yellow.png' });

	var sentData = {};

	var connects = {};
	var markers = {};
	var active = false;

	socket.on('load:coords', function(data) {
		if (!(data.id in connects)) {
			setMarker(data);
			$("html, body").animate({ scrollTop: 0 }, "fast");
		}

		connects[data.id] = data;
		connects[data.id].updated = $.now();
	});

	socket.on('load:chat', function(data) {
		setMarkerChat(data)
		snd.play();
	});


	// check whether browser supports geolocation api
	if (navigator.geolocation) {
		navigator.geolocation.getCurrentPosition(positionSuccess, positionError, { enableHighAccuracy: true });
	} else {
		$('.map').text('Your browser is out of fashion, there\'s no geolocation!');
	}

	function onLocationFound(e) {
	    var radius = e.accuracy / 2;

	    L.marker(e.latlng).addTo(map)
	        .bindPopup("You are within " + radius + " meters from this point").openPopup();

	    L.circle(e.latlng, radius).addTo(map);
	}

	function positionSuccess(position) {
		var lat = position.coords.latitude;
		var lng = position.coords.longitude;
		var acr = position.coords.accuracy;

		// mark user's position
		var userMarker = L.marker([lat, lng], {
			icon: redIcon
		});
		// uncomment for static debug
		// userMarker = L.marker([51.45, 30.050], { icon: redIcon });

		// load leaflet map
		map = L.map('map').fitWorld();
		

		L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', { minZoom: 5, maxZoom: 20, detectRetina: true }).addTo(map);

		map.locate({setView: true, maxZoom: 16});


		map.on('locationfound', onLocationFound);


		// set map bounds
		userMarker.addTo(map);
		userMarker.bindPopup('<p>You are there! Your ID is ' + userId + '</p>').openPopup();




		var emit = $.now();
		// send coords on when user is active
		doc.on('mousemove', function() {
			active = true;

			sentData = {
				id: userId,
				active: active,
				coords: [{
					lat: lat,
					lng: lng,
					acr: acr
				}]
			};

			if ($.now() - emit > 30) {
				socket.emit('send:coords', sentData);
				emit = $.now();
			}
		});

		chatinput.on("keypress", function (e){
			if (e.which == 13){
			
				var chat = $(this).val();
				active = true;
				sentData = {
					id: userId,
					active: active,
					chat: chat,
					coords: [{
						lat: lat,
						lng: lng,
						acr: acr
					}]
				};
				if ($.now() - emit > 30) {
					//alert($(this).val())	
					socket.emit('send:chat', sentData);
					emit = $.now();
				}	
				$(this).val("")
				$("#chatoutput").append("<div class='me'>" + chat + "</div>");
				setTimeout(function(){
					$('#chatoutput').scrollTop($('#chatoutput')[0].scrollHeight)
				}, 300);
			}
			
		}); 

	}

	doc.bind('mouseup mouseleave', function() {
		active = false;
	});

	// showing markers for connections
	function setMarker(data) {
		for (var i = 0; i < data.coords.length; i++) {
			var marker = L.marker([data.coords[i].lat, data.coords[i].lng], { icon: yellowIcon }).addTo(map);
			marker.bindPopup('<p>One more external user is here!</p>').openPopup();
			markers[data.id] = marker;
		}
	}

	// showing markers for connections
	function setMarkerChat(data) {
		$("#chatoutput").append("<div class='you'>" + data.id + " : " + data.chat + "</div>");
		$('#chatoutput').scrollTop($('#chatoutput')[0].scrollHeight);
		for (var i = 0; i < data.coords.length; i++) {
			var marker = L.marker([data.coords[i].lat, data.coords[i].lng], { icon: yellowIcon }).addTo(map);
			marker.bindPopup(data.chat).openPopup();
			markers[data.id] = marker;
		}
	}

	// handle geolocation api errors
	function positionError(error) {
		var errors = {
			1: 'Authorization fails', // permission denied
			2: 'Can\'t detect your location', //position unavailable
			3: 'Connection timeout' // timeout
		};
		showError('Error:' + errors[error.code]);
	}

	function showError(msg) {
		info.addClass('error').text(msg);

		doc.click(function() {
			info.removeClass('error');
		});
	}

	setTimeout(function() {
    	$('#header').slideUp('slow');

	}, 4000);

	// delete inactive users every 15 sec
	setInterval(function() {
		for (var ident in connects){
			if ($.now() - connects[ident].updated > 15000) {
				delete connects[ident];
				map.removeLayer(markers[ident]);
			}
		}
	}, 15000);
});
