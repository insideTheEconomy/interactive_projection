/**
 * Created by scott on 7/28/14.
 * Based on example by Nate Ross  and https://gist.github.com/mccannf/1629644
 */

var FREDTimeline = (function (module) {

    var chartAreaXFactor = .8; // portion of horizontal chart area for the actual scatter area
    var chartAreaYFactor = .9; // portion of vertical chart area for the actual scatter area

    var chartWidth,
        chartHeight;
    var chartMargin = {
        left: 100,
        top: 0,
        bottom: 0,
        inner: 5
    };
    var axispos = {
        xtitle: 0, // no title for date axis
        ytitle: 50,
        sztitle: 25,
        xlabel: 5,
        ylabel: 5,
        szlabel: 5
    };

//    var maxDataPointsForDots = 50,
//        transitionDuration = 1000;

    var chartSvg = null;
    var jqSvg;

//    var yAxisGroup = null;
//    var xAxisGroup = null;
    var dataCirclesGroup = null;
    var dataLinesGroup = null;

    var annotationPointRadius = 4;
//    var dataPointRadius = 2;
    var xScale;
    var yScale;

    var xMin, xMax;
    var yMin, yMax;

    var circles;

    var suppliedData;
    var sampleData;
    var dataDefs;

    var plotData;
    var dataAnnotations;
    var valueLabelGroup;
    var valueLine;

    var annotFO;
    var annotDiv;
    var annotP;
    var annotX;
    var annotY;
    var curAnnotation;
    var isAnnotationInitialized;

    var usDataId;

    var selectedCircle = null;

    module.init = function (selector, dataDefsArg, timelineDataArg, nationFeatures) {
        dataDefs = dataDefsArg;
        suppliedData = timelineDataArg;
        sampleData = suppliedData.line.data[0][0];

        // we are assuming this chart is just for USA data
        for (var i in nationFeatures) {
            var x = nationFeatures[i];
            if (nationFeatures[i] != "undefined" && nationFeatures[i].name === "United States") {
                usDataId = nationFeatures[i].gid
                break;
            }
        }

        dataAnnotations = suppliedData.line.annotations;
        valueLabelGroup = null;
        curAnnotation = null;
        isAnnotationInitialized = false;

        FREDChart.initChart(selector, FREDChart.timelineClass, getDateRange, initPlotData, initializeChart,
            updateChart, true /*isUpdateOnSlide*/, true /* isMonthSlider */,
            dataDefs.chart_name, dataDefs.chart_text, null);

    };

    var initializeChart = function () {
        chartSvg = FREDChart.chartAreaDiv.append("svg").attr("id", FREDChart.chartSvgId);
        jqSvg = $("#" + FREDChart.chartSvgId);

        // get transformed, as-drawn coordinates of the div
        var divRect = FREDChart.chartAreaDiv.node().getBoundingClientRect();
        chartWidth = divRect.width * chartAreaXFactor;
        chartHeight = divRect.height * chartAreaYFactor;

        //then draw the shapes
        drawChart();

        //if(FREDChart.isMaster) {
        //    // set up rollovers
        //    circles.on("click", function (d) {
        //        resizePt(2);
        //
        //        var args = new Array(2);
        //        FREDChart.rpcSession.call(FREDChart.rpcURLPrefix + "timeline.resizePt", args); // call slave
        //    }).on("mouseout", function (d) {
        //        resizePt(1);
        //
        //        var args = new Array(1);
        //        FREDChart.rpcSession.call(FREDChart.rpcURLPrefix + "timeline.resizePt", args); // call slave
        //    });
        //} else {
        //    // register slider callback rpc's
        //    FREDChart.rpcSession.register(FREDChart.rpcURLPrefix + "timeline.resizePt", resizePt);
        //}

    };

    var resizePt = function(multiplier){
        if(!FREDChart.isMaster) multiplier = multiplier[0];
        d3.select(this).attr("r", multiplier * getSize(this));
    }

    var drawChart = function () {
        var chartGroup = chartSvg.append("g");

        chartGroup.append("rect")
            .attr("id", FREDChart.chartPanelId )
            .attr("x", chartMargin.left)
            .attr("y", chartMargin.top)
            .attr("height", chartHeight)
            .attr("width", chartWidth);

        var yLab = sampleData[0].title + " (" + sampleData[0].units + ")";

        yMin = plotData.reduce(function (previous, current) {
            return previous.value < current.value ? previous : current;
        });
        yMax = plotData.reduce(function (previous, current) {
            return previous.value > current.value ? previous : current;
        });

        xMin = plotData[0].date;
        xMax = plotData[plotData.length - 1].date;


        // scale domain and range
        var xrange = [chartMargin.left + chartMargin.inner, chartMargin.left + chartWidth - chartMargin.inner];
        var yrange = [chartMargin.top + chartHeight - chartMargin.inner, chartMargin.top + chartMargin.inner];
        var xlim = [xMin, xMax];
        var ylim = [yMin.value, yMax.value];
        xScale = d3.time.scale().domain(xlim).range(xrange);
        yScale = d3.scale.linear().domain(ylim).range(yrange);
        
        // configure ticks
        var nxticks = 8;
        var nyticks = 8;
        var xticks = xScale.ticks(nxticks);
        var yticks = yScale.ticks(nyticks);

        var xAxisGroup = chartGroup.append("g").attr("class", "x axis");
        xAxisGroup.selectAll("empty").data(xticks).enter().append("line")
            .attr("x1", function (d) {
                return xScale(d);
            })
            .attr("x2", function (d) {
                return xScale(d);
            })
            .attr("y1", chartMargin.top)
            .attr("y2", chartMargin.top + chartHeight)
            .style("pointer-events", "none");
        xAxisGroup.selectAll("empty").data(xticks).enter().append("text")
            .attr("x", function (d) {
                return xScale(d);
            })
            .attr("y", chartMargin.top + chartHeight + axispos.xlabel)
            .text(function (d) {
                return formatAxis(xticks)(d.getFullYear());
            });
//        xAxis.append("text").attr("class", "title")
//            .attr("x", margin.left + width / 2)
//            .attr("y", margin.top + chartHeight + axispos.xtitle)
//            .text(xlab);

        var rotate_ylab = rotate_ylab != null ? rotate_ylab : yLab.length > 1;
        var yAxisGroup = chartGroup.append("g").attr("class", "y axis");
        yAxisGroup.selectAll("empty").data(yticks).enter().append("line")
            .attr("y1", function (d) {
                return yScale(d);
            })
            .attr("y2", function (d) {
                return yScale(d);
            })
            .attr("x1", chartMargin.left)
            .attr("x2", chartMargin.left + chartWidth)
            .style("pointer-events", "none");
        yAxisGroup.selectAll("empty").data(yticks).enter().append("text")
            .attr("y", function (d) {
                return yScale(d);
            })
            .attr("x", chartMargin.left - axispos.ylabel)
            .text(function (d) {
                return formatAxis(yticks)(d);
            });
        yAxisGroup.append("text").attr("class", "title")
            .attr("y", chartMargin.top + chartHeight / 2)
            .attr("x", chartMargin.left - axispos.ytitle)
            .text(yLab)
            .attr("transform", rotate_ylab ? "rotate(270," + (chartMargin.left - axispos.ytitle) + "," + (chartMargin.top + chartHeight / 2) + ")" : "");

        var line = d3.svg.line()
            // assign the X function to plot our line as we wish
            .x(function (d, i) {
                // verbose logging to show what's actually being done
                //console.log('Plotting X value for date: ' + d.date + ' using index: ' + i + ' to be at: ' + xScale(d.date) + ' using our xScale.');
                // return the X coordinate where we want to plot this datapoint
                return xScale(d.date);
            })
            .y(function (d) {
                // verbose logging to show what's actually being done
                // console.log('Plotting Y value for data value: ' + d.value + ' to be at: ' + yScale(d.value) + " using our yScale.");
                // return the Y coordinate where we want to plot this datapoint
                return yScale(d.value);
            })
            .interpolate("linear");

        var garea = d3.svg.area()
            .interpolate("linear")
            .x(function (d) {
                return xScale(d.date);
            })
            .y0(yrange[0])
            .y1(function (d) {
                // verbose logging to show what's actually being done
                // console.log('Plotting Y value for data value: ' + d.value + ' to be at: ' + yScale(d.value) + " using our yScale.");
                return yScale(d.value);
            });

        chartGroup.append('svg:path')
            .attr("class", "area")
            .attr("d", garea(plotData));

        chartGroup.append('svg:path')
            .attr('class', "data-line")
            .style('opacity', 0.3)
            .attr("d", line(plotData))
//            .transition()
//            .delay(transitionDuration / 2)
//            .duration(transitionDuration)
            .style('opacity', 1)
        ;

        d3.selectAll(".area")
//            .transition()
//            .duration(transitionDuration)
            .attr("d", garea(plotData));

        // Draw the annotated points
        dataCirclesGroup = chartSvg.append('svg:g');

        circles = dataCirclesGroup.selectAll('.data-point')
            .data(dataAnnotations)
            .enter()
            .append('svg:circle')
            .attr( "class", "data-point" )
            .style('opacity', 1)
            .attr('cx', function (d) {
                return xScale(d.date);
            })
            .attr('cy', function (d) {
                return yScale(interpolateDataValue(d.date));
            })
            .attr('r', function () {
                return annotationPointRadius;
            });
    };

    var updateChart = function () {
        var date = new Date(FREDChart.timeSlotDate);
        // slide sweep line across plot and popup annotations when available
        // console.log("Date: " + date);
        var dataPoint = {"date": date, "value": interpolateDataValue(date)};
        updateValueTrace(dataPoint);
    };

    // a dotted line from the plot line to the x-axis with a value box at the top
    var updateValueTrace = function (dataPoint) {
        var padding = 2;

        var date = dataPoint.date;
        var value = dataPoint.value;
        var x = xScale(date);
        var y = yScale(value);

        // add a label group if there isn't one yet
        if (!valueLabelGroup) {
            valueLabelGroup = chartSvg.append("g");

            valueLabelGroup.append("svg:rect")
                .attr("class", "valueLabel")
                .attr("rx", 5)
                .attr("ry", 5);

            valueLabelGroup.append("svg:text")
                .attr("class", "valueLabel");

            valueLabelGroup.append("svg:line")
                .attr("class", "valueLine");
        }

        var nearestAnnotation = getNearestAnnotation(dataPoint);

        if(nearestAnnotation != curAnnotation){
            curAnnotation = nearestAnnotation;
            popupAnnotation(curAnnotation, x, y);
        }

        if(annotDiv) {
            fadeAnnotation(x);
        }

//        // get offset of the chart div
//        var offset = jqSvg.offset();

        d3.select("text.valueLabel").text(FREDChart.formatNumber(value));

        // position the popup elements

        d3.select("line.valueLine")
            .attr("x1", x)
            .attr("y1", yScale(yMin.value))
            .attr("x2", x)
            .attr("y2", y);

        d3.select("text.valueLabel")
            .attr("x", x - annotationPointRadius - 2 * padding) // just off the left edge of the point
            .attr("y", y);

        // center rectangle on text
        centerRectOnText(d3.select("rect.valueLabel"), d3.select("text.valueLabel"), padding);

        d3.select("text.valueLabel").attr("visibility", "visible");
        d3.select("rect.valueLabel").attr("visibility", "visible");
    };

    var popupAnnotation = function (annotation, x, y) {
        var padding = 2;

        annotX = xScale(annotation.date);
        annotY = yScale(interpolateDataValue(annotation.date));

        // add a label group if there isn't one yet
        if (!isAnnotationInitialized) {
            var svgRect = chartSvg[0][0].getBoundingClientRect();
            isAnnotationInitialized = true;
            annotFO = chartSvg.append("svg:foreignObject")
                .attr("width", .25 * svgRect.width)
                .attr("height", svgRect.height) // temporary height limit
                .attr("class", "annotationLabelFO");
            annotDiv = annotFO.append("xhtml:div")
                .attr("class", "timelineAnnotationLabel");
            annotP = annotDiv.append("xhtml:p")
                .attr("class", "timelineAnnotationLabel");
        }

        annotP.html("<i>Milestone: "
            + FREDChart.getFullFormattedDate(annotation.date) + "</i>"
            + "<br/><br/><b>" + annotation.title + "</b>"
            + "<br/><br/>" + annotation.text + "");

        //// text positioned above annotation circle
        //var divRect = annotDiv[0][0].getBoundingClientRect();
        //annotFO.attr("x", annotX + padding)
        //    .attr("y", annotY - divRect.height - 2 * (annotationPointRadius + padding))
        //    .ttr("height", divRect.height);

        // text hangs below annotation circle
        var divRect = annotDiv[0][0].getBoundingClientRect();
        annotFO.attr("x", annotX + padding)
            .attr("y", annotY)
            .attr("height", divRect.height);
    };

    var fadeAnnotation = function(x){
        annotDiv.style("opacity", Math.abs(annotX-x) == 0 ? 1 : 1/Math.abs(annotX-x));
    };


    // get union of all the dates from the data in string format
    var getDateRange = function () {
        var dateRange = [];
        $.each(plotData, function (slot) {
            var date = plotData[slot].date;
            if ($.inArray(date, dateRange) == -1) // date not in dateRange already?
                dateRange.push(date.toUTCString());
        });
        return dateRange; //.sort();
    };

    var initPlotData = function () {
        plotData = loadPlotData(suppliedData);
    };

    var loadPlotData = function (dataSet) {
        var data = dataSet.line.data[0];
        var rawData = [];
        for (var i = 0; i < data[0].length; i++) {
            var d = data[0][i];
            var date = getDateValue(d.date);
            var value = getDatum(d.values, usDataId, FREDChart.noValue);
            if (value !== FREDChart.noValue) // skip entries with no value
                rawData.push({ "date": date, "value": value });
        }
        rawData.sort(function (a, b) {
            return a.date - b.date
        }); // sort ascending
        return rawData;
    };

    var getDatum = function (data, index, defaultVal) {
        if (!data || (typeof data[index] === "undefined"))
            return defaultVal;
        else {
            var d = data[index];
            return parseFloat(d);
        }
    };

    var getLim = function (dataSet) {
        var lim = [Number.MAX_VALUE, Number.MIN_VALUE];
        for (var i in dataSet) {
            var data = dataSet[i].values;
            // look for min and max
            for (var j in data) {
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
    };

    var getDateValue = function (dateString) {
        return new Date(dateString);
    };

    var interpolateDataValue = function (date) {
        // scan up across plot data looking for the date or two dates that frame it
        var dateValue = date.getTime();
        var lower = null;
        for (var i = 0; i < plotData.length; i++) {
            var plotDate = plotData[i].date;
            var plotDateValue = plotDate.getTime();
            if (dateValue == plotDateValue) {
                return plotData[i].value; // no need to interpolate
            } else if (dateValue < plotDateValue) {
                // interpolate the value
                var upper = plotData[i]; // plotData[i+1] is upper date
                var valueRange = upper.value - lower.value;
                var dateRange = upper.date.getTime() - lower.date.getTime();
                var factor = (dateValue - lower.date.getTime()) / dateRange;
                return lower.value + factor * valueRange;
            } else {
                lower = plotData[i]; // plotData[i] is current lower date
            }

        }
        throw "date out of range, (" + date.valueOf() + " " + date.toGMTString() + "), in interpolateDataValue.";
    };

    var displayValue = function (date) {
        return FREDChart.formatNumber(interpolateDataValue(date));
    };

    var getNearestAnnotation = function(dataPoint){
//        var curMo = dataPoint.date.getUTCMonth();
//        var curYr = dataPoint.date.getUTCFullYear();
        var curDateVal = dataPoint.date.getTime();
        var nearestVal = Number.MAX_VALUE;
        var nearestAnnotation = null;
        for(var i in dataAnnotations){
            var annotation = dataAnnotations[i];
//            var annotationMo = annotation.date.getUTCMonth();
//            var annotationYr = annotation.date.getUTCFullYear();
//            if( annotationYr == curYr && annotationMo == curMo ){;
                var annotDateVal = annotation.date.getTime();
                var dist = Math.abs(curDateVal - annotDateVal);
                if( dist < nearestVal ){
                    nearestVal = dist;
                    nearestAnnotation = annotation;
//                }
            }
        }
        return nearestAnnotation;
    }

    return module;

}(FREDTimeline || {}));
