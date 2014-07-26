/**
 * Created by scott on 6/12/14.
 */
//path = "/Users/scott/Projects/projection.db"
path = "/Volumes/Pylos/Projects/FED/projection.db";
var chartType = "scatter";
var ds = new Datasource(path);
ds.setup().then(
    function (defs) {
        var defUSMap = defs.Category_1[0]; // usmap
        switch (chartType) {
            case "timeline": // TBD: no data def yet
                var defTimeline = defs.Category_3[0]; // scatter
                ds.get(defTimeline).then(
                    function(dataTimeline) {
                        new Timeline("#chart", defTimeline, dataTimeline );
                    });
                break;
            case "scatter":
                ds.get(defUSMap).then(
                    function (dataUSMap) {
                        var defScatter = defs.Category_3[0]; // scatter
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