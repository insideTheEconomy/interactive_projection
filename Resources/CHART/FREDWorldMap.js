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

    var countryClicked = null;
    var countryFeature = null;

    var chartSvg;
    var jqSvg;
    var chartGroup;

    var rpcSession;

    var isMaster;

    module.init = function (selector, dataDefs, dataWorldMapArg, isMasterArg, rpcSessionArg) {
        dataWorldMap = dataWorldMapArg;
        rpcSession = rpcSessionArg;
        isMaster = isMasterArg;

        // get the source footnote text, last entry is most recent
        var srcFootnote = dataWorldMap.data[dataWorldMap.data.length-1].title;

        FREDChart.initChart(selector, FREDChart.worldmapClass, getDateRange, initData, initializeChart,
            updateChart, true /*isUpdateOnSlide*/, false /* isMonthSlider */,
            dataDefs.chart_name, dataDefs.chart_text, srcFootnote, isMaster, rpcSession);
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
        return dateRange;//.reverse();
    }

    var initializeChart = function () {
        chartSvg = FREDChart.chartAreaDiv.append("svg").attr("id", FREDChart.chartSvgId);
        chartGroup = chartSvg.append("g").attr("id", "chartGroup");
        jqSvg = $("#" + FREDChart.chartSvgId);

        //Adding legend for our Choropleth
        colorScale = FREDChart.drawLegend(/*chartSvg, */countryData, unselectedCountryOpacity);

        // get calculated width, height of chart area
        var chartAreaStyles = window.getComputedStyle(document.getElementById(FREDChart.chartAreaId), null);
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

        if (isMaster) {
            chartSvg.on("click", function () { // clicks outside of map land here and hide the popup if there is one
                reset();
                rpcSession.call(FREDChart.rpcURLPrefix + "worldmap.reset"); // call slave
            });
        } else {
            // register slider callback rpc's
            rpcSession.register(FREDChart.rpcURLPrefix + "worldmap.reset", reset);
        }
    }

    var drawChart = function () {
        // get values for initial timeslot
        updateTimeslotValues();

        // filled in counties
        mapRegions = chartGroup.append("g");
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
            }).on("click", onClickCountry)
                .attr("d", pathMap); //draw the paths;

        if(!isMaster) {
            // register slider callback rpc's
            rpcSession.register(FREDChart.rpcURLPrefix + "worldmap.onClickCountry", onClickCountry);
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
                    if (d === countryClicked) {
                        return selectedCountryOpacity;
                    }
                    else {
                        return unselectedCountryOpacity
                    }
                }
            })
            .attr("d", pathMap);

        // update the popup value text if it's popped up
        if(countryClicked) {
            d3.select("#countryDataLabelValue").text(displayValue())
        }
    }

    var onClickCountry = function (d) {
        if(isMaster) {
            countryClicked = d;
            countryFeature = this;
            d3.event.stopPropagation();
            updateCountryDataLabel();
            rpcSession.call(FREDChart.rpcURLPrefix + "worldmap.onClickCountry", [countryClicked.id, countryFeature]); // call slave
        } else {
            countryClicked = $("path.country#"+d[0]); // d[0] is the country id
            countryFeature = d[1];
            updateCountryDataLabel();
        }
    }

    var updateCountryDataLabel = function () {
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
        var brect = d3.select(countryFeature).node().getBoundingClientRect();
        var featureWidth = brect.width;
        var featureHeight = brect.height;
        var featureLeft = brect.left;
        var featureTop = brect.top;
        if( countryNameById[countryClicked.id] == "United States"){
            // manually tweak for distributed location of USA (alaska in west, hawaii in east)
            featureWidth = .5 * featureWidth; // back towards to the left edge
            featureHeight = 1.1 * featureHeight; // a little further down from the top
        }

        var mouse = d3.mouse(chartGroup.node());
        var mouseX = mouse[0];
        var mouseY = mouse[1];

        // get offset of the chart div
        var offset = jqSvg.offset();

        d3.select("#countryDataLabelName").text(countryNameById[countryClicked.id]);
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
        countryClicked = null;
    };

    var displayValue = function () {
        var val = countryValuesById[countryClicked.id];
        if (isNaN(val))
            return FREDChart.noValueLabel;
        else
            return +val;
    };

    return module;

}(FREDWorldMap || {}));