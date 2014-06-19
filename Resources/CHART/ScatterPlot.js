/**
 * Created by sreed on 5/29/2014.
 */
var dataDir = "DATA";

var defaultSize = 10;

var h, halfh, halfw, margin, totalh, totalw, w;

h = 300;
w = 400;

margin = {
    left: 60,
    top: 40,
    right: 40,
    bottom: 40,
    inner: 5
};

halfh = h + margin.top + margin.bottom;

totalh = halfh * 2;

halfw = w + margin.left + margin.right;

totalw = halfw * 2;

//d3.json(dataDir + "/" + "data.json", function(data) {
//    var mychart;
//    mychart = scatterplot().xvar(0).yvar(1).xlab("X1").ylab("X2").height(h).width(w).margin(margin);
//    d3.select("div#plot").datum({
//        data: data
//    }).call(mychart);
//    return mychart.pointsSelect().on("mouseover", function(d) {
//        return d3.select(this).attr("r", mychart.pointsize() * 3);
//    }).on("mouseout", function(d) {
//        return d3.select(this).attr("r", mychart.pointsize());
//    });
//});



var chartDiv;
var chartSvg;

var timeSlotDate = "2000-04-01";

var featureIds = [];
var stateData;
var stateXValuesById = {};
var stateYValuesById = {};
var stateZValuesById = {};
var stateNameById = {};

var dbDefs;

var winSize = {
    width: 600,
    height: 300
};


padding = {
    left: 60,
    right: 60,
    top: 60,
    bottom: 60
};

inner = {
    w: winSize.width - this.padding.left - this.padding.right,
    h: winSize.height - this.padding.top - this.padding.bottom,
    r: winSize.width - this.padding.right,
    b: winSize.height - this.padding.bottom
};

//Start of Choropleth drawing

var ScatterPlot = function(sel, dataDefs, data) {
    dbDefs = dataDefs;

    chartDiv = d3.select(sel).attr("class","chart");
    chartSvg = chartDiv.append("svg").attr("width", winSize.width).attr("height", winSize.height)

    stateData = data;

    // get feature names and Ids
    data.x.forEach(function (feature, i) {
        featureIds.push(feature.id);
        stateNameById[feature.id] = feature.properties.name;
    });

    // get values for timeslot
    getTimeslotValues();

    d3.select("#chartTitle").text(dbDefs.chart_name);
    d3.select("#chartDescription").text(dbDefs.chart_text);

    initializeChart(); // draw map

    drawControls();
}// <-- End of USMap

function drawControls() {
    drawSlider();
    //drawResetButton();
}

function drawSlider() {
    var dateRange = getDateRange();
    chartDiv.append("div").attr("class","slider");
    $(".slider").slider({
        min: 0,
        max: dateRange.length - 1,
        value: dateRange.indexOf(timeSlotDate), // start in center
        animate: "fast", // animate sliding
        slide: function (event, ui) {
            //console.log(ui.value, dateRange[ui.value]);
//            var delay = function () {
            timeSlotDate = dateRange[ui.value];
            $("#dateLabel").html(getFormattedDate(timeSlotDate));
//            // wait for the ui.handle to set its position
//            setTimeout(delay, 5);
        },
        stop: function (event, ui) {
            getTimeslotValues();
//            colorScale = getColorScale(stateData);
            updateChart();

            // if county is clicked, then update tooltip
            if (countyClicked) {
                updateCountyDataLabel();
            }
        }
    });

    $("#dateLabel").html(getFormattedDate(timeSlotDate));
}
//
//function drawResetButton() {
//    $("#resetBtn").button(
//        {
//            disabled: true,
//            label: "Reset Zoom",
//            id: "resetBtn",
//            //click: reset
//        }
//    ).on("click", reset);
//}

function getFormattedDate(dateString) {
    var date = new Date(dateString);
    var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return months[date.getMonth()] + " " + date.getFullYear();
    ;
}

function getTimeslotValues() {
    // get feature values for each timeSlot
    for (var i = 0; i < stateData.length; i++) {
        var xTimeSeries = stateData[i].x.values;
        var yTimeSeries = stateData[i].y.values;
        var zTimeSeries = stateData[i].size.values;
        if (timeSeries.date == timeSlotDate) {
            for (var j = 0; j < featureIds.length; j++) {
                stateXValuesById[featureIds[j]] = parseFloat(xTimeSeries.values[j + 1]);
                stateYValuesById[featureIds[j]] = parseFloat(yTimeSeries.values[j + 1]);
                stateZValuesById[featureIds[j]] = parseFloat(zTimeSeries.values[j + 1]);
            }
            break;
        }
    }
}

