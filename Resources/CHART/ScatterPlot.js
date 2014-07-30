/**
 * Created by sreed on 5/29/2014.
 */
var dataDir = "DATA";

var defaultSize = 4;

var h, halfh, halfw, margin, totalh, totalw, w;

h = 600;
w = 700;

var minPointRadius = 3;
var maxPointRadius = 20;

szlegend = {
    width: Math.max( 2 * maxPointRadius + 50, 150),
    height: .5 * h,
    padding: 5,
    offset: 10,
    fill: "grey"
};
margin = {
    left: 100,
    top: 40,
    right: 10 + szlegend.width,
    bottom: 40,
    inner: 5
};
axispos = {
    xtitle: 25,
    ytitle: 80,
    sztitle: 25,
    xlabel: 5,
    ylabel: 5,
    szlabel: 5
};
titlepos = 20;

halfh = h + margin.top + margin.bottom;

totalh = halfh * 2;

halfw = w + margin.left + margin.right;

totalw = halfw * 2;

var chartClassName = "chart"
var chartDiv;
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
var szDataIndex = 2;

var nszticks = 11;

//var winSize = {
//    width: 600,
//    height: 300
//};


//padding = {
//    left: 60,
//    right: 60,
//    top: 60,
//    bottom: 80
//};

//inner = {
//    w: winSize.width - this.padding.left - this.padding.right,
//    h: winSize.height - this.padding.top - this.padding.bottom,
//    r: winSize.width - this.padding.right,
//    b: winSize.height - this.padding.bottom
//};

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
    var min = 0;
    var max = dateRange.length - 1;
    var fullRange = max - min;
    var numTicks = 4;
    var tickInterval = Math.max( 1, Math.floor(fullRange/(numTicks - 1)));
    chartDiv.append("div").attr("class", "slider");
    var dateLabelDiv = chartDiv.append("div").attr("id", "dateLabelSlider");
    var slideDiv = $(".slider");
    var slider = slideDiv.labeledslider({
        min: min,
        max: max,
        value: dateRange.indexOf(timeSlotDate), // start in center
        animate: "fast", // animate sliding
        tickInterval: tickInterval,
        tickLabels: getScatterLabels(),
        slide: function (event, ui) {
            var value = Math.round(ui.value);
            if (value != uiValue) {
                timeSlotDate = dateRange[value];
                $("#dateLabel").html(getScatterFormattedDate(timeSlotDate));
                $("#dateLabelSlider").html(getScatterFormattedDate(timeSlotDate));
                updateScatterChart();
                uiValue = value;
            }
        }
    });

    $("#dateLabel").html(getScatterFormattedDate(timeSlotDate));
    $("#dateLabelSlider").html(getScatterFormattedDate(timeSlotDate));
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

//    //Adding legend for our Choropleth
//    drawScatterLegend();

    //then draw the shapes
    drawScatterChart();

    // set up rollovers
    chart.pointsSelect().on("mouseover", function (d) {
        return d3.select(this).attr("r", 2 *  getScatterSize( this ));
    }).on("mouseout", function (d) {
        return d3.select(this).attr("r", getScatterSize( this ));
    });
    szscale = chart.szscale();
}

function getScatterSize( marker ){
    var datumIdx = parseInt(marker.id);
    var size = scatterPlotData.data[datumIdx][szDataIndex];
    return szscale(size);
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
    var szLab = statesData.size[0].title;
    var xLim = getScatterLim( statesData.x );
    var yLim = getScatterLim( statesData.y );
    var szLim = getScatterLim( statesData.size );
    var NA = getScatterNA();

    initScatterPlotData();

    chart = scatterplot()
        .xvar(xDataIndex).xlab(xLab).xlim(xLim).xNA(NA[xDataIndex])
        .yvar(yDataIndex).ylab(yLab).ylim(yLim).yNA(NA[yDataIndex]).rotate_ylab(true)
        .szvar(szDataIndex).szlab(szLab).szlim(szLim).szNA(NA[szDataIndex]).szlegend(szlegend).nszticks(nszticks)
        .minPointRadius(minPointRadius).maxPointRadius(maxPointRadius)
        .height(h).width(w).margin(margin)
        .axispos(axispos).titlepos(titlepos);

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
    var szData = loadScatterData(statesData.size );
    var data = [];
    for ( i in stateIds ) {
        var value = [];
        var idx = stateIds[i];
        value[xDataIndex] = getScatterDatum(xData, idx, "NA");
        value[yDataIndex] = getScatterDatum(yData, idx, "NA");
        value[szDataIndex] = getScatterDatum(szData, idx, defaultSize);
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
    var dataSets = [statesData.x, statesData.y, statesData.size];
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
        },
        {
            handle: false
        }
    ];

    // check if any values missing for particular dates
    for (idx in [0, 1, 2]) {
        if (!NA[idx].handle) {
            var dataset = dataSets[idx];
            for (i in dataset) {
                for (j in dataset[i].values) {
                    if (dataset[i].values[j] === "NA") {
                        NA[idx].handle = true;
                        break;
                    }
                }
                if (NA[idx].handle)
                    break;
            }
        }
    }

    // check if any dates each dataset are missing from the others
    for( i in [0, 1, 2] ) {
        for( j in [0, 1, 2] ) {
            if( i != j && !NA[j].handle )
                NA[j].handle = isScatterMissingDates(dataSets[i], dataSets[j]);
        }
    }

    return NA;
}

function isScatterMissingDates( standard, test ){
    for(i in standard ){
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