var FREDWorldMap = (function (module) {

    var selectedCountryOpacity = 1.0;
    var unselectedCountryOpacity = 0.9;

    var countryDataLabel;

    var dataWorldMap;
    var mapRegions;
    var mapCountries;
    var mapCountryFeatures; // country map geometry

    var colorScale; // for mapping values to colors
    var colorLegend;

    var pathMap; // path and projection
    var countryData;

    var featureIds = [];
    var countryValuesById = {};
    var countryNameById = {};

    var path = d3.geo.path();

    var countryClicked = null;
    var countryFeature = null;

    var chartSvg;
    var jqSvg;

    module.init = function (selector, dataDefs, dataWorldMapArg) {
        dataWorldMap = dataWorldMapArg;

        FREDChart.initChart(selector, FREDChart.worldmapClass, getDateRange, initData, initializeChart,
            updateChart, true /*isUpdateOnSlide*/, dataDefs.chart_name, dataDefs.chart_text);
    };// <-- End of init

    var initData = function () {
        countryData = dataWorldMap.data;

        // get feature names and Ids
        featureIds = [];
        dataWorldMap.map[0].features.forEach(function (feature, i) {
            featureIds.push(feature.id);
            countryNameById[feature.id] = feature.properties.name;
        });

        mapCountries = dataWorldMap.map[0];
        mapCountryFeatures = mapCountries.features;
    }

    var updateTimeslotValues = function () {
        // get feature values for each timeSlot
        for (var i = 0; i < countryData.length; i++) {
            var timeSeries = countryData[i];
            if (timeSeries.date === FREDChart.timeSlotDate) {
                for (var j = 0; j < featureIds.length; j++) {
                    countryValuesById[featureIds[j]] = parseFloat(timeSeries.values[j + 1]);
                }
                break;
            }
        }
    }

// get data range from the data
    var getDateRange = function () {
        var dateRange = [];
        var dataSets = countryData;
        $.each(dataSets, function (index) {
            dateRange.push(dataSets[index].date);
        });
        return dateRange.reverse();
    }

    var initializeChart = function () {
        chartSvg = FREDChart.chartAreaDiv.append("svg").attr("id", FREDChart.chartSvgId).attr("class", FREDChart.worldmapClass);
        jqSvg = $("#" + FREDChart.chartSvgId);

        //Adding legend for our Choropleth
        drawLegend();

        // get calculated width, height of chart area
        var chartAreaStyles = window.getComputedStyle(document.getElementById(FREDChart.chartAreaId), null);
        var width = chartAreaStyles.getPropertyValue("width").replace("px", "");
        var chartHeight = chartAreaStyles.getPropertyValue("height").replace("px", "");
        // offset the chart to make room for the legend on the left
        var offset = $("#" + FREDChart.mapColorLegendId)[0].getBBox().width;

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
        var chartWidth = width - offset;
        var s = .95 / Math.max(b_width / chartWidth, (b_height / chartHeight)),
            t = [offset + (chartWidth - s * (b[1][0] + b[0][0])) / 2, (chartHeight - s * (b[1][1] + b[0][1])) / 2];

        // Update the projection to use computed scale & translate.
        projection
            .scale(s)
            .translate(t);
        pathMap = pathMap.projection(projection);

        //then draw the shapes
        drawChart();
    }

    var drawChart = function () {
        // get values for initial timeslot
        updateTimeslotValues();

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
                        return(FREDChart.nanColor);
                    }
                },
                "opacity": unselectedCountryOpacity
            })
            // counties are clickable when state opacity is 0
            .on("click", onClickCountry)
            .attr("d", pathMap); //draw the paths
    }

    var updateChart = function () {
        // get values for timeslot
        updateTimeslotValues();

        // filled in mapRegions
        mapRegions.data(mapCountryFeatures).selectAll("path.country").transition().duration(500)
            .style({
                "fill": function (d) {
                    //apply fill from colorScale, or nanColor if NAN
                    var val = countryValuesById[d.id];
                    if (!isNaN(val)) {
                        return colorScale(val)
                    } else {
                        return(FREDChart.nanColor);
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
    }

    var drawLegend = function () {
        // get colorScale scale
        colorScale = getColorScale(countryData);

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

        colorLegend = legendSvg.selectAll("g.legend")
            .data(domainElems)
            .enter().append("g").attr("class", "legend").attr("id", FREDChart.mapColorLegendId);

        var lsW = 30;
        var lsH = 30;
        var lsYMargin = 2 * lsH;
        var lsTextYOffset = lsH / 2 + 4;
        var lsTextXOffset = lsW * 2;

        colorLegend.append("rect")
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

        colorLegend.append("text")
            .attr("x", lsTextXOffset)
            .attr("y", function (d, i) {
                return (i * lsH) + lsYMargin + lsTextYOffset;
            })
            .attr("font-weight", "bold")
            .text(function (d, i) {
                return legendLabels[i];
            });

    }

    var onClickCountry = function (d) {
        countryClicked = d;
        countryFeature = this;
        updateCountryDataLabel();
    }

    var updateCountryDataLabel = function () {
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
        var offset = jqSvg.offset();

        d3.select("#countryDataLabelName").text(countryNameById[countryClicked.id]);
        var textWidthName = d3.select("#countryDataLabelName").node().getBBox().width;
        var textHeightName = d3.select("#countryDataLabelName").node().getBBox().height;

        d3.select("#countryDataLabelValue").text(displayValue());
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

    var displayValue = function () {
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
//    var chartWidth = chartAreaDiv.width();
//    var chartHeight = chartAreaDiv.height();
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

    var getColorScale = function (featuresData) {
        // get extent of data for all timeseries
        var dataArray = [];
        for (var i = 0; i < featuresData.length; i++) {
            var timeSeries = featuresData[i];
            for (var j = 0; j < featureIds.length; j++) {
                var val = parseFloat(timeSeries.values[j + 1]);
                if (!isNaN(val)) {
                    dataArray.push(val);
                }
            }
        }
        return FREDChart.getNiceColorScale(dataArray);
    }


    return module;

}(FREDWorldMap || {}));