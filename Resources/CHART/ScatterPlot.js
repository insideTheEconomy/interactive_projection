/**
 * Created by sreed on 5/29/2014.
 */
var dataDir = "DATA";

var defaultSize = 4;

var h, halfh, halfw, margin, totalh, totalw, w;

h = 600;
w = 800;

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

var chartClassName = "chart"
var chartDiv;
var chartSvg;
var chart;

var timeSlotDate;

var stateIds = [];
var statesData = {};
var statesGeoData = {};
var stateNamesById = {};
var stateNames = [];
var statesGeoFeatures; // state map data
var dateRange;

var statesDataDefs;

var xDataIndex = 0;
var yDataIndex = 1;
var sizeDataIndex = 2;  //TBD!!!

var minPointsize = 3;
var maxPointsize = 15;

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

var ScatterPlot = function (sel, dataDefsArg, statesDataArg, statesGeoDataArg) {
    statesDataDefs = dataDefsArg;
    statesData = statesDataArg;
    statesGeoData = statesGeoDataArg;

    statesGeoFeatures = statesGeoData.features;
    // get feature names and Ids
    statesGeoFeatures.forEach(function (feature, i) {
        stateIds.push(feature.id);
        stateNamesById[feature.id] = feature.properties.name;
    });
    // convert names by ID to names by index
    for( var i = 0; i<stateIds.length; i++){
        stateNames.push(stateNamesById[stateIds[i]]);
    }

    chartDiv = d3.select(sel).attr("class", chartClassName);
    //chartSvg = chartDiv.append("svg").attr("width", winSize.width).attr("height", winSize.height);

    dateRange = getScatterDateRange();
    timeSlotDate = dateRange[0];

    // get plot data for this time slot
    scatterPlotData = initScatterPlotData();

    d3.select("#chartTitle").text(statesDataDefs.chart_name);
    d3.select("#chartDescription").text(statesDataDefs.chart_text);

    initializeScatterChart(); // draw plot

    drawScatterControls();
}// <-- End of ScatterPlot

function drawScatterControls() {
    drawScatterSlider();
}
function drawScatterSlider() {
    var uiValue = null;
    chartDiv.append("div").attr("class", "slider");
    $(".slider").labeledslider({
        min: 0,
        max: dateRange.length - 1,
        value: dateRange.indexOf(timeSlotDate), // start in center
        animate: "fast", // animate sliding
        tickLabels: getScatterLabels(),
        slide: function (event, ui) {
            var value = Math.round(ui.value);
            if (value != uiValue) {
                timeSlotDate = dateRange[value];
                $("#dateLabel").html(getScatterFormattedDate(timeSlotDate));
                updateScatterChart();
                uiValue = value;
            }
        }
    });

    $("#dateLabel").html(getScatterFormattedDate(timeSlotDate));
}

function getScatterLabels() {
    var labels = [];
    for( var i=0; i<dateRange.length; i++){
        var date = new Date(dateRange[i]);
        labels.push( date.getFullYear() )
    }
    return labels;
}

function getScatterFormattedDate(dateString) {
    var date = new Date(dateString);
    var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return months[date.getMonth()] + " " + date.getFullYear();
}


// get data union of all the dates from the data
function getScatterDateRange() {
    var dateRange = [];
    var dataSets = [statesData.x, statesData.y, statesData.size];
    $.each(dataSets, function (index) {
        if (typeof dataSets[index] !== "undefined") {
            $.each(dataSets[index], function (slot) {
                var date = dataSets[index][slot].date;
                if ($.inArray(date, dateRange) == -1) // date not in dateRange already?
                    dateRange.push(date);
            });
        }
    });
    return dateRange.sort();
}

function initializeScatterChart() {
    // get transformed, as-drawn coordinates of the div
    var divRect = chartDiv.node().getBoundingClientRect();

    // get colorScale scale
    colorScale = getScatterColorScale(statesData);

    //Adding legend for our Choropleth
    drawScatterLegend();

    //then draw the shapes
    drawScatterChart();

    // set up rollovers
    chart.pointsSelect().on("mouseover", function (d) {
        return d3.select(this).attr("r", 2 *  getScatterSize( this ));
    }).on("mouseout", function (d) {
        return d3.select(this).attr("r", getScatterSize( this ));
    });
}

function getScatterSize( marker ){
    var datumIdx = parseInt(marker.id);
    var size = scatterPlotData.data[datumIdx][sizeDataIndex];
    return size;
}

