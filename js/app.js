var app = app || angular.module('bubbleApp', ['ui-rangeSlider'])
.controller('chartController', function($scope, bubbleChart) {
    $scope.slider = {
        min: 0,
        max: 100
    };

    $scope.all = function () {
        bubbleChart.render();
    };

    $scope.$watch('slider.min', function() {
        if (bubbleChart.ready()) {
            //bubbleChart.render();
        }
    });
});