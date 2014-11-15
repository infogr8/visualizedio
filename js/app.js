var app = app || angular.module('bubbleApp', ['ui-rangeSlider'])
.controller('chartController', function($scope, bubbleChart) {
    $scope.slider = {
        min: 0,
        max: 100
    };

    function getUrl(params) {
        var queryString = _.map(params, function(value, key) {

            return key + '=' + value;
        }).join('&');

        return './twitter-proxy.php?url=' + encodeURIComponent('search/tweets.json?' + queryString);
    }

    var statuses,
        url = getUrl({
            q: 'visualizedio'
        });

    url = 'mock.json';

    d3.json(url, function(error, root) {
        console.log('count', root.statuses.length);
        statuses = root.statuses.filter(function (d) {
            return d.retweeted_status === undefined;
        });

        statuses.map(function (d) {
            console.log(d.text);
        });

        // $scope.speakers = _.uniq(statuses, function (d) {
        //     return d.user.name;
        // }).map(function (d) {
        //     return {
        //         name: d.user.name
        //     };
        // });
        $scope.$digest();
        bubbleChart.render(statuses);

        d3.select(window).on('resize', function () {
            bubbleChart.render(statuses);
        });

        $scope.$watch('slider.min', $scope.debouncedSlider);
        $scope.$watch('slider.max', $scope.debouncedSlider);
    });


    $scope.speakers = [
        'Maral Pourkazemi',
        'Valentina D\'Efilippo',
        'Surprise Guest',
        'M. da Gandra & M. Van Neck',
        'William Rowe',
        'Pierre la Baume',
        'Kate McLean',
        'Kim Albrecht',
        'Bronwen Robertson',
        'Pascal Raabe',
        'Andreas Koller',
        'Andy Kirk',
        'Marcin Ignac',
        'Pau Garcia & Dani Pearson',
        'Peter Crnokrak'
    ].map(function (d) {
        return {
            name: d
        };
    });

    $scope.filter = function (filter) {
        bubbleChart.render(statuses.filter(function (d) {
            return !filter || d.user.name === filter.speaker;
        }));
    };

    $scope.setWeight = function (filter) {
        bubbleChart.setWeight(filter);
        bubbleChart.render();
    };

    // when sliding, we want some grace. debounce waits a bit, to
    // if the function is called again, and only executes the last one.
    $scope.debouncedSlider = _.debounce(function () {
        bubbleChart.filterTime($scope.slider.min, $scope.slider.max);
        bubbleChart.render();
    }, 100);

});