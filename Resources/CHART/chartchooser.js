/**
 * Created by scott on 6/12/14.
 */
path = "/Users/scott/Projects/projection.db"
var usmapParams = {
    category: "Human Capital",
    index: "0"
};
var isChart = false;
var chartDivs = ["#chartTitle","#dateLabel","#chartDescription","#chart"];

var ds = new Datasource(path);
ds.setup().then(
    function (defs) {
        var indent = 10;
        var menu = d3.select("body").append("div")
            .style({"width": "200px", "position": "fixed", "top": "450px", "left": "1000px"});
        for (var category in defs) {
//            console.log("Category: "+category);
            var def = defs[category];
            menu.append("p").style({"font-weight": "bold", "font-size": "8pt", "margin-top": "3px", "margin-bottom": "1px"})
                .html(category);
            menu.selectAll("p." + category).data(def).enter()
                .append("p").attr("class", category)
                .style({"margin-top": "0px", "margin-bottom": "1px"})
                .append("svg").attr("height", 8)
                .append("text")
                .style({"font-size": "6pt", "line-height": "90%", "alignment-baseline": "ideographic", "text-anchor": "start"})
                .attr("x", indent).attr("y", 4) // indent
                .on("click", function (d, i) {
                    console.log(d.chart_type + " " + d.category + " " + i);
                    selectChart(defs, d.chart_type, d.category, i);
                })
                .text(function (d) {
//                    console.log("Chart: "+d.chart_name);
                    return d.chart_name + "(" + d.chart_type + ")";
                    return text;
                });
        }
    });

var selectChart = function(defs, chartType, category, chartIndex) {
    if( isChart ) {
        // clean up previous chart
        for( var i in chartDivs)
            d3.select(chartDivs[i]).selectAll("*").remove();
    }

    isChart = true;
    switch (chartType) {
        case "line": // TBD: no data def yet
            var defTimeline = defs[category][+chartIndex]; // scatter
            ds.get(defTimeline).then(
                function (dataTimeline) {
                    new Timeline("#chart", defTimeline, dataTimeline);
                });
            break;
        case "scatter":
            var defUSMap = defs[usmapParams.category][+usmapParams.index]; // usmap for state names
            ds.get(defUSMap).then(
                function (dataUSMap) {
                    var defScatter = defs[category][+chartIndex]; // scatter
                    ds.get(defScatter).then(
                        function (dataScatter) {
                            new ScatterPlot("#chart", defScatter, dataScatter.scatter, dataUSMap.usmap.maps.state);
                        });
                });
            break;
        case "usmap":
            var defUSMap = defs[category][+chartIndex]; // usmap
            ds.get(defUSMap).then(
                function (dataUSMap) {
                    new USMap("#chart", defUSMap, dataUSMap.usmap);
                });
            break;
        case "worldmap":
            var defWorldMap = defs[category][+chartIndex]; // worldmap
            ds.get(defWorldMap).then(
                function (dataWorldMap) {
                    new WorldMap("#chart", defWorldMap, dataWorldMap.worldmap);
                });
            break;
        default:
            console.log("Error: unknown chart type" + def.chart_type);
    }
}