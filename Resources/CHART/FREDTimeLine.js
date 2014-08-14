/**
 * Created by scott on 7/28/14.
 * Based on example by Nate Ross  and https://gist.github.com/mccannf/1629644
 */

var FREDTimeline = (function (module) {

    var chartWidth,
        chartHeight;
    var tickPadding = 5;
    var margin = {
        left: 40,
        top: 40,
        bottom: 40,
        inner: 5
    };
    var axispos = {
        xtitle: 0, // no title for date axis
        ytitle: 30,
        sztitle: 25,
        xlabel: 5,
        ylabel: 5,
        szlabel: 5
    };

    var monthNames = [ "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December" ];

    var maxDataPointsForDots = 50,
        transitionDuration = 1000;

    var chartSvg = null;
    var jqSvg;

    var yAxisGroup = null;
    var xAxisGroup = null;
    var dataCirclesGroup = null;
    var dataLinesGroup = null;

    var annotationPointRadius = 4;
    var dataPointRadius = 2;
    var xScale;
    var yScale;

    var xMin, xMax;
    var yMin, yMax;
    var valueFormat = d3.format(".2f");

    var circles;

    var suppliedData;
    var dataDefs;

    var plotData;
    var dataAnnotations;
    var valueLabel;
    var valueLine;
    var usDataId;

    var timelineClass = FREDChart.timelineClass;

    module.init = function (selector, dataDefsArg, timelineDataArg, nationFeatures) {
        dataDefs = dataDefsArg;
        suppliedData = timelineDataArg;

        for (var i in nationFeatures) {
            var x = nationFeatures[i];
            if (nationFeatures[i] != "undefined" && nationFeatures[i].name === "United States") {
                usDataId = nationFeatures[i].gid
            }
        }

        dataAnnotations = suppliedData.line.annotations;

        FREDChart.initChart(selector, timelineClass, getDateRange, initPlotData, initializeChart,
            updateChart, true /*isUpdateOnSlide*/, dataDefs.chart_name, dataDefs.chart_text);

    };

    var initializeChart = function () {
        chartSvg = FREDChart.chartAreaDiv.append("svg").attr("id", FREDChart.chartSvgId).attr("class",
            FREDChart.timelineClass);
        jqSvg = $("#" + FREDChart.chartSvgId);

        // get transformed, as-drawn coordinates of the div
        var divRect = FREDChart.chartAreaDiv.node().getBoundingClientRect();
        chartWidth = divRect.width;
        chartHeight = divRect.height;

        //then draw the shapes
        drawChart();

        // set up rollovers
        circles.on("mouseover", function (d) {
            return d3.select(this).attr("r", 2 * getSize(this));
        }).on("mouseout", function (d) {
            return d3.select(this).attr("r", getSize(this));
        });
    };

    var drawChart = function () {
        var sampleData = suppliedData.line.data[0][0];
        var yLab = sampleData[0].title + " (" + sampleData[0].units + ")";

        yMin = plotData.reduce(function (previous, current) {
            return previous.value < current.value ? previous : current;
        });
        yMax = plotData.reduce(function (previous, current) {
            return previous.value > current.value ? previous : current;
        });

        xMin = plotData[0].date;
        xMax = plotData[plotData.length - 1].date;

        xScale = d3.time.scale().range([0, chartWidth - margin.bottom * 2]).domain([xMin, xMax]);
        yScale = d3.scale.linear().range([chartHeight - margin.left * 2, 0]).domain([yMin.value, yMax.value]);

        var xAxis = d3.svg.axis().scale(xScale)
            .tickSize(chartHeight - margin.bottom * 2 + tickPadding)
            .tickPadding(tickPadding)
            .ticks(7);
        var yAxis = d3.svg.axis().scale(yScale).orient('left')
            .tickSize(-chartWidth + margin.left * 2 - tickPadding)
            .tickPadding(tickPadding)
            .ticks(6);

        transition = chartSvg.transition().duration(transitionDuration);

        // y ticks and labels
        if (!yAxisGroup) {
            yAxisGroup = chartSvg.append('svg:g')
                .attr("class", "y axis " + timelineClass)
                .call(yAxis);

            // y axis title
            yAxisGroup.append("text")
                .attr("class", "title " + timelineClass)
                .attr("y", margin.top + margin.bottom + chartHeight / 2)
                .attr("x", margin.left - axispos.ytitle)
                .text(yLab)
                .attr("transform", "rotate(270," + (margin.left - axispos.ytitle) + "," + (margin.top + margin.bottom + chartHeight / 2) + ")");
        }
        else {
            transition.select('.y.axis').call(yAxis);
        }

        // x ticks and labels
        if (!xAxisGroup) {
            xAxisGroup = chartSvg.append('svg:g')
                .attr("class", "x axis " + timelineClass)
                .call(xAxis);
        }
        else {
            transition.select('.x.axis').call(xAxis);
        }

        // Draw the lines
        if (!dataLinesGroup) {
            dataLinesGroup = chartSvg.append('svg:g');
        }

        var dataLines = dataLinesGroup.selectAll('.data-line')
            .data([plotData]);

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

        /*
         .attr("d", d3.svg.line()
         .x(function(d) { return x(d.date); })
         .y(function(d) { return y(0); }))
         .transition()
         .delay(transitionDuration / 2)
         .duration(transitionDuration)
         .style('opacity', 1)
         .attr("transform", function(d) { return "translate(" + x(d.date) + "," + y(d.value) + ")"; });
         */

        var garea = d3.svg.area()
            .interpolate("linear")
            .x(function (d) {
                return xScale(d.date);
            })
            .y0(chartHeight - margin.bottom - margin.top)
            .y1(function (d) {
                // verbose logging to show what's actually being done
                // console.log('Plotting Y value for data value: ' + d.value + ' to be at: ' + yScale(d.value) + " using our yScale.");
                return yScale(d.value);
            });

        dataLines
            .enter()
            .append('svg:path')
            .attr("class", "area")
            .attr("d", garea(plotData));

        dataLines.enter().append('path')
            .attr('class', 'data-line')
            .style('opacity', 0.3)
            .attr("d", line(plotData))
            .transition()
            .delay(transitionDuration / 2)
            .duration(transitionDuration)
            .style('opacity', 1)
            .attr('x1', function (d, i) {
                return (i > 0) ? xScale(data[i - 1].date) : xScale(d.date);
            })
            .attr('y1', function (d, i) {
                return (i > 0) ? yScale(data[i - 1].value) : yScale(d.value);
            })
            .attr('x2', function (d) {
                return xScale(d.date);
            })
            .attr('y2', function (d) {
                return yScale(d.value);
            });

//        dataLines.transition()
//            .attr("d", line)
//            .duration(transitionDuration)
//            .style('opacity', 1)
//            .attr("transform", function (d) {
//                return "translate(" + xScale(d.date) + "," + yScale(d.value) + ")";
//            });
//
//        dataLines.exit()
//            .transition()
//            .attr("d", line)
//            .duration(transitionDuration)
//            .attr("transform", function (d) {
//                return "translate(" + xScale(d.date) + "," + yScale(0) + ")";
//            })
//            .style('opacity', 1e-6)
//            .remove();

        d3.selectAll(".area").transition()
            .duration(transitionDuration)
            .attr("d", garea(plotData));

        // Draw the annotated points
        if (!dataCirclesGroup) {
            dataCirclesGroup = chartSvg.append('svg:g');
        }

        circles = dataCirclesGroup.selectAll('.data-point')
            .data(dataAnnotations)
            .enter()
            .append('svg:circle')
            .attr('class', 'data-point')
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
        console.log("Date: " + date);
        var dataPoint = {"date": date, "value": interpolateDataValue(date)};
        updateValueTrace(dataPoint);
        //updateAnnotationLabel(dataPoint);
    };

    // a dotted line from the plot line to the x-axis with a value box at the top
    var updateValueTrace = function (dataPoint) {
        var margin = 10;
        var padding = 2;

        var date = dataPoint.date;
        var value = dataPoint.value;
        var x = xScale(date);
        var y = yScale(value);

        // add a label group if there isn't one yet
        if (!valueLabel) {
            valueLabel = chartSvg.append("g");

            valueLabel.append("svg:rect")
                .attr("class", "valueLabel " + timelineClass)
                .attr("rx", "5")
                .attr("ry", "5");

            valueLabel.append("svg:text")
                .attr("class", "valueLabel" + timelineClass)
                .attr("id", "valueLabelValue");

            valueLabel.append("svg:line")
                .attr("class", "valueLine" + timelineClass);
        }

        // get offset of the chart div
        var offset = jqSvg.offset();

        d3.select("#valueLabelValue").text(valueFormat(value));
        var textWidthValue = d3.select("#valueLabelValue").node().getBBox().width;
        var textHeightValue = d3.select("#valueLabelValue").node().getBBox().height;
        var rectWidth = textWidthValue + margin;

        // position the popup elements

        d3.select("line.valueLine")
            .attr("x1", x)
            .attr("y1", yScale(yMin.value))
            .attr("x2", x)
            .attr("y2", y);

        d3.select("#valueLabelValue")
            .attr("x", x + annotationPointRadius + 2) // just off the right edge of the point
            .attr("y", y);

        // center rectangle on text
        centerRectOnText(d3.select("rect.valueLabel"), d3.select("#valueLabelValue"), padding);

        d3.select("#valueLabelValue").attr("visibility", "visible");
        d3.select("rect.valueLabel").attr("visibility", "visible");
    };

    var updateAnnotationLabel = function (dataPoint) {
        var annotatedCircle;

        // add a label group if there isn't one yet
        if (!valueLabel) {
            valueLabel = chartSvg.append("g");

            valueLabel.append("rect")
                .attr("class", "annotationLabel")
                .attr("rx", "5")
                .attr("ry", "5");

            valueLabel.append("text")
                .attr("class", "annotationLabel")
                .attr("id", "annotationLabelValue");
        }

        var margin = 10;

        // get transformed, as-drawn coordinates of the county
        var brect = d3.select(annotatedCircle).node().getBoundingClientRect();

        // get offset of the chart div
        var offset = chartAreaDiv.offset();

        d3.select("#annotationLabelValue").text(displayValue());
        var textWidthValue = d3.select("#annotationLabelValue").node().getBBox().width;
        var textHeightValue = d3.select("#annotationLabelValue").node().getBBox().height;
        var rectWidth = Math.max(textWidthName, textWidthValue) + margin;

        // position the popup elements

        d3.select("#annotationLabelValue")
            .attr("x", +((brect.left + (brect.width - textWidthValue) / 2 - offset.left))) // center on the county
            .attr("y", +(textHeightValue + brect.top + brect.height / 2 - offset.top) + margin);

        // Update the width and height of the rectangle to match the text, with a little padding
        var rectHeight = textHeightValue + textHeightValue + margin;
        d3.select("rect.annotationLabel")
            .attr("width", rectWidth + 5)
            .attr("height", rectHeight + 5)
            .attr("x", +(brect.left + (brect.width - rectWidth) / 2 - offset.left) + annotationPointRadius) // left edge just off the
            .attr("y", +(brect.top + brect.height / 2 - offset.top - margin));

        d3.select("#annotationLabelValue").attr("visibility", "visible");
        d3.select("rect.annotationLabel").attr("visibility", "visible");
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
        throw "date out of range, (" + date.toGMTString() + "), in interpolateDataValue.";
    };

    var displayValue = function (date) {
        return interpolateDataValue(date)
    };

    return module;

}(FREDTimeline || {}));