// get data range from the data
function getDateRange() {
    var dateRange = [];
    var dataSets = countyData;
    $.each(dataSets, function (index) {
        dateRange.push(dataSets[index].date);
    });
    return dateRange.reverse();
}

function initializeChart() {
    // get transformed, as-drawn coordinates of the div
    var divRect = chartDiv.node().getBoundingClientRect();

    // get colorScale scale
    colorScale = getColorScale(stateData);

    //Adding legend for our Choropleth
    drawLegend();

    //then draw the shapes
    drawChart();
}

function drawLegend() {
    if( !colorScale )
        return; // no legend

    // get the threshold value for each of the colors in the color scale
    var domainElems = [];
    $.each(colors, function (index) {
        var domainExtent = colorScale.invertExtent(colors[index]);
        domainElems[index] = domainExtent[0];
    });

    // set labels for the legend color bar
    var legendLabels = [ "< " + domainElems[1].toFixed(1) ]; // initial element
    for (var i = 1; i < domainElems.length; i++) {
        legendLabels[i] = +domainElems[i].toFixed(1) + "+";
    }

    // reverse order so we draw bar from highest value (top) first to lowest (bottom) last
    legendLabels.reverse();
    domainElems.reverse();

    // get the legend DOM element
    var legendSvg = d3.select("#legend").append("svg");

    legend = legendSvg.selectAll("g.legend")
        .data(domainElems)
        .enter().append("g")
        .attr("class", "legend");

    var lsW = 30, lsH = 30;
    var lsYMargin = 2 * lsH;
    var lsTextYOffset = lsH / 2 + 4;
    var lsTextXOffset = lsW * 2;

    legend.append("rect")
        .attr("x", 20)
        .attr("y", function (d, i) {
            var yVal = (i * lsH) + lsYMargin;
            //console.log("d,i,y",d,i,yVal);
            return yVal;
        })
        .attr("width", lsW)
        .attr("height", lsH)
        .style("fill", function (d, i) {
            //console.log("d,i",d,i,colorScale(d));
            return colorScale(d);
        })
        .style("opacity", unselectedCountyOpacity);

    legend.append("text")
        .attr("x", lsTextXOffset)
        .attr("y", function (d, i) {
            return (i * lsH) + lsYMargin + lsTextYOffset;
        })
        .attr("font-weight", "bold")
        .text(function (d, i) {
            return legendLabels[i];
        });

};

function drawChart() {
    var chart = nv.models.scatterChart()
        .showDistX(true)    //showDist, when true, will display those little distribution lines on the axis.
        .showDistY(true)
        .transitionDuration(350)
        .color(d3.scale.category10().range());

    //Configure how the tooltip looks.
    chart.tooltipContent(function (key) {
        return '<h3>' + key + '</h3>';
    });

    //Axis settings
    chart.xAxis.tickFormat(d3.format('.02f'));
    chart.yAxis.tickFormat(d3.format('.02f'));

//    //We want to show shapes other than circles.
//    chart.scatter.onlyCircles(false);

    d3.select(chartSvg)
        .datum(stateData)
        .call(chart);

    nv.utils.windowResize(chart.update);

//    mychart = scatterplot().xvar(0).yvar(1).xlab(dbDefs).ylab(dbDefs).height(h).width(w).margin(margin);
//    chartSvg.datum({
//        data: data
//    }).call(mychart);
//
//    // size the chart to fit the container
//    chartSvg.attr("width", "100%")
//        .attr("height", "100%");
//
//    // get actual height and width and resize to fit container
//    var width = chartSvg.style("width").replace("px", "");
//    var height = chartSvg.style("height").replace("px", "");
//    chartSvg.attr("viewBox", "0 0 " + width + " " + height)
//        .attr("preserveAspectRatio", "xMaxYMax")
//        .attr("margin", "0 auto");
}

