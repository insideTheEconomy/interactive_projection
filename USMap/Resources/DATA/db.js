
var datasource = function( dataDIR ){
	defs = dataDir + "/" + "chart_definitions.csv"
	this.def;
	self = this;
	
	this.setup = function(){
		var dfd = $.Deferred();
		d3.csv(defs,function(d){
			self.def = d;
			
			
			var res = {};
			$.each(self.def,function(i,d){
				console.log("cat")
				console.log(d.category);
				if(!res.hasOwnProperty(d.category)){
					res[d.category] = [];
				}
				res[d.category].push(d);
			})
			dfd.resolve(res);
			
		});
		return dfd.promise();
	}
	
	this.get = function(_id){
		var dfd = $.Deferred();
		 
		var o = this.def.map(function(d){  if (+d.id == _id){return d}});
		console.log("o:");
		console.log(o);
		var q = queue();
			q.defer(d3.json, dataDir + "/" + o[0].region_type+".json")
			q.defer(d3.json, dataDir + "/" + o[0].series_hash+".json")
			
		q.awaitAll(function(e,r){
			if(e){dfd.reject(e)}else{
			dfd.resolve( {map:r[0], data: [r[1]]}  )}
			
		})
		return dfd.promise();
	}
	
	this.getByName = function(_name){
		var id;
		$.each(this.def, function(i,d){
			if(d["chart_name"] == _name){
				id = d.id;
				console.log("id: ");
				console.log(d.id);
				return;
			} 
		})
        if( id == null ){
            throw "Chart " + _name + " not found.";
        }
		return self.get(id);
	}
	
}


