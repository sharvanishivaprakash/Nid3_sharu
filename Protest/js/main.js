/* ===========================================================
   main.js
   When the World Takes to the Streets
=========================================================== */

"use strict";

/* ===========================================================
   GLOBAL APP
=========================================================== */

const App = {

    width: 0,
    height: 0,

    svg: null,

    layers: {},

    currentScene: ""

};



/* ===========================================================
   CREATE SVG
=========================================================== */

function createSVG() {

    const container = document.getElementById("visual-container");

    App.width = container.clientWidth;
    App.height = container.clientHeight;

    d3.select("#visual-container")
        .selectAll("*")
        .remove();

    App.svg = d3.select("#visual-container")
        .append("svg")
        .attr("id", "viz-svg")
        .attr("width", App.width)
        .attr("height", App.height)
        .attr("viewBox", `0 0 ${App.width} ${App.height}`);

}


/* ===========================================================
   CREATE LAYERS
=========================================================== */

function createSceneGroups() {

    App.layers = {};

    App.layers.background =
        App.svg.append("g")
            .attr("id", "background-layer");

    App.layers.intro =
        App.svg.append("g")
            .attr("id", "intro-layer")
            .style("pointer-events", "none");

    App.layers.introParticles =
        App.svg.append("g")
            .attr("id", "intro-particles-layer")
            .style("pointer-events", "none");

    App.layers.map =
        App.svg.append("g")
            .attr("id", "map-layer")
            .attr("opacity", 0);

    App.layers.motivation =
        App.svg.append("g")
            .attr("id", "motivation-layer")
            .attr("opacity", 0);

    App.layers.success =
        App.svg.append("g")
            .attr("id", "success-layer")
            .style("opacity", 0);

    App.layers.caseStudy =
        App.svg.append("g")
            .attr("id", "case-layer")
            .style("opacity", 0);

}


/* ===========================================================
   INITIALIZE EVERYTHING
=========================================================== */

function initializeVisuals() {

    createSVG();

    createSceneGroups();

    initializeMap(App);

    initializeMotivation(App);

    initializeSuccess(App);

initializeCaseStudy(App);

createIntroParticles(App);

}
/* ===========================================================
   INTRO
=========================================================== */

function fadeLayers(activeLayer) {

    Object.values(App.layers).forEach(layer => {

        gsap.to(layer.node(), {
            opacity: 0,
            duration: 0.5
        });

    });

    if (!activeLayer) return;

    gsap.to(activeLayer.node(), {
        opacity: 1,
        duration: 0.8
    });

    // Keep intro particles visible on the intro screen
    if (
        activeLayer === App.layers.intro &&
        App.layers.introParticles
    ) {

        gsap.to(App.layers.introParticles.node(), {
            opacity: 1,
            duration: 0.8
        });

    }

}

function showIntro() {

    fadeLayers(App.layers.intro);

    const tl = gsap.timeline();

    tl.from(".eyebrow", {
        opacity: 0,
        y: 20,
        duration: 0.5
    })

    .from(".hero-title .line", {
        opacity: 0,
        y: 60,
        stagger: 0.25,
        duration: 0.8,
        ease: "power3.out"
    }, "-=0.2")

    .from(".intro-body", {
        opacity: 0,
        y: 20,
        duration: 0.7
    }, "-=0.2")

    .from(".scroll-indicator", {
        opacity: 0,
        y: 15,
        duration: 0.5
    }, "+=0.4");

    gsap.to(".scroll-indicator span", {
        y: 10,
        repeat: -1,
        yoyo: true,
        duration: 0.8,
        ease: "power1.inOut"
    });

}

/* ===========================================================
    MAP
=========================================================== */

function showMap(){

    // keep intro particles visible
    animateParticlesToMap(App);


    // wait for particle movement
    setTimeout(()=>{

        fadeLayers(App.layers.map);

        activateMap();


    },1800);

}

/* ===========================================================
   MOTIVATION
=========================================================== */

function showMotivation() {

    fadeLayers(App.layers.motivation);

    activateMotivation();

}




/* ===========================================================
   SUCCESS
=========================================================== */

function showSuccess() {

    fadeLayers(App.layers.success);

    activateSuccess();

}


/* ===========================================================
   CASE STUDY
=========================================================== */

function showCaseStudy() {

    fadeLayers(App.layers.caseStudy);

    activateCaseStudy();

}

   



/* ===========================================================
   SCENE DETECTION
=========================================================== */

function updateScene() {

    const trigger = window.innerHeight * 0.5;

    let active = "scene-intro";

    document.querySelectorAll(".scene").forEach(scene => {

        const rect = scene.getBoundingClientRect();

        if (rect.top <= trigger && rect.bottom >= trigger) {

            active = scene.id;

        }

    });

    if (active === App.currentScene) return;

    App.currentScene = active;

    switch (active) {

        case "scene-intro":
            showIntro();
            break;

        case "scene-map":
            showMap();
            break;

        case "scene-motivation":
            showMotivation();
            break;

        case "scene-success":
            showSuccess();
            break;

        case "scene-case":
            showCaseStudy();
            break;

    }

}


/* ===========================================================
   EVENTS
=========================================================== */

window.addEventListener("scroll", updateScene);

window.addEventListener("resize", () => {

    initializeVisuals();

    setTimeout(() => {

        updateScene();

    }, 100);

});


/* ===========================================================
   START
=========================================================== */

window.addEventListener("load", () => {

    requestAnimationFrame(() => {

        initializeVisuals();

        setTimeout(() => {

            updateScene();

        }, 100);

    });

});