function drawScatterLegend() {
    if (!colorScale)
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

}

function drawScatterChart() {
    var xLab = statesData.x[0].title;
    var yLab = statesData.y[0].title;
    var xLim = getScatterLim( statesData.x );
    var yLim = getScatterLim( statesData.y );
    var NA = getScatterNA();
    var sizeLab = "TBD";

    initScatterPlotData();

    chart = scatterplot()
        .xvar(xDataIndex).xlab(xLab).xlim(xLim).xNA(NA[0])
        .yvar(yDataIndex).ylab(yLab).ylim(yLim).yNA(NA[1]).rotate_ylab(true)
        .sizevar(sizeDataIndex).sizelab(sizeLab).sizelim([minPointsize, maxPointsize])
        .height(h).width(w).margin(margin);

    d3.select("." + chartClassName)
        .datum(scatterPlotData)
        .call(chart);

    d3.select("." + chartClassName)
        .call(chart.initPoints);
}

function updateScatterChart() {
    updateScatterPlotData();
    d3.select("." + chartClassName)
        .call(chart.updatePoints);
}

function displayScatterValue() {
    var val = countyValuesById[countyClicked.id];
    if (isNaN(val))
        return "undefined";
    else
        return +val;
}

function getScatterColorScale(featuresData) {
    if (typeof featuresData.size === "undefined")
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

function getScatterColorDomainExtent(domainExtent) {
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

function initScatterPlotData() {
    scatterPlotData = {
        "data": [],
        "indID": stateNames };
    updateScatterPlotData();
}

function updateScatterPlotData(){
    var xData = loadScatterData(statesData.x );
    var yData = loadScatterData(statesData.y );
    var zData = loadScatterData(statesData.size );
    var data = [];
    for ( i in stateIds ) {
        var value = [];
        var idx = stateIds[i];
        value[xDataIndex] = getScatterDatum(xData, idx, "NA");
        value[yDataIndex] = getScatterDatum(yData, idx, "NA");
        value[sizeDataIndex] = getScatterDatum(zData, idx, defaultSize);
        data.push(value);
    }
    scatterPlotData.data = data;
}

function loadScatterData( dataSet ){
    if (typeof dataSet !== "undefined")
        for ( i in dataSet ) {
            if (dataSet[i].date === timeSlotDate) {
                return dataSet[i].values;
            }
        }
    else
        return null;
}

function getScatterDatum(data, index, defaultVal) {
    if (!data || (typeof data[index] === "undefined"))
        return defaultVal;
    else {
        var value = parseFloat(data[index]);
        return value;
    }
}

function getScatterLim( dataSet ){
    var lim = [Number.MAX_VALUE, Number.MIN_VALUE];
    for( i in dataSet ) {
        var data = dataSet[i].values;
        // look for min and max
        for (j in data) {
            var value = parseFloat(data[j]);
            if (value < lim[0]) {
                lim[0] = value;
            }
            if (value > lim[1]) {
                lim[1] = value;
            }
        }
    }
    return lim;
}

function getScatterNA() {
    var xIdx = 0;
    var yIdx = 1;
    var dataSets = [statesData.x, statesData.y];
    var NA = [
        {
            handle: false,
            force: false,
            width: 15,
            gap: 10
        },
        {
            handle: false,
            force: false,
            width: 15,
            gap: 10
        }
    ];
    // check if any x dates are missing from y
    NA[yIdx].handle = isScatterMissingDates(dataSets[xIdx], dataSets[yIdx]);
    // check if any y dates are missing from x
    NA[xIdx].handle = isScatterMissingDates(dataSets[yIdx], dataSets[xIdx]);

    // check if any values missing for particular dates
    for (idx in [0, 1]) {
        if (!NA[idx].handle) {
            var dataset = dataSets[idx];
            for (i in dataset) {
                for (j in dataset.values) {
                    if (dataset.values[j] === "NA") {
                        NA[idx].handle = true;
                        break;
                    }
                }
                if (NA[idx].handle)
                    break;
            }
        }
    }
    return NA;
}

function isScatterMissingDates( standard, test ){
    for( i in standard ){
        var date = standard[i].date;
        var missing = true;
        for( j in test ) {
            if (test[j].date === date) {
                missing = false;
                break;
            }
        }
        if( missing ) {
            return true;
        }
    }
    return false;
}

function log10(x) {
    return Math.log(x) * Math.LOG10E;
}