<?php 
	// I personally don't know how xmlhttprequest would handle a php file with mulitple functions, so each is having its own file for now...)
	
	$servername = "";
	$username = "";
	$password = "";
	$dbname = "";
	$locationID = $_REQUEST["id"];
	
	if($locationID !== "") {
		// Create connection
		$conn = new mysqli($servername, $username, $password, $dbname);
		
		// Check connection
		if ($conn->connect_error) {
			die("Connection failed: " . $conn->connect_error);
		}
	
		$query = "SELECT payload, MAX(dateTime) FROM data WHERE locationID = '$locationID'";
		$result = $conn->query($query);
		while($row = mysqli_fetch_assoc($result)) {
			echo $row['payload'];
			//echo $row['locationID'] . "," . $row['latitude'] . "," . $row['longitude'] . ";";
		}
	
		$conn->close();
	} else {
			echo "locationID is null!";
	}
	
?>