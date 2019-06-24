/*
	You need to install these two libraries for the mqtt and mysql:
	https://www.npmjs.com/package/mqtt this is nodej' mqtt library
	npm install mysql for nodejs' mysql library
	(THESE NODEJS LIBARIES GO IN THE DIRECTORY IN WHICH THE JS FILE IS THAT YOU WISH TO RUN
	for me, nodejs would only work if it was installed on the C drive)

	database structure:
	tables:
	locationData (ie. long lat) -- use hardware_serial for a pk?
		payloadData (ie. payload, date)
*/

var mysql = require('mysql');

var conn = mysql.createConnection({
	host: '',
	user: '',
	password: '',
	charset: 'utf8_general_ci'
});

conn.connect(function(err) {
	if(err) throw err;
	console.log("MySQL Connected!");
	var sql = "CREATE TABLE IF NOT EXISTS co657_02.locations (locationID int NOT NULL auto_increment PRIMARY KEY, town varchar(30), stationRef varchar(30),devID varchar(30) UNIQUE, latitude varchar(30) NOT NULL UNIQUE, longitude varchar(30) NOT NULL UNIQUE, altitude varchar(30))"; // we expect locations, generally, not to move
	// ^lat double, long double, alt int (changed to varchar while I work with json stuff)
	conn.query(sql, function(err) {
		if(err) throw err;
		console.log("locations table created");
	});
	sql = "CREATE TABLE IF NOT EXISTS co657_02.data (dataID int NOT NULL auto_increment PRIMARY KEY, locationID int NOT NULL, payload varchar(30), dateTime varchar(30), FOREIGN KEY (locationID) REFERENCES co657_02.locations(locationID), UNIQUE KEY(locationID, payload, dateTime))";
	conn.query(sql, function(err) {
		if(err) throw err;
		console.log("data table created");
	});
});

var mqtt = require('mqtt');
var options = {
	username: 'kentwatersensors',
	password: ''
};
var client  = mqtt.connect('mqtt://lora.kent.ac.uk', options);

client.on('connect', function() {
	console.log('MQTT Connected!');
	/**
	 *	If it keeps 'connecting' successfully check this link:
	 *	https://status.thethings.network/
	 */
	client.subscribe('kentwatersensors/devices/+/up', function() {
		client.on('message', function(topic, message, packet) {
			var json = JSON.parse(message); // message is a string
			var devID = '';
			var latitude = '';
			var longitude = '';
			var altitude = '';
			var rawPayload = '';
			var payload = '';
			var dateTime = '';
			var locationID = '';
			for(var attributeName in json) {
				console.log(attributeName+": "+ json[attributeName]);
				if(attributeName === "dev_id") {
					devID = json[attributeName];
				}
				if(attributeName === "payload_raw") {
					rawPayload = json[attributeName];
					payload = new Buffer(rawPayload, 'base64').toString('hex');
					payload = parseInt(payload, 16); // get decimal
					payload = payload/1000; // convert to m
					sqlMeta = 'SELECT distSensor FROM co657_02.metaData WHERE devID = ?'
					conn.query(sqlMeta, devID, function(err, result) {
						if(err) throw err;
						console.log("result: " + result[0].distSensor);
						payload = result[0].distSensor - payload;
						mqttCheckFlood(payload, devID);
					});
					
				}
				if(attributeName === "metadata") {
					for(var metaAttributeName in json[attributeName]) {
						if(metaAttributeName === "time") {
							dateTime = JSON.stringify(json[attributeName][metaAttributeName]);
							dateTime = dateTime.substr(1); // dateTime was starting with a " so we'll remove the first character (we could remove the " but this should be fine)
							dateTime = dateTime.slice(0, -11); // mqtt gave time with a higher accuracy than the EA, ie. it had ms, this seems unnecessary, hence we'll get rid of it
							var lastChar = dateTime[dateTime.length-1];
							if(lastChar == ".") { dateTime = dateTime.slice(0, -1); }
						}
						if(metaAttributeName === "latitude") {
							latitude = JSON.stringify(json[attributeName][metaAttributeName]);
						}
						if(metaAttributeName === "longitude") {
							longitude = JSON.stringify(json[attributeName][metaAttributeName]);
						}
						if(metaAttributeName === "altitude") {
							altitude = JSON.stringify(json[attributeName][metaAttributeName]);
						}
					}
				}
			}
			var sqlLocations = "INSERT IGNORE INTO co657_02.locations (devID, latitude, longitude, altitude) VALUES ('" + devID + "','" + latitude + "','" + longitude + "','" + altitude + "')";
			conn.query(sqlLocations, function(err) {
				console.log("lat: " + latitude);
				if(err) throw err;

				var sqlQuery = 'SELECT locationID FROM co657_02.locations WHERE latitude = ?';
				conn.query(sqlQuery, latitude, function(err, result) {
					if(err) throw err;
					for(var i = 0; i < result.length; i++) { // select returns a json it seems...
						console.log("result[i].locationID: " + result[i].locationID);
						locationID = result[i].locationID;
						console.log("locationID: " + locationID);
					}
					var sqlData = "INSERT INTO co657_02.data (locationID, payload, dateTime) VALUES ('" + locationID + "','" + payload + "','" + dateTime + "')";
					conn.query(sqlData, function(err) {
						if(err) throw err;
						console.log("MQTT data successfully added to db");
					});
				});
			});
			console.log("Received '" + message + "' on '" + topic + "'");
			console.log("packet: " + JSON.stringify(packet));
		});
	});
});

