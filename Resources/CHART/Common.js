/**
 * Created by scott on 8/1/14.
 */

var chartMainId = "chartMain";
var chartAreaId = "chartArea";
var chartSvgId = "chartSvg";
var chartTitleId = "chartTitle";
var chartDescriptionId = "chartDescription";
var dateLabelId = "dateLabel";
var dateSliderId = "dateSlider";
var dateSliderLabelId = "dateSliderLabel";
var chartTopLevelDivIds = [chartMainId];//, chartAreaId, chartTitleId, chartDescriptionId, dateLabelId, dateSliderId];

var getFormattedDate = function(dateString) {
    var date = new Date(dateString);
    var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return months[date.getMonth()] + " " + date.getFullYear();
}