<!DOCTYPE html>
<html lang="en">
<head>

	<link rel="stylesheet" type="text/css" href="style.css">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<!--Bootstrap cdn-->
	<link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.1.3/css/bootstrap.min.css">
	<script src="https://ajax.googleapis.com/ajax/libs/jquery/3.2.1/jquery.min.js"></script>
	<!--Push notifications-->
	<script src="push.js"></script>
	<!-- https://flood-warning-information.service.gov.uk/river-and-sea-levels?location=ct2+8ll -->


<style>

body {text-align:center;}


font-face {
  font-family: myFirstFont;
  src: url(sansation_bold.woff);
  font-weight: bold;
}

#floodWarnings {
	padding: 15vw;
	border-collapse: collapse;
	margin:0px auto; 
	height: 100%; 
	width: 100%;
}
#floodWarnings tr:nth-child(even){
	background-color: #f2f2f2;
}
#floodWarnings tr {
	height: 25px;
}
#floodWarnings tr:hover {
	background-color: #FFC20A;
}
#floodWarnings, th, td { 
    border: 1px solid black;
}
#floodWarnings th {
    height: 50px;
	background-color: #0C7BDC;
    color: white;
}
#floodWarnings td {
	text-align: centre;
	overflow: auto;
}
ul {
	list-style-type: none;
	margin: 60;
	padding: 60;
	overflow: hidden;
	background-color: #FFC20A;
}

li {
  float: left;
}

li a {
	display: block;
	color: white;
	text-align: center;
	padding: 14px 16px;
	text-decoration: none;
}

li a:hover:not(.active) {
	background-color: #4CAF50;
}

.active {
	background-color: #4CAF50;
}



table.center {
	margin-left:auto; 
	margin-right:auto;
}

.wrapper {overflow: auto;}

main {margin-left: 4px;}

@media screen and (min-width: 480px) {
  #leftsidebar {width: 200px; float: left;}
  #main {margin-left: 216px;}
}

ul li ul.dropdown {
    list-style: none;
    display: none;
    z-index: 1000;
    padding: 0;
    margin: 0;
}

ul li:hover ul.dropdown {
	display: block;
}

.nav-right {
	float: right;
}

</style>
</head>
<body>
<ul>
	<li><a href="index.html">EA Flood Warnings</a></li>
	<li><a href="mqtt.html">MQTT</a></li>
		<li><a id="mapDropdown" href="map.html">map</a>
			<ul class="dropdown">
				<li><a href="map2.html">High Contrast</a></li>
			</ul>
		</li>
	<li><a href="subscribe.html">Subscribe to alerts</a></li>
	<li><a class="active" href="checkifonline.php">Check api status</a></li>
	<div class="nav-right">
		<li><a href="#">login</a></li>
	</div>
</ul>

<?php
/**
 * PHP/cURL function to check a web site status. If HTTP status is not 200 or 302, or
 * the requests takes longer than 10 seconds, the website is unreachable.
*/
 $url = "https://environment.data.gov.uk/flood-monitoring/id/stations";
  $timeout = 10;
  $ch = curl_init();
  curl_setopt ( $ch, CURLOPT_URL, $url );
  curl_setopt ( $ch, CURLOPT_RETURNTRANSFER, 1 );
  curl_setopt ( $ch, CURLOPT_TIMEOUT, $timeout );
  $http_respond = curl_exec($ch);
  $http_respond = trim( strip_tags( $http_respond ) );
  $http_code = curl_getinfo( $ch, CURLINFO_HTTP_CODE );
  if ( ( $http_code == "200" ) || ( $http_code == "302" ) ) {
    echo '<h1>environment agency api is available</h1>';
  } else {
    // return $http_code;, possible too
    echo '<h1>environment agency api is unavailable</h1>';
  }
  curl_close( $ch );

?>

</body>
</html>