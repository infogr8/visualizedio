var app = app || angular.module('bubbleApp', ['ui-rangeSlider'])
.controller('chartController', function($scope, bubbleChart) {


    var speakers = {
        'Maral Pourkazemi': '@marallo',
        'Valentina D\'Efilippo': '@defilippovale',
        'Surprise Guest': '',
        'Maria Da Gandra & Maaike Van Neck': '@maalkewave,@infoform,@mariadagandra',
        'William Rowe': '@willprotein',
        'Pierre La Baume': '@labaume_de',
        'Kate McLean': '@katemclean',
        'Kim Albrecht': '@kimay',
        'Bronwen Robertson': '@small_media',
        'Stefanie Posavec': '@stefpos',
        'Pascal Raabe': '@jazzpazz',
        'Andreas Koller': '@akllr',
        'Andy Kirk': '@visualisingdata',
        'Eimar Boesjes': '@eimarb',
        'Marcin Ignac': '@marcinignac,@variable_io',
        'Pau Garcia & Dani Pearson': '@domesticstream,@danipirson',
        'Peter Crnokrak': ''
    };

    $scope.speakers = _.keys(speakers);
    $scope.filteredSpeaker = '';
    $scope.keywords = {};

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

    function countKeywords (statuses) {
        var counter = {};

        statuses.map(function (d) {
            d.text.match(/\w{5,}/ig).map(function (keyword) {
                counter[keyword] = counter[keyword] || 0;
                counter[keyword] += 1;
            });
        });

        $scope.keywords = _.keys(counter).sort(function (a, b) {
            return counter[b] - counter[a];
        }).map(function (keyword) {
            return {
                keyword: keyword,
                count: counter[keyword]
            };
        });
    }

    d3.json(url, function(error, root) {
        statuses = root.statuses.filter(function (d) {
            return d.retweeted_status === undefined;
        });

        countKeywords(statuses);


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

    $scope.filterSpeakers = function (speaker) {
        $scope.filteredSpeaker = speaker;

        var tags = speaker ? speakers[speaker].split(',') : [];
        bubbleChart.filterSpeakers(tags);
        bubbleChart.render();
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