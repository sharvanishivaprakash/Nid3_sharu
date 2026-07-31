/* =====================================================
RESTORED chart script
===================================================== */

const svg = d3.select("#line-chart");

const margin = { top: 60, right: 90, bottom: 60, left: 70 };
const width = 900;
const height = 650;

svg
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

const chart = svg.append("g");

d3.csv("data/age-series.csv", d => ({
    age: +d.age,
    series: +d.series,
    exact: +d.exact,
    smooth: +d.smooth
})).then(data => {
    data.sort((a, b) => {
        if (a.series === b.series) return a.age - b.age;
        return a.series - b.series;
    });

    const x = d3.scaleLinear()
        .domain(d3.extent(data, d => d.age))
        .range([margin.left, width - margin.right]);

    const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.smooth)])
        .nice()
        .range([height - margin.bottom, margin.top]);

    chart.append("g")
        .attr("class", "grid")
        .attr("transform", `translate(${margin.left},0)`)
        .call(
            d3.axisLeft(y)
                .ticks(6)
                .tickSize(-(width - margin.left - margin.right))
                .tickFormat("")
        );

    chart.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(
            d3.axisBottom(x).ticks(8)
        )
        .call(g => g.select(".domain").remove());

    chart.append("g")
        .attr("class", "y-axis")
        .attr("transform", `translate(${margin.left},0)`)
        .call(
            d3.axisLeft(y)
                .ticks(6)
                .tickFormat(d => `${Math.round(d * 100)}%`)
        )
        .call(g => g.select(".domain").remove());

    const line = d3.line()
        .curve(d3.curveMonotoneX)
        .x(d => x(d.age))
        .y(d => y(d.smooth));

    const colors = { 2003: "#f08e3f", 2015: "#3d8da0" };

    const grouped = d3.group(data, d => d.series);

    grouped.forEach((values, year) => {
        const last = values[values.length - 1];
        chart.append("text")
            .attr("class", "line-label")
            .attr("x", x(last.age) + 14)
            .attr("y", y(last.smooth))
            .attr("dominant-baseline", "middle")
            .attr("fill", colors[year])
            .text(year);
    });

    chart.append("text")
        .attr("class", "axis-label")
        .attr("x", width / 2)
        .attr("y", height - 15)
        .attr("text-anchor", "middle")
        .text("Age");

    chart.append("text")
        .attr("class", "axis-label")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", 22)
        .attr("text-anchor", "middle")
        .text("Meals eaten alone");

    const data2015 = grouped.get(2015);
    const data2003 = grouped.get(2003);

    const line2015 = chart.append("path")
        .datum(data2015)
        .attr("class", "line line-2015")
        .attr("fill", "none")
        .attr("opacity", 0)
        .attr("d", line);

    const line2003 = chart.append("path")
        .datum(data2003)
        .attr("class", "line line-2003")
        .attr("fill", "none")
        .attr("opacity", 0)
        .attr("d", line);

    const dots2015 = chart.append("g")
        .attr("class", "dots-2015")
        .selectAll("circle")
        .data(data2015)
        .join("circle")
        .attr("class", "dot dot-2015")
        .attr("cx", d => x(d.age))
        .attr("cy", d => y(d.smooth))
        .attr("r", 4)
        .attr("opacity", 0)
        .append("title")
        .text(d => d.age);

    const dots2003 = chart.append("g")
        .attr("class", "dots-2003")
        .selectAll("circle")
        .data(data2003)
        .join("circle")
        .attr("class", "dot dot-2003")
        .attr("cx", d => x(d.age))
        .attr("cy", d => y(d.smooth))
        .attr("r", 4)
        .attr("opacity", 0)
        .append("title")
        .text(d => d.age);

    const calloutGroup = chart.append("g")
        .attr("class", "callout-group")
        .attr("opacity", 0);
    const calloutCircle = calloutGroup.append("circle")
        .attr("class", "callout-circle");
    const calloutLine = calloutGroup.append("line")
        .attr("class", "callout-line");
    const calloutText = calloutGroup.append("text")
        .attr("class", "callout-text");

    const ageBands = [
        { start: 15, end: 19, label: "15-19" },
        { start: 20, end: 30, label: "20-30" },
        { start: 30, end: 50, label: "30-50" },
        { start: 50, end: 75, label: "50-75" },
        { start: 75, end: 85, label: "75-85" }
    ];

    const bandGroup = chart.append("g")
        .attr("class", "band-group")
        .attr("opacity", 0);

    bandGroup.selectAll("rect")
        .data(ageBands)
        .join("rect")
        .attr("class", "band-rect")
        .attr("x", d => x(d.start))
        .attr("y", margin.top)
        .attr("width", d => x(d.end) - x(d.start))
        .attr("height", height - margin.top - margin.bottom);

    bandGroup.selectAll("text")
        .data(ageBands)
        .join("text")
        .attr("class", "band-label")
        .attr("x", d => x(d.start) + 8)
        .attr("y", margin.top + 20)
        .text(d => d.label);

    const storyCards = Array.from(document.querySelectorAll(".story-card"));

    function animatePath(path) {
        const totalLength = path.node().getTotalLength();
        path
            .attr("stroke-dasharray", totalLength)
            .attr("stroke-dashoffset", totalLength)
            .transition()
            .duration(1200)
            .ease(d3.easeCubicOut)
            .attr("stroke-dashoffset", 0);
    }

    function findNearest(points, targetAge) {
        let nearest = points[0];
        let minDistance = Math.abs(points[0].age - targetAge);
        points.forEach(d => {
            const distance = Math.abs(d.age - targetAge);
            if (distance < minDistance) {
                nearest = d;
                minDistance = distance;
            }
        });
        return nearest;
    }

    function updateScene(index) {
        storyCards.forEach((card, cardIndex) => {
            card.classList.toggle("active", cardIndex === index);
        });

        line2015.transition().duration(500).attr("opacity", 1).attr("stroke-width", 4);
        line2003.transition().duration(500).attr("opacity", index >= 3 ? 0.35 : 0);

        if (index === 0) {
            dots2015.transition().duration(500).attr("opacity", 0.75).attr("r", 4.5);
            dots2003.transition().duration(500).attr("opacity", 0);
            calloutGroup.transition().duration(400).attr("opacity", 0);
            bandGroup.transition().duration(400).attr("opacity", 0);
        } else if (index === 1) {
            dots2015.transition().duration(500).attr("opacity", 0.75).attr("r", 4.5);
            dots2003.transition().duration(500).attr("opacity", 0);
            const point = findNearest(data2015, 32);
            calloutGroup.transition().duration(400).attr("opacity", 1);
            calloutCircle.attr("cx", x(point.age)).attr("cy", y(point.smooth)).attr("r", 44);
            calloutLine.attr("x1", x(point.age) + 44).attr("y1", y(point.smooth)).attr("x2", x(point.age) + 132).attr("y2", y(point.smooth) - 46);
            calloutText.attr("x", x(point.age) + 136).attr("y", y(point.smooth) - 40).text("30-something social butterflies");
            bandGroup.transition().duration(400).attr("opacity", 0);
        } else if (index === 2) {
            dots2015.transition().duration(500).attr("opacity", 0.65).attr("r", 4);
            dots2003.transition().duration(500).attr("opacity", 0);
            const point = findNearest(data2015, 72);
            calloutGroup.transition().duration(400).attr("opacity", 1);
            calloutCircle.attr("cx", x(point.age)).attr("cy", y(point.smooth)).attr("r", 44);
            calloutLine.attr("x1", x(point.age) + 44).attr("y1", y(point.smooth)).attr("x2", x(point.age) + 132).attr("y2", y(point.smooth) + 28);
            calloutText.attr("x", x(point.age) + 136).attr("y", y(point.smooth) + 34).text("70-something solo diners");
            bandGroup.transition().duration(400).attr("opacity", 0);
        } else if (index === 3) {
            dots2015.transition().duration(500).attr("opacity", 0.55).attr("r", 4);
            dots2003.transition().duration(500).attr("opacity", 0.8).attr("r", 4);
            calloutGroup.transition().duration(400).attr("opacity", 0);
            bandGroup.transition().duration(400).attr("opacity", 0);
            animatePath(line2003);
        } else {
            dots2015.transition().duration(500).attr("opacity", 0.4).attr("r", 4);
            dots2003.transition().duration(500).attr("opacity", 0.7).attr("r", 4);
            calloutGroup.transition().duration(400).attr("opacity", 0);
            bandGroup.transition().duration(400).attr("opacity", 0.25);
            animatePath(line2003);
        }

        if (index === 0) {
            animatePath(line2015);
        }
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const sceneIndex = Number(entry.target.dataset.scene || 0);
                updateScene(sceneIndex);
            }
        });
    }, {
        root: null,
        threshold: 0.55
    });

    storyCards.forEach(card => observer.observe(card));

    updateScene(0);
}).catch(error => {
    console.error("Could not load age-series.csv", error);
});
