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

    var chartAreaDiv;
    var dateLabelDiv;

    var updateChartFcn;

    var dateRange;

    module.wrapperDivId = "wrapper";
    module.menuDivId = "accordion";
    module.chartDivId = "chart";

    var chartMainId = "chartMain";
    var chartAreaId = "chartArea";
    var chartTitleId = "chartTitle";
    var chartDescriptionId = "chartDescription";
    var dateLabelId = "dateLabel";
    var dateSliderId = "dateSlider";
    var dateSliderLabelId = "dateSliderLabel";

    module.initChart = function (parentSelector, chartClass, getDateRangeFcn, initPlotDataFcn, initializeChartFcn,
                                 updateChartFcnArg, isUpdateOnSlide, chartTitle, chartText ) {

        updateChartFcn = updateChartFcnArg;

        var parentElem = d3.select(parentSelector);
        var mainElement = appendOrReclassElement(parentElem, "div", chartMainId, chartClass);
        appendOrReclassElement(mainElement, "div", chartTitleId, chartClass);
        appendOrReclassElement(mainElement, "div", chartDescriptionId, chartClass);
        dateLabelDiv = appendOrReclassElement(mainElement, "div", dateLabelId, chartClass);
        chartAreaDiv = replaceElement(mainElement, "div", chartAreaId, chartClass);

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
        var numTicks = 4;
        var tickInterval = Math.max(1, Math.floor(fullRange / (numTicks - 1)));
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
                    dateLabelDiv.html(getFormattedDate(module.timeSlotDate));
                    dateLabelSliderDiv.html(getFormattedDate(module.timeSlotDate));
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

        dateLabelDiv.html(getFormattedDate(module.timeSlotDate));
        dateLabelSliderDiv.html(getFormattedDate(module.timeSlotDate));
    }

    function getFormattedDate(dateString) {
        var date = new Date(dateString);
        var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        return months[date.getMonth()] + " " + date.getFullYear();
    }

    var getSliderLabels = function(tickInterval) {
        var labels = [];
        for( var i=0; i<dateRange.length; i++){
            if( i%tickInterval == 0 ) {
                var date = new Date(dateRange[i]);
                labels.push(date.getFullYear())
            } else {
                labels.push(" ");
            }
        }
        return labels;
    }

    return module;
}(FREDChart || {}));
