/* ==========================================================
   success.js
   Does a bigger crowd mean more success?
========================================================== */

"use strict";

let successGroup;
let successDots;

function initializeSuccess(App) {

    successGroup = App.layers.success
        .append("g");
    

    d3.csv("data/Global Protest Atlas - Protests data.csv").then(data => {

        /* =====================================================
           PREPARE DATA
        ===================================================== */

        data.forEach(d => {

            d.Score = +d["Success Score"] || 0;

            const participants = String(d.Participants).toLowerCase();

            if (participants.includes("million")) {

                d.Participants = 5;

            } else if (participants.includes("hundred")) {

                d.Participants = 4;

            } else if (participants.includes("ten")) {

                d.Participants = 3;

            } else if (participants.includes("thousand")) {

                d.Participants = 2;

            } else {

                d.Participants = 1;

            }

        });

        /* =====================================================
           CHART
        ===================================================== */

        const chartWidth = 760;
        const chartHeight = 460;

        const margin = {

            top: 60,
            right: 60,
            bottom: 100,
            left: 80

        };

        /* =====================================================
           CENTER INSIDE SVG
        ===================================================== */

        const visualWidth = App.width * 0.58;

const offsetX = App.width * 0.42 + (visualWidth - chartWidth) / 2 - 180;
const offsetY = (App.height - chartHeight) / 2 + 80;

        successGroup.attr(
            "transform",
            `translate(${offsetX},${offsetY})`
        );

        /* =====================================================
           SCALES
        ===================================================== */

        const x = d3.scaleLinear()
            .domain([1, 5])
            .range([margin.left, chartWidth - margin.right]);

        const y = d3.scaleLinear()
            .domain([0, 5])
            .range([chartHeight - margin.bottom, margin.top]);

        
        /* =====================================================
           AXES
        ===================================================== */

        const xAxis = d3.axisBottom(x)
            .tickValues([1, 2, 3, 4, 5])
            .tickFormat(d => ({
                1: "Small",
                2: "Thousands",
                3: "Tens",
                4: "Hundreds",
                5: "Millions"
            })[d]);

        const yAxis = d3.axisLeft(y).ticks(5);

        successGroup
            .append("g")
            .attr("transform", `translate(0,${chartHeight - margin.bottom})`)
            .call(xAxis);

        successGroup
            .append("g")
            .attr("transform", `translate(${margin.left},0)`)
            .call(yAxis);

        successGroup
            .selectAll(".domain,.tick line")
            .attr("stroke", "#666");

        successGroup
            .selectAll(".tick text")
            .attr("fill", "white")
            .attr("font-size", 12);

        /* =====================================================
           AXIS LABELS
        ===================================================== */

        successGroup
            .append("text")
            .attr("x", chartWidth / 2)
            .attr("y", chartHeight - 20)
            .attr("fill", "white")
            .attr("text-anchor", "middle")
            .text("Estimated Crowd Size");

        successGroup
            .append("text")
            .attr("transform", "rotate(-90)")
            .attr("x", -chartHeight / 2)
            .attr("y", 20)
            .attr("fill", "white")
            .attr("text-anchor", "middle")
            .text("Success Score");

        /* =====================================================
           DOTS
        ===================================================== */

        successDots = successGroup
            .selectAll("circle")
            .data(data)
            .enter()
            .append("circle")
            .attr("cx", d => x(d.Participants) + (Math.random() - 0.5) * 55)
            .attr("cy", d => y(d.Score) + (Math.random() - 0.5) * 55 - 12)
            .attr("r", 0)
            .attr("fill", "#E63946")
            .attr("opacity", 0.75)
            .on("mouseenter", function(event,d){

                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr("r",8)
                    .attr("fill","#ff7777");

                d3.select("#tooltip")
                    .style("opacity",1)
                    .html(`

                    <strong>
                    ${d["Hover Title"]}
                    </strong>

                    <br><br>

                    <b>Summary:</b><br>
${d["Hover Summary"] || "No summary available"}

<br><br>

<b>Outcome:</b><br>
${d["Outcome Summary"] || "No outcome available"}

                    `);

            })
            .on("mousemove", function(event){

                d3.select("#tooltip")
                    .style(
                        "left",
                        (event.clientX + 20) + "px"
                    )
                    .style(
                        "top",
                        (event.clientY + 20) + "px"
                    );

            })
            .on("mouseleave", function(){

                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr("r",5)
        .attr("fill","#E63946");


    d3.select("#tooltip")
        .style("opacity",0);

});

    });

}

/* ==========================================================
   ACTIVATE
========================================================== */

function activateSuccess() {

    if (!successGroup || !successDots) return;

    gsap.fromTo(

        successGroup.node(),

        {
            opacity: 0,
            y: 30
        },

        {
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: "power2.out"
        }

    );

    successDots
        .transition()
        .duration(700)
        .delay((d, i) => i * 3)
        .attr("r", 5);

}