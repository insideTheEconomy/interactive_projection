var dataDir = "DATA";

var domain;
var extent;

var scaleFactor = 1100;

var colors = [
    "#10069f",
    "#183085",
    "#1e4975",
    "#225c69",
    "#287659",
    "#2e9644",
    "#34b233",
    "#67b32b",
    "#9ab423",
    "#beb51d",
    "#d1b519",
    "#ffb612"
];
var nanColor = '#D5D2CA';

var selectedCountryOpacity = 1.0;
var unselectedCountryOpacity = 0.9;
//var stateFillOpacity = 0.3;
//var stateFillColor = "white"

var chartDiv;
var chartSvg;
var stateOutlines;
var mapRegions;
var countryDataLabel;
var mapCountryFeatures; // country map geometry
//var mapStateFeatures; // state map geometry
var colorScale; // color quantize scale
var pathMap; // path and projection
var countryData;
var activeState = null;

// zoom/pan tarnsform
var scale;
var translate;

var featureIds = [];
var countryValuesById = {};
var countryNameById = {};
var timeSlotDate = "2000-04-01";

var path = d3.geo.path()

var countryClicked = null;
var countryFeature = null;

var dbDefs;

var winSize = {
    width: 800,
    height: 600
};


//Start of Choropleth drawing

var WorldMap = function(sel, dataDefs, dataWorldMap) {

    chartDiv = d3.select(sel).attr("class","chart");
    chartSvg = chartDiv.append("svg").attr("width", winSize.width).attr("height", winSize.height)

    countryData = dataWorldMap.data;

    // get feature names and Ids
    dataWorldMap.map[0].features.forEach(function (feature, i) {
        featureIds.push(feature.id);
        countryNameById[feature.id] = feature.properties.name;
    });

    // get values for timeslot
    getMapTimeslotValues();

    d3.select("#chartTitle").text(dataDefs.chart_name);
    d3.select("#chartDescription").text(dataDefs.chart_text);

    //Drawing Choropleth
    initializeMapChart(dataWorldMap.map[0]); // draw map

    drawMapControls();
}// <-- End of WorldMap

var drawMapControls = function() {
    drawMapSlider();
}

var drawMapSlider = function() {
    var dateRange = getMapDateRange();
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
            $("#dateLabel").html(getMapFormattedDate(timeSlotDate));
//            // wait for the ui.handle to set its position
//            setTimeout(delay, 5);
            getMapTimeslotValues();
//            colorScale = getMapColorScale(countryData);
            updateMapChart();

            // if country is clicked, then update tooltip
            if (countryClicked) {
                updateCountryDataLabel();
            }
        }
    });

    $("#dateLabel").html(getMapFormattedDate(timeSlotDate));
}

//function drawMapResetButton() {
//    $("#resetBtn").button(
//        {
//            disabled: true,
//            label: "Reset Zoom",
//            id: "resetBtn"
//            //click: reset
//        }
//    ).on("click", resetMap);
//}

var getMapFormattedDate = function(dateString) {
    var date = new Date(dateString);
    var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return months[date.getMonth()] + " " + date.getFullYear();
}

var getMapTimeslotValues = function() {
    // get feature values for each timeSlot
    for (var i = 0; i < countryData.length; i++) {
        var timeSeries = countryData[i];
        if (timeSeries.date == timeSlotDate) {
            for (var j = 0; j < featureIds.length; j++) {
                countryValuesById[featureIds[j]] = parseFloat(timeSeries.values[j + 1]);
            }
            break;
        }
    }
}

// get data range from the data
var getMapDateRange = function() {
    var dateRange = [];
    var dataSets = countryData;
    $.each(dataSets, function (index) {
        dateRange.push(dataSets[index].date);
    });
    return dateRange.reverse();
}

