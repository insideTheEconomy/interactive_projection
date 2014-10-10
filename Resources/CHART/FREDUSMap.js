var FREDUSMap = (function (module) {
    var selectedCountyOpacity = 1.0;
    var unselectedCountyOpacity = 0.9;
    var stateFillOpacity = 0.3;
    var stateFillColor = "white";

    var strokeWidthUnzoomed;
    var strokeUnzoomed;

    var chartSvg;
    var jqSvg;

    var dataUSMap;
    var mapCounties;
    var mapStates;
    var mapRegions;
    var countyDataLabel;
    var mapCountyFeatures; // county map geometry
    var mapStateFeatures; // state map geometry
    var colorScale; // color quantize scale
    var pathMap; // path and projection
    var countyData;
    var activeStatePath = null;

    var scale;
    var translate;

    var featureIds = [];
    var countyValuesById = {};
    var countyNameById = {};

    var path = d3.geo.path();

    var countyFeatureSelected = null;
    var countyPathSelected = null;

    module.init = function (selector, dataDefs, dataUSMapArg) {
        dataUSMap = dataUSMapArg;

        // get the source footnote text, last entry is most recent
        var srcFootnote = dataUSMap.data[dataUSMap.data.length-1].title;

        countyDataLabel = null;

        FREDChart.initChart(selector, FREDChart.usmapClass, getDateRange, initData, initializeChart,
            updateChart, false /*isUpdateOnSlide*/, false /* isMonthSlider */,
            dataDefs.chart_name, dataDefs.chart_text, srcFootnote);
    };

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
        return dateRange;//.reverse();
    };

    var initializeChart = function () {
        chartSvg = FREDChart.chartAreaDiv.append("svg").attr("id", FREDChart.chartSvgId);
        jqSvg = $("#"+FREDChart.chartSvgId);

        //Adding legend for our Choropleth
        colorScale = FREDChart.drawLegend(countyData, unselectedCountyOpacity);

        // get calculated width, height of chart area
        var chartAreaStyles = window.getComputedStyle(document.getElementById(FREDChart.chartAreaId), null);
        var chartAreaWidth = chartAreaStyles.getPropertyValue("width").replace("px", "");
        var chartHeight = chartAreaStyles.getPropertyValue("height").replace("px", "");
        // offset the chart to make room for the legend on the left
//        offset = $("#" + FREDChart.mapColorLegendId)[0].getBBox().width;

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
        var chartWidth = chartAreaWidth; // - offset;
        var s = .95 / Math.max(b_width / chartWidth, (b_height / chartHeight)),
            t = [/*offset +*/ (chartWidth - s * (b[1][0] + b[0][0])) / 2, (chartHeight - s * (b[1][1] + b[0][1])) / 2];

        // Update the projection to use computed scale & translate.
        projection
            .scale(s)
            .translate(t);
        pathMap = pathMap.projection(projection);

        mapCountyFeatures = mapCounties.features;
        mapStateFeatures = mapStates.features;

        //then draw the shapes
        drawChart();

        initializeResetButton();
    };

    var drawChart = function () {
        // get values for initial timeslot
        updateTimeslotValues();

        // filled in counties
        mapRegions = chartSvg.append("g");
        mapRegions.selectAll("path.county").data(mapCountyFeatures).enter().append("path")
            .attr("class", "county")
            .attr("id", function(d){ return "county"+d.id;})
            .attr("vector-effect", "non-scaling-stroke") // prevent boundaries from scaling
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
            .on("click", function (countyFeature) {
                    countyFeatureSelected = countyFeature;
                    countyPathSelected = this;
                    onSelectCounty();

                    var args = new Array(countyFeatureSelected.id);//TBT
                    FREDChart.rpcSession.call(FREDChart.rpcURLPrefix +
                                              "usmap.onSelectCountySlave", args);
                }).attr("d", pathMap); //draw the paths

        // state outlines on top
        mapRegions.selectAll("path.state").data(mapStateFeatures).enter().append("path")
            .attr("class", "state")
            .attr("id", function (d) {
                      return "state" + d.id;
                  })
            .attr("vector-effect", "non-scaling-stroke") // prevent boundaries from scaling
            .style({
                       "fill": stateFillColor,
                       "fill-opacity": stateFillOpacity
                   })
            .on("click", function (stateFeature) {
                    onSelectState(stateFeature);

                    var args = new Array(stateFeature.id);//TBT
                    FREDChart.rpcSession.call(FREDChart.rpcURLPrefix +
                                              "usmap.onSelectStateSlave", args);
                })
            .attr("d", pathMap); //draw the paths


        strokeWidthUnzoomed = parseFloat(mapRegions.select("path.state").style("stroke-width").replace("px",""));
        strokeUnzoomed = d3.rgb(mapRegions.select("path.state").style("stroke"));

        // size the chart to fit the container
        chartSvg.attr("width", "100%")
            .attr("height", "100%");

        chartSvg.on("click", function () {
            module.resetZoom();
            // clicks outside of map land here and hide the popup if there is one
            FREDChart.rpcSession.call(FREDChart.rpcURLPrefix + "usmap.resetZoom"); // call slave
        });

        if (!FREDChart.isMaster) {
            // register reset callback rpc
            FREDChart.rpcSession.register(FREDChart.rpcURLPrefix + "usmap.resetZoom", module.resetZoom);
            // register click callback rpc's
            FREDChart.rpcSession.register(FREDChart.rpcURLPrefix + "usmap.onSelectCountySlave", onSelectCountySlave);
            FREDChart.rpcSession.register(FREDChart.rpcURLPrefix + "usmap.onSelectStateSlave", onSelectStateSlave);
        }
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
                    if (d === countyFeatureSelected) {
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

        if(countyFeatureSelected) {
            d3.select("#countyDataLabelValue").text(displayValue());
        }
    };

    var onSelectCountySlave = function(args) {
        countyFeatureSelected = FREDChart.findFeatureById(mapCountyFeatures, args[0]); // args[0] is the feature Id
        countyPathSelected = ("path#county"+args[0]); // args[1] is the path id
        updateCountyDataLabel();
    };

    var onSelectCounty = function () {
        // prevent click from triggering reset in svg
        d3.event.stopPropagation();
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
        var bRect = d3.select(countyPathSelected).node().getBoundingClientRect();

        // get offset of the chart div
        var offset = jqSvg.offset();

        d3.select("#countyDataLabelName").text(countyNameById[countyFeatureSelected.id]);
        var textWidthName = d3.select("#countyDataLabelName").node().getBBox().width;
        var textHeightName = d3.select("#countyDataLabelName").node().getBBox().height;

        d3.select("#countyDataLabelValue").text(displayValue());
        var textWidthValue = d3.select("#countyDataLabelValue").node().getBBox().width;
        var textHeightValue = d3.select("#countyDataLabelValue").node().getBBox().height;
        var rectWidth = Math.max(textWidthName, textWidthValue) + margin;

        // position the popup elements
        d3.select("#countyDataLabelName")
            .attr("x", +((bRect.left + (bRect.width - textWidthName) / 2 - offset.left))) // center on the county
            .attr("y", +(bRect.top + bRect.height / 2 - offset.top) + margin);

        d3.select("#countyDataLabelValue")
            .attr("x", +((bRect.left + (bRect.width - textWidthValue) / 2 - offset.left))) // center on the county
            .attr("y", +(textHeightName + bRect.top + bRect.height / 2 - offset.top) + margin);

        // Update the width and height of the rectangle to match the text, with a little padding
        var rectHeight = textHeightName + textHeightValue + margin;
        d3.select("rect.countyDataLabel")
            .attr("width", rectWidth + 5)
            .attr("height", rectHeight + 5)
            .attr("x", +(bRect.left + (bRect.width - rectWidth) / 2 - offset.left)) // center on the county
            .attr("y", +(bRect.top + bRect.height / 2 - offset.top - margin));

        d3.select("#countyDataLabelName").attr("visibility", "visible");
        d3.select("#countyDataLabelValue").attr("visibility", "visible");
        d3.select("rect.countyDataLabel").attr("visibility", "visible");
        countyDataLabel.attr("d", pathMap);
    };

    var displayValue = function () {
        var val = countyValuesById[countyFeatureSelected.id];
        if (isNaN(val))
            return FREDChart.noValueLabel;
        else
            return FREDChart.formatNumber(val);
    };

    var onSelectStateSlave = function(args){
        onSelectState(FREDChart.findFeatureById(mapStateFeatures, args[0])); // args[0] is feature id
    };

    var onSelectState = function (feature) {
        if (activeStatePath) {
            module.resetZoom();
            if (this == null)
                return;
        }

        activeStatePath = d3.select("path#state"+feature.id).classed("active", true)
            .style("fill", "none"); // make counties clickable

        // zoom to the state
        var chartAreaStyles = window.getComputedStyle(document.getElementById(FREDChart.chartAreaId), null);
        var chartAreaWidth = chartAreaStyles.getPropertyValue("width").replace("px", "");
        var chartAreaHeight = chartAreaStyles.getPropertyValue("height").replace("px", "");
        var bounds = pathMap.bounds(feature),
            dx = bounds[1][0] - bounds[0][0],
            dy = bounds[1][1] - bounds[0][1],
            x = (bounds[0][0] + bounds[1][0]) / 2,
            y = (bounds[0][1] + bounds[1][1]) / 2;
        scale = .95 / Math.max(dx / chartAreaWidth, dy / chartAreaHeight);
        translate = [chartAreaWidth / 2 - scale * x, chartAreaHeight / 2 - scale * y];

        // adjust boundary lines when zoomed
        var strokeWidthZoomed = 2 * strokeWidthUnzoomed; // make boundaries double wide
        var strokeZoomed = strokeUnzoomed.darker().darker(); // and twice as dark, .7 * .7

        mapRegions.transition()
            .duration(500)
            .style("stroke-width", strokeWidthZoomed + "px")
            .style("stroke", strokeZoomed.toString())
            .attr("transform", "translate(" + translate + ")scale(" + scale + ")");

        // prevent click from triggering reset in svg
        d3.event.stopPropagation();

        d3.selectAll("."+FREDChart.resetBtnClass).attr("visibility", "visible");
    };

    /** reset button for unzooming maps **/
    var initializeResetButton = function() {

        var resetGroup = chartSvg.append("g").attr("class", FREDChart.resetBtnClass);
        resetGroup.append("image")
            .attr("class", FREDChart.resetBtnClass)
            .attr("xlink:href", "IMG/resetZoom.svg")
            .attr({width: "90px", height: "90px"})
            .attr("visibility", "hidden") // initially hidden
            .on("click", function () {
                module.resetZoom();
            });
    }

    module.resetZoom = function () {
        // unclick county (if there was one)
        countyFeatureSelected = null;
        countyPathSelected = null;

        // hide the reset btn
        d3.selectAll("."+FREDChart.resetBtnClass).attr("visibility", "hidden");

        // hide the tooltip
        d3.select("#countyDataLabelName").attr("visibility", "hidden");
        d3.select("#countyDataLabelValue").attr("visibility", "hidden");
        d3.select("rect.countyDataLabel").attr("visibility", "hidden");

        //
        activeStatePath.classed("active", false)
            .style("fill", stateFillColor);
        activeStatePath = null;

        // unzoom/unpan
        mapRegions.transition()
            .duration(500)
            .style("stroke-width", + strokeWidthUnzoomed +"px")
            .style("stroke", + strokeUnzoomed)
            .attr("transform", "translate(0,0) scale(1)");
    };

    return module;

}(FREDUSMap || {}));