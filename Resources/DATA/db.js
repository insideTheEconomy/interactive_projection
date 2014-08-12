
var Datasource = function( data_path ){

	var sqlite3 = require('sqlite3').verbose();
	var when = require('when');
	var csv = require('fast-csv');
	this.testVar;

	this.db = new sqlite3.Database(data_path, sqlite3.OPEN_READONLY);

	this.db.on('trace', function(t){console.log(t)});
	var defs = "chart_definitions.csv";
	var ann_def = "line_annotations.csv";

	
	this.placeKey = {};
	this.def;
	this.annotations = [];
	self = this;
	
	this.setup = function(){
		//var dfd = $.Deferred();
		
		this.dfd = when.defer();
		this.res = {};
		self = this;
		
		csv.fromPath(defs, {headers: true}).on("record",this.pushResponse).on("end", this.resolveResponse);
		csv.fromPath(ann_def, {headers: true}).on("record",function(d){
			var date = d.date;
			d.date = new Date(date);
			self.annotations.push(d);
			console.log(d);
		});
		
		var places = ["county","state","country"];
		
		this.buildPlaceKey();
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
					d[1][0].sort(function(_a,_b){return _a.jsDate - _b.jsDate});
					dfd.resolve({"usmap":{maps:{state:d[0][0], county:d[0][1] }, data:d[1][0]  }});
				}else if(type == 'worldmap'){
					d[1][0].sort(function(_a,_b){return _a.jsDate - _b.jsDate});
					dfd.resolve({'worldmap':{map:d[0], data:d[1][0]}});
				}else if(type == "scatter"){
					var x = d[0][0];
					var y = d[0][1];
					
					
					
					x.sort(function(_a,_b){return _a.jsDate - _b.jsDate});
					y.sort(function(_a,_b){return _a.jsDate - _b.jsDate});
					
					x = self.xFilter(x,y);
					y = self.xFilter(y,x);
					
					dfd.resolve({scatter:{x: x, y:x, size:d[0][2]}});
				}else if(type == "line"){
					d.sort(function(_a,_b){return _a.jsDate - _b.jsDate});
					
					dfd.resolve({line:{data:d, annotations:self.annotations}});
				}

		})
		
		return dfd.promise;
	}
	
	//Filter for common values
	this.xFilter = function(_b,_a){
		var c = [];


		_a.forEach(function(ao){
			d = _b.filter(function(bo){
				return ao.date == bo.date
			})
			c = c.concat(d);
		})
		return c;
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
	
	this.buildPlaceKey = function (){
		var places = ["county","state","country"];
		this.getMaps( places ).then(function(a){
				

			
					a.forEach(function(map,i){
						self.placeKey[places[i]] = new Array(map.features.length);

						map.features.forEach(function(feature, j){
							self.placeKey[places[i]][+feature.properties.gid] = feature.properties;
						})


					})

				});
	
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
			dfds.push( self.getObservation(o)  );
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
	
	this.getObservationTest = function( ser_hash ){
		var dfd = when.defer();
		var ret = [];
		self.db.all("SELECT observation from observations WHERE series_hash = ?", [ser_hash], 
		
		function(e,r){
			console.log("error: ",e);
			r=null;
		});
		return dfd.promise;
	}
	
	
 
	
	
	
	this.getObservation = function( ser_hash ){
		var dfd = when.defer();
		var ret = [];

		self.db.each("SELECT observation from observations WHERE series_hash = ?", [ser_hash], 
			function(e,r){
				if(e){dfd.reject(e)
					}else{
						console.log("row");
						var rj = JSON.parse(r.observation);
						var dt = rj.date.split("-");
						rj.jsDate = new Date(dt[0],dt[1]-1,dt[2]);
						ret.push(rj);
					}
			
			},
			function(e,r){
				if(e){dfd.reject(e)
					}else{
							console.log(r+" rows transmitted ");
							dfd.resolve(ret);
					}
			
			})
		return dfd.promise;
	}
}
