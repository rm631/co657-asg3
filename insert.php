<html>
<body>
<?php
header('Location: index.html');
$servername = "";
$username = "";
$password = "";

try {
    $conn = new PDO("mysql:host=$servername;dbname=co657_02", $username, $password);
    // set the PDO error mode to exception
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    echo "Connected successfully"; 
    


$stmt=$conn->prepare("INSERT INTO subscribe (email, postcode) VALUES (?,?)");

$stmt->execute([md5($_POST['email']),md5($_POST['postcode'])]);

}
catch(PDOException $e)
    {
    echo "Connection failed: " . $e->getMessage();
    }

?>
</body>
</html>