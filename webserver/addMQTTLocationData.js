// this will just insert the mqtt location data into the table (will let you run historical without waiting for subscribe (hence this script will end up as an insert ignore in historical.js))
// somewhere on the forums it was said the mqtt sensors won't move, so these values will be hardcoded, otherwise we'd just pull some historical MQTT data and rip the lat/long from there#

var mysql = require('mysql');

var conn = mysql.createConnection({
	host: '',
	user: '',
	password: '',
	charset: 'utf8_general_ci'
});

conn.connect(function(err) {
	if(err) throw err;
	insert();
	
});

function insert() {
	var devID = "lairdc0ee400001012345";
	var latitude = "51.281";
	var longitude = "1.0742298";
	var altitude = "8";
	var sqlInsert = "INSERT IGNORE INTO co657_02.locations (devID, latitude, longitude, altitude) VALUES ('" + devID + "','" + latitude + "','" + longitude + "','" + altitude + "')";
	console.log(sqlInsert);
	conn.query(sqlInsert, function(err) {
		if(err) throw err;
		insert2();
	});
}

function insert2() {
	var devID = "lairdc0ee4000010109f3";
	var latitude = "51.279247";
	var longitude = "1.0776373";
	var altitude = "9";
	var sqlInsert = "INSERT IGNORE INTO co657_02.locations (devID, latitude, longitude, altitude) VALUES ('" + devID + "','" + latitude + "','" + longitude + "','" + altitude + "')";
	console.log(sqlInsert);
	conn.query(sqlInsert, function(err) {
		if(err) throw err;
	});
}