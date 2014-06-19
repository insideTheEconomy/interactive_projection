/**
 * Created by scott on 6/12/14.
 */
path = "/Users/scott/Projects/projection.db"
//path = "/Volumes/Pylos/Projects/FED/projection.db";
var ds = new Datasource(path);
var defs;
var datasource;
ds.setup().then(
    function (d) {
        defs = d;
        //var def = defs.Category_1[0]; // usmap
        var def = defs.Category_3[0]; // scatter
        //$("body").html("<h1>Definitions:</h1><pre>"+JSON.stringify(defs,null,3)+"</pre>");
        ds.get(def).then(
            function (d) {
                data = d;
                console.log("done");
                setupChart(def, data);
            })
    }
)

function setupChart(def, data) {
    switch (def.chart_type) {
        case "scatter":
            new ScatterPlot("#chart", def, data.scatter);
            break;
        case "usmap":
            new USMap("#chart", def, data.usmap);
            break;
        default:
            console.log("Error: unknown chart type" + def.chart_type);
    }
}