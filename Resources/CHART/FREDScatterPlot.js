/**
 * Created by sreed on 5/29/2014.
 */

var FREDScatterPlot = (function (module) {

    var defaultSz = 4;

    var chartAreaXFactor = .8; // portion of horizontal chart area for the actual scatter area
    var chartAreaYFactor = .9; // portion of vertical chart area for the actual scatter area

    var minPointRadius = 3;
    var maxPointRadius = 20;

    var isSize = false; // turns on and off size data display
    var szlegend = {
        width: Math.max(2 * maxPointRadius + 50, 150),
        height: 0,
        padding: 5,
        offset: 10,
        fill: "grey"
    };
    var chartMargin = {
        left: 100,
        top: 0,
        right: 10 + szlegend.width,
        bottom: 0,
        inner: 5
    };
    var axispos = {
        xtitle: 25,
        ytitle: 80,
        sztitle: 25,
        xlabel: 5,
        ylabel: 5,
        szlabel: 5
    };
    var titlepos = 20;

    var chart;

    var regionIds = [];
    var regionData = {};
    var regionNamesById = {};
    var regionNames = [];

    var scatterPlotData;

    var regionsDataDefs;

    var xDataIndex = 0;
    var yDataIndex = 1;
    var szDataIndex = 2;

    var nszticks = 11;

    var colorScale;

    module.init = function (selector, dataDefsArg, regionDataArg, regionMetadata) {
        regionsDataDefs = dataDefsArg;
        regionData = regionDataArg;
        var sampleMeta = regionData.x[regionData.x.length-1].seriesMeta; // last entry is most recent
        var srcFootnote;
        for(var meta in sampleMeta) {
            srcFootnote = sampleMeta[meta].source + ", " + sampleMeta[meta].title;
            break;
        }

        // get feature names and Ids
        regionMetadata.forEach(function (feature, i) {
            regionIds.push(feature.gid);
            regionNamesById[feature.gid] = feature.name;
        });
        // convert names by ID to names by index
        for (var i = 0; i < regionIds.length; i++) {
            regionNames.push(regionNamesById[regionIds[i]]);
        }

        FREDChart.initChart(selector, FREDChart.scatterClass, getDateRange, initPlotData, initializeChart,
            updateChart, true /*isUpdateOnSlide*/, false /* isMonthSlider */,
            regionsDataDefs.chart_name, regionsDataDefs.chart_text, srcFootnote);
    }


// get data union of all the dates from the data
    var getDateRange = function () {
        var dateRange = [];
        var dataSets = [regionData.x, regionData.y, regionData.size];
        $.each(dataSets, function (index) {
            if (typeof dataSets[index] !== "undefined") {
                $.each(dataSets[index], function (slot) {
                    var date = dataSets[index][slot].date;
                    if ($.inArray(date, dateRange) == -1) // date not in dateRange already?
                        dateRange.push(date);
                });
            }
        });
        return dateRange.sort();
    }

    var initializeChart = function () {
        // get colorScale scale
        colorScale = getColorScale(regionData);

        //then draw the shapes
        drawChart();

        // set up rollovers
        chart.pointsSelect().on("mouseover", function (d) {
            return d3.select(this).attr("r", 2 * getSize(this));
        }).on("mouseout", function (d) {
            return d3.select(this).attr("r", getSize(this));
        });
    }

    var getSize = function (marker) {
        if(isSize) {
            var datumIdx = parseInt(marker.id);
            var size = scatterPlotData.data[datumIdx][szDataIndex];
            return szscale(size);
        } else {
            return defaultSz;
        }
    }
    var drawChart = function () {

        var xLab = regionData.x[0].title + " (" + regionData.x[0].units + ")";
        var yLab = regionData.y[0].title + " (" + regionData.y[0].units + ")";
        var szLab = isSize ? regionData.size[0].title : null;
        var xLim = getLim(regionData.x);
        var yLim = getLim(regionData.y);
        var szLim = isSize ? getLim(regionData.size) : null;
        var NA = getNA();

        // get transformed, as-drawn coordinates of the div
        var divRect = FREDChart.chartAreaDiv.node().getBoundingClientRect();
        var chartWidth = divRect.width * chartAreaXFactor;
        var chartHeight = divRect.height * chartAreaYFactor;

        szlegend.height = .5 * chartHeight;

        chart = scatterplot()
            .xvar(xDataIndex).xlab(xLab).xlim(xLim).xNA(NA[xDataIndex])
            .yvar(yDataIndex).ylab(yLab).ylim(yLim).yNA(NA[yDataIndex]).rotate_ylab(true)
            .isSize(isSize).szvar(szDataIndex).szlab(szLab).szlim(szLim).szNA(NA[szDataIndex]).szlegend(szlegend).nszticks(nszticks)
            .minPointRadius(minPointRadius).maxPointRadius(maxPointRadius)
            .height(chartHeight).width(chartWidth).margin(chartMargin)
            .axispos(axispos).titlepos(titlepos);

        FREDChart.chartAreaDiv.datum(scatterPlotData).call(chart);

        FREDChart.chartAreaDiv.call(chart.initPoints);
    };

    var updateChart = function () {
        updatePlotData();
        FREDChart.chartAreaDiv.call(chart.updatePoints);
    };

    var getColorScale = function (featuresData) {
        if (typeof featuresData.size === "undefined")
            return null; // no color scale if no size data

        // get extent of size data
        var sizeData = featuresData.size;
        var domainExtent = [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY];
        var dataArray = [];
        var dataArrayIndex = 0;
        var total = 0;
        var count = 0;
        for (var i = 0; i < sizeData.length; i++) {
            var val = parseFloat(sizeData[i]);
            if (!isNaN(val)) {
                dataArray[dataArrayIndex++] = val;
                total += val;
                count++;
            }
        }

        var mean = total / count;
        var stdDevSum = 0;
        for (i = count; i--; ){
            stdDevSum += Math.pow(dataArray[i] - mean, 2)
        }
        var variance = stdDevSum / count;
        var stdDev = Math.sqrt(variance);

        var niceDomainExtent = [mean - 2 * stdDev, mean + 2 * stdDev];

        // return the color scale
        return d3.scale.quantize()
            .domain(niceDomainExtent)
            .range(FREDChart.colors);
    };

    var getColorDomainExtent = function (domainExtent) {
        var niceDomainExtent = [];
        // make the domain extent round numbers
        var dx = domainExtent[1] - domainExtent[0];

        // set start of color extent to zero if min data is less than 50% of of the way to the middle of the extent
        if (domainExtent[0] < (domainExtent[0] + dx / 2))
            niceDomainExtent[0] = 0;
        else // otherwise, just round it
            niceDomainExtent[0] = Math.round(domainExtent[0]);

        niceDomainExtent[1] = Math.ceil(domainExtent[1]);

        return niceDomainExtent;
    };

    var initPlotData = function () {
        scatterPlotData = {
            "data": [],
            "indID": regionNames };
        updatePlotData();
    };

    var updatePlotData = function () {
        var xData = loadData(regionData.x);
        var yData = loadData(regionData.y);
        var szData = loadData(regionData.size);
        var data = [];
        for (var i in regionIds) {
            var value = [];
            var idx = regionIds[i];
            value[xDataIndex] = getDatum(xData, idx, FREDChart.noValue);
            value[yDataIndex] = getDatum(yData, idx, FREDChart.noValue);
            value[szDataIndex] = getDatum(szData, idx, defaultSz);
            data.push(value);
        }
        scatterPlotData.data = data;
    };

    var loadData = function (dataSet) {
        if (typeof dataSet !== "undefined")
            for (var i in dataSet) {
                if (dataSet[i].date === FREDChart.timeSlotDate) {
                    return dataSet[i].values;
                }
            }
        else
            return null;
    };

    var getDatum = function (data, index, defaultVal) {
        if (!data || (typeof data[index] === "undefined"))
            return defaultVal;
        else {
            var value = parseFloat(data[index]);
            return value;
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

    var getNA = function () {
        var dataSets = [regionData.x, regionData.y, regionData.size];
        var NA = [
            {
                handle: false,
                force: false,
                width: 15,
                gap: 10
            },
            {
                handle: false,
                force: false,
                width: 15,
                gap: 10
            },
            {
                handle: false
            }
        ];

        // check if any values missing for particular dates
        for (var idx in [0, 1, 2]) {
            if (!NA[idx].handle) {
                var dataset = dataSets[idx];
                for (var i in dataset) {
                    for (var j in dataset[i].values) {
                        if (dataset[i].values[j] === FREDChart.noValue) {
                            NA[idx].handle = true;
                            break;
                        }
                    }
                    if (NA[idx].handle)
                        break;
                }
            }
        }

        // check if any dates each dataset are missing from the others
        for (var i in [0, 1, 2]) {
            for (var j in [0, 1, 2]) {
                if (i != j && !NA[j].handle)
                    NA[j].handle = isMissingDates(dataSets[i], dataSets[j]);
            }
        }

        return NA;
    };

    var isMissingDates = function (standard, test) {
        for (i in standard) {
            var date = standard[i].date;
            var missing = true;
            for (j in test) {
                if (test[j].date === date) {
                    missing = false;
                    break;
                }
            }
            if (missing) {
                return true;
            }
        }
        return false;
    }

    return module;

}(FREDScatterPlot || {}));