var initializeMapChart = function(mapCountries) {
    // figure out scaling and translation
    // create a first guess for the projection
    // Create a unit projection.
    var projection = d3.geo.mercator()
        .scale(1)
        .translate([0, 0]);

    // Create a path generator.
    pathMap = d3.geo.path()
        .projection(projection);

    // Compute the bounds of a feature of interest, then derive scale & translate.
    var b = pathMap.bounds(mapCountries),
        b_s = b[0][1],
        b_n = b[1][1],
        b_w = b[0][0],
        b_e = b[1][0],
        b_height = Math.abs(b_n - b_s),
        b_width = Math.abs(b_e - b_w);
    var s = .95 / Math.max(b_width / winSize.width, (b_height / winSize.height)),
        t = [(winSize.width - s * (b[1][0] + b[0][0])) / 2, (winSize.height - s * (b[1][1] + b[0][1])) / 2];

    // Update the projection to use computed scale & translate.
    projection
        .scale(s)
        .translate(t);
    pathMap = pathMap.projection(projection);

    mapCountryFeatures = mapCountries.features;

    // get colorScale scale
    colorScale = getMapColorScale(countryData);

    //Adding legend for our Choropleth
    drawMapLegend();

    //then draw the shapes
    drawMapChart();
}

var drawMapChart = function() {
    // filled in counties
    mapRegions = chartSvg.append("g");
    mapRegions.selectAll("path.country").data(mapCountryFeatures).enter().append("path")
        .attr("class", "country")
        .style({
            "fill": function (d) {
                //apply fill from colorScale, or nanColor if NAN
                var val = countryValuesById[d.id];
                if (!isNaN(val)) {
                    return colorScale(val)
                } else {
                    return(nanColor);
                }
            },
            "opacity": unselectedCountryOpacity
        })
        // counties are clickable when state opacity is 0
        .on("click", onClickCountry)
        .attr("d", pathMap); //draw the paths

//    // state outlines on top
//    mapRegions.selectAll("path.state").data(mapStateFeatures).enter().append("path")
//        .attr("class", "state")
//        .style({
//            "fill": stateFillColor,
//            "fill-opacity": stateFillOpacity
//        })
//        .on("click", onClickState)
//        .attr("d", pathMap); //draw the paths
//
//    // size the chart to fit the container
//    chartSvg.attr("width", "100%")
//        .attr("height", "100%");

//    // get actual height and width and resize to fit container
//    var width = chartSvg.style("width").replace("px", "");
//    var height = chartSvg.style("height").replace("px", "");
//    chartSvg.attr("viewBox", "0 0 " + width + " " + height)
//        .attr("preserveAspectRatio", "xMaxYMax")
//        .attr("margin", "0 auto");

}

var updateMapChart = function() {
    // filled in mapRegions
    mapRegions.data(mapCountryFeatures).selectAll("path.country").transition()
        .style({
            "fill": function (d) {
                //apply fill from colorScale, or nanColor if NAN
                var val = countryValuesById[d.id];
                if (!isNaN(val)) {
                    return colorScale(val)
                } else {
                    return(nanColor);
                }
            },
            "opacity": function (d) {
                if (d === countryClicked) {
                    return selectedCountryOpacity;
                }
                else {
                    return unselectedCountryOpacity
                }
            }
        })
        .attr("d", pathMap);

//    // state outlines on top
//    mapRegions.data(mapStateFeatures).selectAll("path.state")
//        .attr("d", pathMap);
}

