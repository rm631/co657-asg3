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
	
	$query = 'SELECT * FROM locations';
	$result = $conn->query($query);
	while($row = mysqli_fetch_assoc($result)) {
		echo $row['locationID'] . "," . $row['latitude'] . "," . $row['longitude'] . ";";
	}
	$conn->close();
?> 