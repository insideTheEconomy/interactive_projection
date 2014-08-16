/**
 * Created by scott on 8/4/14.
 */
var FREDChart = (function (module) {

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

    var chartAreaDiv;
    var dateLabelDiv;
    var colorLegendDiv;

    var updateChartFcn;

    var dateRange;

    module.wrapperDivId = "wrapper";
    module.menuDivId = "accordion";
    module.chartDivId = "chart";

    module.chartMainId = "chartMain";
    module.chartAreaId = "chartArea";
    module.chartSvgId = "chartSvg";
    module.chartPanelId = "chartPanel";
    var chartTitleId = "chartTitle";
    var chartDescriptionId = "chartDescription";
    var dateLabelId = "dateLabel";
    var dateSliderId = "dateSlider";
    var dateSliderLabelId = "dateSliderLabel";
    module.mapColorLegendId = "mapColorLegend";
    var sourceFootnoteId = "sourceFootnote";
    module.resetBtnClass = "resetBtn";

    module.scatterClass = "scatter";
    module.usmapClass = "usmap";
    module.worldmapClass = "worldmap";
    module.timelineClass = "timeline";

    var numSliderTicks = 8;

    var resetFcn;

    module.initChart = function (parentSelector, chartClass,
                                 getDateRangeFcn, initPlotDataFcn, initializeChartFcn, updateChartFcnArg,
                                 isUpdateOnSlide, chartTitle, chartText, sourceFootnote) {

        updateChartFcn = updateChartFcnArg;

        // hide the reset btn if there is one
        d3.selectAll("."+module.resetBtnClass).attr("visibility", "hidden");

        var parentElem = d3.select(parentSelector);
        var mainElement = appendOrReclassElement(parentElem, "div", module.chartMainId, chartClass);
        appendOrReclassElement(mainElement, "div", chartTitleId, null);
        appendOrReclassElement(mainElement, "div", chartDescriptionId, null);
        dateLabelDiv = appendOrReclassElement(mainElement, "div", dateLabelId, null);
        chartAreaDiv = replaceElement(mainElement, "div", module.chartAreaId, chartClass);
        colorLegendDiv = replaceElement(mainElement, "div", module.mapColorLegendId, chartClass);

        module.chartAreaDiv = chartAreaDiv; // export this

        // init plot data
        initPlotDataFcn();

        dateRange = getDateRangeFcn();
        module.timeSlotDate = dateRange[0];

        d3.select("#" + chartTitleId).text(chartTitle+"*");
        d3.select("#" + chartDescriptionId).text(chartText);

        initializeChartFcn(chartClass); // draw plot

        drawSlider(chartClass, isUpdateOnSlide);

        drawSourceFootnote(chartClass, sourceFootnote)

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

    function drawSlider(chartClass, isUpdateOnSlide) {
        var uiValue = null;
        var min = 0;
        var max = dateRange.length - 1;
        var fullRange = max - min;
        var tickInterval = Math.max(1, Math.floor(fullRange / (numSliderTicks - 1)));
        appendOrReclassElement(chartAreaDiv, "div", dateSliderId, chartClass);
        $("#" + dateSliderId).labeledslider({
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
                    dateLabelSliderDiv.html(module.getFormattedDatestring(module.timeSlotDate));
                    uiValue = value;
                    if (isUpdateOnSlide) {
                        updateChartFcn();
                    }
                }
            },
            stop: function () {
                if (!isUpdateOnSlide) {
                    updateChartFcn();
                }
            }
        });
        var dateLabelSliderDiv = appendOrReclassElement(chartAreaDiv, "div", dateSliderLabelId, chartClass);

        dateLabelDiv.html(module.getFormattedDatestring(module.timeSlotDate));
        dateLabelSliderDiv.html(module.getFormattedDatestring(module.timeSlotDate));
    }

    module.getFormattedDatestring = function (dateString) {
        return module.getFormattedDate(new Date(dateString));
    }

    var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    module.getFormattedDate = function (date) {
        return months[date.getUTCMonth()] + " " + date.getUTCFullYear();
    };

    var getSliderLabels = function (tickInterval) {
        var labels = [];
        for (var i = 0; i < dateRange.length; i++) {
            if (i % tickInterval == 0) {
                var date = new Date(dateRange[i]);
                labels.push(date.getFullYear())
            } else {
                labels.push(" ");
            }
        }
        return labels;
    };

    var drawSourceFootnote = function(chartClass, sourceFootnote){
        appendOrReclassElement(chartAreaDiv, "div", sourceFootnoteId, chartClass)
            .html("(*"+sourceFootnote+")")
            .attr("id",sourceFootnoteId);
    }

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
    }

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

        /** reset button for unzooming maps **/
        var resetRect = legendGroup.append("rect").attr("class", module.resetBtnClass)
            .attr("visibility", "hidden")
            .on("click", function(){
                resetFcn();
            });

        var resetPadding = 5;
        var resetText = legendGroup.append("text").attr("class", module.resetBtnClass)
            .attr("x", marginLeft + resetPadding)
            .attr("y", yND + lsH + lsYMargin + 5)
            .attr("visibility", "hidden")
            .text("Reset");

        // center rectangle on text
        centerRectOnText(resetRect, resetText, resetPadding);

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
        var c = 0, p;
        for (var p in obj) {
            if (obj.hasOwnProperty(p)) {
                c++;
            }
        }
        return c;
    }

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

    module.setResetFcn = function(resetFcnArg){
        resetFcn = resetFcnArg;
    }

    module.log10 = function (x) {
        return Math.log(x) * Math.LOG10E;
    }

    return module;
}(FREDChart || {}));
