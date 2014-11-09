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


var url = './twitter-proxy.php?url='+encodeURIComponent('search/tweets.json?q=visualizedio&src=typd');
//url = 'mock.json';

d3.json(url, function(error, root) {
    var children = root.statuses.map(function(d) {
        // console.log('favorite_count:', d.favorite_count);
        // console.log('retweet_count:', d.retweet_count);

        d.value = (d.favorite_count + 1) * (d.retweet_count + 1);
        return d;
    });

  var node = svg.selectAll(".node")
    .data(bubble.nodes({
        children: children
    })
    .filter(function(d) { return !d.children; }))
    .enter().append("g")
      .attr("class", "node")
      .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; })
      .on("mouseover", function (d) {
        var tooltip = d3.select("#tooltip")
            .style("left", d3.event.pageX + "px")
            .style("top", d3.event.pageY + "px")
            .style("opacity", 1);

        tooltip.select("strong").text(d.text);
        tooltip.select(".retweet_count").text(d.retweet_count);
        tooltip.select(".favorite_count").text(d.favorite_count);
      })
      .on("mouseout", function () {
        // Hide the tooltip
        d3.select("#tooltip")
            .style("opacity", 0);
      });

  // node.append("title")
  //     .text(function(d) { return d.text + ": " + format(d.value); });

  node.append("circle")
      .attr("r", function(d) { return d.r; })
      .style("fill", "white");


  // node.append("text")
  //     .attr("dy", ".3em")
  //     .style("text-anchor", "middle")
  //     .text(function(d) { return d.text.substr(0, 4); });
});

// Returns a flattened hierarchy containing all leaf nodes under the root.
function classes(root) {
  var classes = [];

  function recurse(name, node) {
    if (node.children) node.children.forEach(function(child) { recurse(node.name, child); });
    else classes.push({packageName: name, className: node.name, value: node.size});
  }

  recurse(null, root);
  return {children: classes};
}

d3.select(self.frameElement).style("height", diameter + "px");