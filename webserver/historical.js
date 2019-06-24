var mysql = require('mysql');

var conn = mysql.createConnection({
	host: '',
	user: '',
	password: '',
	charset: 'utf8_general_ci'
});

/**
 *	If you connect, it will drop the entire data table 
 */
conn.connect(function(err) {
	if(err) throw err;
	console.log("MySQL Connected!");
	/*conn.query("DROP TABLE IF EXISTS co657_02.data", function(err) {
		if(err) throw err;
	});*/
	sql = "CREATE TABLE IF NOT EXISTS co657_02.data (dataID int NOT NULL auto_increment PRIMARY KEY, locationID int NOT NULL, payload varchar(30), dateTime varchar(30), FOREIGN KEY (locationID) REFERENCES co657_02.locations(locationID))";
	conn.query(sql, function(err) {
		if(err) throw err;
		console.log("data table created");
	});
});

var http = require('https');
// https://kentwatersensors.data.thethingsnetwork.org/api/v2/devices?last=7d
var getOptions = {
		headers: {
			'Authorization' : '' // ttn api key omitted
		},
	host: 'kentwatersensors.data.thethingsnetwork.org',
	path: '/api/v2/query?last=7d',
	method: 'GET',
};


http.get(getOptions, function(res) {
	console.log("statusCode: " + res.statusCode);
	res.setEncoding('utf8');
	var body = '';
	res.on('data', function(chunk) {
		body += chunk;
	});
	res.on('end', function() {
		var parsed = JSON.parse(body);
		
		for(var i = 0; i < parsed.length; i++) {
			var counter = parsed[i];
			var locationID = '';
			var devID = counter.device_id;
			
			var rawPayload = counter.raw;
			var payload = new Buffer(rawPayload, 'base64').toString('hex');
			payload = parseInt(payload, 16);
			payload = payload/1000;
			sqlMeta = 'SELECT distSensor FROM co657_02.metaData WHERE devID = ?'
			conn.query(sqlMeta, devID, function(err, result) {
				if(err) throw err;
				payload = result[0].distSensor - payload;
			});
			
			var dateTime = counter.time;
			dateTime = dateTime.substr(0, 19);
			
			mqttInsert(locationID, devID, payload, dateTime);
		}
	});
	res.on('error', function(e) {
		console.log("error: " + e.message);
	});
});

function mqttInsert(locationID, devID, payload, dateTime) {
	var sql = 'SELECT locationID FROM co657_02.locations WHERE devID = ?';
	conn.query(sql, devID, function(err, result) {
		if(err) throw err;
		for(var i = 0; i < result.length; i++) {
			locationID = result[i].locationID;
		}
		//console.log("2: " + locationID + "', '" + payload + "', '" + dateTime);
		/**
		 *	THIS WILL ERROR IF IT FAILS TO FIND THE DEV_ID IN THE SELECT ABOVE
		 */
		var sqlData = "INSERT IGNORE INTO co657_02.data (locationID, payload, dateTime) VALUES ('" + locationID + "','" + payload + "','" + dateTime + "')";
		conn.query(sqlData, function(err) {
			if(err) throw err;
			//console.log("3: " + locationID + "', '" + payload + "', '" + dateTime);
		});
	});
}

/**
 *	This next section gets the historical data for the eaAPI
 *	eg. https://environment.data.gov.uk/flood-monitoring/id/stations/1491TH/readings?_sorted&startdate=2018-12-01&enddate=2018-12-02
 *	Need to get the stationRef for link
 */


eaHistoricalData();
function eaHistoricalData() {
	console.log("eaHistoricalData()");
	var sqlLocationRefs = "SELECT stationRef FROM co657_02.locations";
	conn.query(sqlLocationRefs, function(err, result) {
		if(err) throw err;
		for(var i in result) {
			var stationRef = result[i].stationRef;
			//console.log("result: " + JSON.stringify(stationRef));
			if(stationRef) {
				stationRef = JSON.stringify(stationRef);
				stationRef = stationRef.replace(/"/g,"");
				eaGet(stationRef);
			}
		}
	});
}

var moment = require('moment');
function eaGet(stationRef) {
	//console.log("stationRef after replace: " + stationRef);
	// http://momentjs.com/
	/**
	 *	date solution adapted from: https://stackoverflow.com/questions/13838441/javascript-how-to-calculate-the-date-that-is-2-days-ago/13838662
	 */
	var endDate = new Date(); // current date
	var x = 7; 
	var startDate = endDate - 1000 * 60 * 60 * 24 * x; // where x is the number of day back you want to start at
	endDate = moment(endDate).format("YYYY-MM-DD");
	startDate = moment(startDate).format("YYYY-MM-DD");
	var url = "https://environment.data.gov.uk/flood-monitoring/id/stations/" + stationRef + "/readings?_sorted&startdate=" + startDate + "&enddate=" + endDate;
	http.get(url, function(res) {
		res.setEncoding('utf8');
		var body = '';
		res.on('data', function(chunk) {
			body += chunk;
		});
		res.on('end', function() {
			var dateTime;
			var value;
			var locationID;
			var parsed = JSON.parse(body);
			for(var j in parsed) {
				for(var k in parsed[j]) {
					dateTime = parsed[j][k].dateTime;
					value = parsed[j][k].value;
					locationID = '';
					eaInsert(stationRef, dateTime, value, locationID);
				}
			}
		});
		res.on('error', function(e) {
			console.log("error: " + e.message);
		});
	});	
	console.log("EA API historical data added to db");
}

function eaInsert(stationRef, dateTime, value, locationID) {
	//console.log(stationRef + " " + dateTime + " " + value + " " + locationID);
	if(value) { // a few undefined variables were making it through somehow...
		var sqlLocationID = 'SELECT locationID FROM co657_02.locations WHERE stationRef = ?';
		conn.query(sqlLocationID, stationRef, function(err, result) {
			if(err) throw err;
			for(var i in result) {
				locationID = result[i].locationID;
			}
			var sqlInsert = "INSERT IGNORE INTO co657_02.data (locationID, payload, dateTime) VALUES('" + locationID + "','" + value + "','" + dateTime.substr(0, 19) + "')";
				conn.query(sqlInsert, function(err) {
					if(err) throw err;
					//console.log("adding: " + locationID + "," + value + "," + dateTime); 
					//console.log("historical EA API data added to db");
				});
			//console.log(locationID);
		});
	}
}