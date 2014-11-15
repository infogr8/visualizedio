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
    $scope.weights = ['retweets', 'favourites', 'followers'];

    $scope.slider = {
        min: 0,
        max: 100
    };

    function getQueryVariable(variable) {
        var query = window.location.search.substring(1);
        var vars = query.split("&");
        for (var i=0;i<vars.length;i++) {
            var pair = vars[i].split("=");
            if(pair[0] === variable){
                return pair[1];
            }
        }
    }
    function getUrl(params) {
        params.q = getQueryVariable('q') || params.q;

        var queryString = _.map(params, function(value, key) {

            return key + '=' + value;
        }).join('&');

        return './proxy.php?url=' + encodeURIComponent('search/tweets.json?' + queryString);
    }

    var statuses,
        url = getUrl({
            q: 'visualizedio14',
            count: 100
        });

    function countKeywords (statuses) {
        var counter = {};

        statuses.map(function (d) {
            var result;

            if (d.text && d.text.match) {
                result = d.text.match(/\w{5,}/ig);
                if (result) {
                    result.map(function (keyword) {
                        return keyword.toUpperCase();
                    }).map(function (keyword) {
                        counter[keyword] = counter[keyword] || 0;
                        counter[keyword] += 1;
                    });
                }
            }
        });
        return sortKeywords(counter);
    }


    function sortKeywords(counter) {
        return _.keys(counter).sort(function (a, b) {
            return counter[b] - counter[a];
        }).map(function (keyword) {
            return {
                keyword: keyword,
                count: counter[keyword]
            };
        });
    }

    function countHashtags (statuses) {
        var counter = {};

        statuses.map(function (d) {
            d.entities.hashtags.map(function (hashtag) {
                var text = hashtag.text.toUpperCase();
                counter[text] = counter[text] || 0;
                counter[text] += 1;
            });
        });

        return sortKeywords(counter);
    }

    d3.json(url, function(error, root) {
        statuses = root.statuses.filter(function (d) {
            return d.retweeted_status === undefined;
        });

        $scope.keywords =countKeywords(statuses);
        $scope.hashtags = countHashtags(statuses);

        $scope.$digest();
        bubbleChart.render(statuses);

        d3.select(window).on('resize', function () {
            bubbleChart.render(statuses);
        });

        $scope.$watch('slider.min', $scope.debouncedSlider);
        $scope.$watch('slider.max', $scope.debouncedSlider);
    });

    $scope.filterKeyword = function (d) {
        if ($scope.activeKeyword === d) {
            $scope.activeKeyword = d = '';
        }
        $scope.activeKeyword = d;
        bubbleChart.filterKeyword(d);
        bubbleChart.render();
    };

    $scope.filterHashtag = function (d) {
        if ($scope.activeHashtag === d) {
            $scope.activeHashtag = d = '';
        }
        $scope.activeHashtag = d;
        bubbleChart.filterKeyword(d);
        bubbleChart.render();
    };

    $scope.filterSpeakers = function (speaker) {
        $scope.filteredSpeaker = speaker;

        var tags = speaker ? speakers[speaker].split(',') : [];
        bubbleChart.filterSpeakers(tags);
        bubbleChart.render();
    };

    $scope.filterBefore = function () {
        bubbleChart.filterBefore();
        if ($scope.before) {
            $scope.sliderDisabled = false;
            $scope.before = false;
        } else {
            $scope.sliderDisabled = true;
            $scope.before = true;
            $scope.after = false;
        }
        bubbleChart.render();
    };
    $scope.filterAfter = function () {
        bubbleChart.filterAfter();
        if ($scope.after) {
            $scope.sliderDisabled = false;
            $scope.after = false;
        } else {
            $scope.sliderDisabled = true;
            $scope.after = true;
            $scope.before = false;
        }
        bubbleChart.render();
    };

    $scope.setWeight = function (filter) {
        if ($scope.activeWeight === filter) {
            $scope.activeWeight = filter = '';
        }
        $scope.activeWeight = filter;
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