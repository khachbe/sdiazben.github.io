function transformData(data, us_states_abb, us_coord) {
    var placements = {};
    for (var i = 0; i < data.length; i++) {
        var line = data[i];
        var nationality = line.Nationality;
        var state = line["Placement State"];
        var city = line["Placement City"];
        var value = parseInt(line["CY 2017"]);
        var state_abb = "";
        for (var j = 0; j < us_states_abb.length; j++) {
            var current = us_states_abb[j];
            if (current.name == state) {
                state_abb = current.abbreviation;
                break;
            }
        }

        var longitude = null;
        var latitude = null;

        for (var j = 0; j < us_coord.length; j++) {
            var current = us_coord[j];
            if (current.fields.state == state_abb) {
                if (current.fields.city == city) {
                    longitude = current.fields.longitude;
                    latitude = current.fields.latitude;
                    break;
                }
            }
        }

        if (!(nationality in placements))
            placements[nationality] = {};
        if (!(state in placements[nationality]))
            placements[nationality][state] = {};
        if (!(city in placements[nationality][state]))
            placements[nationality][state][city] = {};
        if (!("value" in placements[nationality][state][city]))
            placements[nationality][state][city]["value"] = 0;
        if (longitude != null) {
            if (!("longitude" in placements[nationality][state][city])) {
                placements[nationality][state][city]["longitude"] = longitude;
                placements[nationality][state][city]["latitude"] = latitude;
            }
        }
        placements[nationality][state][city]["value"] += value;
    }
    return placements;
};


function createMap(svg, data) {
    var nationality = "Bhutan"; // We will change that later
    var us_states = data[1];
    var us_states_abb = data[2];
    var us_coord = data[3];
    var arrivals = transformData(data[0], us_states_abb, us_coord);

    var min_arrivals = Number.MAX_VALUE;
    var max_arrivals = Number.MIN_VALUE;

    var cities = [];
    for (let state in arrivals[nationality]) {
        var value = 0;

        for (let city in arrivals[nationality][state]) {
            current = arrivals[nationality][state][city];
            value += current["value"];
            if ("longitude" in current) {
                cities.push({
                    "name": city,
                    "lon": current.longitude,
                    "lat": current.latitude,
                    "value": current.value
                });
            }
        }
        if (value > max_arrivals) {
            max_arrivals = value;
        }
        if (value < min_arrivals) {
            min_arrivals = value;
        }


        for (var j = 0; j < us_states.features.length; j++) {
            var state_name = us_states.features[j].properties.NAME;
            if (state_name == state) {
                us_states.features[j].properties.arrivals = value;
                break;
            }
        }
    }

    cities.sort(function (a, b) {
        var keyA = a.value,
            keyB = b.value;
        if (keyA < keyB) return 1;
        if (keyA > keyB) return -1;
        return 0;
    });

    var div = d3.select("body")
        .append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    var colorScale = d3.scaleQuantile()
        .domain(d3.range(min_arrivals, max_arrivals))
        .range(d3.schemeBlues[9]);

    var colorLegend = d3.legendColor()
        .labelFormat(d3.format(".0f"))
        .scale(colorScale)
        .shapePadding(70)
        .shapeWidth(20)
        .shapeHeight(20)
        .title("Number of arrivals")
        .orient('horizontal');

    var legend = svg.append("g")
        .attr("transform", "translate(-10, 426)")
        .call(colorLegend);

    // Change position of each cell in the legend
    legend.selectAll('.cell')
    .each(function(d,i) {
      d3.select(this) 
      .attr("transform", "translate("+i%5*90+","+Math.floor(i/5)*30+")");
    });

    //change the position and attributes of the text in each cell
    legend.selectAll('.label')
        .attr("class", "legendText")
        .attr("style", "text-anchor: left")
        // .attr("font-size", "12")
        .attr("transform", "translate(25,15)");

    //change attributes of title of legend
    legend.select('.legendTitle')
    .attr("transform", "translate(10, 0)");

    var projection = d3.geoAlbersUsa().scale(800).translate([350, 180]);
    var path = d3.geoPath()
        .projection(projection);
    svg.selectAll('path')
        .data(us_states.features)
        .enter().append('path')
        .attr("stroke-width", 1)
        .style("stroke", "#ccc")
        .attr("class", "states")
        .attr("name", function (d) {
            return d.properties.NAME;
        })
        .attr("d", path)
        .style("fill", function (d) {

            // Get data value
            var value = d.properties.arrivals;
            if (value) {
                //If value exists…
                return colorScale(value);
            } else {
                //If value is undefined…
                return "rgb(213,222,217)";
            };

        })
        .on("mouseover", function (d) {
            if (d.properties.arrivals > 0) {
                div.transition()
                    .duration(200)
                    .style("opacity", .9);
                div.text(d.properties.NAME + ": " + d.properties.arrivals)
                    .style("left", (d3.event.pageX) + "px")
                    .style("top", (d3.event.pageY - 28) + "px");
            }
        })

        // fade out tooltip on mouse out               
        .on("mouseout", function (d) {
            div.transition()
                .duration(500)
                .style("opacity", 0);
        });;


    var circles = svg.selectAll("circle")
        .data(cities)
        .enter()
        .append("circle")
        .attr("class", function (d, i) {
            return "cities " + d.name + " " + d.lat + " " + d.lon;
        })
        .attr("cx", function (d) {
            return projection([d.lon, d.lat])[0];
        })
        .attr("cy", function (d) {
            return projection([d.lon, d.lat])[1];
        })
        .attr("r", function (d) {
            return 0.8 * Math.sqrt(d.value);
        })
        .style("fill", "rgb(217,91,67)")

        .style("opacity", 0.85)

        .on("mouseover", function (d) {
            div.transition()
                .duration(200)
                .style("opacity", .9);
            div.text(d.name + ": " + d.value)
                .style("left", (d3.event.pageX) + "px")
                .style("top", (d3.event.pageY - 28) + "px");
        })

        // fade out tooltip on mouse out               
        .on("mouseout", function (d) {
            div.transition()
                .duration(500)
                .style("opacity", 0);
        });

    d3.select("#loading").remove();
};