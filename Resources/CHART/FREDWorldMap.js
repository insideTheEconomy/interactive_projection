var FREDWorldMap = (function (module) {

    var selectedCountryOpacity = 1.0;
    var unselectedCountryOpacity = 0.9;

    var countryDataLabel;

    var dataWorldMap;
    var mapRegions;
    var mapCountries;
    var mapCountryFeatures; // country map geometry

    var colorScale; // for mapping values to colors

    var pathMap; // path and projection
    var countryData;

    var featureIds = [];
    var countryValuesById = {};
    var countryNameById = {};

    var path = d3.geo.path();

    var countryFeatureSelected = null;
    var countryPathSelected = null;

    var chartSvg;
    var jqSvg;
    var chartGroup;

    module.init = function (selector, dataDefs, dataWorldMapArg) {
        dataWorldMap = dataWorldMapArg;

        // get the source footnote text, last entry is most recent
        var srcFootnote = dataWorldMap.data[dataWorldMap.data.length-1].title;

        FREDChart.initChart(selector, FREDChart.worldmapClass, getDateRange, initData, initializeChart,
            updateChart, true /*isUpdateOnSlide*/, false /* isMonthSlider */,
            dataDefs.chart_name, dataDefs.chart_text, srcFootnote);
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

        countryDataLabel = null;
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
        return dateRange;//.reverse();
    }

    var initializeChart = function () {
        chartSvg = FREDChart.chartAreaDiv.append("svg").attr("id", FREDChart.chartSvgId);
        chartGroup = chartSvg.append("g").attr("id", "chartGroup");
        jqSvg = $("#" + FREDChart.chartSvgId);

        //Adding legend for our Choropleth
        colorScale = FREDChart.drawLegend(/*chartSvg, */countryData, unselectedCountryOpacity);

        // get calculated width, height of chart area
        var chartAreaDiv = document.getElementById(FREDChart.chartAreaId);
        var chartAreaStyles = window.getComputedStyle(chartAreaDiv, null);
        var width = chartAreaStyles.getPropertyValue("width").replace("px", "");
        var chartHeight = chartAreaStyles.getPropertyValue("height").replace("px", "");

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
        var chartWidth = width;
        var s = .95 / Math.max(b_width / chartWidth, (b_height / chartHeight)),
            t = [(chartWidth - s * (b[1][0] + b[0][0])) / 2, (chartHeight - s * (b[1][1] + b[0][1])) / 2];

        // Update the projection to use computed scale & translate.
        projection
            .scale(s)
            .translate(t);
        pathMap = pathMap.projection(projection);

        //then draw the shapes
        drawChart();

        if (FREDChart.isMaster) {
            chartSvg.on("click", function () { // clicks outside of map land here and hide the popup if there is one
                reset();
                FREDChart.rpcSession.call(FREDChart.rpcURLPrefix + "worldmap.reset"); // call slave
            });
        } else {
            // register slider callback rpc's
            FREDChart.rpcSession.register(FREDChart.rpcURLPrefix + "worldmap.reset", reset);
        }
    }

    var drawChart = function () {
        // get values for initial timeslot
        updateTimeslotValues();

        // filled in counties
        mapRegions = chartGroup.append("g");
        mapRegions.selectAll("path.country").data(mapCountryFeatures).enter().append("path")
            .attr("class", "country")
            .attr("id", function(d,i){
                return "country"+ d.id;
            })
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
            }).on("click", onSelectCountry)
                .attr("d", pathMap); //draw the paths;

        if(!FREDChart.isMaster) {
            // register slider callback rpc's
            FREDChart.rpcSession.register(FREDChart.rpcURLPrefix + "worldmap.updateCountryDataLabel", updateCountryDataLabel);
        }
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
                    if (d === countryFeatureSelected) {
                        return selectedCountryOpacity;
                    }
                    else {
                        return unselectedCountryOpacity
                    }
                }
            })
            .attr("d", pathMap);

        // update the popup value text if it's popped up
        if(countryFeatureSelected) {
            d3.select("#countryDataLabelValue").text(displayValue())
        }
    }

    var onSelectCountry = function (d) {
        d3.event.stopPropagation();

        var mouse = d3.mouse(chartGroup.node());
        var args = [d.id, this.getAttribute("id"), mouse[0], mouse[1]];

        updateCountryDataLabel(args);

        FREDChart.rpcSession.call(FREDChart.rpcURLPrefix + "worldmap.updateCountryDataLabel", args); // call slave
    }

    var updateCountryDataLabel = function(args){
        var featureId = args[0];
        var pathId = args[1];
        var mouseX = args[2];
        var mouseY = args[3];

        countryFeatureSelected = FREDChart.findFeatureById(mapCountryFeatures, featureId); // d[0] is the country id
        countryPathSelected = "path.country#"+pathId;

        // add a label group if there isn't one yet
        if (!countryDataLabel) {
            countryDataLabel = chartGroup.append("g");

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

        var margin = 5;

        // get transformed, as-drawn coordinates of the country
        var brect = d3.select(countryPathSelected).node().getBoundingClientRect();
        var featureWidth = brect.width;
        var featureHeight = brect.height;
        var featureLeft = brect.left;
        var featureTop = brect.top;
        //if( countryNameById[countryFeatureSelected.id] == "United States"){
        //    // manually tweak for distributed location of USA (alaska in west, hawaii in east)
        //    featureWidth = .5 * featureWidth; // back towards to the left edge
        //    featureHeight = 1.1 * featureHeight; // a little further down from the top
        //}

        // get offset of the chart div
        var offset = jqSvg.offset();

        d3.select("#countryDataLabelName").text(countryNameById[countryFeatureSelected.id]);
        var textWidthName = d3.select("#countryDataLabelName").node().getBBox().width;
        var textHeightName = d3.select("#countryDataLabelName").node().getBBox().height;

        d3.select("#countryDataLabelValue").text(displayValue());
        var textWidthValue = d3.select("#countryDataLabelValue").node().getBBox().width;
        var textHeightValue = d3.select("#countryDataLabelValue").node().getBBox().height;

        var rectWidth = Math.max(textWidthName, textWidthValue) + 2 * margin;
        var rectHeight = textHeightName + textHeightValue + 2 * margin;

        // position the popup elements
        d3.select("#countryDataLabelName")
            .style({"text-anchor": "middle", "alignment-baseline": "before-edge"})
            .attr("x", mouseX + rectWidth/2)//+((featureLeft + (featureWidth - textWidthName) / 2 - offset.left))) // center on the country
            .attr("y", mouseY + margin);//+(featureTop + featureHeight / 2 - offset.top) + margin);

        d3.select("#countryDataLabelValue")
            .style({"text-anchor": "middle", "alignment-baseline": "before-edge"})
            .attr("x", mouseX + rectWidth/2)//+((featureLeft + (featureWidth - textWidthValue) / 2 - offset.left))) // center on the country
            .attr("y", mouseY + margin + textHeightName);//+(textHeightName + featureTop + featureHeight / 2 - offset.top) + margin);

        // Update the width and height of the rectangle to match the text, with a little padding
        d3.select("rect.countryDataLabel")
            .attr("width", rectWidth)
            .attr("height", rectHeight)
            .attr("x", mouseX)//+(featureLeft + (featureWidth - rectWidth) / 2 - offset.left)) // center on the country
            .attr("y", mouseY);//+(featureTop + featureHeight / 2 - offset.top - margin));

        d3.select("#countryDataLabelName").attr("visibility", "visible");
        d3.select("#countryDataLabelValue").attr("visibility", "visible");
        d3.select("rect.countryDataLabel").attr("visibility", "visible");
        countryDataLabel.attr("d", pathMap);
    };

    var reset = function () {
        // hide the tooltip
        d3.select("#countryDataLabelName").attr("visibility", "hidden");
        d3.select("#countryDataLabelValue").attr("visibility", "hidden");
        d3.select("rect.countryDataLabel").attr("visibility", "hidden");
        countryFeatureSelected = null;
    };

    var displayValue = function () {
        var val = countryValuesById[countryFeatureSelected.id];
        if (isNaN(val))
            return FREDChart.noValueLabel;
        else
            return FREDChart.formatNumber(val);

    };

    return module;

}(FREDWorldMap || {}));