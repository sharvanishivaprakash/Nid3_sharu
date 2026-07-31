/* ===========================================================
   map.js
   World Map + Protest Locations
   =========================================================== */

"use strict";

let mapGroup;
let projection;
let path;
let protestDots;

let mapReady = false;

// Shared with introParticles.js
window.protestPoints = [];

function initializeMap(App) {

    mapGroup = App.layers.map
        .append("g");


    Promise.all([
        d3.json("data/world.geojson"),
        d3.csv("data/Global Protest Atlas - Protests data.csv")
    ]).then(([world, protests]) => {

        /* ===================================================
           PROJECTION
           =================================================== */

        projection = d3.geoNaturalEarth1()
            .fitSize(
                [
                    App.width * 0.92,
                    App.height * 0.82
                ],
                world
            );

        path = d3.geoPath(projection);

        /* ===================================================
           CENTER MAP
           =================================================== */

        const bounds = path.bounds(world);

        const mapWidth =
            bounds[1][0] - bounds[0][0];

        const mapHeight =
            bounds[1][1] - bounds[0][1];

        const offsetX =
            (App.width - mapWidth) / 2
            - bounds[0][0];

        const offsetY =
            (App.height - mapHeight) / 2
            - bounds[0][1];

        mapGroup.attr(
            "transform",
            `translate(${offsetX},${offsetY})`
        );

        /* ===================================================
           WORLD
           =================================================== */

        mapGroup
            .selectAll("path")
            .data(world.features)
            .enter()
            .append("path")
            .attr("d", path)
            .attr("fill", "none")
            .attr("stroke", "#777")
            .attr("stroke-width", 0.6)
            .attr("opacity", 0.8);

        /* ===================================================
           TOOLTIP
           =================================================== */

        const tooltip = d3.select("body")
            .selectAll("#tooltip")
            .data([null])
            .join("div")
            .attr("id", "tooltip")
            .style("position", "fixed")
            .style("background", "#111")
            .style("color", "#fff")
            .style("padding", "12px")
            .style("border", "1px solid #444")
            .style("border-radius", "8px")
            .style("font-family", "Inter")
            .style("font-size", "13px")
            .style("line-height", "1.6")
            .style("pointer-events", "none")
            .style("opacity", 0)
            .style("z-index", 9999);

        /* ===================================================
           PROTEST POINTS
           =================================================== */
        window.protestPoints = [];
        window.sriLankaMapPoint = null;

        protests.forEach(protest => {

            const country = world.features.find(

                d => d.properties.name === protest.Country

            );

    

            if (!country) return;

            const centroid = path.centroid(country);

            const point = {

    x: centroid[0],

    y: centroid[1],

    protest

};


window.protestPoints.push(point);


// Save Sri Lanka position
if(protest.Country === "Sri Lanka"){

    window.sriLankaMapPoint = point;

}

        });

       protestDots = mapGroup
    .selectAll(".protest-dot")
    .data(window.protestPoints)
    .enter()
    .append("circle")
    .attr("class", "protest-dot")
    .attr("cx", d => d.x)
    .attr("cy", d => d.y)
    .attr("r", 4.5)
    .attr("fill", "#ff4b4b")
    .attr("opacity", 1)
    .style("pointer-events","all")
    
    .on("click", function(event,d){

    console.log("DOT CLICKED", d);

})
    .on("mouseover", function(event,d){

    console.log("DOT HOVER");

        d3.select(this)
            .transition()
            .duration(200)
            .attr("r",8)
            .attr("fill","#ff7777");


        tooltip
            .style("opacity",1)
            .html(`

            <strong>
            ${d.protest["Official Name of Protest"]}
            </strong>

            <br><br>

            🌍 Country:
            ${d.protest.Country}

            <br>

            🎯 Cause:
            ${d.protest.Motivation}

            <br>

            👥 Participants:
            ${d.protest.Participants}

            <br>

            ⏳ Duration:
            ${d.protest.Duration}

            <br>

            📈 Success:
            ${d.protest["Success Score"]}

            `);

    })


    .on("mousemove", function(event){

        tooltip
            .style(
                "left",
                (event.clientX + 20) + "px"
            )
            .style(
                "top",
                (event.clientY + 20) + "px"
            );

    })


    .on("mouseout", function(){

        d3.select(this)
            .transition()
            .duration(200)
            .attr("r",4.5)
            .attr("fill","#ff4b4b");


        tooltip
            .style("opacity",0);

    });


console.log("Countries:", world.features.length);
console.log("Protests:", protests.length);
console.log("Matched points:", window.protestPoints.length);
        /* ===================================================
           DOTS
           =================================================== */

        mapReady = true;
       
    });

}

console.log("initializeMap closed");



/* ===========================================================
   ACTIVATE
   =========================================================== */



    

/* ===========================================================
   ACTIVATE MAP
=========================================================== */

function activateMap(){

    if(!mapReady) return;

    if(!mapGroup) return;


    gsap.set(mapGroup.node(),{
    opacity:1
});
    const dots = mapGroup.selectAll(".protest-dot");


    dots
    .attr("opacity",0)
    .transition()
    .duration(600)
    .delay((d,i)=>i*10)
    .attr("opacity",1)
    .attr("r",4);
}