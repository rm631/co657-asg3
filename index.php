<?php
	$servername = "";
	$username = "";
	$password = "";
	$dbname = "";
	
	// Create connection
	$conn = new mysqli($servername, $username, $password, $dbname);

	// Check connection
	if ($conn->connect_error) {
		die("Connection failed: " . $conn->connect_error);
	}
	
	$query = "SELECT * FROM locations";
	$result = $conn->query($query);
	while($row = mysqli_fetch_assoc($result)) {
		echo $row['stationRef'] . "," . $row['town'] . ",";
		$tmp = $row['locationID'];
		$innerQuery = "SELECT payload, MAX(dateTime) FROM data WHERE locationID = '$tmp'";
		$innerResult = $conn->query($innerQuery);
		while($innerRow = mysqli_fetch_assoc($innerResult)) {
			echo $innerRow['payload'] . ";";
		}
	}
	
?>