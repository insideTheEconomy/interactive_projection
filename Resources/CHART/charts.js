/**
 * Created by scott on 6/12/14.
 */
path = "/Users/scott/Projects/projection.db"
//path = "/Volumes/Pylos/Projects/FED/projection.db";
var chartType = "scatter";
//var chartType = "usmap";
//var chartType = "timeline";

var usmapParams = {
    category: "US Economic Stories",
    index: "0"
};

var scatterParams = {
    category: "US Economic Stories",
    index: "1"
};

var lineParams = {
    category: "US Economic Stories",
    index: "2"
};

var ds = new Datasource(path);
ds.setup().then(
    function (defs) {
        var defUSMap = defs[usmapParams.category][+usmapParams.index]; // usmap
        switch (chartType) {
            case "timeline": // TBD: no data def yet
                var defTimeline = defs[lineParams.category][+lineParams.index]; // scatter
                ds.get(defTimeline).then(
                    function(dataTimeline) {
                        new Timeline("#chart", defTimeline, dataTimeline );
                    });
                break;
            case "scatter":
                ds.get(defUSMap).then(
                    function (dataUSMap) {
                        var defScatter = defs[scatterParams.category][+scatterParams.index]; // scatter
                        ds.get(defScatter).then(
                            function(dataScatter) {
                                new ScatterPlot("#chart", defScatter, dataScatter.scatter, dataUSMap.usmap.maps.state );
                            });
                        });
                break;
            case "usmap":
                ds.get(defUSMap).then(
                    function (dataUSMap) {
                        new USMap("#chart", defUSMap, dataUSMap.usmap);
                    });
                break;
            default:
                console.log("Error: unknown chart type" + def.chart_type);
        }
    }
);