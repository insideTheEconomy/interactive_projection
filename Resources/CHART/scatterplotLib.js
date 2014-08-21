// Originally generated by CoffeeScript 1.7.1
// http://kbroman.github.io/qtlcharts/
// see https://github.com/kbroman/qtlcharts/tree/master/inst/panels/scatterplot
//
// Modified significantly by Scott

// Generated by CoffeeScript 1.7.1
var scatterplot = function () {
    var axispos, chart, data,
        dataByInd, group, height, indID, indtip,
        isPopupShowing, isMaster,
        margin, minPointRadius, maxPointRadius,
        na_value, ngroup, nxticks, nyticks, nszticks,
        pointcolor, pointsSelect, pointstroke,
        popup, popupRect, popupText,
        popupTickH, popupTickLen, popupTickV,
        popupLblH, popupLblV, popupLblRectH, popupLblRectV,
        rectcolor, rotate_ylab, rpcSession,
        selectedElem,
        isSize, sz, szlab, szlegend, szlim, szNA, szscale, szticks, szvar, svg,
        title, titlepos, width,
        x, xNA, xlab, xlim, xscale, xticks, xvar,
        y, yNA, ylab, ylim, yscale, yticks, yvar;

    // default values
    width = 901;
    height = 501;
    szlegend = {
        width: 120,
        height: .5 * height,
        padding: 20,
        offset: 10,
        fill: "blue"
    };
    margin = {
        left: 40,
        top: 40,
        right: szlegend.width + szlegend.offset,
        bottom: 40,
        inner: 5
    };
    axispos = {
        xtitle: 25,
        ytitle: 30,
        sztitle: 25,
        xlabel: 5,
        ylabel: 5,
        szlabel: 5
    };
    titlepos = 20;
    isSize = false;
    xNA = {
        handle: true,
        force: false,
        width: 15,
        gap: 10
    };
    yNA = {
        handle: true,
        force: false,
        width: 15,
        gap: 10
    };
    szNA = {
        handle: true
    }
    xlim = null;
    ylim = null;
    szlim = null;
    nxticks = 5;
    xticks = null;
    nyticks = 5;
    yticks = null;
    nszticks = 6;
    szticks = null;
    rectcolor = d3.rgb(230, 230, 230);
    pointcolor = null;
    pointstroke = "black";
    minPointRadius = 3;
    title = "";
    xlab = "X";
    ylab = "Y";
    szlab = "Size";
    rotate_ylab = null;
    xscale = d3.scale.linear();
    yscale = d3.scale.linear();
    szscale = d3.scale.linear();
    xvar = 0;
    yvar = 1;
    szvar = 2;
    pointsSelect = null;
    dataByInd = true;

    selectedElem = null;
    isPopupShowing = false;
    popupTickLen = 10;

    chart = function (selection) {
        return selection.each(function (chartdata) {
            var chartGroup, gEnter, panelheight, paneloffset, panelwidth, titleGroup = null,
                xaxis, xrange, xscl,
                yaxis, yrange, yscl,
                szaxis, szrange, szscl;
            data = chartdata;
            //apointcolor = pointcolor != null ? pointcolor : selectGroupColors(ngroup, "dark");
            pointcolor = expand2vector(pointcolor, ngroup);
            if (xNA.handle) {
                paneloffset = xNA.width + xNA.gap;
                panelwidth = width - paneloffset;
            } else {
                paneloffset = 0;
                panelwidth = width;
            }
            if (yNA.handle) {
                panelheight = height - (yNA.width + yNA.gap);
            } else {
                panelheight = height;
            }
            svg = d3.select(this).selectAll("svg").data([data]);
            gEnter = svg.enter().append("svg").append("g");
            chartGroup = svg.select("g");
            chartGroup.append("rect")
                .attr("id", FREDChart.chartPanelId )
                .attr("x", paneloffset + margin.left)
                .attr("y", margin.top)
                .attr("height", panelheight)
                .attr("width", panelwidth)
                .attr("fill", rectcolor)
                .attr("stroke", "none");

            if(title) {
                titleGroup = chartGroup.append("g").attr("class", "chartTitle").append("text")
                    .attr("x", margin.left + width / 2)
                    .attr("y", margin.top - titlepos).text(title);
            }

            if (xNA.handle) {
                chartGroup.append("rect").attr("x", margin.left).attr("y", margin.top).attr("height",
                    panelheight).attr("width",
                    xNA.width).attr("fill", rectcolor).attr("stroke", "none");
            }
            if (xNA.handle && yNA.handle) {
                chartGroup.append("rect").attr("x", margin.left).attr("y", margin.top + height - yNA.width).attr("height",
                    yNA.width).attr("width", xNA.width).attr("fill", rectcolor).attr("stroke", "none");
            }
            if (yNA.handle) {
                chartGroup.append("rect").attr("x", margin.left + paneloffset).attr("y",
                        margin.top + height - yNA.width).attr("height", yNA.width).attr("width",
                    panelwidth).attr("fill", rectcolor).attr("stroke", "none");
            }

            xrange = [margin.left + paneloffset + margin.inner, margin.left + paneloffset + panelwidth - margin.inner];
            yrange = [margin.top + panelheight - margin.inner, margin.top + margin.inner];
            szrange = [minPointRadius, maxPointRadius];
            xscale.domain(xlim).range(xrange);
            yscale.domain(ylim).range(yrange);
            if (isSize) {
                szscale.domain(szlim).range(szrange);
            }
            na_value = ( xlim[0] < ylim[0] ? xlim[0] : ylim[0]) - 100; // min x and y minus 100 will put the NA points 100 units outside main chart areaif (xNA.handle) {
            // add na_value to scales if necessary
            if (xNA.handle) {
                xscale.domain([na_value].concat(xlim)).range([margin.left + xNA.width / 2].concat(xrange));
            }
            if (yNA.handle) {
                yscale.domain([na_value].concat(ylim)).range([height + margin.top - yNA.width / 2].concat(yrange));
            }
            if (isSize && szNA.handle) {
                szscale.domain([na_value].concat(szlim)).range([height + margin.top - yNA.width / 2].concat(szrange));
            }

            xscl = d3.scale.linear().domain(xlim).range(xrange);
            yscl = d3.scale.linear().domain(ylim).range(yrange);
            if (isSize) {
                szscl = d3.scale.linear().domain(szlim).range(szrange);
            }
            xticks = xticks != null ? xticks : xscl.ticks(nxticks);
            yticks = yticks != null ? yticks : yscl.ticks(nyticks);
            if (isSize) {
                szticks = szticks != null ? szticks : szscl.ticks(nszticks);
            }

            xaxis = chartGroup.append("g").attr("class", "x axis");
            xaxis.selectAll("empty").data(xticks).enter().append("line")
                .attr("x1", function (d) {
                    return xscale(d);
                })
                .attr("x2", function (d) {
                    return xscale(d);
                })
                .attr("y1", margin.top)
                .attr("y2", margin.top + height).attr("fill", "none")
                .style("pointer-events", "none");
            xaxis.selectAll("empty").data(xticks).enter().append("text")
                .attr("x", function (d) {
                    return xscale(d);
                })
                .attr("y", margin.top + height + axispos.xlabel)
                .text(function (d) {
                    return formatAxis(xticks)(d);
                });
            xaxis.append("text").attr("class", "title").attr("x", margin.left + width / 2).attr("y",
                    margin.top + height + axispos.xtitle).text(xlab);
            //xaxis.select("text.title").call(FREDChart.wrapTextLines);
            if (xNA.handle) {
                xaxis.append("text").attr("x", margin.left + xNA.width / 2).attr("y",
                        margin.top + height + axispos.xlabel).text("N/A");
            }

            rotate_ylab = rotate_ylab != null ? rotate_ylab : ylab.length > 1;
            yaxis = chartGroup.append("g").attr("class", "y axis");
            yaxis.selectAll("empty").data(yticks).enter().append("line")
                .attr("y1", function (d) {
                    return yscale(d);
                })
                .attr("y2", function (d) {
                    return yscale(d);
                })
                .attr("x1", margin.left)
                .attr("x2", margin.left + width)
                .style("pointer-events", "none");
            yaxis.selectAll("empty").data(yticks).enter().append("text")
                .attr("y", function (d) {
                    return yscale(d);
                })
                .attr("x", margin.left - axispos.ylabel)
                .text(function (d) {
                    return formatAxis(yticks)(d);
                });
            yaxis.append("text")
                .attr("class", "title")
                .attr("y", margin.top + height / 2)
                .attr("x", margin.left - axispos.ytitle)
                .text(ylab)
                .attr("transform", rotate_ylab ? "rotate(270," + (margin.left - axispos.ytitle) + "," + (margin.top + height / 2) + ")" : "");
            //yaxis.select("text.title").call(FREDChart.wrapTextLines);
            if (yNA.handle) {
                yaxis.append("text").attr("x", margin.left - axispos.ylabel).attr("y",
                        margin.top + height - yNA.width / 2).text("N/A");
            }

            if (isSize) {
                var maxSz = szscale(szticks[0]);
                for (var i = 1; i < szticks.length; i++) {
                    var sz = szscale(szticks[i]);
                    if (maxSz < sz)
                        maxSz = sz;
                }
                szaxis = chartGroup.append("g").attr("class", "sz axis");
                var szlbl = szaxis.append("text").attr("class", "title").text(szlab)
                    .attr("y", margin.top)
                    .attr("x", +(width + margin.left + szlegend.offset))
                    .attr("text-anchor", "start");
                var szlblHt = szlbl.node().getBBox().height;
                szaxis.selectAll("empty").data(szticks).enter().append("text")
                    .attr("y", function (d, i) {
                        var y = margin.top + szlblHt + szlegend.padding;
                        for (var j = 1; j <= i; j++) {
                            y += szlegend.padding + szscale(szticks[j - 1]) + szscale(szticks[j]);
                        }
                        return y;
                    })
                    .attr("x", function (d, i) {
                        return width + margin.left + szlegend.offset + 2 * maxSz + szlegend.padding;
                    })
                    .attr("dy", "-0.2em") // vertically center the text
                    .text(function (d) {
                        return formatAxis(szticks)(d);
                    });
                szaxis.selectAll("empty").data(szticks).enter().append("circle")
                    .attr("cy", function (d, i) {
                        var y = margin.top + szlblHt + szlegend.padding + szscale(0);
                        for (var j = 1; j <= i; j++) {
                            y += szlegend.padding + szscale(szticks[j - 1]) + szscale(szticks[j]);
                        }
                        return y;
                    })
                    .attr("cx", function (d, i) {
                        return width + margin.left + szlegend.offset + maxSz;
                    })
                    .attr("r", function (d) {
                        return szscale(d);
                    })
                    .attr("fill", function (d, i) {
                        return szlegend.fill;//group[i]];
                    });
                szaxis.append("text").attr("class", "title")
                    .attr("x", width - margin.right)
                    .attr("y", margin.top + szlegend.height / 2)
                    .text(szlab)
                    .attr("transform",
                        "rotate(270," + (margin.left - axispos.sztitle) + "," + (margin.top + szlegend.height) + ")");
            }

            indtip = d3.tip().attr("class", "d3-tip " + FREDChart.scatterClass).html(function (d, i) {
                return data.indID[i];
            }).direction("e").offset([0, 10]);
            svg.call(indtip);
            popup = svg.append("g").attr("class", "popup");
            popupRect = popup.append("svg:rect").attr("class", "popupRect");
            popupText = popup.append("svg:text").attr("class", "popupText");
            popupTickH = popup.append("svg:line").attr("class", "popupTick");
            popupTickV = popup.append("svg:line").attr("class", "popupTick");
            var tickGroupH = popup.append("g").attr("class", "popupTickLabel");
            var tickGroupV = popup.append("g").attr("class", "popupTickLabel");
            popupLblRectH = tickGroupH.append("svg:rect");
            popupLblRectV = tickGroupV.append("svg:rect");
            popupLblH = tickGroupH.append("svg:text");
            popupLblV = tickGroupV.append("svg:text");
            isPopupShowing = false;

            if(isMaster) {
                svg.on("click", function (d, i) {
                    // clicks outside of scatter points land here and hide the popup if there is one
                    chart.unselectElem();
                    rpcSession.call(FREDChart.rpcURLPrefix + "scatter.chart.unselectElem"); // call slave
                });
            } else {
                rpcSession.register(FREDChart.rpcURLPrefix + "scatter.chart.unselectElem", chart.unselectElem);
            }

            if (xNA.handle) {
                chartGroup.append("rect").attr("x", margin.left).attr("y", margin.top).attr("height", panelheight).attr("width",
                    xNA.width).attr("fill", "none").attr("stroke", "black").attr("stroke-width", "none");
            }
            if (xNA.handle && yNA.handle) {
                chartGroup.append("rect").attr("x", margin.left).attr("y", margin.top + height - yNA.width).attr("height",
                    yNA.width).attr("width", xNA.width).attr("fill", "none").attr("stroke",
                    "black").attr("stroke-width", "none");
            }
            if (yNA.handle) {
                return chartGroup.append("rect").attr("x", margin.left + paneloffset).attr("y",
                        margin.top + height - yNA.width).attr("height", yNA.width).attr("width",
                    panelwidth).attr("fill", "none").attr("stroke", "black").attr("stroke-width", "none");
            }
        });
    };
    chart.isMaster = function (value) {
        if (!arguments.length) {
            return isMaster;
        }
        isMaster = value;
        return chart;
    };
    chart.rpcSession = function (value) {
        if (!arguments.length) {
            return rpcSession;
        }
        rpcSession = value;
        return chart;
    };
    chart.width = function (value) {
        if (!arguments.length) {
            return width;
        }
        width = value;
        return chart;
    };
    chart.height = function (value) {
        if (!arguments.length) {
            return height;
        }
        height = value;
        return chart;
    };
    chart.szlegend = function (value) {
        if (!arguments.length) {
            return szlegend;
        }
        szlegend = value;
        return chart;
    };
    chart.margin = function (value) {
        if (!arguments.length) {
            return margin;
        }
        margin = value;
        return chart;
    };
    chart.axispos = function (value) {
        if (!arguments.length) {
            return axispos;
        }
        axispos = value;
        return chart;
    };
    chart.titlepos = function (value) {
        if (!arguments.length) {
            return titlepos;
        }
        titlepos = value;
        return chart;
    };
    chart.xlim = function (value) {
        if (!arguments.length) {
            return xlim;
        }
        xlim = value;
        return chart;
    };
    chart.nxticks = function (value) {
        if (!arguments.length) {
            return nxticks;
        }
        nxticks = value;
        return chart;
    };
    chart.xticks = function (value) {
        if (!arguments.length) {
            return xticks;
        }
        xticks = value;
        return chart;
    };
    chart.ylim = function (value) {
        if (!arguments.length) {
            return ylim;
        }
        ylim = value;
        return chart;
    };
    chart.nyticks = function (value) {
        if (!arguments.length) {
            return nyticks;
        }
        nyticks = value;
        return chart;
    };
    chart.yticks = function (value) {
        if (!arguments.length) {
            return yticks;
        }
        yticks = value;
        return chart;
    };
    chart.minPointRadius = function (value) {
        if (!arguments.length) {
            return minPointRadius;
        }
        minPointRadius = value;
        return chart;
    };
    chart.maxPointRadius = function (value) {
        if (!arguments.length) {
            return maxPointRadius;
        }
        maxPointRadius = value;
        return chart;
    };
    chart.szlim = function (value) {
        if (!arguments.length) {
            return szlim;
        }
        szlim = value;
        return chart;
    };
    chart.nszticks = function (value) {
        if (!arguments.length) {
            return nszticks;
        }
        nszticks = value;
        return chart;
    };
    chart.szticks = function (value) {
        if (!arguments.length) {
            return szticks;
        }
        szticks = value;
        return chart;
    };
    chart.rectcolor = function (value) {
        if (!arguments.length) {
            return rectcolor;
        }
        rectcolor = value;
        return chart;
    };
    chart.pointcolor = function (value) {
        if (!arguments.length) {
            return pointcolor;
        }
        pointcolor = value;
        return chart;
    };
    chart.pointstroke = function (value) {
        if (!arguments.length) {
            return pointstroke;
        }
        pointstroke = value;
        return chart;
    };
    chart.dataByInd = function (value) {
        if (!arguments.length) {
            return dataByInd;
        }
        dataByInd = value;
        return chart;
    };
    chart.title = function (value) {
        if (!arguments.length) {
            return title;
        }
        title = value;
        return chart;
    };
    chart.isSize = function (value) {
        if (!arguments.length) {
            return isSize;
        }
        isSize = value;
        return chart;
    };
    chart.xlab = function (value) {
        if (!arguments.length) {
            return xlab;
        }
        xlab = value;
        return chart;
    };
    chart.ylab = function (value) {
        if (!arguments.length) {
            return ylab;
        }
        ylab = value;
        return chart;
    };
    chart.szlab = function (value) {
        if (!arguments.length) {
            return szlab;
        }
        szlab = value;
        return chart;
    };
    chart.rotate_ylab = function (value) {
        if (!arguments.length) {
            return rotate_ylab;
        }
        rotate_ylab = value;
        return chart;
    };
    chart.xvar = function (value) {
        if (!arguments.length) {
            return xvar;
        }
        xvar = value;
        return chart;
    };
    chart.yvar = function (value) {
        if (!arguments.length) {
            return yvar;
        }
        yvar = value;
        return chart;
    };
    chart.szvar = function (value) {
        if (!arguments.length) {
            return szvar;
        }
        szvar = value;
        return chart;
    };
    chart.xNA = function (value) {
        if (!arguments.length) {
            return xNA;
        }
        xNA = value;
        return chart;
    };
    chart.yNA = function (value) {
        if (!arguments.length) {
            return yNA;
        }
        yNA = value;
        return chart;
    };
    chart.szNA = function (value) {
        if (!arguments.length) {
            return szNA;
        }
        szNA = value;
        return chart;
    };
    chart.yscale = function () {
        return yscale;
    };
    chart.xscale = function () {
        return xscale;
    };
    chart.szscale = function () {
        return szscale;
    };
    chart.pointsSelect = function () {
        return pointsSelect;
    };
    chart.svg = function () {
        return svg;
    };
    chart.initPoints = function () {
        chart.getData();
        indID = data != null ? data.indID : (function () {
            // if no ID text provided, use index of element
            var results = [];
            for (var i = 0; i < x.length; i++) {
                results.push(i);
            }
            return results;
        }).apply(this);

//        group = (data != null ? data.group : void 0) != null ? data : (function () {
//            var results;
//            results = [];
//            for (var j = 0; j < x.length; j++) {
//                var i = x[j];
//                results.push(1);
//            }
//            return results;
//        })();
//        ngroup = d3.max(group);
//        group = (function () {
//            var results = [];
//            for (var j = 0; j < group.length; j++) {
//                var g = group[j];
//                results.push(g - 1);
//            }
//            return results;
//        })();

        var points = svg.select("g").append("g").attr("id", "points");
        pointsSelect = points.selectAll(".pt").data(d3.range(x.length)).enter().append("circle")
            .attr("class","pt")
            .attr("id", function (d, i) {
                return i;
            }).attr("cx", function (d, i) {
                return xscale(x[i]);
            }).attr("cy", function (d, i) {
                return yscale(y[i]);
            }).attr("r", function (d, i) {
                return isSize ? szscale(sz[i]) : minPointRadius;
            }).attr("fill", function (d, i) {
                return pointcolor[0];//group[i]];
            }).attr("stroke", pointstroke)
            .attr("stroke-width", "1")
            .attr("opacity", function (d, i) {
                if (((x[i] != null) || xNA.handle) && ((y[i] != null) || yNA.handle)) {
                    return 1;
                }
                return 0;
//            }).on("click", function () {
//                chart.selectElem(this); // call slave in helper fcn
            }).on("mouseover.paneltip", function(d,i){
                chart.selectElem(this);
//                indtip.show(d,i);
//                rpcSession.call(FREDChart.rpcURLPrefix + "scatter.indtip.show", [d, i]); // call slave
            })
//            .on("mouseout.paneltip", function(d,i){
//                indtip.hide(d,i);
//                rpcSession.call(FREDChart.rpcURLPrefix + "scatter.indtip.hide", [d, i]); // call slave
//            });

        if(!isMaster){
            // register rpc callbacks
            rpcSession.register(FREDChart.rpcURLPrefix + "scatter.chart.selectElem", chart.selectElem);
//            rpcSession.register(FREDChart.rpcURLPrefix + "scatter.indtip.show", indtipSlaveShow);
//            rpcSession.register(FREDChart.rpcURLPrefix + "scatter.indtip.hide", indtipSlaveHide);
        }
    };

//    var indtipSlaveShow = function(args){
//        indtip.show(args[0], args[1]);
//    }
//
//    var indtipSlaveHide = function(args){
//        indtip.hide();
//    }

    chart.selectElem = function (elem) {
        if(isMaster){
            indtip.hide();
            chart.unselectElem(); // unselect any previously select elem
            selectedElem = elem;
            selectedElem.setAttribute("class", "selected");
            chart.showPopup();
            d3.event.stopPropagation();
            rpcSession.call(FREDChart.rpcURLPrefix + "scatter.chart.selectElem", ["circle.pt#"+selectedElem.getAttribute("id")]); // call slave
        } else { // slave
            indtip.hide();
            chart.unselectElem(); // unselect any previously select elem
            selectedElem = $(elem[0]); // use first arg for rpc args
            selectedElem.setAttribute("class", "selected");
            chart.showPopup();
        }
    };

    chart.unselectElem = function () {
        if (selectedElem != null) {
            selectedElem.setAttribute("class", "pt");
            chart.hidePopup();
            selectedElem = null;
        }
    };

    chart.hidePopup = function () {
        // clean up popup for non-point selections
        if (isPopupShowing) {
            popup.transition()
                .duration(200)
                .style("opacity", 0);
            isPopupShowing = false;
        }
    };

    chart.reshowPopupOnce = function (d, i) {
        // if popup should be showing, reshow it once after transition
        if (selectedElem != null && !isPopupShowing) {
            chart.showPopup(d, i);
        }
    };

    chart.showPopup = function () {
        // var idx = parseInt(d3.select(selectedElem).attr("id"));
        var idx = selectedElem.getAttribute("id");
        var xVal = data.data[idx][xvar];
        var yVal = data.data[idx][yvar];
        var szVal = isSize ? data.data[idx][szvar] : null;
        var r = isSize ? szscale(szVal) : minPointRadius;
        var padding = 2;

        var cx = selectedElem.getAttribute("cx");
        var cy = selectedElem.getAttribute("cy");

        // position text above marker
        var popupParent = popup[0][0].parentElement;
        var matrix = selectedElem.getTransformToElement(popupParent).translate(+cx, +cy);
        // matrix.e is horizontal, matrix.f is vertical distance from top left of the svg to circle center
        popup.attr("transform", "translate(" + (matrix.e) + "," + (matrix.f) + ")");
        popup.transition().duration(200).style("opacity", 1);

        popupText.text(data.indID[idx]);

        // position text above elem
        popupText.attr("x", +padding).attr("y", +(-2 * (r + padding)));

        // center rectangle on text
        centerRectOnText(popupRect, popupText, padding);

        // add ticks with value labels to element
        popupTickH.attr("x1", +(-r - popupTickLen));
        popupTickH.attr("x2", +(-r));
        popupTickV.attr("y1", +r);
        popupTickV.attr("y2", +(popupTickLen + r));
        popupLblH.text(+yVal);
        popupLblV.text(+xVal);

        // get text centered at end of ticks
        var lblHBox = popupLblH.node().getBBox();
        var lblVBox = popupLblV.node().getBBox();
        var xHTrans = -r - lblHBox.width - popupTickLen;
        var yHTrans = lblHBox.height / 2;
        var xVTrans = -lblVBox.width / 2;
        var yVTrans = lblVBox.height + popupTickLen;
        popupLblH.attr("x", +xHTrans).attr("y", +yHTrans);
        popupLblV.attr("x", +xVTrans).attr("y", +yVTrans);

        // center background on tick labels
        var lblRectPadding = 1;
        centerRectOnText(popupLblRectH, popupLblH, lblRectPadding);
        centerRectOnText(popupLblRectV, popupLblV, lblRectPadding);

        isPopupShowing = true;
    };

    chart.updatePoints = function () {
        chart.hidePopup(); // hide popup if there is one

        chart.getData();

//        group = (data != null ? data.group : void 0) != null ? data : (function () {
//            var results;
//            results = [];
//            for (var j = 0; j < x.length; j++) {
//                var i = x[j];
//                results.push(1);
//            }
//            return results;
//        })();
//        ngroup = d3.max(group);
//        group = (function () {
//            var results = [];
//            for (var j = 0; j < group.length; j++) {
//                var g = group[j];
//                results.push(g - 1);
//            }
//            return results;
//        })();

        pointsSelect.transition()
            .attr("cx", function (d, i) {
                return xscale(x[i]);
            }).attr("cy", function (d, i) {
                return yscale(y[i]);
            }).attr("r", function (d, i) {
                return isSize ? szscale(sz[i]) : minPointRadius;
            }).attr("fill", function (d, i) {
                return pointcolor[0];//group[i]];
            }).attr("stroke", pointstroke).attr("stroke-width", "1").attr("opacity", function (d, i) {
                if (((x[i] != null) || xNA.handle) && ((y[i] != null) || yNA.handle)) {
                    return 1;
                }
                return 0;
            }).each("end", function (d, i) {
                chart.reshowPopupOnce(d, i);
            });
    };

    chart.getData = function () {
        if (dataByInd) {
            x = data.data.map(function (d) {
                return d[xvar];
            });
            y = data.data.map(function (d) {
                return d[yvar];
            });
            sz = isSize ? data.data.map(function (d) {
                    return d[szvar];
                }) : null;
        } else {
            x = data.data[xvar];
            y = data.data[yvar];
            sz = isSize ? data.data[szvar] : null;
        }
        x = missing2null(x, [FREDChart.noValue, ""]);
        y = missing2null(y, [FREDChart.noValue, ""]);
        sz = isSize ? missing2default(sz, [FREDChart.noValue, ""], minPointRadius) : null;
        if (xNA.handle) {
            x = x.map(function (e) {
                if (e != null) {
                    return e;
                } else {
                    return na_value;
                }
            });
        }
        if (yNA.handle) {
            y = y.map(function (e) {
                if (e != null) {
                    return e;
                } else {
                    return na_value;
                }
            });
        }
    };

    return chart;
};
