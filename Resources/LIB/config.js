/* - */

//-- Variable Declarations  -- //

//Debug//
var goKiosk;
var hideMouse;

// --------------------------- //

try{
	var user = process.env.USER;
	var homeDir = "/Users/"+user+"/exhibit/";
	var config = "config_interactive.json";
	settings = require(homeDir+config);
	console.log("Using config.json Settings: ", settings);
	
	goKiosk = settings.kiosk;
	hideMouse = settings.hideMouse;
}
catch(e){
	settings = require("./config_interactive.json");
	console.log("Using DEFAULT cfg: ", settings);
}

// --------------------------- //