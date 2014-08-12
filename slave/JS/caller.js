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

// Set up 'onopen' handler
connection.onopen = function (session) {
   setInterval(function() {
      session.call('org.iproj.rpc_call').then(
         // RPC success callback
         function (now) {
            console.log("Current time:", now);
         },
         // RPC error callback
         function (error) {
            console.log("Call failed:", error);
         }
      );
   }, 6000); 

	setInterval(function() {
	      session.call('org.iproj.rpc_args',["Hello","World"],{"name":"Dave", "message": "open the pod bay doors, Hal."}).then(
	         // RPC success callback
	         function (now) {
	            console.log("Response:", now);
	         },
	         // RPC error callback
	         function (error) {
	            console.log("Call failed:", error);
	         }
	      );
	   }, 3000);

	
};

// Open connection
connection.open();
