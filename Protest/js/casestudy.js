/* ===========================================================
   caseStudy.js
   Sri Lanka Case Study
=========================================================== */

"use strict";

let caseStartPoint;
let caseGroup;
let sriLankaDot;
let caseTitle;
let caseSubtitle;



/* ===========================================================
   INITIALIZE
=========================================================== */

function initializeCaseStudy(App){


    caseGroup = App.layers.caseStudy
        .append("g")
        .attr("class","case-container");


    /*
        Main Sri Lanka transition dot
    */

    sriLankaDot = caseGroup
        .append("circle")
        .attr("class","sri-lanka-dot")
        .attr("cx",App.width/2)
        .attr("cy",App.height/2)
        .attr("r",15)
        .attr("fill","#E63946")
        .attr("opacity",0);



    /*
        Title
    */

    caseTitle = caseGroup
        .append("text")
        .attr("x",App.width/2)
        .attr("y",App.height*0.35)
        .attr("text-anchor","middle")
        .attr("fill","white")
        .attr("font-size",48)
        .attr("font-family","Inter")
        .attr("opacity",0)
        .text("Sri Lanka");



    /*
        Subtitle
    */

    caseSubtitle = caseGroup
        .append("text")
        .attr("x",App.width/2)
        .attr("y",App.height*0.42)
        .attr("text-anchor","middle")
        .attr("fill","#E63946")
        .attr("font-size",24)
        .attr("font-family","Inter")
        .attr("opacity",0)
        .text("The Movement That Forced A Political Change");


}



/* ===========================================================
   ACTIVATE
=========================================================== */

function activateCaseStudy(){


    if(!caseGroup) return;


    gsap.to(caseGroup.node(),{

        opacity:1,

        duration:0.5

    });



    // Start from Sri Lanka map position

    if(window.sriLankaMapPoint){


        sriLankaDot
            .attr(
                "cx",
                window.sriLankaMapPoint.x
            )
            .attr(
                "cy",
                window.sriLankaMapPoint.y
            )
            .attr("r",5)
            .attr("opacity",1);



        // Travel to center

        gsap.to(
            sriLankaDot.node(),
            {

            attr:{

                cx:window.innerWidth/2,
                cy:window.innerHeight/2

            },

            duration:2,

            ease:"power3.inOut"

        });



        // Expand after arriving

        gsap.to(
            sriLankaDot.node(),
            {

            attr:{
                r:80
            },

            delay:2,

            duration:1,

            ease:"power2.out"

        });


    }



    gsap.to(caseTitle.node(),{

        opacity:1,

        delay:2.5,

        duration:1

    });



    gsap.to(caseSubtitle.node(),{

        opacity:1,

        delay:2.8,

        duration:1

    });


}