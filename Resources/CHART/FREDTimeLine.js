/**
 * Created by scott on 7/28/14.
 * Based on example by Nate Ross
 */

var FREDTimeline = (function (module) {

    var w = 900,
        h = 450;

    var monthNames = [ "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December" ];

    var maxDataPointsForDots = 50,
        transitionDuration = 1000;

    var chartSvg = null;
    var yAxisGroup = null;
    var xAxisGroup = null;
    var dataCirclesGroup = null;
    var dataLinesGroup = null;
    var tip = null;

    var circles;

    var suppliedData;
    var dataDefs;

    var plotData;
    var dataAnnotations;
    var nationFeatures;
    var usDataId;

    module.init = function (selector, dataDefsArg, timelineDataArg, nationFeaturesArg) {
        dataDefs = dataDefsArg;
        suppliedData = timelineDataArg;
        nationFeatures = nationFeaturesArg;
        for (i in nationFeatures) {
            if (nationFeatures[i].properties.name === "United States") {
                usDataId = nationFeatures[i].properties.gid;
                break;
            }
        }

        dataAnnotations = suppliedData.annotations;

        FREDChart.initChart(selector, timelineClass, getDateRange, initPlotData, initializeChart,
            updateChart, true /*isUpdateOnSlide*/, dataDefs.chart_name, dataDefs.chart_text);

    };

    var initializeChart = function () {
        // get transformed, as-drawn coordinates of the div
        var divRect = FREDChart.chartAreaDiv.node().getBoundingClientRect();
        w = divRect.width;
        h = divRect.height;

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
        var margin = 40;

        var yMin = plotData.reduce(function (previous, current) {
            return previous.value < current.value ? previous : current;
        });
        var yMax = plotData.reduce(function (previous, current) {
            return previous.value > current.value ? previous : current;
        });

        var xMin = plotData[0].date;
        var xMax = plotData[plotData.length - 1].date;

        var pointRadius = 4;
        var xScale = d3.time.scale().range([0, w - margin * 2]).domain([xMin, xMax]);
        var yScale = d3.scale.linear().range([h - margin * 2, 0]).domain([yMin.value, yMax.value]);

        var xAxis = d3.svg.axis().scale(xScale).tickSize(h - margin * 2).tickPadding(10).ticks(7);
        var yAxis = d3.svg.axis().scale(yScale).orient('left').tickSize(-w + margin * 2).tickPadding(10);
        var t = null;

        chartSvg = FREDChart.chartAreaDiv.append("svg").attr("id", chartSvgId).attr("class", timelineClass);

        t = chartSvg.transition().duration(transitionDuration);

        // y ticks and labels
        if (!yAxisGroup) {
            yAxisGroup = chartSvg.append('svg:g')
                .attr('class', 'yTick')
                .call(yAxis);
        }
        else {
            t.select('.yTick').call(yAxis);
        }

        // x ticks and labels
        if (!xAxisGroup) {
            xAxisGroup = chartSvg.append('svg:g')
                .attr('class', 'xTick')
                .call(xAxis);
        }
        else {
            t.select('.xTick').call(xAxis);
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
            .y0(h - margin * 2)
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
            .attr("d", line(plotData));
        /*
         .transition()
         .delay(transitionDuration / 2)
         .duration(transitionDuration)
         .style('opacity', 1)
         .attr('x1', function(d, i) { return (i > 0) ? xScale(data[i - 1].date) : xScale(d.date); })
         .attr('y1', function(d, i) { return (i > 0) ? yScale(data[i - 1].value) : yScale(d.value); })
         .attr('x2', function(d) { return xScale(d.date); })
         .attr('y2', function(d) { return yScale(d.value); });
         */

        dataLines.transition()
            .attr("d", line)
            .duration(transitionDuration)
            .style('opacity', 1)
            .attr("transform", function (d) {
                return "translate(" + xScale(d.date) + "," + yScale(d.value) + ")";
            });

        dataLines.exit()
            .transition()
            .attr("d", line)
            .duration(transitionDuration)
            .attr("transform", function (d) {
                return "translate(" + xScale(d.date) + "," + yScale(0) + ")";
            })
            .style('opacity', 1e-6)
            .remove();

        d3.selectAll(".area").transition()
            .duration(transitionDuration)
            .attr("d", garea(plotData));

        // Draw the points
        if (!dataCirclesGroup) {
            dataCirclesGroup = chartSvg.append('svg:g');
        }

        circles = dataCirclesGroup.selectAll('.data-point')
            .data(plotData);

        circles
            .enter()
            .append('svg:circle')
            .attr('class', 'data-point')
            .style('opacity', 1e-6)
            .attr('cx', function (d) {
                return xScale(d.date)
            })
            .attr('cy', function () {
                return yScale(0)
            })
            .attr('r', function () {
                return (plotData.length <= maxDataPointsForDots) ? pointRadius : 0
            })
            .transition()
            .duration(transitionDuration)
            .style('opacity', 1)
            .attr('cx', function (d) {
                return xScale(d.date)
            })
            .attr('cy', function (d) {
                return yScale(d.value)
            });

        circles
            .transition()
            .duration(transitionDuration)
            .attr('cx', function (d) {
                return xScale(d.date)
            })
            .attr('cy', function (d) {
                return yScale(d.value)
            })
            .attr('r', function () {
                return (plotData.length <= maxDataPointsForDots) ? pointRadius : 0
            })
            .style('opacity', 1);

        circles
            .exit()
            .transition()
            .duration(transitionDuration)
            // Leave the cx transition off. Allowing the points to fall where they lie is best.
            //.attr('cx', function(d, i) { return xScale(i) })
            .attr('cy', function () {
                return yScale(0)
            })
            .style("opacity", 1e-6)
            .remove();

//    $('svg circle').tipsy({
//        gravity: 'chartWidth',
//        html: true,
//        title: function() {
//            var d = this.__data__;
//            var pDate = d.date;
//            return 'Date: ' + pDate.getDate() + " " + monthNames[pDate.getMonth()] + " " + pDate.getFullYear() + '<br>Value: ' + d.value;
//        }
//    });

        tip = d3.tip().attr("class", "timelinetip").html(function (d, i) {
            for (var a = 0; a < annotations.length; a++) {
                if (a.date == FREDChart.timeSlotDate) {
                    return annotations[a].value;
                }
            }
            return null;
        }).direction("e").offset([0, 10]);
        chartSvg.call(tip);
    };

    var updateChart = function () {
        // TBD
        // slide sweep line across plot and popup annotations when available
        console.log("Date: " + FREDChart.timeSlotDate);
    }


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
        for (var i=0; i<data[0].length; i++) {
            var d = data[0][i];
            var date = getDateValue( d.date );
            var value = getDatum(d.values, usDataId, FREDChart.noValue);
            if( value !== FREDChart.noValue ) // skip entries with no value
                rawData.push({ "date": date, "value": value });
        }
        rawData.sort(function(a, b){return a.date - b.date}); // sort ascending
        return rawData;
    };

    var getDatum = function (data, index, defaultVal) {
        if (!data || (typeof data[index] === "undefined"))
            return defaultVal;
        else {
            var d= data[index];
            var value = parseFloat(d);
            return value;
        }
    }

    var getLim = function (dataSet) {
        var lim = [Number.MAX_VALUE, Number.MIN_VALUE];
        for (i in dataSet) {
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

    var getDateValue = function( dateString ){
        return new Date( dateString );
    }

    return module;

}(FREDTimeline || {}));
