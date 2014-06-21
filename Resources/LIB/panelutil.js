// Generated by CoffeeScript 1.7.1
// http://kbroman.github.io/qtlcharts/
// see https://github.com/kbroman/qtlcharts/blob/master/inst/panels/panelutil.js

var chrscales, expand2vector, forceAsArray, formatAxis, getLeftRight, matrixExtent, matrixMax, matrixMaxAbs, matrixMin, maxdiff, median, missing2null, pullVarAsArray, reorgLodData, selectGroupColors, unique;

formatAxis = function(d) {
    var ndig;
    d = d[1] - d[0];
    ndig = Math.floor(Math.log(d % 10) / Math.log(10));
    if (ndig > 0) {
        ndig = 0;
    }
    ndig = Math.abs(ndig);
    return d3.format("." + ndig + "f");
};

unique = function(x) {
    var output, v, _i, _len, _results;
    output = {};
    for (_i = 0, _len = x.length; _i < _len; _i++) {
        v = x[_i];
        if (v) {
            output[v] = v;
        }
    }
    _results = [];
    for (v in output) {
        _results.push(output[v]);
    }
    return _results;
};

pullVarAsArray = function(data, variable) {
    var i, v;
    v = [];
    for (i in data) {
        v = v.concat(data[i][variable]);
    }
    return v;
};

reorgLodData = function(data, lodvarname) {
    var chr, i, j, lodcolumn, lodval, marker, pos, _i, _j, _k, _len, _len1, _len2, _ref, _ref1, _ref2;
    if (lodvarname == null) {
        lodvarname = null;
    }
    data.posByChr = {};
    data.lodByChr = {};
    _ref = data.chrnames;
    for (i = _i = 0, _len = _ref.length; _i < _len; i = ++_i) {
        chr = _ref[i];
        data.posByChr[chr] = [];
        data.lodByChr[chr] = [];
        _ref1 = data.pos;
        for (j = _j = 0, _len1 = _ref1.length; _j < _len1; j = ++_j) {
            pos = _ref1[j];
            if (data.chr[j] === chr) {
                data.posByChr[chr].push(pos);
                if (!Array.isArray(data.lodnames)) {
                    data.lodnames = [data.lodnames];
                }
                lodval = (function() {
                    var _k, _len2, _ref2, _results;
                    _ref2 = data.lodnames;
                    _results = [];
                    for (_k = 0, _len2 = _ref2.length; _k < _len2; _k++) {
                        lodcolumn = _ref2[_k];
                        _results.push(data[lodcolumn][j]);
                    }
                    return _results;
                })();
                data.lodByChr[chr].push(lodval);
            }
        }
    }
    if (lodvarname != null) {
        data.markers = [];
        _ref2 = data.markernames;
        for (i = _k = 0, _len2 = _ref2.length; _k < _len2; i = ++_k) {
            marker = _ref2[i];
            if (marker !== "") {
                data.markers.push({
                    name: marker,
                    chr: data.chr[i],
                    pos: data.pos[i],
                    lod: data[lodvarname][i]
                });
            }
        }
    }
    return data;
};

chrscales = function(data, width, chrGap, leftMargin, pad4heatmap) {
    var L, chr, chrEnd, chrLength, chrStart, cur, d, i, maxd, rng, totalChrLength, w, _i, _j, _len, _len1, _ref, _ref1;
    chrStart = [];
    chrEnd = [];
    chrLength = [];
    totalChrLength = 0;
    maxd = 0;
    _ref = data.chrnames;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        chr = _ref[_i];
        d = maxdiff(data.posByChr[chr]);
        if (d > maxd) {
            maxd = d;
        }
        rng = d3.extent(data.posByChr[chr]);
        chrStart.push(rng[0]);
        chrEnd.push(rng[1]);
        L = rng[1] - rng[0];
        chrLength.push(L);
        totalChrLength += L;
    }
    if (pad4heatmap) {
        data.recwidth = maxd;
        chrStart = chrStart.map(function(x) {
            return x - maxd / 2;
        });
        chrEnd = chrEnd.map(function(x) {
            return x + maxd / 2;
        });
        chrLength = chrLength.map(function(x) {
            return x + maxd;
        });
        totalChrLength += chrLength.length * maxd;
    }
    data.chrStart = [];
    data.chrEnd = [];
    cur = leftMargin;
    if (!pad4heatmap) {
        cur += chrGap / 2;
    }
    data.xscale = {};
    _ref1 = data.chrnames;
    for (i = _j = 0, _len1 = _ref1.length; _j < _len1; i = ++_j) {
        chr = _ref1[i];
        data.chrStart.push(cur);
        w = Math.round((width - chrGap * (data.chrnames.length - pad4heatmap)) / totalChrLength * chrLength[i]);
        data.chrEnd.push(cur + w);
        cur = data.chrEnd[i] + chrGap;
        data.xscale[chr] = d3.scale.linear().domain([chrStart[i], chrEnd[i]]).range([data.chrStart[i], data.chrEnd[i]]);
    }
    return data;
};

