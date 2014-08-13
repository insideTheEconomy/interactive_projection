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

    module.noValue = "NA";

    var chartAreaDiv;
    var dateLabelDiv;

    var updateChartFcn;

    var dateRange;

    module.wrapperDivId = "wrapper";
    module.menuDivId = "accordion";
    module.chartDivId = "chart";

    module.chartMainId = "chartMain";
    module.chartAreaId = "chartArea";
    module.chartSvgId = "chartSvg";
    var chartTitleId = "chartTitle";
    var chartDescriptionId = "chartDescription";
    var dateLabelId = "dateLabel";
    var dateSliderId = "dateSlider";
    var dateSliderLabelId = "dateSliderLabel";
    module.mapColorLegendId = "mapColorLegend";

    module.scatterClass = "scatter";
    module.usmapClass = "usmap";
    module.worldmapClass = "worldmap";
    module.timelineClass = "timeline";

    var numSliderTicks = 8;

    module.initChart = function (parentSelector, chartClass, getDateRangeFcn, initPlotDataFcn, initializeChartFcn, updateChartFcnArg, isUpdateOnSlide, chartTitle, chartText) {

        updateChartFcn = updateChartFcnArg;

        var parentElem = d3.select(parentSelector);
        var mainElement = appendOrReclassElement(parentElem, "div", module.chartMainId, chartClass);
        appendOrReclassElement(mainElement, "div", chartTitleId, chartClass);
        appendOrReclassElement(mainElement, "div", chartDescriptionId, chartClass);
        dateLabelDiv = appendOrReclassElement(mainElement, "div", dateLabelId, chartClass);
        chartAreaDiv = replaceElement(mainElement, "div", module.chartAreaId, chartClass);

        module.chartAreaDiv = chartAreaDiv; // export this

        // init plot data
        initPlotDataFcn();

        dateRange = getDateRangeFcn();
        module.timeSlotDate = dateRange[0];

        d3.select("#" + chartTitleId).text(chartTitle);
        d3.select("#" + chartDescriptionId).text(chartText);

        initializeChartFcn(chartClass); // draw plot

        drawSlider(chartClass, isUpdateOnSlide);

        d3.select("body").style("cursor", "auto");
    }

//    function d3AppendOrReclassElement(parentSelector, element, id, elemClass) {
//        var elemRef = d3.select(parentSelector + " " + element + "#" + id);
//        if (elemRef.length == 0 || elemRef[0][0] == null) {
//            elemRef = d3.select(parentSelector).append(element).attr("id", id).attr("class", elemClass);
//        }
//        return elemRef;
//    }

    function appendOrReclassElement(parentElem, element, id, elemClass) {
        var elemRef = parentElem.select(element + "#" + id);
        if (elemRef.length == 0 || elemRef[0][0] == null) {
            elemRef = parentElem.append(element).attr("id", id).attr("class", elemClass);
        }
        return elemRef;
    }

    function replaceElement(parentElem, element, id, elemClass) {
        var elemRef = parentElem.select(element + "#" + id);
        if (elemRef.length > 0 && elemRef[0][0] != null) {
            parentElem.select(element + " #" + id).remove();
        }
        elemRef = parentElem.append(element).attr("id", id).attr("class", elemClass);
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

    module.getNiceColorScale = function (dataArray) {
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
    }

    module.log10 = function (x) {
        return Math.log(x) * Math.LOG10E;
    }

    return module;
}(FREDChart || {}));
