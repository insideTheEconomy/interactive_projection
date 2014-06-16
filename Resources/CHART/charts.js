/**
 * Created by scott on 6/12/14.
 */
//path = "/Users/scott/Projects/projection.db"
path = "/Volumes/Pylos/Projects/FED/projection.db";
var ds = new Datasource(path);
var defs;
var datasource;
ds.setup().then(
    function(d){
        defs = d;
        var def = defs.Category_1[0];
        //$("body").html("<h1>Definitions:</h1><pre>"+JSON.stringify(defs,null,3)+"</pre>");
        ds.get(def).then(
            function(d){
                data = d;
                console.log("done");
               setupCharts(def, data);
            })
    }

)

function setupCharts( def, data ){
    new USMap("#chart", def, data.usmap);
}