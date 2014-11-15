var app = app || angular.module('bubbleApp', ['ui-rangeSlider']);

app.factory('urlReplacer', function() {

    function replaceURLWithHTMLLinks(text) {
        var re = /(\(.*?)?\b((?:https?|ftp|file):\/\/[-a-z0-9+&@#\/%?=~_()|!:,.;]*[-a-z0-9+&@#\/%=~_()|])/ig;
        return text.replace(re, function(match, lParens, url) {
            var rParens = '';
            lParens = lParens || '';

            // Try to strip the same number of right parens from url
            // as there are left parens.  Here, lParenCounter must be
            // a RegExp object.  You cannot use a literal
            //     while (/\(/g.exec(lParens)) { ... }
            // because an object is needed to store the lastIndex state.
            var lParenCounter = /\(/g;
            while (lParenCounter.exec(lParens)) {
                var m;
                // We want m[1] to be greedy, unless a period precedes the
                // right parenthesis.  These tests cannot be simplified as
                //     /(.*)(\.?\).*)/.exec(url)
                // because if (.*) is greedy then \.? never gets a chance.
                if (m = /(.*)(\.\).*)/.exec(url) ||
                        /(.*)(\).*)/.exec(url)) {
                    url = m[1];
                    rParens = m[2] + rParens;
                }
            }
            return lParens + "<a target=\"_blank\" href='" + url + "'>" + url + "</a>" + rParens;
        });
    }

    return {
        replace: replaceURLWithHTMLLinks
    };
});