//function updateChart() {
//    var mychart;
//    mychart = scatterplot().xvar(0).yvar(1).xlab("X1").ylab("X2").height(h).width(w).margin(margin);
//    d3.select("div#plot").datum({
//        data: stateData
//    }).call(mychart);
//    return mychart.pointsSelect().on("mouseover", function(d) {
//        return d3.select(this).attr("r", mychart.pointsize() * 3);
//    }).on("mouseout", function(d) {
//        return d3.select(this).attr("r", mychart.pointsize());
//    });
//
////    // filled in mapRegions
////    mapRegions.data(mapCountyFeatures).selectAll("path.county")
////        .style({
////            "fill": function (d) {
////                //apply fill from colorScale, or nanColor if NAN
////                var val = countyValuesById[d.id];
////                if (!isNaN(val)) {
////                    return colorScale(val)
////                } else {
////                    return(nanColor);
////                }
////            },
////            "opacity": function (d) {
////                if (d === countyClicked) {
////                    return selectedCountyOpacity;
////                }
////                else {
////                    return unselectedCountyOpacity
////                }
////            }
////        });
////
////    // state outlines on top
////    mapRegions.data(mapStateFeatures).selectAll("path.state")
////        .attr("d", pathMap);
//}
//
//function onClickCounty(d) {
//    countyClicked = d;
//    countyFeature = this;
//    updateCountyDataLabel();
//}
//
//function updateCountyDataLabel() {
//    // add a label group if there isn't one yet
//    if (!countyDataLabel) {
//        countyDataLabel = chartSvg.append("g");
//
//        countyDataLabel.append("rect")
//            .attr("class", "countyDataLabel")
//            .attr("rx", "5")
//            .attr("ry", "5");
//
//        countyDataLabel.append("text")
//            .attr("class", "countyDataLabel")
//            .attr("id", "countyDataLabelName");
//
//        countyDataLabel.append("text")
//            .attr("class", "countyDataLabel")
//            .attr("id", "countyDataLabelValue");
//    }
//
//    var margin = 10;
//
//    // get transformed, as-drawn coordinates of the county
//    var brect = d3.select(countyFeature).node().getBoundingClientRect();
//
//    // get offset of the chart div
//    var offset = $("#chart").offset();
//
//    d3.select("#countyDataLabelName").text(countyNameById[countyClicked.id]);
//    var textWidthName = d3.select("#countyDataLabelName").node().getBBox().width;
//    var textHeightName = d3.select("#countyDataLabelName").node().getBBox().height;
//
//    d3.select("#countyDataLabelValue").text(displayValue());
//    var textWidthValue = d3.select("#countyDataLabelValue").node().getBBox().width;
//    var textHeightValue = d3.select("#countyDataLabelValue").node().getBBox().height;
//    var rectWidth = Math.max(textWidthName, textWidthValue) + margin;
//
//    // position the popup elements
//    d3.select("#countyDataLabelName")
//        .attr("x", +((brect.left + (brect.width - textWidthName) / 2 - offset.left))) // center on the county
//        .attr("y", +(brect.top + brect.height / 2 - offset.top) + margin);
//
//    d3.select("#countyDataLabelValue")
//        .attr("x", +((brect.left + (brect.width - textWidthValue) / 2 - offset.left))) // center on the county
//        .attr("y", +(textHeightName + brect.top + brect.height / 2 - offset.top) + margin);
//
//    // Update the width and height of the rectangle to match the text, with a little padding
//    var rectHeight = textHeightName + textHeightValue + margin;
//    d3.select("rect.countyDataLabel")
//        .attr("width", rectWidth + 5)
//        .attr("height", rectHeight + 5)
//        .attr("x", +(brect.left + (brect.width - rectWidth) / 2 - offset.left)) // center on the county
//        .attr("y", +(brect.top + brect.height / 2 - offset.top - margin));
//
//    d3.select("#countyDataLabelName").attr("visibility", "visible");
//    d3.select("#countyDataLabelValue").attr("visibility", "visible");
//    d3.select("rect.countyDataLabel").attr("visibility", "visible");
//    countyDataLabel.attr("d", pathMap);
//}

function displayValue() {
    var val = countyValuesById[countyClicked.id];
    if (isNaN(val))
        return "undefined";
    else
        return +val;
}

