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


var ds = new Datasource(path);

ds.setup().then(
    function (defs) {

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

        connection.onopen = function (rpcSession) {
            var isSlave = $("body").attr("class") === "slave";

            if (isSlave) {
                startSlave(defs, rpcSession);
            } else {
                startMaster(defs, rpcSession);
            }
        }
    });

var startMaster = function (defs, rpcSession) {
    d3.select("body").append("div").attr("id", FREDChart.wrapperDivId);

    /*
     $("body").plainOverlay({
     fillColor: "green",
     //progress: function() { return $('<img src="images/wait.gif"/>'); }
     });
     */

    var menu = d3.select("#" + FREDChart.wrapperDivId).append("div").attr("id", FREDChart.menuDivId);

    d3.select("#" + FREDChart.wrapperDivId).append("div").attr("id", FREDChart.chartDivId);
    var chartElemSelector = "#" + FREDChart.chartDivId;

    var cat = menu.selectAll("div").data(Object.keys(defs)).enter().append("h3").text(function (d) {
        return d
    });

    cat.append("div").attr("class", "accord-items")
        .selectAll("p").data(function (d) {
            return defs[d]
        }).enter()
        .insert("p")
        .on("click", function (d, i) {
            $("p").removeClass("selected");
            $(this).addClass("selected");
            console.log("Add Selected");
            console.log(d.chart_type + " " + d.category + " " + i);

            //create a modal dialog using jqueryUI
            $modal.dialog();
            //and progressbar


            console.log("modal show");
            selectChart(chartElemSelector, defs, d.chart_type, d.region_type, d.category, i, false, rpcSession);

            rpcSession.call(FREDChart.rpcURLPrefix + "selectChart", [defs]); // call slave
        })
        .text(function (d) {
            return d.chart_name
        });


    var items = $(".accord-items").detach();
    var headers = $("h3");

    $.each(headers, function (i, val) {
        $(headers[i]).after(items[i]);
    });


//        $( "p" ).on( "click", function() {
//            $("p").removeClass("selected");
//            $(this).addClass("selected");
//            console.log($(this).prop("__data__")); //this is the definition, to pass to db.js function
//        });


    $("#accordion").accordion({
        heightStyle: "content",
        collapsible: true
    });
};

var startSlave = function(defs, rpcSession){
        // register selection call
    rpcSession.register(FREDChart.rpcURLPrefix + "selectChart", function (args) {
        var d = args[0];
        var chartIndex = args[1];
        selectChart(chartElemSelector, defs, d.chart_type, d.region_type, d.category, chartIndex, true, rpcSession);
    });
}

var selectChart = function(chartElemSelector, defs, chartType, regionType, category, chartIndex, isSlave, rpcSession) {
    // turn on wait screen
    //$.blockUI();//{ message: '<img src="images/wait.gif" />' });
    //var alert = $.fn.jAlert({"message":"test"});
//    console.log("modal open");

	
    var regionMetadata = ds.placeKey[regionType];
    switch (chartType) {
        case "line": // TBD: no data def yet
            var defTimeline = defs[category][+chartIndex]; // line
            ds.get(defTimeline).then(
                function (dataTimeline) {
					$modal.dialog("close");
                    console.log("modal hide");
                    new FREDTimeline.init(chartElemSelector, defTimeline, dataTimeline, regionMetadata, isSlave, rpcSession);
                });
            break;
        case "scatter":
            var defScatter = defs[category][+chartIndex]; // scatter
            ds.get(defScatter).then(
                function (dataScatter) {
					$modal.dialog("close");
                    console.log("modal hide");
                    new FREDScatterPlot.init(chartElemSelector, defScatter, dataScatter.scatter, regionMetadata, isSlave, rpcSession);
                });
            break;
        case "usmap":
            var defUSMap = defs[category][+chartIndex]; // usmap
            ds.get(defUSMap).then(
                function (dataUSMap) {
					$modal.dialog("close");
                    console.log("modal hide");
                    new FREDUSMap.init(chartElemSelector, defUSMap, dataUSMap.usmap, isSlave, rpcSession);
                });
            break;
        case "worldmap":
            var defWorldMap = defs[category][+chartIndex]; // worldmap
            ds.get(defWorldMap).then(
                function (dataWorldMap) {
					$modal.dialog("close");
                    console.log("modal hide");
                    new FREDWorldMap.init(chartElemSelector, defWorldMap, dataWorldMap.worldmap, isSlave, rpcSession);
                });
            break;
        default:
            $modal.dialog("close");
            console.log("Error: unknown chart type" + def.chart_type);
    }
}