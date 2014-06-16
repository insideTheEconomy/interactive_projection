
var Datasource = function( data_path ){
	
	var sqlite3 = require('sqlite3').verbose();
	var when = require('when');
	var csv = require('fast-csv');


	this.db = new sqlite3.Database(data_path, sqlite3.OPEN_READONLY);
	this.db.on('trace', function(t){console.log(t)});
	var defs = "chart_definitions.csv"
	
	this.def;
	self = this;
	
	this.setup = function(){
		//var dfd = $.Deferred();
		
		this.dfd = when.defer();
		this.res = {};
		self = this;
		
		
		csv.fromPath(defs, {headers: true}).on("record",this.pushResponse).on("end", this.resolveResponse);
	
		
		return this.dfd.promise;
	}
	
	this.pushResponse = function(d){
		//console.log(d);
		d.series_hash = d.series_hash.split(',').map(function(a){return a.replace(/\s+/g, '')});
		if(!self.res.hasOwnProperty(d.category)){
			self.res[d.category] = [];
		}
		self.res[d.category].push(d);
	}
	
	this.resolveResponse = function(){
		self.dfd.resolve(self.res);
		//console.log(self.res);
	}
	
	
	this.get = function( def ){ 
		var dfd = when.defer();
		var type = def.chart_type;  //one of 'usmap','worldmap','line','scatter'
		console.log("type ", type);
		this.getAll(def).then(function( d ){
				//dfd.resolve(self.format(d, type));	
				console.log("GOT ALL ");
		 		if(type == 'usmap'){
					dfd.resolve({"usmap":{maps:{state:d[0][0], county:d[0][1] }, data:d[1][0]  }});
				}else if(type == 'worldmap'){
					dfd.resolve({'worldmap':{map:d[0], data:d[1][0]}});
				}else if(type == "scatter"){
					dfd.resolve({scatter:{x: d[0][0], y:d[0][1], size:d[0][2]}});
				}else if(type == "line"){
					dfd.resolve({line:{data:d}});
				}

		})
		
		return dfd.promise;
	}
	
	this.getAll = function( def ){
		var dfds = [];
		
		var type = def.chart_type;  //one of 'usmap','worldmap','line','scatter'
		console.log("type ", type);
		var res = [];
		
		switch (type){
			case 'usmap':
				dfds.push(this.getMaps(['state','county']));
				break;
			case 'worldmap':
				dfds.push(this.getMaps(['country']));
				break;
		}
		dfds.push(this.getObservations(def.series_hash));
		return when.all(dfds);
	}
	
	
	this.getMaps = function( geo_types ){
		var dfds = [];
		geo_types.forEach(function(o,i,a){
			dfds.push(self.getMap(o));
		});
		return when.all(dfds);
	}
	
	this.getObservations = function(series){
		var dfds = [];
		series.forEach(function(o,i,a){
			dfds.push(self.getObservation(o));
		});
		return when.all(dfds);
	}
	
	 
	this.getMap = function( geo_type ){
		var dfd = when.defer();
		var ret = [];
		self.db.get("SELECT geometry from geo WHERE region_type = ?", [geo_type], 
			function(e,r){
				var rj = JSON.parse(r.geometry);
				r=null;
				dfd.resolve(rj);
			}
		)
		return dfd.promise;
	}
	
	this.getObservation = function( ser_hash ){
		var dfd = when.defer();
		var ret = [];
		self.db.all("SELECT observation from observations WHERE series_hash = ?", [ser_hash], 
		
		function(e,r){
			console.log("error: ",e);
			dfd.resolve(r);
			r=null;
		});
		return dfd.promise;
	}
	
	

	
	
	
	this.getObservationOld = function( ser_hash ){
		var dfd = when.defer();
		var ret = [];
		self.db.serialize(function(){
				self.db.each("SELECT observation from observations WHERE series_hash = ?", [ser_hash], 
					function(e,r){
						if(e){dfd.reject(e)
							}else{
								console.log("row");
								var rj = JSON.parse(r.observation);
								ret.push(rj);
							}
					
					},
					function(e,r){
						if(e){dfd.reject(e)
							}else{
									console.log(r+" rows transmitted ");
									dfd.resolve(ret);
							}
					
					}
				)
			
		})
	
		return dfd.promise;
	}
}