client.on('error', function(err) {
    console.log(err);
	client.end();
});

var nodemailer = require('nodemailer');

function mqttCheckFlood(payload, devID) {
	console.log(payload);
	var sqlMeta = 'SELECT distFlood FROM co657_02.metaData WHERE devID = ?';
	conn.query(sqlMeta, devID, function(err, result) {
		if(err) throw err;
		if(payload => result) {
			var warning = "flood warning";
			var sqlFlood = "INSERT INTO co657_02.floodWarnings (devID, floodWarning) VALUES ('" + devID + "','" + warning + "')";
			conn.query(sqlFlood, function(err) {
				if(err) throw err;
			});
		}
	});
}

/**
 *	This next section handles the EA api data and the DB stuff related to it..
 * 	As a sidenote, currently the data/station for lat: 51.1802705, long: 1.035354 is
 *	suspended, noted in the station field by:
 *	http://environment.data.gov.uk/flood-monitoring/def/core/statusSuspended
 *	If a station is suspended, it is now ignored as they seem to delete/have no data for it
 */

var http = require('https');

var getOptions = {
	host: 'environment.data.gov.uk',
	path: '/flood-monitoring/id/stations?riverName=Great+Stour',
	method: 'GET'
};

eaAPI(); // call once immediates when the 'server' is opened..
setInterval(eaAPI, 900000); // every 15 mins after the server is opened

