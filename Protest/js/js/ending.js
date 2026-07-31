"use strict";


let endingGroup;


function initializeEnding(App){


    endingGroup = App.layers.ending
        .append("g");


    endingGroup.attr(
        "transform",
        `translate(${App.width * 0.65},${App.height * 0.5})`
    );


    // central red movement dot

    endingGroup
        .append("circle")
        .attr("class","ending-core")
        .attr("r",18)
        .attr("fill","#E63946");



    const factors = [
        "Clear Demand",
        "Sustained Pressure",
        "Mass Participation",
        "Visibility",
        "Political Leverage"
    ];



    factors.forEach((factor,i)=>{


        const x = (i-2)*140;


        // connecting line

        endingGroup
            .append("line")
            .attr("x1",0)
            .attr("y1",0)
            .attr("x2",x)
            .attr("y2",120)
            .attr("stroke","#555")
            .attr("stroke-dasharray","5 5");



        // factor dots

        endingGroup
            .append("circle")
            .attr("cx",x)
            .attr("cy",120)
            .attr("r",7)
            .attr("fill","#E63946");



        // labels

        endingGroup
            .append("text")
            .attr("x",x)
            .attr("y",160)
            .attr("text-anchor","middle")
            .attr("fill","white")
            .attr("font-size",15)
            .text(factor);


    });


}



function activateEnding(){


    if(!endingGroup) return;


    gsap.fromTo(

        endingGroup.node(),

        {
            opacity:0,
            y:40
        },

        {
            opacity:1,
            y:0,
            duration:1
        }

    );


}