var app = app || angular.module('bubbleApp', ['ui-rangeSlider'])
.controller('chartController', function($scope, bubbleChart) {

    $scope.query = 'data visualisation';

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
        params.q = params.q || getQueryVariable('q') || DEFAULT_QUERY;
        params.count = 100;

        var queryString = _.map(params, function(value, key) {
            return key + '=' + value;
        }).join('&');

        return './proxy.php?url=' + encodeURIComponent('search/tweets.json?' + queryString);
    }

    var statuses,
        url = getUrl({});

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

    var previous;

    $scope.search = function () {
        url = getUrl({
            q: $scope.query
        });
        $scope.refresh();
    };

    $scope.refresh = function () {
        $scope.loading = true;
        d3.json(url, function(error, root) {
            $scope.loading = false;

            if (root && root.errors) {
                $scope.error = root && root.errors && root.errors.length && root.errors[0] && root.errors[0].message;
                $scope.$digest();
            }
            // see if something has changed
            else if (root && !_.isEqual(root, previous)) {
                // deep clone
                previous = JSON.parse(JSON.stringify(root));

                statuses = root.statuses.filter(function (d) {
                    return d.retweeted_status === undefined;
                });

                $scope.keywords =countKeywords(statuses);
                $scope.hashtags = countHashtags(statuses);

                $scope.$digest();
                bubbleChart.render(statuses);

                if (!$scope.inited) {
                    $scope.initListeners();
                }
            } else {
                $scope.$digest();
            }
        });
    };

    // this is to trigger a rate limit overflow
    // for(var i = 0; i < 180; i++) {
    //     url = getUrl({
    //         q: 'test' + i
    //     });
    //     $scope.refresh();
    // }

    // yup, every thirty seconds we poll.
    $scope.refresh();
    setInterval(function () { $scope.refresh(); }, 30 * 1000);

    $scope.initListeners = function () {
        d3.select(window).on('resize', function () {
            bubbleChart.render(statuses);
        });

        $scope.$watch('slider.min', $scope.debouncedSlider);
        $scope.$watch('slider.max', $scope.debouncedSlider);

        $scope.inited = true;
    };

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

    // smelly, should really put all the filters in one object
    $scope.reset = function () {
        $scope.filteredSpeaker = '';
        $scope.before = false;
        $scope.slider.min = 0;
        $scope.slider.max = 100;
        $scope.after = false;
        $scope.activeHashtag = '';
        $scope.activeKeyword = '';
        $scope.activeWeight = '';
        bubbleChart.reset();
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