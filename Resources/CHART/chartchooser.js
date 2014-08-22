/**
 * Created by scott on 6/12/14.
 */

window.iprojConfig;

configFile = process.env.HOME + "/exhibit/iproj.json";

try {
    //user config
    window.iprojConfig = require(configFile);
} catch (e) {
    //defaults
    window.iprojConfig = require("./iproj.json")
}
console.log("config loaded", window.iprojConfig);
path = window.iprojConfig.dbPath;

var gui = require('nw.gui');

var ds = new Datasource(path);

if (!('contains' in String.prototype)) {
    String.prototype.contains = function (str, startIndex) {
        return -1 !== String.prototype.indexOf.call(this, str, startIndex);
    };
}

var chartElemSelector = "#" + FREDChart.chartDivId;

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
                                                     url: 'ws://localhost:8080/ws',
                                                     realm: 'iproj'
                                                 }
        );

        connection.onopen = function (rpcSession) {
            FREDChart.rpcSession = rpcSession;
            console.log("Connection Open");
            var menu;
            var isMaster = $("body").attr("class").contains("master") &&
                gui.App.argv[0] != "-slave";

            // basic page configuration
            d3.select("body").append("div").attr("id", FREDChart.wrapperDivId);
            if (isMaster) {
                menu = d3.select("#" + FREDChart.wrapperDivId).append("div").attr("id", FREDChart.menuDivId);
            }
            d3.select("#" + FREDChart.wrapperDivId).append("div").attr("id", FREDChart.chartDivId);
            
            if (isMaster) {
                FREDChart.rpcSession.call(FREDChart.rpcURLPrefix + "test",["OK","YES"]).then(
                    function(arg){console.log("call worked", arg);},
                    function(error){console.log("call failed", error);}
                );
                startMaster(menu, defs);
            } else {
                FREDChart.rpcSession.register(FREDChart.rpcURLPrefix + "test",function(args){
                    console.log(args[0],args[1]);
                    return "CALLED";
                });
                startSlave(defs);
            }
        }

        connection.open();
    });

var startMaster = function (menu, defs) {

    /*
     $("body").plainOverlay({
     fillColor: "green",
     //progress: function() { return $('<img src="images/wait.gif"/>'); }
     });
     */

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

                var args = [i,i];
                console.log("!args:" + (!args) + " || args instanceof Array:" +
                            (args instanceof Array));
                    var uri = FREDChart.rpcURLPrefix + "selectChart";



                FREDChart.rpcSession.call(uri, args, d); // call slave first to register calls

                selectChart(defs, d, i, true);
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

var startSlave = function (defs) {
    // register selection call
    FREDChart.rpcSession.register(FREDChart.rpcURLPrefix + "selectChart", function (args, kwargs) {
        var chartIndex = args[0];
        var d = kwargs;
        selectChart(defs, d, chartIndex, false);
    }).then(
        function (registration) {
            console.log(registration);
        },
        function (error) {
            console.log(error.error+": \""+error.args[0]+"\"");;
        }
    );
}

var selectChart = function (defs, d, chartIndex, isMaster) {
    var chartType = d.chart_type;
    var regionType = d.region_type;
    var category = d.category;
    var regionMetadata = ds.placeKey[regionType];
    switch (chartType) {
        case "line":
            var defTimeline = defs[category][+chartIndex]; // line
            ds.get(defTimeline).then(
                function (dataTimeline) {
                    $modal.dialog("close");
                    console.log("modal hide");
                    new FREDTimeline.init(chartElemSelector, defTimeline, dataTimeline,
                                          regionMetadata, isMaster);
                });
            break;
        case "scatter":
            var defScatter = defs[category][+chartIndex]; // scatter
            ds.get(defScatter).then(
                function (dataScatter) {
                    $modal.dialog("close");
                    console.log("modal hide");
                    new FREDScatterPlot.init(chartElemSelector, defScatter, dataScatter.scatter,
                                             regionMetadata, isMaster);
                });
            break;
        case "usmap":
            var defUSMap = defs[category][+chartIndex]; // usmap
            ds.get(defUSMap).then(
                function (dataUSMap) {
                    $modal.dialog("close");
                    console.log("modal hide");
                    new FREDUSMap.init(chartElemSelector, defUSMap, dataUSMap.usmap, isMaster);
                });
            break;
        case "worldmap":
            var defWorldMap = defs[category][+chartIndex]; // worldmap
            ds.get(defWorldMap).then(
                function (dataWorldMap) {
                    $modal.dialog("close");
                    console.log("modal hide");
                    new FREDWorldMap.init(chartElemSelector, defWorldMap, dataWorldMap.worldmap,
                                          isMaster);
                });
            break;
        default:
            $modal.dialog("close");
            console.log("Error: unknown chart type" + chartType);
    }
}