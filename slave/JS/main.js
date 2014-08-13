// Make code portable to Node.js without any changes
try {
   var autobahn = require('autobahn');
} catch (e) {
   // when running in browser, AutobahnJS will
   // be included without a module system
}

// Set up WAMP connection to router
var connection = new autobahn.Connection({
   url: 'ws://localhost:9000/ws',
   realm: 'iproj'}
);

//remote procedures
function rpc_call (a,o) {
	console.log("Method Called",a,o);
	now = new Date();
    return now.toISOString();
}

function rpc_args (a,o) {
	// body...
	console.log("Method Called with Arguments",a,o);
	return {name: "HAL 9000", message:"I'm sorry Dave, I'm afraid I can't do that"};
}


// Set up 'onopen' handler
connection.onopen = function (session) {
  

   // Register the remote procedure with the router
   session.register('org.iproj.rpc_call', rpc_call).then(
      function (registration) {
         console.log("Procedure registered:", 'org.iproj.rpc_call', registration.id);
      },
      function (error) {
         console.log("Registration failed:", error);
      }
   );

	session.register('org.iproj.rpc_args', rpc_args).then(
	      function (registration) {
	         console.log("Procedure registered:",'org.iproj.rpc_args', registration.id);
	      },
	      function (error) {
	         console.log("Registration failed:", error);
	      }
	   );
};

// Open connection
connection.open();
