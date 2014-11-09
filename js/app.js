(function() {
    'use strict';

    var diameter = 640,
        format = d3.format(",d"),
        color = d3.scale.category20c();

    var bubble = d3.layout.pack()
        .sort(null)
        .size([diameter, diameter])
        .padding(1.5);

    var svg = d3.select("#chart").append("svg")
        .attr("width", diameter)
        .attr("height", diameter)
        .attr("class", "bubble");


    var url = getUrl({
        q: 'visualizedio',
        result_type: 'recent',
        count: 300
    });

    function getUrl (params) {
        var queryString = _.map(params, function (value, key) {

            return key + '=' + value;
        }).join('&');

        return './twitter-proxy.php?url=' + encodeURIComponent('search/tweets.json?' + queryString); 
    }

    // distance from center, plus one
    function weighTweet (d) {
        return 1 + Math.sqrt(
            d.favorite_count * d.favorite_count +
            d.retweet_count + d.retweet_count);
    }

    //url = 'mock.json';

    d3.json(url, function(error, root) {
        console.log(root);
        var children = root.statuses.map(function(d) {
            d.value = weighTweet(d);
            return d;
        });

        var node = svg.selectAll(".node")
            .data(bubble.nodes({
                    children: children
                })
                .filter(function(d) {
                    return !d.children;
                }))
            .enter().append("g")
            .attr("class", "node")
            .attr("transform", function(d) {
                return "translate(" + d.x + "," + d.y + ")";
            })
            .on("mouseover", function(d) {
                var tooltip = d3.select("#tooltip")
                    .style("left", (d.x + 20) + "px")
                    .style("top", d.y + "px")
                    .style("opacity", 1);

                tooltip.select("strong").text(d.text);
                tooltip.select(".retweet_count").text(d.retweet_count);
                tooltip.select(".favorite_count").text(d.favorite_count);
            })
            .on("mouseout", function() {
                d3.select("#tooltip")
                    .style("opacity", 0);
            });

        node.append("circle")
            .attr("r", function(d) {
                return d.r;
            })
            .style("fill", "white");
    });

    d3.select(self.frameElement).style("height", diameter + "px");

}());