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
	
		$query = "SELECT payload, dateTime FROM data WHERE locationID = '$locationID' ORDER BY dateTime DESC";
		$result = $conn->query($query);
		while($row = mysqli_fetch_assoc($result)) {
			echo $row['payload'] . "," . $row['dateTime'] . ",";
		}
	
		$conn->close();
	} else {
		echo "locationID is null!";
	}
	
?>