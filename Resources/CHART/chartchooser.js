/**
 * Created by scott on 6/12/14.
 */

window.iprojConfig;

configFile = process.env.HOME+"/exhibit/iproj.json";

try{
	//user config
	window.iprojConfig = require(configFile);
}catch(e){
	//defaults
	window.iprojConfig = require("./iproj.json")
}
console.log("config loaded", window.iprojConfig);
path = window.iprojConfig.dbPath;

var usmapMetadata = {
    category: "Human Capital",
    index: "0"
};
var worldmapMetadata = {
    category: "Infrastructure",
    index: "1"
};

var ds = new Datasource(path);

ds.setup().then(
    function(defs){
        d3.select("body").append("div").attr("id", FREDChart.wrapperDivId);

        var menu = d3.select("#"+FREDChart.wrapperDivId).append("div").attr("id", FREDChart.menuDivId);

        d3.select("#"+FREDChart.wrapperDivId).append("div").attr("id", FREDChart.chartDivId);
        var chartElemSelector = "#"+FREDChart.chartDivId;

        var cat = menu.selectAll("div").data(Object.keys(defs)).enter().append("h3").text(function(d){return d});

        cat.append("div").attr("class", "accord-items")
            .selectAll("p").data(function(d){return defs[d]}).enter()
            .insert("p")
            .on("click", function (d, i) {
                console.log(d.chart_type + " " + d.category + " " + i);
                selectChart(chartElemSelector, defs, d.chart_type, d.category, i);
            })
            .text(function(d){return d.chart_name});


        var items = $(".accord-items").detach();
        var headers = $("h3");

        $.each( headers, function( i, val ) {
            $(headers[i]).after(items[i]);
        });


//        $( "p" ).on( "click", function() {
//            $("p").removeClass("selected");
//            $(this).addClass("selected");
//            console.log($(this).prop("__data__")); //this is the definition, to pass to db.js fu ction
//        });


        $( "#accordion" ).accordion({
            heightStyle: "content",
            collapsible: true
        });
    }
);

var selectChart = function(chartElemSelector, defs, chartType, category, chartIndex) {
    switch (chartType) {
        case "line": // TBD: no data def yet
            var nationMetadata = ds.placeKey["country"];
            var defTimeline = defs[category][+chartIndex]; // scatter
            ds.get(defTimeline).then(
                function (dataTimeline) {
                    new FREDTimeline.init(chartElemSelector, defTimeline, dataTimeline, nationMetadata);//dataWorldMap.worldmap.map[0].features);
                });
            break;
        case "scatter":
            var stateMetadata = ds.placeKey["state"];
            var defScatter = defs[category][+chartIndex]; // scatter
            ds.get(defScatter).then(
                function (dataScatter) {
                    new FREDScatterPlot.init(chartElemSelector, defScatter, dataScatter.scatter, stateMetadata);//dataUSMap.usmap.maps.state.features);
                });
            break;
        case "usmap":
            var countyMetadata = ds.placeKey["county"];
            var defUSMap = defs[category][+chartIndex]; // usmap
            ds.get(defUSMap).then(
                function (dataUSMap) {
                    new FREDUSMap.init(chartElemSelector, defUSMap, dataUSMap.usmap);
                });
            break;
        case "worldmap":
            var nationMetadata = ds.placeKey["nation"];
            var defWorldMap = defs[category][+chartIndex]; // worldmap
            ds.get(defWorldMap).then(
                function (dataWorldMap) {
                    new FREDWorldMap.init(chartElemSelector, defWorldMap, dataWorldMap.worldmap);
                });
            break;
        default:
            console.log("Error: unknown chart type" + def.chart_type);
    }
}