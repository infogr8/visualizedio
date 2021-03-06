var app = app || angular.module('bubbleApp', ['ui-rangeSlider']);

app.factory('bubbleChart', function(urlReplacer) {

    var padding = 6,
        radius = d3.scale.sqrt().range([0, 12]),
        weight = '',
        RESET_FILTER = {
            begin: 0,
            end: 100,
            speakers: []
        },
        filter = _.clone(RESET_FILTER),
        timeScale,
        activeCircle,
        savedStatuses,
        color = {
            active: "#ffffff",
            inactive: '#42bef6',
            hover: '#ffca28'
        },
        drag;

    function linkUsers (text) {
        return text.replace(/\@(\w+)/g, '<a href="https://twitter.com/$1" target="_blank">@$1</a>');
    }

    function linkHashtags (text) {
        return text.replace(/\#(\w+)/g, '<a href="https://twitter.com/hashtag/$1?src=tren" target="_blank">#$1</a>');
    }

    function inactivateCircle () {
        if (activeCircle) {
            activeCircle.
                transition().
                style('fill', function(d) {
                    return d.isActive ? color.active : color.inactive;
                });
        }
    }

    function hideTooltip (tooltip) {
        if (!eventInTooltip()) {
            inactivateCircle();

            tooltip
                .transition()
                .duration(0)
                .delay(300)
                .style('pointer-events', 'none')
                .style("opacity", 0);
        }
    }

    // Move nodes toward cluster focus.
    function gravity(alpha) {
        return function(d) {
            d.y += (d.cy - d.y) * alpha;
            d.x += (d.cx - d.x) * alpha;
        };
    }

    // Resolve collisions between nodes.
    function collide(alpha, nodes) {
        var quadtree = d3.geom.quadtree(nodes);
        return function(d) {
            var r = d.radius + radius.domain()[1] + padding,
                nx1 = d.x - r,
                nx2 = d.x + r,
                ny1 = d.y - r,
                ny2 = d.y + r;
            quadtree.visit(function(quad, x1, y1, x2, y2) {
                if (quad.point && (quad.point !== d)) {
                    var x = d.x - quad.point.x,
                        y = d.y - quad.point.y,
                        l = Math.sqrt(x * x + y * y),
                        r = d.radius + quad.point.radius + (d.color !== quad.point.color) * padding;
                    if (l < r) {
                        l = (l - r) / l * alpha;
                        d.x -= x *= l;
                        d.y -= y *= l;
                        quad.point.x += x;
                        quad.point.y += y;
                    }
                }
                return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
            });
        };
    }

    function eventInTooltip () {
        var tooltip = $('#tooltip'),
            opacity = tooltip.css('opacity'),
            offset = tooltip.offset(),
            width = tooltip.width(),
            height = tooltip.height(),
            left = d3.event.pageX,
            top = d3.event.pageY;

        // the +30 and +10 are compensate for as of yet unexplained
        // behavior, probably browser offset issues.
        return opacity > 0 && left >= offset.left &&
            left <= offset.left + width + 30 &&
            top >= offset.top &&
            top <= offset.top + height + 10;
    }

    // distance from center, plus one
    function weighTweet(d) {
        if (weight === 'followers') {
            return 1 + d.user.followers_count;
        }

        if (weight === 'favorite') {
            return 1 + d.favorite_count;
        }

        if (weight === 'retweets') {
            return 1 + d.retweet_count;
        }

        return 1 + Math.sqrt(
            d.favorite_count * d.favorite_count +
            d.retweet_count + d.retweet_count);
    }

    // this will apply the filtering properties to see if this
    // node qualifies
    function isActive (d) {
        return checkKeyword(d) && checkSpeaker(d) && checkTime(d);
    }

    // by default show all input, limited by begin and end
    // if beforeEvent: show all input before event start
    // if afterEvent: show all input after event start
    function checkTime(d) {
        if (filter.beforeEvent) {
            return d.created_at_ms < new Date('2014-11-22 9:50').getTime();
        }
        if (filter.afterEvent) {
            return d.created_at_ms > new Date('2014-11-22 18:00').getTime();
        }

        // scaled indicates where this time stamp is from the first to
        // the last one of the input data.
        // say we have [100, 200, 300] as ms values,
        // and created_at_ms is 250,
        // the scale function will return 75.
        var scaled = timeScale(d.created_at_ms);
        return filter.begin <= scaled && filter.end >= scaled;
    }

    function checkKeyword (d) {
        return !filter.keyword || d.text.toUpperCase().indexOf(filter.keyword) !== -1;
    }

    function checkSpeaker (d) {
        // if no speakers are in the filter, just carry on.
        // check if any of the speakers are mentioned.
        return filter.speakers.length === 0 ||
            !!_.find(filter.speakers, function (speaker) {
                return d.text.toLowerCase().indexOf(speaker.toLowerCase()) !== -1;
            });
    }

    function updateData(nodes) {
        var svg = d3.select("#chart svg");

        return svg.selectAll("circle")
            .data(nodes)
            .enter().append("circle")
            .attr("r", function(d) {
                return d.radius;
            })
            .style("fill", function(d, i) {
                return d.isActive ? color.active : color.inactive;
            })
            .call(drag);
    }

    // abuse the pack layout to calculate the radii
    function scaleBubbleSize (children, width, height) {
        var data = _.map(children, function (d, i) {
            d.value = weighTweet(d);
            d.created_at_ms = parseDate(d.created_at).toDate().getTime();
            return d;
        });

        timeScale = d3.scale.linear()
            .domain([
                // data arrives in reverse sorted order: newest first
                data.length ? _.last(data).created_at_ms : 0,
                data.length ? _.first(data).created_at_ms : 0
            ])
            .range([0, 100]);

        var bubble = d3.layout.pack()
            .sort(null)
            .size([width, height])
            .padding(0);

        return bubble.nodes({
            children: data
        })
        .filter(function(d) {
            return !d.children && d.text;
        }).map(function (d) {
            d.cx = width / 2;
            d.cy = height / 2;

            // reset
            d.x = Math.random() * width / 2;
            d.y = Math.random() * height /2;

            d.radius = Math.min(100, d.r);
            d.isActive = isActive(d);
            return d;
        });
    }

    // twitter date comes with weekday in front, strip it off
    // e.g. Tue Nov 04 13:32:42 +0000 2014
    // then use moment.js to parse.
    function parseDate(date) {
        var replaced = date.replace(/^\w{3} /, '');

        return moment(replaced, 'MMMM DD HH:mm:SS Z YYYY');
    }

    function render(statuses) {
        var width = $('#chart').width(),
            height = $('#chart').height();

        if (statuses) {
            savedStatuses = statuses;
        } else {
            statuses = savedStatuses;
        }

        var nodes = scaleBubbleSize(statuses, width, height);

        var force = d3.layout.force()
            .nodes(nodes)
            .size([width, height])
            .gravity(0)
            .charge(0)
            .on("tick", tick)
            .start();

        drag = force.drag().on("drag", dragmove);

        function dragmove(d) {
            var euclideanDistance = Math.sqrt(Math.pow((d.px - 198), 2) + Math.pow((d.py - 198), 2));

            if (euclideanDistance > 198 - d.radius) {
                d.px = d.px - 198;
                d.py = d.py - 198;

                var radians = Math.atan2(d.py, d.px);

                d.px = Math.cos(radians) * (198 - d.radius) + 198;
                d.py = Math.sin(radians) * (198 - d.radius) + 198;
            }
        }

        // var svg = d3.select("#chart svg");

        // if (svg[0][0] === null) {
        //     svg = d3.select('#chart').append('svg');
        // } else {
        //     console.log('got a live one');
        // }

        // svg.attr("width", width).attr('height', height);
        var svg = d3.select("#chart").select("svg").remove();

        svg = d3.select("#chart").append("svg")
            .attr("width", width)
            .attr("height", height);


        var circle = updateData(nodes);
        var tooltip = d3.select("#tooltip");
        tooltip.on('mouseout', function () {
            hideTooltip(tooltip);
        });

        circle
            .on("mouseover", function(d) {
                var width = $('#tooltip').width(),
                    offset = $(this).offset(),
                    radius = parseFloat(d3.select(this).attr('r')),
                    left = offset.left + width + radius > $(window).width() ?
                        offset.left - width :
                        offset.left + radius,
                    created_at = parseDate(d.created_at).format('MMMM DD YYYY, h:mm:ss a'),
                    formatted;

                activeCircle = d3.select(this);

                activeCircle.
                    transition().
                    style('fill', function(d) {
                        return color.hover;
                    });

                if (!eventInTooltip()) {
                    tooltip
                        .transition()
                        .duration(300)
                        .style('pointer-events', 'auto')
                        .style("opacity", 1)
                        .style("top", (d3.event.pageY - 28) + "px")
                        .style("left", left + "px");

                    formatted = urlReplacer.replace(d.text);
                    formatted = linkUsers(formatted);
                    formatted = linkHashtags(formatted);
                    tooltip.select("strong").html(formatted);
                    tooltip.select(".retweet_count").text(d.retweet_count);
                    tooltip.select(".favorite_count").text(d.favorite_count);
                    tooltip.select('.created_at').text(created_at);
                    tooltip.select('.user-name').text(d.user.name);
                    tooltip.select('img').attr('src', d.user.profile_image_url);
                    tooltip.select('a.reply_link').attr('href', 'https://twitter.com/intent/tweet?in_reply_to=' + d.id_str);
                    tooltip.select('a.retweet_link').attr('href', 'https://twitter.com/intent/retweet?tweet_id=' + d.id_str);
                    tooltip.select('a.favourite_link').attr('href', 'https://twitter.com/intent/favorite?tweet_id=' + d.id_str);
                    tooltip.select('a.user_link').attr('href', 'https://twitter.com/intent/user?user_id=' + d.user.id);
                }
            })
            .on("mouseout", function() {
                if (!eventInTooltip()) {
                    hideTooltip(tooltip);
                }
            });

        function tick(e) {
            circle.each(gravity(0.04 * e.alpha))
                .each(collide(0.4, nodes))
                .attr("cx", function(d) {
                    return d.x;
                })
                .attr("cy", function(d) {
                    return d.y;
                });
        }
    }

    function setWeight(value) {
        weight = value;
    }

    function filterTime(begin, end) {
        filter.begin = begin;
        filter.end = end;
    }

    function filterSpeakers(speakers) {
        filter.speakers = speakers || [];
    }

    function filterKeyword(keyword) {
        filter.keyword = keyword;
    }

    function filterBefore() {
        filter.beforeEvent = true;
        filter.afterEvent = false;
    }

    function filterAfter() {
        filter.beforeEvent = false;
        filter.afterEvent = true;
    }

    function reset () {
        filter = _.clone(RESET_FILTER);
    }

    return {
        render: render,
        setWeight: setWeight,
        filterBefore: filterBefore,
        filterAfter: filterAfter,
        filterTime: filterTime,
        filterKeyword: filterKeyword,
        filterSpeakers: filterSpeakers,
        reset: reset
    };
});