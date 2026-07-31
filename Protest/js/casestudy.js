/* ===========================================================
   caseStudy.js
   Sri Lanka Case Study
=========================================================== */

"use strict";

let caseStartPoint;
let caseGroup;
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

gsap.registerPlugin(ScrollTrigger);

activateCaseScroll();

}



/* ===========================================================
   ACTIVATE
=========================================================== */

function activateCaseStudy(){

    if(!window.sriLankaSuccessDot){

        console.log("Sri Lanka dot not found");
        return;

    }


    const dot = window.sriLankaSuccessDot;


    // move dot above other SVG elements
    dot.parentNode.appendChild(dot);


    // enlarge first
    gsap.to(dot,{

        attr:{
            r:18
        },

        duration:0.8,
        ease:"power2.out"

    });



    // travel into case study position
    gsap.to(dot,{

        attr:{

            cx: window.innerWidth * 0.75,
            cy: window.innerHeight * 0.45

        },

        duration:2,

        delay:0.5,

        ease:"power3.inOut"

    });



    // become hero red dot

    gsap.to(dot,{

        attr:{
            r:90
        },

        duration:1,

        delay:2.3,

        ease:"power2.out"


    });


    // reveal title

    gsap.to(caseTitle.node(),{

        opacity:1,

        delay:3,

        duration:0.8

    });



    gsap.to(caseSubtitle.node(),{

        opacity:1,

        delay:3.2,

        duration:0.8

    });


}
function activateCaseScroll(){


    gsap.utils.toArray(".case-block, .case-final")
    .forEach(block=>{


        gsap.to(block,{

            opacity:1,

            y:0,

            duration:1,

            ease:"power3.out",

            scrollTrigger:{

                trigger:block,

                start:"top 80%",

            }

        });


    });


}
