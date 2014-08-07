var FREDUSMap = (function (module) {
    var selectedCountyOpacity = 1.0;
    var unselectedCountyOpacity = 0.9;
    var stateFillOpacity = 0.3;
    var stateFillColor = "white";

    var chartAreaDiv;
    var chartSvg;

    var dataUSMap;
    var mapCounties;
    var mapStates;
    var mapRegions;
    var countyDataLabel;
    var mapCountyFeatures; // county map geometry
    var mapStateFeatures; // state map geometry
    var colorScale; // color quantize scale
    var legend;
    var pathMap; // path and projection
    var countyData;
    var activeState = null;

    var scale;
    var translate;

    var featureIds = [];
    var countyValuesById = {};
    var countyNameById = {};

    var path = d3.geo.path();

    var countyClicked = null;
    var countyFeature = null;

    var dbDefs;


//padding = {
//    left: 60,
//    right: 60,
//    top: 60,
//    bottom: 60
//};
//
//inner = {
//    chartWidth: chartArea.width - this.padding.left - this.padding.right,
//    chartHeight: chartArea.height - this.padding.top - this.padding.bottom,
//    r: chartArea.width - this.padding.right,
//    b: chartArea.height - this.padding.bottom
//};

    module.init = function (selector, dataDefs, dataUSMapArg) {
        dataUSMap = dataUSMapArg;

        FREDChart.initChart(selector, usmapClass, getDateRange, initData, initializeChart,
            updateChart, true /*isUpdateOnSlide*/, dataDefs.chart_name, dataDefs.chart_text);
    };// <-- End of USMap

    var initData = function () {
        countyData = dataUSMap.data;

        // get feature names and Ids
        featureIds = [];
        dataUSMap.maps.county.features.forEach(function (feature, i) {
            featureIds.push(feature.id);
            countyNameById[feature.id] = feature.properties.name;
        });

        mapCounties = dataUSMap.maps.county;
        mapStates = dataUSMap.maps.state;
        mapCountyFeatures = mapCounties.features;
    };

    var updateTimeslotValues = function () {
        // get feature values for each timeSlot
        for (var i = 0; i < countyData.length; i++) {
            var timeSeries = countyData[i];
            if (timeSeries.date == FREDChart.timeSlotDate) {
                for (var j = 0; j < featureIds.length; j++) {
                    countyValuesById[featureIds[j]] = parseFloat(timeSeries.values[j + 1]);
                }
                break;
            }
        }
    };

// get data range from the data
    var getDateRange = function () {
        var dateRange = [];
        var dataSets = countyData;
        $.each(dataSets, function (index) {
            dateRange.push(dataSets[index].date);
        });
        return dateRange.reverse();
    };

    var initializeChart = function () {
        chartSvg = FREDChart.chartAreaDiv.append("svg").attr("id", chartSvgId).attr("class", usmapClass);

        //Adding legend for our Choropleth
        drawLegend();

        // get calculated width, height of chart area
        var chartAreaStyles = window.getComputedStyle(document.getElementById(chartAreaId), null);
        var chartAreaWidth = chartAreaStyles.getPropertyValue("width").replace("px","");
        var chartHeight = chartAreaStyles.getPropertyValue("height").replace("px","");
        // offset the chart to make room for the legend on the left
        var offset = $("#"+mapColorLegendId)[0].getBBox().width;

        // figure out scaling and translation
        // create a first guess for the projection
        // Create a unit projection.
        var projection = d3.geo.albersUsa()
            .scale(1)
            .translate([0, 0]);

        // Create a path generator.
        pathMap = d3.geo.path()
            .projection(projection);

        // Compute the bounds of a feature of interest, then derive scale & translate.
        var b = pathMap.bounds(mapCounties),
            b_s = b[0][1],
            b_n = b[1][1],
            b_w = b[0][0],
            b_e = b[1][0],
            b_height = Math.abs(b_n - b_s),
            b_width = Math.abs(b_e - b_w);
        var chartWidth = chartAreaWidth - offset;
        var s = .95 / Math.max(b_width / chartWidth, (b_height / chartHeight)),
            t = [offset + (chartWidth - s * (b[1][0] + b[0][0])) / 2, (chartHeight - s * (b[1][1] + b[0][1])) / 2];

        // Update the projection to use computed scale & translate.
        projection
            .scale(s)
            .translate(t);
        pathMap = pathMap.projection(projection);

        mapCountyFeatures = mapCounties.features;
        mapStateFeatures = mapStates.features;

        //then draw the shapes
        drawChart();
    };

    var drawChart = function () {
        // get values for initial timeslot
        updateTimeslotValues();

        // filled in counties
        mapRegions = chartSvg.append("g");
        mapRegions.selectAll("path.county").data(mapCountyFeatures).enter().append("path")
            .attr("class", "county")
            .style({
                "fill": function (d) {
                    //apply fill from colorScale, or nanColor if NAN
                    var val = countyValuesById[d.id];
                    if (!isNaN(val)) {
                        return colorScale(val)
                    } else {
                        return(FREDChart.nanColor);
                    }
                },
                "opacity": unselectedCountyOpacity
            })
            // counties are clickable when state opacity is 0
            .on("click", onClickCounty)
            .attr("d", pathMap); //draw the paths

        // state outlines on top
        mapRegions.selectAll("path.state").data(mapStateFeatures).enter().append("path")
            .attr("class", "state")
            .style({
                "fill": stateFillColor,
                "fill-opacity": stateFillOpacity
            })
            .on("click", onClickState)
            .attr("d", pathMap); //draw the paths

        // size the chart to fit the container
        chartSvg.attr("width", "100%")
            .attr("height", "100%");
    };

    var drawLegend = function () {

        // get colorScale scale
        colorScale = getColorScale(countyData);

        // get the threshold value for each of the colors in the color scale
        var domainElems = [];
        $.each(FREDChart.colors, function (index) {
            var domainExtent = colorScale.invertExtent(FREDChart.colors[index]);
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

        // add the legend DOM element
        var legendSvg = chartSvg.append("g");

        legend = legendSvg.selectAll("g.legend")
            .data(domainElems)
            .enter().append("g").attr("class", "legend").attr("id", mapColorLegendId );

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

    var updateChart = function () {
        // get values for timeslot
        updateTimeslotValues();

        // filled in mapRegions
        mapRegions.data(mapCountyFeatures).selectAll("path.county")
            .style({
                "fill": function (d) {
                    //apply fill from colorScale, or nanColor if NAN
                    var val = countyValuesById[d.id];
                    if (!isNaN(val)) {
                        return colorScale(val)
                    } else {
                        return(FREDChart.nanColor);
                    }
                },
                "opacity": function (d) {
                    if (d === countyClicked) {
                        return selectedCountyOpacity;
                    }
                    else {
                        return unselectedCountyOpacity
                    }
                }
            });

        // state outlines on top
        mapRegions.data(mapStateFeatures).selectAll("path.state")
            .attr("d", pathMap);
    };

    var onClickCounty = function (d) {
        countyClicked = d;
        countyFeature = this;
        updateCountyDataLabel();
    };

    var updateCountyDataLabel = function () {
        // add a label group if there isn't one yet
        if (!countyDataLabel) {
            countyDataLabel = chartSvg.append("g");

            countyDataLabel.append("rect")
                .attr("class", "countyDataLabel")
                .attr("rx", "5")
                .attr("ry", "5");

            countyDataLabel.append("text")
                .attr("class", "countyDataLabel")
                .attr("id", "countyDataLabelName");

            countyDataLabel.append("text")
                .attr("class", "countyDataLabel")
                .attr("id", "countyDataLabelValue");
        }

        var margin = 10;

        // get transformed, as-drawn coordinates of the county
        var brect = d3.select(countyFeature).node().getBoundingClientRect();

        // get offset of the chart div
        var offset = chartAreaDiv.offset();

        d3.select("#countyDataLabelName").text(countyNameById[countyClicked.id]);
        var textWidthName = d3.select("#countyDataLabelName").node().getBBox().width;
        var textHeightName = d3.select("#countyDataLabelName").node().getBBox().height;

        d3.select("#countyDataLabelValue").text(displayValue());
        var textWidthValue = d3.select("#countyDataLabelValue").node().getBBox().width;
        var textHeightValue = d3.select("#countyDataLabelValue").node().getBBox().height;
        var rectWidth = Math.max(textWidthName, textWidthValue) + margin;

        // position the popup elements
        d3.select("#countyDataLabelName")
            .attr("x", +((brect.left + (brect.width - textWidthName) / 2 - offset.left))) // center on the county
            .attr("y", +(brect.top + brect.height / 2 - offset.top) + margin);

        d3.select("#countyDataLabelValue")
            .attr("x", +((brect.left + (brect.width - textWidthValue) / 2 - offset.left))) // center on the county
            .attr("y", +(textHeightName + brect.top + brect.height / 2 - offset.top) + margin);

        // Update the width and height of the rectangle to match the text, with a little padding
        var rectHeight = textHeightName + textHeightValue + margin;
        d3.select("rect.countyDataLabel")
            .attr("width", rectWidth + 5)
            .attr("height", rectHeight + 5)
            .attr("x", +(brect.left + (brect.width - rectWidth) / 2 - offset.left)) // center on the county
            .attr("y", +(brect.top + brect.height / 2 - offset.top - margin));

        d3.select("#countyDataLabelName").attr("visibility", "visible");
        d3.select("#countyDataLabelValue").attr("visibility", "visible");
        d3.select("rect.countyDataLabel").attr("visibility", "visible");
        countyDataLabel.attr("d", pathMap);
    };

    var displayValue = function () {
        var val = countyValuesById[countyClicked.id];
        if (isNaN(val))
            return "undefined";
        else
            return +val;
    };

    var onClickState = function (feature) {
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
        var chartWidth = chartAreaDiv.width();
        var chartHeight = chartAreaDiv.height();
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
    };

    var reset = function () {
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
    };

    var getColorScale = function (featuresData) {
        // get extent of data for all timeseries
//        var domainExtent = [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY];
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
            .range(FREDChart.colors);

        return colorScale;
    };

    var getColorDomainExtent = function (domainExtent) {
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
    };

    return module;

}(FREDUSMap || {}));