var drawMapLegend = function() {
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
        .style("opacity", unselectedCountryOpacity);

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

var onClickCountry = function(d) {
    countryClicked = d;
    countryFeature = this;
    updateCountryDataLabel();
}

var updateCountryDataLabel = function() {
    // add a label group if there isn't one yet
    if (!countryDataLabel) {
        countryDataLabel = chartSvg.append("g");

        countryDataLabel.append("rect")
            .attr("class", "countryDataLabel")
            .attr("rx", "5")
            .attr("ry", "5");

        countryDataLabel.append("text")
            .attr("class", "countryDataLabel")
            .attr("id", "countryDataLabelName");

        countryDataLabel.append("text")
            .attr("class", "countryDataLabel")
            .attr("id", "countryDataLabelValue");
    }

    var margin = 10;

    // get transformed, as-drawn coordinates of the country
    var brect = d3.select(countryFeature).node().getBoundingClientRect();

    // get offset of the chart div
    var offset = chartDiv.offset();

    d3.select("#countryDataLabelName").text(countryNameById[countryClicked.id]);
    var textWidthName = d3.select("#countryDataLabelName").node().getBBox().width;
    var textHeightName = d3.select("#countryDataLabelName").node().getBBox().height;

    d3.select("#countryDataLabelValue").text(displayMapValue());
    var textWidthValue = d3.select("#countryDataLabelValue").node().getBBox().width;
    var textHeightValue = d3.select("#countryDataLabelValue").node().getBBox().height;
    var rectWidth = Math.max(textWidthName, textWidthValue) + margin;

    // position the popup elements
    d3.select("#countryDataLabelName")
        .attr("x", +((brect.left + (brect.width - textWidthName) / 2 - offset.left))) // center on the country
        .attr("y", +(brect.top + brect.height / 2 - offset.top) + margin);

    d3.select("#countryDataLabelValue")
        .attr("x", +((brect.left + (brect.width - textWidthValue) / 2 - offset.left))) // center on the country
        .attr("y", +(textHeightName + brect.top + brect.height / 2 - offset.top) + margin);

    // Update the width and height of the rectangle to match the text, with a little padding
    var rectHeight = textHeightName + textHeightValue + margin;
    d3.select("rect.countryDataLabel")
        .attr("width", rectWidth + 5)
        .attr("height", rectHeight + 5)
        .attr("x", +(brect.left + (brect.width - rectWidth) / 2 - offset.left)) // center on the country
        .attr("y", +(brect.top + brect.height / 2 - offset.top - margin));

    d3.select("#countryDataLabelName").attr("visibility", "visible");
    d3.select("#countryDataLabelValue").attr("visibility", "visible");
    d3.select("rect.countryDataLabel").attr("visibility", "visible");
    countryDataLabel.attr("d", pathMap);
}

var displayMapValue = function() {
    var val = countryValuesById[countryClicked.id];
    if (isNaN(val))
        return "undefined";
    else
        return +val;
}

//function onClickState(feature) {
//    if (activeState) {
//        resetMap();
//        if (this == null)
//            return;
//    }
//    activeState = d3.select(this).classed("active", true)
//        .style("fill", "none"); // make counties clickable
//
//    // enable the reset button
//    $("#resetBtn").button("option", "disabled", false);
//
//    // zoom to the state
//    var chartWidth = chartDiv.width();
//    var chartHeight = chartDiv.height();
//    var bounds = pathMap.bounds(feature),
//        dx = bounds[1][0] - bounds[0][0],
//        dy = bounds[1][1] - bounds[0][1],
//        x = (bounds[0][0] + bounds[1][0]) / 2,
//        y = (bounds[0][1] + bounds[1][1]) / 2;
//    scale = .9 / Math.max(dx / chartWidth, dy / chartHeight);
//    translate = [chartWidth / 2 - scale * x, chartHeight / 2 - scale * y];
//
//    mapRegions.transition()
//        .duration(500)
//        .style("stroke-width", 1.5 / scale + "px")
//        .attr("transform", "translate(" + translate + ")scale(" + scale + ")");
//}

//function resetMap() {
//    // unclick country (if there was one)
//    countryClicked = null;
//    countryFeature = null;
//
//    // hide the tooltip
//    d3.select("#countryDataLabelName").attr("visibility", "hidden");
//    d3.select("#countryDataLabelValue").attr("visibility", "hidden");
//    d3.select("rect.countryDataLabel").attr("visibility", "hidden");
//
//    //
//    activeState.classed("active", false)
//        .style("fill", stateFillColor);
//    activeState = null;
//
//    // disable the reset btn
//    $("#resetBtn").button("option", "disabled", true)
//
//    // unzoom/unpan
//    mapRegions.transition()
//        .duration(500)
//        .style("stroke-width", "1.5px")
//        .attr("transform", "translate(0,0) scale(1)");
//}

var getMapColorScale = function(featuresData) {
    // get extent of data for all timeseries
    var domainExtent = [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY];
    var dataArray = [];
    var dataArrayIndex = 0;
    var total = 0;
    var count = 0;
    for (var i = 0; i < featuresData.length; i++) {
        var timeSeries = featuresData[i];
        for (var j = 0; j < featureIds.length; j++) {
            var val = parseFloat(timeSeries.values[j + 1]);
            if (!isNaN(val)) {
                dataArray[dataArrayIndex++] = val;
                total += val;
                count++;
            }
//            if (val) {
//                if (val < domainExtent[0]) {
//                    domainExtent[0] = val;
//                }
//                if (val > domainExtent[1]) {
//                    domainExtent[1] = val;
//                }
//        }
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

var getColorDomainExtent = function(domainExtent) {
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

//var log10 = function(x) {
//    return Math.log(x) * Math.LOG10E;
//}