selectGroupColors = function(ngroup, palette) {
    if (ngroup === 0) {
        return [];
    }
    if (palette === "dark") {
        if (ngroup === 1) {
            return ["slateblue"];
        }
        if (ngroup === 2) {
            return ["MediumVioletRed", "slateblue"];
        }
        if (ngroup <= 9) {
            return colorbrewer.Set1[ngroup];
        }
        return d3.scale.category20().range().slice(0, ngroup);
    } else {
        if (ngroup === 1) {
            return [d3.rgb(190, 190, 190)];
        }
        if (ngroup === 2) {
            return ["lightpink", "lightblue"];
        }
        if (ngroup <= 9) {
            return colorbrewer.Pastel1[ngroup];
        }
        return ["#8fc7f4", "#fed7f8", "#ffbf8e", "#fffbb8", "#8ce08c", "#d8ffca", "#f68788", "#ffd8d6", "#d4a7fd", "#f5f0f5", "#cc968b", "#f4dcd4", "#f3b7f2", "#f7f6f2", "#bfbfbf", "#f7f7f7", "#fcfd82", "#fbfbcd", "#87feff", "#defaf5"].slice(0, ngroup);
    }
};

expand2vector = function(input, n) {
    var i;
    if (Array.isArray(input) && input.length >= n) {
        return input;
    }
    if (!Array.isArray(input)) {
        input = [input];
    }
    if (input.length === 1 && n > 1) {
        input = (function() {
            var _results;
            _results = [];
            for (i in d3.range(n)) {
                _results.push(input[0]);
            }
            return _results;
        })();
    }
    return input;
};

median = function(x) {
    var n;
    if (x == null) {
        return null;
    }
    n = x.length;
    x.sort(function(a, b) {
        return a - b;
    });
    if (n % 2 === 1) {
        return x[(n - 1) / 2];
    }
    return (x[n / 2] + x[(n / 2) - 1]) / 2;
};

getLeftRight = function(x) {
    var i, n, result, v, xdif, _i, _j, _k, _len, _ref;
    n = x.length;
    x.sort(function(a, b) {
        return a - b;
    });
    xdif = [];
    result = {};
    for (_i = 0, _len = x.length; _i < _len; _i++) {
        v = x[_i];
        result[v] = {};
    }
    for (i = _j = 1; 1 <= n ? _j < n : _j > n; i = 1 <= n ? ++_j : --_j) {
        xdif.push(x[i] - x[i - 1]);
        result[x[i]].left = x[i - 1];
    }
    for (i = _k = 0, _ref = n - 1; 0 <= _ref ? _k < _ref : _k > _ref; i = 0 <= _ref ? ++_k : --_k) {
        result[x[i]].right = x[i + 1];
    }
    xdif = median(xdif);
    result.mediandiff = xdif;
    result[x[0]].left = x[0] - xdif;
    result[x[n - 1]].right = x[n - 1] + xdif;
    result.extent = [x[0] - xdif / 2, x[n - 1] + xdif / 2];
    return result;
};

maxdiff = function(x) {
    var d, i, result, _i, _ref;
    if (x.length < 2) {
        return null;
    }
    result = x[1] - x[0];
    if (x.length < 3) {
        return result;
    }
    for (i = _i = 2, _ref = x.length; 2 <= _ref ? _i < _ref : _i > _ref; i = 2 <= _ref ? ++_i : --_i) {
        d = x[i] - x[i - 1];
        if (d > result) {
            result = d;
        }
    }
    return result;
};

matrixMin = function(mat) {
    var i, j, result;
    result = mat[0][0];
    for (i in mat) {
        for (j in mat[i]) {
            if (result > mat[i][j]) {
                result = mat[i][j];
            }
        }
    }
    return result;
};

matrixMax = function(mat) {
    var i, j, result;
    result = mat[0][0];
    for (i in mat) {
        for (j in mat[i]) {
            if (result < mat[i][j]) {
                result = mat[i][j];
            }
        }
    }
    return result;
};

matrixMaxAbs = function(mat) {
    var i, j, result;
    result = Math.abs(mat[0][0]);
    for (i in mat) {
        for (j in mat[i]) {
            if (result < mat[i][j]) {
                result = Math.abs(mat[i][j]);
            }
        }
    }
    return result;
};

matrixExtent = function(mat) {
    return [matrixMin(mat), matrixMax(mat)];
};

d3.selection.prototype.moveToFront = function() {
    return this.each(function() {
        return this.parentNode.appendChild(this);
    });
};

d3.selection.prototype.moveToBack = function() {
    return this.each(function() {
        var firstChild;
        firstChild = this.parentNode.firstchild;
        if (firstChild) {
            return this.parentNode.insertBefore(this, firstChild);
        }
    });
};

forceAsArray = function(x) {
    if (Array.isArray(x)) {
        return x;
    }
    return [x];
};

missing2null = function(vec, missingvalues) {
    if (missingvalues == null) {
        missingvalues = ['NA', ''];
    }
    return vec.map(function(value) {
        if (missingvalues.indexOf(value) > -1) {
            return null;
        } else {
            return value;
        }
    });
};
