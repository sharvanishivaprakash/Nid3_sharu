/* ==========================================================
   motivation.js
   Why do people protest?
========================================================== */

"use strict";

let motivationGroup;
let motivationBars;
let motivationValues;
let motivationScale;

function initializeMotivation(App) {

    motivationGroup = App.layers.motivation
        .append("g");


    d3.csv("data/Global Protest Atlas - Protests data.csv").then(data => {

        /* =====================================================
           COUNT MOTIVATIONS
        ===================================================== */

        const counts = {};

        data.forEach(d => {

            const key = d.Motivation || "Unknown";

            counts[key] = (counts[key] || 0) + 1;

        });

        const dataset = Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8);

        /* =====================================================
           CHART
        ===================================================== */

        const chartWidth = 720;
        const chartHeight = 460;

        const margin = {

            top: 60,
            right: 70,
            bottom: 40,
            left: 240

        };

        /* =====================================================
         /* =====================================================
   POSITION CHART
===================================================== */

const visualWidth = App.width * 0.58;

const CHART_SHIFT_X = -90;
const CHART_SHIFT_Y = 20;

const offsetX =
    App.width * 0.42 +
    (visualWidth - chartWidth) / 2 +
    CHART_SHIFT_X;

const offsetY =
    (App.height - chartHeight) / 2 +
    CHART_SHIFT_Y;

motivationGroup.attr(
    "transform",
    `translate(${offsetX}, ${offsetY})`
);
        /* =====================================================
           SCALES
        ===================================================== */

        motivationScale = d3.scaleLinear()
            .domain([0, d3.max(dataset, d => d[1])])
            .range([0, chartWidth - margin.left - margin.right]);

        const y = d3.scaleBand()
            .domain(dataset.map(d => d[0]))
            .range([margin.top, chartHeight - margin.bottom])
            .padding(0.28);

        /* =====================================================
           TITLE
        ===================================================== */



        /* =====================================================
           LABELS
        ===================================================== */

        motivationGroup
            .selectAll(".label")
            .data(dataset)
            .enter()
            .append("text")
            .attr("class", "label")
            .attr("x", margin.left - 20)
            .attr("y", d => y(d[0]) + y.bandwidth() / 2)
            .attr("text-anchor", "end")
            .attr("dominant-baseline", "middle")
            .attr("fill", "white")
            .attr("font-size", 15)
            .text(d => d[0]);

        /* =====================================================
           BARS
        ===================================================== */

        motivationBars = motivationGroup
            .selectAll(".bar")
            .data(dataset)
            .enter()
            .append("rect")
            .attr("class", "bar")
            .attr("x", margin.left)
            .attr("y", d => y(d[0]))
            .attr("height", y.bandwidth())
            .attr("width", 0)
            .attr("rx", 6)
            .attr("fill", "#E63946");

        /* =====================================================
           VALUES
        ===================================================== */

        motivationValues = motivationGroup
            .selectAll(".value")
            .data(dataset)
            .enter()
            .append("text")
            .attr("class", "value")
            .attr("x", d => margin.left + motivationScale(d[1]) - 12)
.attr("text-anchor", "end")
            .attr("y", d => y(d[0]) + y.bandwidth() / 2)
            .attr("dominant-baseline", "middle")
            .attr("fill", "white")
            .attr("font-size", 14)
            .text(d => d[1]);

    });

}

/* ==========================================================
   ACTIVATE
========================================================== */

function activateMotivation() {

    if (!motivationGroup || !motivationBars) return;

    gsap.fromTo(

        motivationGroup.node(),

        {
            opacity: 0,
            y: 25
        },

        {
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: "power2.out"
        }

    );

    motivationBars
        .transition()
        .duration(700)
        .delay((d, i) => i * 60)
        .attr("width", d => motivationScale(d[1]));

}