/**
 * Created by scott on 8/4/14.
 */
var FREDChart = (function (module) {

    module.rpcURLPrefix = "org.iproj.";

    module.colors = [
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
    module.nanColor = '#D5D2CA';

    module.noValue = "ND";
    module.noValueLabel = "No Data";

    module.chartAreaDiv;
    var dateLabelDiv;
//    var dateSliderLabelDiv;
    var colorLegendDiv;

    var updateChartFcn;

    var isMaster;
    var rpcSession;

    var dateRange;

    module.wrapperDivId = "wrapper";
    module.menuDivId = "accordion";
    module.chartDivId = "chart";

    module.chartMainId = "chartMain";
    module.chartAreaId = "chartArea";
    module.chartSvgId = "chartSvg";
    module.chartSvgDivId = "chartSvgDiv";
    module.chartPanelId = "chartPanel";
    var chartTitleId = "chartTitle";
    var chartDescriptionId = "chartDescription";
    var dateLabelId = "dateLabel";
    var dateSliderId = "dateSlider";
    var dateSliderLabelId = "dateSliderLabel";
    module.mapColorLegendId = "mapColorLegend";
    var sourceFootnoteId = "sourceFootnote";
    var chartLegendWrapperId = "chartLegendWrapper";
    module.resetBtnClass = "resetBtn";

    module.scatterClass = "scatter";
    module.usmapClass = "usmap";
    module.worldmapClass = "worldmap";
    module.timelineClass = "timeline";

    module.slaveClass = "slave";

    var numSliderTicks = 8;

    var resetFcn;

    module.initChart = function (parentSelector, chartClass,
                                 getDateRangeFcn, initPlotDataFcn, initializeChartFcn, updateChartFcnArg,
                                 isUpdateOnSlide, isMonthSlider, chartTitle, chartText, sourceFootnote,
                                 isMasterArg, rpcSessionArg) {

        updateChartFcn = updateChartFcnArg;
        isMaster = isMasterArg;
        rpcSession = rpcSessionArg;

        if(!isMaster){
            chartClass = chartClass + " " + module.slaveClass;
        }

        // hide the reset btn if there is one
        d3.selectAll("."+module.resetBtnClass).attr("visibility", "hidden");

        var parentElem = d3.select(parentSelector);
        var mainElement = appendOrReclassElement(parentElem, "div", module.chartMainId, chartClass);

        // main element children
        appendOrReclassElement(mainElement, "div", chartTitleId, null).text(chartTitle);
        dateLabelDiv = appendOrReclassElement(mainElement, "div", dateLabelId, null);
        var chartLegendWrapper = appendOrReclassElement(mainElement, "div", chartLegendWrapperId, chartClass); // needed to maintain order when replacing contents
        colorLegendDiv = replaceElement(chartLegendWrapper, "div", module.mapColorLegendId, chartClass);
        module.chartAreaDiv = replaceElement(chartLegendWrapper, "div", module.chartAreaId, chartClass);
        appendOrReclassElement(mainElement, "div", chartDescriptionId, null).text(chartText);
        appendOrReclassElement(mainElement, "div", dateSliderId, chartClass);
        var footnoteDiv = appendOrReclassElement(mainElement, "div", sourceFootnoteId, chartClass)
            .attr("id",sourceFootnoteId);;

        // add the source footnote if there is one
        footnoteDiv.html(sourceFootnote ? "(" + sourceFootnote + ")" : "");

        // init plot data
        initPlotDataFcn();

        // get dates for the chart
        dateRange = getDateRangeFcn();
        module.timeSlotDate = dateRange[dateRange.length > 2 ? Math.round(dateRange.length / 2) : 0]; // set initial date, more or less to middle

        initializeChartFcn(chartClass); // draw plot

        // only display slider on master screen
        if(isMaster) {
            if (isMonthSlider) {
                drawMonthSlider(isUpdateOnSlide);
            } else {
                drawSlider(isUpdateOnSlide);
            }
        } else {
            // register slider rpc callback
            rpcSession.register(FREDChart.rpcURLPrefix + "common.updateChart", updateChartFcn);
        }

        // draw data
        updateChartFcn();

        d3.select("body").style("cursor", "auto");
    };

    function appendOrReclassElement(parentElem, element, id, elemClass) {
        var elemRef = parentElem.select(element + "#" + id);
        if (elemRef.length == 0 || elemRef[0][0] == null) {
            elemRef = parentElem.append(element).attr("id", id);
        }
        if( elemClass ){
            elemRef.attr("class", elemClass);
        }
        return elemRef;
    }

    function replaceElement(parentElem, element, id, elemClass) {
        var elemRef = parentElem.select(element + "#" + id);
        if (elemRef.length > 0 && elemRef[0][0] != null) {
            parentElem.select(element + " #" + id).remove();
        }
        elemRef = parentElem.append(element).attr("id", id);
        if( elemClass ){
            elemRef.attr("class", elemClass);
        }
        return elemRef;
    }

    function drawSlider(isUpdateOnSlide) {
        var uiValue = null;
        var min = 0;
        var max = dateRange.length - 1;
        var fullRange = max - min;
        var tickInterval = Math.max(1, Math.floor(fullRange / (numSliderTicks - 1)));
        $("#" + dateSliderId).slider({
            min: min,
            max: max,
            value: dateRange.indexOf(module.timeSlotDate), // start at current date
            animate: "fast", // animate sliding
            tickLabels: getSliderLabels(tickInterval),
            slide: function (event, ui) {
                var value = Math.round(ui.value);
                if (value != uiValue) {
                    module.timeSlotDate = dateRange[value];
                    dateLabelDiv.html(module.getFormattedDatestring(module.timeSlotDate));
//                    dateSliderLabelDiv.html(module.getFormattedDatestring(module.timeSlotDate));
                    uiValue = value;
                    if (isUpdateOnSlide) {
                        updateChartFcn();
                        rpcSession.call(FREDChart.rpcURLPrefix + "common.updateChart"); // call slave
                    }
                }
            },
            stop: function () {
                if (!isUpdateOnSlide) {
                    updateChartFcn();
                    rpcSession.call(FREDChart.rpcURLPrefix + "common.updateChart"); // call slave
                }
            }
        });

        dateLabelDiv.html(module.getFormattedDatestring(module.timeSlotDate));
//        dateSliderLabelDiv.html(module.getFormattedDatestring(module.timeSlotDate));
    }

    // slider that steps by month over a date range, used for the timeline chart
    function drawMonthSlider(isUpdateOnSlide) {
        var numDates = dateRange.length - 1;
        var startDate = new Date(dateRange[0]);
        var endDate = new Date(dateRange[numDates]);
        var curDate = new Date(module.timeSlotDate);
        var startDateYr = startDate.getUTCFullYear();
        var endDateYr = endDate.getUTCFullYear();
        var curDateYr = curDate.getUTCFullYear();
        var startDateMo = startDate.getUTCMonth();
        var endDateMo = endDate.getUTCMonth();
        var curDateMo = curDate.getUTCMonth();
        var totalMonths = 12 * (endDateYr - startDateYr + 1) - startDateMo - (11 - endDateMo);
        var curMo = 12 * (curDateYr - startDateYr + 1) - startDateMo - (11 - curDateMo);

        var uiValue = null;
        var min = 0;
        var max = totalMonths-1;
        $("#" + dateSliderId).slider({
            min: min,
            max: max,
            value: curMo, // start at global date
            animate: "fast", // animate sliding
            slide: function (event, ui) {
                var sliderMo = ui.value;
                var sliderYr = startDateYr + Math.floor((sliderMo + startDateMo)/12);
                var sliderYrMo = (sliderMo + startDateMo) % 12;
                if( sliderMo != uiValue ) {
                    var date = new Date().setUTCFullYear(sliderYr, sliderYrMo);
                    module.timeSlotDate = date;
                    dateLabelDiv.html(module.getFormattedDatestring(module.timeSlotDate));
//                    dateSliderLabelDiv.html(module.getFormattedDatestring(module.timeSlotDate));
                    uiValue = sliderMo;
                    if (isUpdateOnSlide) {
                        updateChartFcn();
                        rpcSession.call(FREDChart.rpcURLPrefix + "common.updateChart"); // call slave
                    }
                }
            },
            stop: function () {
                if (!isUpdateOnSlide) {
                    updateChartFcn();
                    rpcSession.call(FREDChart.rpcURLPrefix + "common.updateChart"); // call slave
                }
            }
        });
        dateLabelDiv.html(module.getFormattedDatestring(module.timeSlotDate));
//        dateLabelSliderDiv.html(module.getFormattedDatestring(module.timeSlotDate));
    }

    module.getFormattedDatestring = function (dateString) {
        return module.getFormattedDate(new Date(dateString));
    };

    module.getFullFormattedDatestring = function (dateString) {
        return module.getFormattedDate(new Date(dateString));
    };

    var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    module.getFormattedDate = function (date) {
        return months[date.getUTCMonth()] + " " + date.getUTCFullYear();
    };

    module.getFullFormattedDate = function (date) {
        return months[date.getUTCMonth()] + " " + date.getUTCDate() + ", " + date.getUTCFullYear();
    };

    var getSliderLabels = function (tickInterval) {
        var labels = [];
        for (var i = 0; i < dateRange.length; i++) {
            if (i % tickInterval == 0) {
                var date = new Date(dateRange[i]);
                labels.push(date.getUTCFullYear())
            } else {
                labels.push(" ");
            }
        }
        return labels;
    };

    var getSmoothSliderLabels = function (numSliderTicks) {
        var numDates = dateRange.length;
        var tickInterval = Math.floor(numDates / numSliderTicks);
        var labels = [];
        for (var i = 0; i < numDates; i++) {
            if (i % tickInterval == 0) {
                var date = new Date(dateRange[i]);
                labels.push(date.getUTCFullYear())
            } else {
                labels.push(" ");
            }
        }
        return labels;
    };

    module.wrapTextLines = function (text) {
        text.each(function () {
            var text = d3.select(this),
                lines = text.text().split("\\n").reverse(),
                line,
                lineNumber = 0,
                lineHeight = 1.1, // ems
                y = text.attr("y"),
                dy = parseFloat(text.attr("dy"));
            text.text(null);
            while (line = lines.pop()) {
                text.append("tspan").attr("x", 0).attr("y", y).attr("dy",
                        ++lineNumber * lineHeight + dy + "em").text(line);
            }
        });
    };

    module.drawLegend = function (plotData, opacity) {
        // get colorScale
        var colorScale = getColorScale(plotData);

        // get the threshold value for each of the colors in the color scale
        var domainElems = [];
        $.each(module.colors, function (index) {
            var domainExtent = colorScale.invertExtent(module.colors[index]);
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
        var colorLegendSvg = colorLegendDiv.append("svg").attr("id", module.mapColorLegendId);
        var legendGroup = colorLegendSvg.append("g");

        var colorLegend = legendGroup.selectAll("g#" + module.mapColorLegendId)
            .data(domainElems)
            .enter().append("g").attr("id", module.mapColorLegendId);

        var marginLeft = 0;
        var lsW = 30;
        var lsH = 30;
        var lsYMargin = 1.5 * lsH;
        var lsTextYOffset = lsH / 2 + 4;
        var lsTextXOffset = lsW * 2;

        // units label above legend
        legendGroup.append("text")
            .attr("id", "colorLegendUnits")
            .attr("text-anchor", "start")
            .attr("x", lsW)
            .attr("y", lsYMargin + lsTextYOffset - lsH)
            .text(plotData[0].units);

        // stack of color bloacks
        colorLegend.append("rect")
            .attr("id", "colorLegendBlock")
            .attr("x", marginLeft)
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
            .style("opacity", opacity);

        // labels for color blocks
        colorLegend.append("text")
            .attr("id", "colorLegendLabel")
            .attr("x", lsTextXOffset)
            .attr("y", function (d, i) {
                return (i * lsH) + lsYMargin + lsTextYOffset;
            })
            .text(function (d, i) {
                return legendLabels[i];
            });

        // append no-data block
        var yND = domainElems.length * lsH + lsYMargin + 5;
        legendGroup.append("rect")
            .attr("id", "colorLegendBlock")
            .attr("x", marginLeft)
            .attr("y", yND)
            .attr("width", lsW)
            .attr("height", lsH)
            .style("fill", module.nanColor)
            .style("opacity", opacity);

        // label no data block
        legendGroup.append("text")
            .attr("id", "colorLegendLabel")
            .attr("x", lsTextXOffset)
            .attr("y", yND + lsTextYOffset)
            .text(module.noValueLabel);

        return colorScale;
    };

    var getColorScale = function (plotData) {
        // get extent of data for all timeseries
        var dataCount = countFields(plotData[0]);
        var dataArray = [];
        for (var i = 0; i < plotData.length; i++) {
            var timeSeries = plotData[i];
            for (var j = 0; j < dataCount; j++) {
                var val = parseFloat(timeSeries.values[j + 1]);
                if (!isNaN(val)) {
                    dataArray.push(val);
                }
            }
        }
        return getNiceColorScale(dataArray);
    };

    var countFields = function(obj) {
        var c = 0;
        for (var p in obj) {
            if (obj.hasOwnProperty(p)) {
                c++;
            }
        }
        return c;
    };

    var getNiceColorScale = function (dataArray) {
        var count = dataArray.length;
        var total = dataArray.reduce(function (a, b) {
            return a + b;
        }, 0);
        var mean = total / count;

        // get a useful range for the data, not too much or too little left outside the color scale
        var stdDevSum = 0;
        for (var i = count; i--; stdDevSum += Math.pow(dataArray[i] - mean, 2));
        var variance = stdDevSum / count;
        var stdev = Math.sqrt(variance);
        var usefulDomainExtent = [mean - 2 * stdev, mean + 2 * stdev];

        // now make it nice, falling into rounded value intervals
        var numColors = module.colors.length;
        var usefulQuantile = (usefulDomainExtent[1] - usefulDomainExtent[0]) / (numColors - 1);
        var x = Math.ceil(module.log10(usefulQuantile) - 1);
        var pow10x = Math.pow(10, x);
        var niceQuantile = Math.ceil(usefulQuantile / pow10x) * pow10x;
        var niceDomainExtent = [niceQuantile * Math.round(usefulDomainExtent[0] / niceQuantile),
                niceQuantile * Math.round(1 + usefulDomainExtent[1] / niceQuantile)];


        var colorScale = d3.scale.quantize()
            .domain(niceDomainExtent)
            .range(module.colors);

        return colorScale;
    };

    module.log10 = function (x) {
        return Math.log(x) * Math.LOG10E;
    };

    module.formatNumber = function(number){
        // return number.toFixed(2);
        return Math.floor(number) === number ? number : module.log10(number) > 4 ? number.toFixed() : number.toFixed(2);
    }

    return module;
}(FREDChart || {}));