function eaAPI() {
	var arr;
	var myPromise = new Promise(function(resolve, reject) {
		http.get(getOptions, function(res) {
			res.setEncoding('utf8');
			var body = '';
			res.on('data', function(chunk) {
				body += chunk;
			});
			res.on('end', function() {
				var parsed = JSON.parse(body);

				var latitude = '';
				var longitude = '';
				var payload = '';
				var dateTime = '';
				var stationRef = '';
				var stat = ''; // I think status might be a keyword so we'll use stat
				var town = '';

				arr = createArray(parsed.items.length-1, 3);
				// for some reason the array was pre-populated with "," so I'll just clear it..
				for(var i = 0; i < arr.length; i++) {
					for(var j = 0; j < arr[i].length; j++) {
						arr[i][j] = "";
					}
				}

				//console.log(parsed); // this prints the entire json, useful for debug

				for(var i in parsed.items) {
					var skip = 0;
					for(var j in parsed.items[i]) {
						if(j === "status") {
							stat = parsed.items[i][j];
							if(stat.indexOf("statusSuspended") !== -1) {
								// suspended found.. skip this iteration
								skip = 1;
							}
						}
						if(j === "lat") {
							latitude = parsed.items[i][j];
						}
						if(j === "long") {
							longitude = parsed.items[i][j];
						}
						if(j === "measures") {
							var measures = parsed.items[i][j];
							for(var k in measures) {
								for(var l in measures[k]) {
									if(l === "@id") {
										var id = JSON.stringify(measures[k][l]);
										var idNoProtocol = id.split('/').slice(2).join('/'); // remove http(s)
										var path =  idNoProtocol.substring(idNoProtocol.indexOf('/'), idNoProtocol.length);
										idNoProtocol = idNoProtocol.substring(0, idNoProtocol.indexOf('/')); // remove the path
										path = path.replace('"', ''); // remove a " that was at the end of the path

										var inserted = 0;
										for(var m = 0; m < arr.length; m++) {
											if(arr[m][0] === "" && inserted === 0) {
												arr[m][0] = latitude;
												arr[m][1] = idNoProtocol;
												arr[m][2] = path;
												inserted = 1;
											}
										}
									}
								}
							}
						}
						if(j === "notation") {
							stationRef = parsed.items[i][j];
						}
						if(j === "town") {
							town = parsed.items[i][j];
						}
					}
					if(!skip) {
						var sql = "INSERT IGNORE INTO co657_02.locations (town, stationRef, latitude, longitude) VALUES ('"+ town +"','"+ stationRef + "','"+ latitude +"','"+ longitude + "')";
						conn.query(sql, function(err) {
							if(err) throw err;
							console.log("EA API location data inserted co657_02.locations");
						});
					}
				}
			});
			res.on('error', function(e) {
				console.log("error: " + e.message);
			});
			resolve(arr);
		});
	}).then(function(array) {
		get(arr);
	}).catch(function(error) {
		console.error("onRejected function called: " + error.message);
	});
}

/**
 *	arr contains lat, host,path of each station
 */
async function get(arr) {
	for(var i in arr) {
		var tmp = createArray(1, 3);
		tmp[0][0] = arr[i][0];
		tmp[0][1] = arr[i][1];
		tmp[0][2] = arr[i][2];
		await eaInsert(tmp);
	}
};

function eaInsert(tmp) {
	var getOptionsMeasures = {
		host: tmp[0][1],
		path: tmp[0][2],
		method: 'GET'
	};
	http.get(getOptionsMeasures, function(resMeasure) {
		resMeasure.setEncoding('utf8');
		var measureBody = '';
		resMeasure.on('data', function(chunkMeasure) {
			measureBody += chunkMeasure;
		});
		resMeasure.on('end', function() {
			var measureParsed = JSON.parse(measureBody);
			var dateTime = '';
			var payload = '';
			var locationID = '';
			for(var j in measureParsed.items) {
				if(j === "latestReading") {
					var latestReading = measureParsed.items[j];
					for(var k in latestReading) {
						if(k === "dateTime") {
							dateTime = latestReading[k];
							dateTime = dateTime.slice(0, -1); // The EA data for time ends with Z, which in unix time denotes the timezone (Z being Zulu eg. GMT), this isn't shared by the MQTT data, so we'll slice it off for simplicities sake
						}
						if(k === "value") {
							payload = latestReading[k];
						}
					}
				}
			}
			var sqlQuery = 'SELECT locationID FROM co657_02.locations WHERE latitude = ?';
			conn.query(sqlQuery, tmp[0][0], function(err, result) {
				if(err) throw err;
				for(var i = 0; i < result.length; i++) {
					locationID = result[i].locationID;
				}
				var sqlInsert = "INSERT IGNORE INTO co657_02.data (locationID, payload, dateTime) VALUES ('" + locationID + "','" + payload + "','" + dateTime + "')";
				conn.query(sqlInsert, function(err) {
					if(err) throw err;
					console.log("EA API data inserted into co657_02.data");
				});
			});
		});
	});
}

/**
 *	Function for creating an empty 2d was found here: https://stackoverflow.com/questions/966225/how-can-i-create-a-two-dimensional-array-in-javascript/966938#966938
 */
function createArray(length) {
    var arr = new Array(length || 0),
        i = length;

    if (arguments.length > 1) {
        var args = Array.prototype.slice.call(arguments, 1);
        while(i--) arr[length-1 - i] = createArray.apply(this, args);
    }
    return arr;
}
