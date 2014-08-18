makeMenu = function(_defs){
	var menu = d3.select("body").append("div").attr("id", "accordion");
	var cat = menu.selectAll("div").data(Object.keys(_defs)).enter().append("h3").text(function(d){return d});
	
	cat.append("div").attr("class", "accord-items")
		.selectAll("p").data(function(d){return _defs[d]}).enter().insert("p").text(function(d){return d.chart_name});
	
	
	var items = $(".accord-items").detach();
	var headers = $("h3");
	
	$.each( headers, function( i, val ) {
		$(headers[i]).after(items[i]);
	});
	
	
	$( "p" ).on( "click", function() {
		$("p").removeClass("selected");
		$(this).addClass("selected");
		console.log("Add Selected");
		console.log($(this).prop("__data__")); //this is the definition, to pass to db.js fu ction
	});
	
	
	$( "#accordion" ).accordion({
		heightStyle: "content",
		collapsible: true,
	});
}