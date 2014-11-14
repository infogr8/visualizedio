var app = app || angular.module('bubbleApp', ['ui-rangeSlider']);

app.factory('bubbleChart', function() {

    var padding = 6,
        radius = d3.scale.sqrt().range([0, 12]),
        m = 1,
        color = d3.scale.category10().domain(d3.range(m)),
        drag,
        statuses,
        margin = {
            top: 0,
            right: 0,
            bottom: 0,
            left: 0
        };


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
        return 1 + Math.sqrt(
            d.favorite_count * d.favorite_count +
            d.retweet_count + d.retweet_count);
    }


    function selectNodes (children, width, height) {
        var x = d3.scale.ordinal().domain(d3.range(m)).rangePoints([0, width], 1);
        var nodes = _.map(children, function(item, index) {
            var i = Math.floor(Math.random() * m);

            item.cx = x(i);
            item.cy = height / 2;

            // reset
            item.x = Math.random() * width / 2;
            item.y = Math.random() * height /2;

            return item;
        });

        // var totalArea = _.reduce(nodes, function (memo, d) {
        //     return memo + 2 * Math.PI * d.radius * d.radius;
        // }, 0);
        // var availableArea = width * height;
        // var factor = availableArea / totalArea;

        // _.each(nodes, function (d) {
        //     d.radius = d.radius * 4;
        // })
        return nodes;
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
    function abuseBubble (children, width, height) {
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
            return !d.children;
        }).map(function (d) {
            d.radius = Math.min(100, d.r);
            return d;
        });

    }

    function render(statuses) {
        var width = parseFloat(d3.select('#chart').style('width').replace(/px$/, '')),
            height = width;

        var children = statuses,
            nodes = abuseBubble(children, width, height);
        nodes = selectNodes(nodes, width, height);

        var force = d3.layout.force()
            .nodes(nodes)
            .size([width, height])
            .gravity(0)
            .charge(0)
            .on("tick", tick)
            .start();

        drag = force.drag().on("drag", dragmove);

        // var tooltip = d3.select("body").append("div")
        //     .attr("class", "tooltip")
        //     .style("opacity", 0);

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

        var svg = d3.select("#chart").select("svg").remove();

            svg = d3.select("#chart").append("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom);
        // } else {
        //     svg = d3.select('#chart svg')
        //         .attr("width", width + margin.left + margin.right)
        //         .attr("height", height + margin.top + margin.bottom);
        // }


        var circle = updateData(nodes, drag);
        var tooltip = d3.select("#tooltip");

        circle
            // to go back uncomment and delete from line 204 to 219
            //.on('click', function (d) {
              //  d3.select(this).
                
                //style('fill', function(d) {
                  //  return '#FFD44E';
               // });

                //console.log('mouseover');
                //var tooltip = d3.select("#tooltip")
                  //  .transition()
                   // .delay(100)
                //    .duration(500)
                  //  .style('display', 'block')
                  //  .style("opacity", 1)
                //    .style("left", (d.x + 20) + "px")
                //    .style("top", (d.y - 50) + "px");

             //   tooltip.select("strong").text(d.text);
             //   tooltip.select(".retweet_count").text(d.retweet_count);
            //    tooltip.select(".favorite_count").text(d.favorite_count);
             //   tooltip.select('.created_at').text(d.created_at);
             //   tooltip.select('.user-name').text(d.user.name);
            //    tooltip.select('img').attr('src', d.user.profile_image_url);
                
           // })
            


            .on("mouseover", function(d) {
                d3.select(this).
                    transition().
                    style('fill', function(d) {
                        return '#FFD44E';
                    });

                tooltip
                    .transition()
                    .duration(300)
                 //   .style('display', 'block')
                    .style("opacity", 1)
                    .style("left", (d3.event.pageX + 30) + "px")
                    .style("top", (d3.event.pageY - 28) + "px");

                tooltip.select("strong").text(d.text);
                tooltip.select(".retweet_count").text(d.retweet_count);
                tooltip.select(".favorite_count").text(d.favorite_count);
                tooltip.select('.created_at').text(d.created_at);
                tooltip.select('.user-name').text(d.user.name);
                tooltip.select('img').attr('src', d.user.profile_image_url);
                
            //FFD44E
            })
            .on("mouseout", function() {
                d3.select(this).
                    transition().
                    style('fill', function(d) {
                        return '#0288d1';
                    });
            //#0187D0

            //    uncomment this to hide the tooltip when leaving
                tooltip
                    .transition().duration(0)
                    .delay(300)
                    .style("opacity", 0)
                    //.style('top', 0)
//                    .select('img').attr('src', '');
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

    return {
        render: render,
        updateData: updateData
    };
});