function onClickState(feature) {
    if (activeState) {
        reset();
        if (this == null)
            return;
    }
    activeState = d3.select(this).classed("active", true)
        .style("fill", "none"); // make counties clickable

    // enable the reset button
    $("#resetBtn").button("option", "disabled", false);

    // zoom to the state
    var chartWidth = $(".chart").width();
    var chartHeight = $(".chart").height();
    var bounds = pathMap.bounds(feature),
        dx = bounds[1][0] - bounds[0][0],
        dy = bounds[1][1] - bounds[0][1],
        x = (bounds[0][0] + bounds[1][0]) / 2,
        y = (bounds[0][1] + bounds[1][1]) / 2;
    scale = .9 / Math.max(dx / chartWidth, dy / chartHeight);
    translate = [chartWidth / 2 - scale * x, chartHeight / 2 - scale * y];

    mapRegions.transition()
        .duration(500)
        .style("stroke-width", 1.5 / scale + "px")
        .attr("transform", "translate(" + translate + ")scale(" + scale + ")");
}

function reset() {
    // unclick county (if there was one)
    countyClicked = null;
    countyFeature = null;

    // hide the tooltip
    d3.select("#countyDataLabelName").attr("visibility", "hidden");
    d3.select("#countyDataLabelValue").attr("visibility", "hidden");
    d3.select("rect.countyDataLabel").attr("visibility", "hidden");

    //
    activeState.classed("active", false)
        .style("fill", stateFillColor);
    activeState = null;

    // disable the reset btn
    $("#resetBtn").button("option", "disabled", true)

    // unzoom/unpan
    mapRegions.transition()
        .duration(500)
        .style("stroke-width", "1.5px")
        .attr("transform", "translate(0,0) scale(1)");
}

function getColorScale(featuresData) {
    if( typeof featuresData.size === "undefined" )
      return null; // no color scale if no size data

    // get extent of size data
    var sizeData = featuresData.size;
    var domainExtent = [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY];
    var dataArray = [];
    var dataArrayIndex = 0;
    var total = 0;
    var count = 0;
    for (var i = 0; i < sizeData.length; i++) {
        var val = parseFloat(sizeData[i]);
        if (!isNaN(val)) {
            dataArray[dataArrayIndex++] = val;
            total += val;
            count++;
        }
    }

    var mean = total / count;
    var stdDevSum = 0;
    for (i = count; i--; stdDevSum += Math.pow(dataArray[i] - mean, 2));
    var variance = stdDevSum / count;
    var stdev = Math.sqrt(variance);

    var niceDomainExtent = [mean - 2 * stdev, mean + 2 * stdev];

    var colorScale = d3.scale.quantize()
        .domain(niceDomainExtent)
        .range(colors);

    return colorScale;
}

function getColorDomainExtent(domainExtent) {
    var niceDomainExtent = [];
    // make the domain extent round numbers
    var dx = domainExtent[1] - domainExtent[0];

    // set start of color extent to zero if min data is less than 50% of of the way to the middle of the extent
    if (domainExtent[0] < (domainExtent[0] + dx / 2))
        niceDomainExtent[0] = 0;
    else // otherwise, just round it
        niceDomainExtent[0] = Math.round(domainExtent[0]);

    niceDomainExtent[1] = Math.ceil(domainExtent[1]);

    return niceDomainExtent;
}

// Database operations
function getDataDeferred(dataName, callback) {
    //console.log("getDataDeferred", dataName, callback);
    initDB(function () {
        console.log(dataName, "inited.");
        ds.getByName(dataName).then(function (d) {
            var data = d;
            var def;
            for (var i = 1; dbDefs["Category_" + i]; i++) {
                if (dbDefs["Category_" + i][0].chart_name == dataName) {
                    def = dbDefs["Category_" + i][0];
                    break;
                }
            }
            //$("#json").text(JSON.stringify(Object.keys(d),null,2));
            callback(null, {"dataDef": def, "data": data});
        });
    });
}

//var isInited = false;
//var ds;
//
//function initDB(callback) {
//    if (isInited) {
//        callback();
//    } else {
//        console.log("init");
//
//        ds = new datasource(dataDir);	//create an instance of the datasource
//        ds.setup().then(		//call setup() and wait for the defered
//            function (d) {
//                dbDefs = d;		//to get the definitions, which is an object whose keys are categories
//                isInited = true;
//                callback();
//            }
//        );
//    }
//}

function getScatterData(data) {
    var scatterData = [];

    scatterData.push({
        key: 'Group',
        values: []
    });

    for (i = 0; i < data.x.length; i++) {
        if( typeof data.size === "undefined" )
            scatterData.values.push({x: data.x[i], y: data.y[i], z: defaultSize});
        else
            scatterData.values.push({x: data.x[i], y: data.y[i], z: data.size[i]});
    }

    return scatterData;
}


function log10(x) {
    return Math.log(x) * Math.LOG10E;
}