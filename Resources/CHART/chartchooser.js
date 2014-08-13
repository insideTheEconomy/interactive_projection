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

//path = "/Users/scott/Projects/projection.db"
//path = "/Volumes/Pylos/Projects/FED/projection.db"

var usmapMetadata = {
    category: "Human Capital",
    index: "0"
};
var worldmapMetadata = {
    category: "Infrastructure",
    index: "1"
};

var ds = new Datasource(path);
//ds.setup().then(
//    function (defs) {
//        var indent = 10;
//        var menu = d3.select("body").append("div")
//            .style({"width": "200px", "position": "fixed", "top": "400px", "left": "1000px"});
//        for (var category in defs) {
////            console.log("Category: "+category);
//            var def = defs[category];
//            menu.append("p").style({"font-weight": "bold", "font-size": "8pt", "margin-top": "3px", "margin-bottom": "1px"})
//                .html(category);
//            menu.selectAll("p." + category).data(def).enter()
//                .append("p").attr("class", category)
//                .style({"margin-top": "0px", "margin-bottom": "1px"})
//                .append("svg").attr("height", 8)
//                .append("text")
//                .style({"font-size": "6pt", "line-height": "90%", "alignment-baseline": "ideographic", "text-anchor": "start"})
//                .attr("x", indent).attr("y", 4) // indent
//                .on("click", function (d, i) {
//                    console.log(d.chart_type + " " + d.category + " " + i);
//                    selectChart(defs, d.chart_type, d.category, i);
//                })
//                .text(function (d) {
////                    console.log("Chart: "+d.chart_name);
//                    return d.chart_name + "(" + d.chart_type + ")";
//                    return text;
//                });
//        }
//    });

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
//            var defWorldMap = defs[worldmapMetadata.category][+worldmapMetadata.index]; // worldmap meta data for USA Id
//            ds.get(defWorldMap).then(
//                function (dataWorldMap) {
                    var defTimeline = defs[category][+chartIndex]; // scatter
                    ds.get(defTimeline).then(
                        function (dataTimeline) {
                            new FREDTimeline.init(chartElemSelector, defTimeline, dataTimeline, nationMetadata );//dataWorldMap.worldmap.map[0].features);
                        });
//                });
            break;
        case "scatter":
            var stateMetadata = ds.placeKey["state"];
//            var defUSMap = defs[usmapMetadata.category][+usmapMetadata.index]; // usmap fmeta data or state Ids, Names
//            ds.get(defUSMap).then(
//                function (dataUSMap) {
                    var defScatter = defs[category][+chartIndex]; // scatter
                    ds.get(defScatter).then(
                        function (dataScatter) {
                            new FREDScatterPlot.init(chartElemSelector, defScatter, dataScatter.scatter, stateMetadata );//dataUSMap.usmap.maps.state.features);
                        });
//                });
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