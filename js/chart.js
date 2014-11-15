var app = app || angular.module('bubbleApp', ['ui-rangeSlider']);

app.factory('bubbleChart', function() {

    var padding = 6,
        radius = d3.scale.sqrt().range([0, 12]),
        weight = '',
        savedStatuses,
        drag;

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

    // distance from center, plus one
    function weighTweet(d) {
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

    function updateData(nodes) {
        var svg = d3.select("#chart svg");

        return svg.selectAll("circle")
            .data(nodes)
            .enter().append("circle")
            .attr("r", function(d) {
                return d.radius;
            })
            .style("fill", function(d, i) {
                return "#0288d1";
            })
            .call(drag);
    }

    // abuse the pack layout to calculate the radii
    function scaleBubbleSize (children, width, height) {
        var data = _.map(children, function (d, i) {
            d.value = weighTweet(d);
            return d;
        });

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

        circle
            .on("mouseover", function(d) {
                var width = $('#tooltip').width(),
                    left = d3.event.pageX + width + 30 > $(window).width() ?
                        d3.event.pageX - width - 30 :
                        d3.event.pageX + 30,
                    created_at = parseDate(d.created_at).format('MMMM DD YYYY, h:mm:ss a');

                d3.select(this).
                    transition().
                    style('fill', function(d) {
                        return '#FFD44E';
                    });

                tooltip
                    .transition()
                    .duration(300)
                    .style("opacity", 1)
                    .style("top", (d3.event.pageY - 28) + "px")
                    .style("left", left + "px");

                tooltip.select("strong").text(d.text);
                tooltip.select(".retweet_count").text(d.retweet_count);
                tooltip.select(".favorite_count").text(d.favorite_count);
                tooltip.select('.created_at').text(created_at);
                tooltip.select('.user-name').text(d.user.name);
                tooltip.select('img').attr('src', d.user.profile_image_url);
            })
            .on("mouseout", function() {
                d3.select(this).
                    transition().
                    style('fill', function(d) {
                        return '#0288d1';
                    });

                tooltip
                    .transition().duration(0)
                    .delay(300)
                    .style("opacity", 0);
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

    return {
        render: render,
        setWeight: setWeight
    };
});